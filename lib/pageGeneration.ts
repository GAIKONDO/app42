/**
 * ページ生成ユーティリティ
 * GPT APIを使用して過去のページやフォーマットを参考に新しいページを生成
 */

import { findSimilarPages } from './pageEmbeddings';
import { getPageStructure } from './pageStructure';
import { PageMetadata } from '@/types/pageMetadata';
import { stripHtml } from './pageMetadataUtils';
import { doc, getDoc, collection, query, where, getDocs } from './localFirebase';
import { PageTemplate, getPageTemplate } from './pageTemplates';

/**
 * HTMLからテキスト部分だけを抽出（構造情報を保持）
 * テキストノードの内容とタグ情報を抽出
 */
function extractTextFromHtml(html: string): {
  textItems: Array<{ tag: string; text: string; level?: number; originalMatch: string }>;
} {
  const textItems: Array<{ tag: string; text: string; level?: number; originalMatch: string }> = [];
  
  // 見出しタグからテキストを抽出
  html.replace(
    /<(h[1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    (match, tag, content) => {
      const text = stripHtml(content).trim();
      if (text) {
        const level = parseInt(tag.substring(1));
        textItems.push({
          tag: tag.toLowerCase(),
          text: text,
          level,
          originalMatch: match,
        });
      }
      return match;
    }
  );
  
  // 段落タグからテキストを抽出
  html.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (match, content) => {
      const text = stripHtml(content).trim();
      if (text) {
        textItems.push({
          tag: 'p',
          text: text,
          originalMatch: match,
        });
      }
      return match;
    }
  );
  
  // リストアイテムからテキストを抽出
  html.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (match, content) => {
      const text = stripHtml(content).trim();
      if (text) {
        textItems.push({
          tag: 'li',
          text: text,
          originalMatch: match,
        });
      }
      return match;
    }
  );
  
  return {
    textItems,
  };
}

/**
 * 生成されたテキストを元のHTML構造に戻す
 */
function replaceTextInHtml(
  html: string,
  textItems: Array<{ tag: string; text: string; level?: number; originalMatch: string }>,
  generatedTexts: string[]
): string {
  let result = html;
  const lines = generatedTexts.filter(line => line.trim()).map(line => line.trim());
  
  // 元のHTMLマッチを生成されたテキストで置き換え
  // 順序を逆にして、後ろから置き換える（インデックスの問題を回避）
  for (let i = textItems.length - 1; i >= 0; i--) {
    const item = textItems[i];
    const newText = lines[i] || item.text; // 生成テキストがない場合は元のテキストを使用
    
    // 元のマッチ内のテキスト部分だけを置き換え（HTMLタグは保持）
    // 最初のテキストノードを置き換え
    const updatedMatch = item.originalMatch.replace(
      />([^<]+)</,
      (match, text) => {
        const trimmedText = text.trim();
        if (trimmedText) {
          // テキスト部分だけを置き換え
          return match.replace(trimmedText, newText);
        }
        return match;
      }
    );
    
    // 元のマッチを更新されたマッチで置き換え（最初の1つだけ）
    const index = result.indexOf(item.originalMatch);
    if (index !== -1) {
      result = result.substring(0, index) + updatedMatch + result.substring(index + item.originalMatch.length);
    }
  }
  
  return result;
}

/**
 * GPT API設定
 */
interface GPTConfig {
  model?: string;
  apiKey?: string;
  apiUrl?: string;
  temperature?: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
}

const DEFAULT_GPT_CONFIG: GPTConfig = {
  model: 'gpt-5-mini', // デフォルトモデル
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  temperature: 0.7,
  maxTokens: 2000,
  maxCompletionTokens: 2000,
};

/**
 * Ollama API設定
 */
interface OllamaConfig {
  model?: string;
  apiUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  model: 'qwen2.5:latest', // デフォルトローカルモデル
  apiUrl: 'http://localhost:11434/api/chat',
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * Ollamaで利用可能なモデル一覧を取得
 */
export async function getAvailableOllamaModels(
  apiUrl?: string
): Promise<Array<{ name: string; model: string; size: number; modified_at: string }>> {
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434';
  const tagsUrl = `${baseUrl}/api/tags`;

  try {
    const response = await fetch(tagsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Ollamaが起動していない場合は空配列を返す
      if (response.status === 0 || response.status >= 500) {
        console.warn('Ollamaが起動していない可能性があります');
        return [];
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Ollama APIエラー: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      return [];
    }

    return data.models.map((model: any) => ({
      name: model.name,
      model: model.name,
      size: model.size || 0,
      modified_at: model.modified_at || '',
    }));
  } catch (error) {
    console.error('Ollamaモデル一覧取得エラー:', error);
    // エラーが発生した場合は空配列を返す（Ollamaが起動していない可能性）
    return [];
  }
}

/**
 * Ollamaでモデルをダウンロード（pull）
 * 
 * @param modelName ダウンロードするモデル名（例: "liquid-foundation-models-2"）
 * @param apiUrl Ollama APIのURL
 * @param onProgress 進捗コールバック（オプション）
 * @returns ダウンロードが完了したかどうか
 */
export async function pullOllamaModel(
  modelName: string,
  apiUrl?: string,
  onProgress?: (status: string, completed: number, total: number) => void
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434';
  const pullUrl = `${baseUrl}/api/pull`;

  try {
    const response = await fetch(pullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelName,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama pull APIエラー: ${response.status} ${response.statusText}. ${errorText}`);
    }

    // ストリーミングレスポンスを処理
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('レスポンスボディの読み取りに失敗しました');
    }

    let buffer = '';
    let completed = 0;
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          
          if (data.status) {
            // 進捗情報を処理
            if (onProgress) {
              onProgress(data.status, completed, total);
            }
            
            // ダウンロード進捗を更新
            if (data.completed !== undefined && data.total !== undefined) {
              completed = data.completed;
              total = data.total;
            }
          }
        } catch (e) {
          // JSONパースエラーは無視（不完全な行の可能性）
          console.warn('JSONパースエラー:', e, line);
        }
      }
    }

    // 残りのバッファを処理
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        if (data.status && onProgress) {
          onProgress(data.status, completed, total);
        }
      } catch (e) {
        // 無視
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Ollamaモデルダウンロードエラー:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Ollama APIを呼び出してテキストを生成
 */
async function callOllamaAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: OllamaConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_OLLAMA_CONFIG, ...config };
  const apiUrl = config.apiUrl || process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';

  try {
    // Ollama APIはストリーミング形式をサポートしているが、ここでは非ストリーミング形式を使用
    const requestBody = {
      model: finalConfig.model,
      messages: messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      stream: false,
      options: {
        temperature: finalConfig.temperature,
        num_predict: finalConfig.maxTokens,
      },
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Ollama APIエラー: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.message || !data.message.content) {
      throw new Error('Ollama APIの応答形式が不正です');
    }

    return data.message.content.trim();
  } catch (error) {
    console.error('Ollama API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * GPT APIを呼び出してテキストを生成
 */
async function callGPTAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: GPTConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_GPT_CONFIG, ...config };
  
  // APIキーを取得: config > 設定ページ > localStorage > 環境変数の順
  let apiKey: string | undefined = config.apiKey;
  if (!apiKey && typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('./security');
      apiKey = getAPIKey('openai') || undefined;
    } catch (error) {
      // セキュリティモジュールがない場合は直接localStorageから取得
      apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
    }
  }
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
  }

  try {
    const requestBody: any = {
      model: finalConfig.model,
      messages,
    };
    
    // モデルによってmax_tokensまたはmax_completion_tokensを使用
    // gpt-5系のモデルはmax_completion_tokensを使用
    if (finalConfig.model?.startsWith('gpt-5')) {
      requestBody.max_completion_tokens = finalConfig.maxCompletionTokens || finalConfig.maxTokens || 2000;
      // gpt-5系のモデルではtemperatureはサポートされていないため設定しない
    } else {
      requestBody.max_tokens = finalConfig.maxTokens || 2000;
      requestBody.temperature = finalConfig.temperature;
    }
    
    const response = await fetch(finalConfig.apiUrl!, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `GPT APIエラー: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('GPT APIの応答形式が不正です');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('GPT API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * モデルタイプに応じて適切なAPIを呼び出す
 */
async function callLLMAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string,
  config?: GPTConfig | OllamaConfig
): Promise<string> {
  // モデル名でローカルモデルかどうかを判定
  const isLocalModel = model.startsWith('qwen') || 
                       model.startsWith('llama') || 
                       model.startsWith('mistral') ||
                       model.includes(':latest') ||
                       model.includes(':instruct');
  const isGeminiModel = model.startsWith('gemini');
  const isClaudeModel = model.startsWith('claude');
  
  if (isLocalModel) {
    return callOllamaAPI(messages, config as OllamaConfig);
  } else if (isGeminiModel) {
    return callGeminiAPI(messages, { ...config, model } as GPTConfig);
  } else if (isClaudeModel) {
    return callClaudeAPI(messages, { ...config, model } as GPTConfig);
  } else {
    return callGPTAPI(messages, { ...config, model } as GPTConfig);
  }
}

/**
 * Gemini APIを呼び出してテキストを生成
 */
async function callGeminiAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: GPTConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_GPT_CONFIG, ...config };
  
  // APIキーを取得: config > 設定ページ > localStorage > 環境変数の順
  let apiKey: string | undefined = config.apiKey;
  if (!apiKey && typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('./security');
      apiKey = getAPIKey('gemini') || undefined;
    } catch (error) {
      apiKey = localStorage.getItem('NEXT_PUBLIC_GEMINI_API_KEY') || undefined;
    }
  }
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }
  
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
  }

  // Gemini APIはsystemメッセージをサポートしていないため、最初のsystemメッセージをuserメッセージに変換
  const geminiMessages = messages.map((msg) => {
    if (msg.role === 'system') {
      return {
        role: 'user' as const,
        parts: [{ text: `[システム指示] ${msg.content}` }],
      };
    }
    return {
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    };
  });

  const requestBody = {
    contents: geminiMessages,
    generationConfig: {
      temperature: finalConfig.temperature,
      maxOutputTokens: finalConfig.maxTokens,
    },
  };

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${finalConfig.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch (error) {
    console.error('Gemini API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * Claude APIを呼び出してテキストを生成
 */
async function callClaudeAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: GPTConfig = {}
): Promise<string> {
  const finalConfig = { ...DEFAULT_GPT_CONFIG, ...config };
  
  // APIキーを取得: config > 設定ページ > localStorage > 環境変数の順
  let apiKey: string | undefined = config.apiKey;
  if (!apiKey && typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('./security');
      apiKey = getAPIKey('claude') || undefined;
    } catch (error) {
      apiKey = localStorage.getItem('NEXT_PUBLIC_CLAUDE_API_KEY') || undefined;
    }
  }
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
  }
  
  if (!apiKey) {
    throw new Error('Claude APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
  }

  // Claude APIはsystemメッセージをサポートしている
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const requestBody: any = {
    model: finalConfig.model,
    messages: conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
    max_tokens: finalConfig.maxTokens,
    temperature: finalConfig.temperature,
  };

  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || '';
  } catch (error) {
    console.error('Claude API呼び出しエラー:', error);
    throw error;
  }
}

/**
 * 参考ページの情報を取得
 */
async function getReferencePageInfo(
  pageId: string,
  planId?: string,
  conceptId?: string,
  subMenuId?: string
): Promise<{
  page: PageMetadata | null;
  structure: Awaited<ReturnType<typeof getPageStructure>>;
}> {
  let page: PageMetadata | null = null;
  let structure = null;

  try {
    // ページデータを取得
    if (planId) {
      // 会社本体の事業計画の場合
      const planDoc = await getDoc(doc(null, 'companyBusinessPlan', planId));
      if (planDoc.exists()) {
        const planData = planDoc.data();
        const pagesBySubMenu = (planData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
        
        // すべてのサブメニューからページを検索
        const allPages = Object.values(pagesBySubMenu).flat();
        page = allPages.find(p => p.id === pageId) || null;
      }
    } else if (conceptId) {
      // 構想の場合
      const conceptsQuery = query(
        collection(null, 'concepts'),
        where('conceptId', '==', conceptId)
      );
      const conceptsSnapshot = await getDocs(conceptsQuery);
      if (!conceptsSnapshot.empty) {
        const conceptData = conceptsSnapshot.docs[0].data();
        const pagesBySubMenu = (conceptData.pagesBySubMenu || {}) as { [key: string]: Array<PageMetadata> };
        
        // すべてのサブメニューからページを検索
        const allPages = Object.values(pagesBySubMenu).flat();
        page = allPages.find(p => p.id === pageId) || null;
      }
    }

    // 構造データを取得
    try {
      structure = await getPageStructure(pageId);
    } catch (error) {
      console.warn(`ページ ${pageId} の構造データ取得エラー:`, error);
    }
  } catch (error) {
    console.error(`ページ ${pageId} の情報取得エラー:`, error);
  }

  return { page, structure };
}

/**
 * フォーマットパターンの説明を生成
 */
function formatPatternDescription(structure: any): string {
  if (!structure) return '';

  const parts: string[] = [];

  // レイアウトタイプ
  if (structure.formatPattern?.layoutType) {
    parts.push(`レイアウト: ${structure.formatPattern.layoutType}`);
  }

  // スタイルパターン
  if (structure.formatPattern?.stylePattern) {
    const style = structure.formatPattern.stylePattern;
    if (style.hasKeyMessage) parts.push('キーメッセージあり');
    if (style.hasCards) parts.push('カードレイアウトあり');
    if (style.visualElements && style.visualElements.length > 0) {
      parts.push(`視覚要素: ${style.visualElements.join(', ')}`);
    }
  }

  // コンテンツパターン
  if (structure.formatPattern?.contentPattern) {
    const content = structure.formatPattern.contentPattern;
    if (content.structure) parts.push(`構造タイプ: ${content.structure}`);
    if (content.hasIntroduction) parts.push('導入部分あり');
    if (content.hasConclusion) parts.push('結論部分あり');
  }

  // コンテンツ構造
  if (structure.contentStructure) {
    const cs = structure.contentStructure;
    if (cs.headings && cs.headings.length > 0) {
      parts.push(`見出し数: ${cs.headings.length}個`);
    }
    if (cs.hasImages) parts.push('画像あり');
    if (cs.hasDiagrams) parts.push('図表あり');
    if (cs.hasTables) parts.push('テーブルあり');
  }

  return parts.join(', ');
}

/**
 * 類似ページを参考に新しいページを生成
 */
export async function generatePageFromSimilar(
  query: string,
  subMenuId: string,
  planId?: string,
  conceptId?: string,
  referencePageIds?: string[],
  model?: string,
  evidenceText?: string
): Promise<{
  title: string;
  content: string;
  referencePages: Array<{ pageId: string; similarity: number; title?: string }>;
}> {
  try {
    // 1. 類似ページを検索
    let similarPages: Array<{ pageId: string; similarity: number; title?: string }> = [];
    
    if (referencePageIds && referencePageIds.length > 0) {
      // 指定されたページIDを使用
      similarPages = referencePageIds.map((id, idx) => ({
        pageId: id,
        similarity: 1 - idx * 0.1, // 仮の類似度
      }));
    } else {
      // クエリに基づいて類似ページを検索
      similarPages = await findSimilarPages(query, 5, planId, conceptId);
    }

    if (similarPages.length === 0) {
      throw new Error('参考となる類似ページが見つかりませんでした');
    }

    // 2. 参考ページの情報を取得
    const referencePagesInfo = await Promise.all(
      similarPages.slice(0, 3).map(async (sp) => {
        const info = await getReferencePageInfo(sp.pageId, planId, conceptId, subMenuId);
        return {
          pageId: sp.pageId,
          similarity: sp.similarity,
          title: info.page?.title || sp.title || sp.pageId,
          content: info.page?.content || '',
          structure: info.structure,
        };
      })
    );

    // 3. 最も類似度の高いページの構造を分析
    const primaryReference = referencePagesInfo[0];
    const formatDescription = formatPatternDescription(primaryReference.structure);
    
    // 参考ページのコンテンツ例を取得（HTMLタグを除去してテキストのみ）
    const referenceContentExamples = referencePagesInfo
      .map(r => r.content ? stripHtml(r.content).substring(0, 300) : '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    // 4. GPT APIを使用してページを生成（GPT-4.1とGPT-5で同じプロンプトを使用）
    const systemPrompt = `あなたは事業計画書のページを作成する専門家です。
過去のページのフォーマットや構造を参考にしながら、新しいページのコンテンツをHTML形式で生成してください。

重要な要件:
- HTMLタグを使用して構造化されたコンテンツを生成
- 見出し（h2, h3）を使用してセクションを明確に
- 段落（p）を使用してテキストを記述
- リスト（ul, ol, li）を適切に使用
- 参考ページのフォーマットパターンを尊重
- 日本語で自然な文章を生成
- 具体的で実用的な内容を生成`;

    // テーマとエビデンスを分離
    const themeMatch = query.match(/^(.+?)(?:\n\n【参照エビデンス】|$)/s);
    const theme = themeMatch ? themeMatch[1].trim() : query;
    const evidence = evidenceText || (query.includes('【参照エビデンス】') ? query.split('【参照エビデンス】')[1] : '');

    const userPrompt = `以下の情報を参考に、新しいページを生成してください。

【生成するページのテーマ】
${theme}

${evidence ? `【参照エビデンス】
${evidence}` : ''}

【参考ページのフォーマットパターン】
${formatDescription || 'フォーマット情報なし'}

【参考ページのタイトル例】
${referencePagesInfo.map(r => r.title || r.pageId).join(', ')}

${referenceContentExamples ? `【参考ページのコンテンツ例】
${referenceContentExamples}` : ''}

上記の情報を参考に、以下の形式でページを生成してください:
1. ページタイトル（1行）
2. HTMLコンテンツ（複数行）

出力形式:
TITLE: [ページタイトル]
CONTENT:
[HTMLコンテンツ]`;

    const finalModel = model || 'gpt-5-mini';
    const generatedText = await callLLMAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], finalModel);

    // 5. 生成されたテキストを解析
    const titleMatch = generatedText.match(/TITLE:\s*(.+)/i);
    const contentMatch = generatedText.match(/CONTENT:\s*([\s\S]+)/i);

    let title = query;
    let content = '';

    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    if (contentMatch) {
      content = contentMatch[1].trim();
    } else {
      // CONTENT: が見つからない場合、TITLE: 以降をコンテンツとして扱う
      const afterTitle = generatedText.replace(/TITLE:.*/i, '').trim();
      content = afterTitle || generatedText;
    }

    // コンテンツが空の場合はデフォルトを生成
    if (!content.trim()) {
      content = `<h2>${title}</h2>
<p>${query}に関する内容をここに記述します。</p>`;
    }

    return {
      title,
      content,
      referencePages: similarPages,
    };
  } catch (error) {
    console.error('ページ生成エラー:', error);
    throw error;
  }
}

/**
 * テンプレートをベースに新しいページを生成
 */
export async function generatePageFromTemplate(
  query: string,
  templateId: string,
  subMenuId: string,
  model?: string,
  evidenceText?: string
): Promise<{
  title: string;
  content: string;
  template: PageTemplate;
}> {
  try {
    // テンプレートを取得
    const template = await getPageTemplate(templateId);
    
    if (!template) {
      throw new Error('テンプレートが見つかりませんでした');
    }

    // HTMLからテキスト部分だけを抽出
    const { textItems } = extractTextFromHtml(template.pageContent);
    
    if (textItems.length === 0) {
      // テキストが見つからない場合は従来の方法を使用
      throw new Error('テンプレートからテキストを抽出できませんでした');
    }
    
    // テーマとエビデンスを分離
    const themeMatch = query.match(/^(.+?)(?:\n\n【参照エビデンス】|$)/s);
    const theme = themeMatch ? themeMatch[1].trim() : query;
    const evidence = evidenceText || (query.includes('【参照エビデンス】') ? query.split('【参照エビデンス】')[1] : '');

    // テキストリストを構造化してGPTに送る
    const textList = textItems.map((item, index) => {
      const prefix = item.tag.startsWith('h') ? `見出し${item.level}: ` : 
                     item.tag === 'p' ? '段落: ' : 
                     item.tag === 'li' ? 'リスト項目: ' : '';
      return `${index + 1}. ${prefix}${item.text}`;
    }).join('\n');

    // GPT-5シリーズ向けにプロンプトを最適化
    const isGPT5 = model?.startsWith('gpt-5');
    
    const systemPrompt = isGPT5
      ? `あなたは事業計画書のページを作成する専門家です。
テンプレートページのテキスト内容を、新しいテーマに沿った内容に置き換えてください。

重要な要件:
1. テンプレートのテキストの順序を厳密に維持する（${textItems.length}個のテキストを同じ順序で出力）
2. 各テキストを新しいテーマに沿った内容に置き換える
3. 日本語で自然な文章を生成
4. 具体的で実用的な内容を生成
5. テキストの長さは元のテキストと同程度を目安にする

出力は必ず以下の形式で行うこと:
TITLE: [ページタイトル]
TEXTS:
[テキスト1]
[テキスト2]
[テキスト3]
...
（必ず${textItems.length}個のテキストを出力すること）`
      : `あなたは事業計画書のページを作成する専門家です。
テンプレートページのテキスト内容を、新しいテーマに沿った内容に置き換えてください。

重要な要件:
- テンプレートのテキストの順序と構造（見出し、段落、リスト項目）を維持する
- 各テキストを新しいテーマに沿った内容に置き換える
- 日本語で自然な文章を生成
- 具体的で実用的な内容を生成
- テキストの長さは元のテキストと同程度を目安にする`;

    const userPrompt = isGPT5
      ? `以下のテンプレートページのテキストを、新しいテーマに沿った内容に置き換えてください。

【生成するページのテーマ】
${theme}

${evidence ? `【参照エビデンス】
${evidence}` : ''}

【テンプレートページのタイトル】
${template.pageTitle}

【テンプレートページのテキストリスト（${textItems.length}個、順序を維持して置き換えてください）】
${textList}

重要: 上記の${textItems.length}個のテキストを、テーマ「${theme}」に沿った新しい内容に置き換えてください。
テキストの順序は必ず維持し、${textItems.length}個すべてを出力してください。

出力形式（この形式を厳密に守ること）:
TITLE: [ページタイトル]
TEXTS:
[テキスト1]
[テキスト2]
[テキスト3]
...
（必ず${textItems.length}個のテキストを出力）`
      : `以下のテンプレートページのテキストを、新しいテーマに沿った内容に置き換えてください。

【生成するページのテーマ】
${theme}

${evidence ? `【参照エビデンス】
${evidence}` : ''}

【テンプレートページのタイトル】
${template.pageTitle}

【テンプレートページのテキストリスト（順序を維持して置き換えてください）】
${textList}

上記のテキストリストの順序と構造を維持しながら、テーマ「${theme}」に沿った新しい内容に置き換えてください。
各テキストを1行ずつ、同じ順序で出力してください。

出力形式:
TITLE: [ページタイトル]
TEXTS:
[テキスト1]
[テキスト2]
[テキスト3]
...`;

    const finalModel = model || 'gpt-5-mini';
    const generatedText = await callLLMAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], finalModel);

    // デバッグログ（GPT-5シリーズの場合）
    if (isGPT5) {
      console.log('GPT-5シリーズの生成結果:', generatedText);
      console.log('期待されるテキスト数:', textItems.length);
    }

    // 生成されたテキストを解析
    const titleMatch = generatedText.match(/TITLE:\s*(.+)/i);
    const textsMatch = generatedText.match(/TEXTS:\s*([\s\S]+)/i);

    let title = theme;
    let generatedTexts: string[] = [];

    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    if (textsMatch) {
      // テキストリストを抽出（各行を個別のテキストとして扱う）
      generatedTexts = textsMatch[1]
        .split('\n')
        .map(line => {
          // 番号付きリストの番号を除去（例: "1. テキスト" -> "テキスト"）
          line = line.replace(/^\d+\.\s*/, '');
          // プレフィックスを除去（例: "見出し1: テキスト" -> "テキスト"）
          line = line.replace(/^(見出し\d+|段落|リスト項目):\s*/, '');
          return line.trim();
        })
        .filter(line => line && line.length > 0);
    } else {
      // TEXTS: が見つからない場合、TITLE: 以降を行ごとに分割
      const afterTitle = generatedText.replace(/TITLE:.*/i, '').trim();
      generatedTexts = afterTitle
        .split('\n')
        .map(line => {
          line = line.replace(/^\d+\.\s*/, '');
          line = line.replace(/^(見出し\d+|段落|リスト項目):\s*/, '');
          return line.trim();
        })
        .filter(line => line && line.length > 0);
    }
    
    // 生成されたテキストが不足している場合は、元のテキストを使用
    while (generatedTexts.length < textItems.length) {
      generatedTexts.push(textItems[generatedTexts.length].text);
    }
    
    // 生成されたテキストが多すぎる場合は、必要な数だけ使用
    if (generatedTexts.length > textItems.length) {
      generatedTexts = generatedTexts.slice(0, textItems.length);
    }

    // デバッグログ
    if (isGPT5) {
      console.log('抽出されたテキスト数:', generatedTexts.length);
      console.log('抽出されたテキスト:', generatedTexts);
    }

    // 生成されたテキストが不足している場合は、元のテキストを使用
    while (generatedTexts.length < textItems.length) {
      generatedTexts.push(textItems[generatedTexts.length].text);
    }

    // 生成されたテキストを元のHTML構造に戻す
    const content = replaceTextInHtml(template.pageContent, textItems, generatedTexts);

    return {
      title,
      content,
      template,
    };
  } catch (error) {
    console.error('テンプレートベースページ生成エラー:', error);
    throw error;
  }
}

/**
 * 複数の参考ページのコンテンツを取得して統合
 */
export async function getReferencePagesContent(
  pageIds: string[],
  planId?: string,
  conceptId?: string
): Promise<Array<{ pageId: string; title: string; content: string }>> {
  // 実際の実装では、Firestoreからページデータを取得
  // ここでは簡易版として空の配列を返す
  return [];
}

