/**
 * トピックメタデータのAI自動生成ユーティリティ
 * OpenAI GPT APIを使用してトピックのメタデータを自動生成
 */

import type { TopicSemanticCategory, TopicSemanticCategoryFixed, TopicImportance, TopicMetadata } from '@/types/topicMetadata';
import type { Entity, EntityType } from '@/types/entity';
import type { Relation, RelationType } from '@/types/relation';

/**
 * LLM APIを呼び出してテキストを生成（GPT、Gemini、Claude、またはローカルモデル）
 */
export async function callGPTAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  // モデルタイプを判定
  const isGeminiModel = model.startsWith('gemini');
  const isClaudeModel = model.startsWith('claude');
  const isGPTModel = model.startsWith('gpt-');
  
  // LFM2モデル（LlamaCpp）の判定
  const isLFM2Model = model === 'lfm2-8b-a1b-q4-k-m' || 
                       model.includes('LFM2') || 
                       model.includes('lfm2') ||
                       model.endsWith('.gguf');
  
  // その他のローカルモデル（Ollama）の判定
  const isOllamaModel = !isGPTModel && 
                        !isGeminiModel && 
                        !isClaudeModel && 
                        !isLFM2Model;

  // LFM2モデル（LlamaCpp Server）の場合
  if (isLFM2Model) {
    try {
      // LlamaCppServerProviderを使用
      const { getModelConfig, getProviderForModel } = await import('./localModel/router');
      const modelConfig = getModelConfig(model);
      const provider = getProviderForModel(modelConfig);
      
      // エンティティ・リレーション抽出の場合はより長いレスポンスが必要
      const isJsonExtraction = messages.some(msg => 
        msg.content.includes('JSON形式') || 
        msg.content.includes('JSON形式で返してください') ||
        msg.content.includes('結果はJSON形式')
      );
      
      console.log(`🔄 LlamaCpp Server API呼び出し開始: モデル: ${model}`);
      
      const chatMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      const result = await provider.chat(chatMessages, {
        model: modelConfig.id,
        temperature: 0.7,
        maxTokens: isJsonExtraction ? 4000 : 2000,
      });
      
      const content = result.text?.trim() || '';
      
      if (!content) {
        throw new Error('LlamaCpp Server APIの応答が空でした');
      }
      
      console.log(`✅ LlamaCpp Server API呼び出し完了: ${content.length}文字`);
      return content;
    } catch (error: any) {
      console.error('LlamaCpp Server API呼び出しエラー:', error);
      
      // エラーメッセージを改善
      if (error.message?.includes('fetch') || error.message?.includes('接続')) {
        throw new Error(`LlamaCpp Serverに接続できませんでした。\n\n【確認事項】\n1. llama-serverが起動しているか確認:\n   cd /Users/gaikondo/Desktop/test-app/app50_LFM2\n   ./ai/bin/run_lfm2_server.sh ./ai/models/LFM2-8B-A1B-Q4_K_M.gguf\n\n2. サーバーが http://localhost:8080 で起動しているか確認\n3. 環境変数 NEXT_PUBLIC_LLAMA_CPP_API_URL が正しく設定されているか確認\n\n【現在の設定】\n- 使用モデル: ${model}`);
      }
      
      throw new Error(`LlamaCpp Server API呼び出しエラー: ${error.message || String(error)}`);
    }
  } else if (isOllamaModel) {
    // Ollama API呼び出し
    // API URLを取得: localStorage > 環境変数 > デフォルト
    let apiUrl: string = 'http://localhost:11434/api/chat';
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('NEXT_PUBLIC_OLLAMA_API_URL') || localStorage.getItem('ollamaChatApiUrl');
      if (savedUrl) {
        apiUrl = savedUrl;
      } else {
        apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || apiUrl;
      }
    } else {
      apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || apiUrl;
    }
    
    // タイムアウト設定（300秒 - ローカルモデル（特に8B以上のモデル）は応答が非常に遅い場合があるため、さらに長めに設定）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    
    try {
      // エンティティ・リレーション抽出の場合はより長いレスポンスが必要
      // システムプロンプトにJSON形式が含まれているかチェック
      const isJsonExtraction = messages.some(msg => 
        msg.content.includes('JSON形式') || 
        msg.content.includes('JSON形式で返してください') ||
        msg.content.includes('結果はJSON形式')
      );
      
      const requestBody = {
        model: model,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: isJsonExtraction ? 4000 : 500, // JSON抽出の場合は長めに設定
        },
      };
      
      console.log(`🔄 Ollama API呼び出し開始: ${apiUrl}, モデル: ${model}`);
      console.log(`📤 リクエストボディ:`, JSON.stringify(requestBody, null, 2));
      
      const startTime = Date.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      const elapsedTime = Date.now() - startTime;
      console.log(`⏱️ レスポンス受信まで: ${elapsedTime}ms`);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Ollama APIエラー: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.message?.content?.trim() || '';
      
      if (!content) {
        throw new Error('Ollama APIの応答が空でした');
      }

      return content;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Ollama API呼び出しがタイムアウトしました（300秒/5分）。\n\n考えられる原因:\n1. モデル「${model}」の応答が非常に遅い可能性があります（8B以上のモデルは特に遅い）\n2. モデルが正しくインストールされていない可能性があります\n3. Ollamaのリソースが不足している可能性があります\n4. ネットワーク接続の問題\n\n確認方法:\n- ターミナルで「ollama list」を実行してモデルがインストールされているか確認\n- ターミナルで直接テスト: curl -X POST http://localhost:11434/api/chat -d '{"model":"${model}","messages":[{"role":"user","content":"test"}],"stream":false}'\n- より軽量なモデルを試す（例: qwen2.5:1.5b, llama3.2:1b など）\n- Ollamaのログを確認: ターミナルでOllamaが実行されている場合、ログを確認\n- API URL: ${apiUrl}`);
      }
      
      // ネットワークエラーの場合
      if (error.message?.includes('Load failed') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('TypeError')) {
        // Tauriアプリケーションかどうかを確認
        const isTauriApp = typeof window !== 'undefined' && (window as any).__TAURI__;
        
        let errorMessage = `Ollamaに接続できませんでした。\n\n`;
        errorMessage += `【確認事項】\n`;
        errorMessage += `1. Ollamaが起動しているか確認:\n`;
        errorMessage += `   ターミナルで「ollama serve」を実行してください\n\n`;
        errorMessage += `2. モデルがインストールされているか確認:\n`;
        errorMessage += `   ターミナルで「ollama list」を実行して「${model}」が表示されるか確認してください\n`;
        errorMessage += `   （モデル名が異なる場合は、正しいモデル名を選択してください）\n\n`;
        
        if (isTauriApp) {
          errorMessage += `3. Tauriアプリケーションの場合:\n`;
          errorMessage += `   ブラウザの開発者ツール（F12）のコンソールでCORSエラーが表示されていないか確認してください\n`;
          errorMessage += `   Ollamaは通常CORSを許可していますが、セキュリティ設定によってはブロックされる可能性があります\n\n`;
        } else {
          errorMessage += `3. ブラウザで直接確認:\n`;
          errorMessage += `   ブラウザで「${apiUrl.replace('/api/chat', '/api/tags')}」にアクセスしてJSONレスポンスが返ってくるか確認してください\n\n`;
        }
        
        errorMessage += `【現在の設定】\n`;
        errorMessage += `- API URL: ${apiUrl}\n`;
        errorMessage += `- 使用モデル: ${model}\n\n`;
        errorMessage += `【解決方法】\n`;
        errorMessage += `- モデル名が正しいか確認（例: qwen2.5:8b, llama3.2:latest など）\n`;
        errorMessage += `- Ollamaを再起動: 「ollama serve」を実行\n`;
        errorMessage += `- 別のモデルを試す: インストール済みのモデルを選択`;
        
        throw new Error(errorMessage);
      }
      
      console.error('Ollama API呼び出しエラー:', error);
      throw new Error(`Ollama API呼び出しエラー: ${error.message || String(error)}\n\nAPI URL: ${apiUrl}\nモデル: ${model}`);
    }
  } else if (isGeminiModel) {
    // Gemini API呼び出し
    let apiKey: string | undefined;
    if (typeof window !== 'undefined') {
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

    const isJsonExtraction = messages.some(msg => 
      msg.content.includes('JSON形式') || 
      msg.content.includes('JSON形式で返してください') ||
      msg.content.includes('結果はJSON形式')
    );

    const requestBody = {
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: isJsonExtraction ? 4000 : 2000,
      },
    };

    // タイムアウト設定（120秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Gemini API呼び出しがタイムアウトしました。');
      }
      console.error('Gemini API呼び出しエラー:', error);
      throw error;
    }
  } else if (isClaudeModel) {
    // Claude API呼び出し
    let apiKey: string | undefined;
    if (typeof window !== 'undefined') {
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

    const isJsonExtraction = messages.some(msg => 
      msg.content.includes('JSON形式') || 
      msg.content.includes('JSON形式で返してください') ||
      msg.content.includes('結果はJSON形式')
    );

    const requestBody: any = {
      model: model,
      messages: conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      max_tokens: isJsonExtraction ? 4000 : 2000,
      temperature: 0.7,
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    // タイムアウト設定（120秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text?.trim() || '';
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Claude API呼び出しがタイムアウトしました。');
      }
      console.error('Claude API呼び出しエラー:', error);
      throw error;
    }
  } else {
    // GPT API呼び出し
    // APIキーを取得: localStorage > 環境変数の順
    let apiKey: string | undefined;
    if (typeof window !== 'undefined') {
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

    // タイムアウト設定（120秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      // エンティティ・リレーション抽出の場合はより長いレスポンスが必要
      // システムプロンプトにJSON形式が含まれているかチェック
      const isJsonExtraction = messages.some(msg => 
        msg.content.includes('JSON形式') || 
        msg.content.includes('JSON形式で返してください') ||
        msg.content.includes('結果はJSON形式')
      );

      const requestBody: any = {
        model,
        messages,
      };

      if (model.startsWith('gpt-5')) {
        requestBody.max_completion_tokens = isJsonExtraction ? 4000 : 2000; // JSON抽出の場合は長めに設定
      } else {
        requestBody.max_tokens = isJsonExtraction ? 4000 : 2000; // JSON抽出の場合は長めに設定
        requestBody.temperature = 0.7;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('GPT API呼び出しがタイムアウトしました。');
      }
      console.error('GPT API呼び出しエラー:', error);
      throw error;
    }
  }
}

/**
 * セマンティックカテゴリを自動判定
 * 固定値のカテゴリに加えて、ドメイン固有のカテゴリ（財務、営業、人事など）も生成可能
 */
export async function generateSemanticCategory(
  title: string,
  content: string,
  model: string = 'gpt-4o-mini',
  allowCustom: boolean = true
): Promise<TopicSemanticCategory> {
  const systemPrompt = `あなたは議事録のトピックを分類する専門家です。
以下のトピックを分類してください。

${allowCustom ? '**推奨カテゴリ（固定値）:**' : '**カテゴリ（固定値）:**'}
- action-item: アクションアイテム（実行すべきタスク）
- decision: 決定事項
- discussion: 議論・討議
- issue: 課題・問題
- risk: リスク
- opportunity: 機会・チャンス
- question: 質問・疑問
- summary: サマリー・要約
- follow-up: フォローアップ事項
- reference: 参照情報
- other: その他

${allowCustom ? `**カスタムカテゴリ（ドメイン固有）:**\n上記の固定値で適切に分類できない場合、ドメイン固有のカテゴリを提案してください。\n例: 財務、営業、人事、AI、インフラ、法務、マーケティング、開発、運用など\n\nカテゴリ名のみを返してください（説明は不要）。` : '分類結果は、カテゴリ名のみを返してください（説明は不要）。'}`;

  const userPrompt = `以下のトピックを分類してください：

タイトル: ${title}
内容: ${content.substring(0, 500)}`;

  try {
    const result = await callGPTAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], model);

    // 結果からカテゴリ名を抽出
    const category = result.toLowerCase().trim();
    const validCategories: TopicSemanticCategory[] = [
      'action-item',
      'decision',
      'discussion',
      'issue',
      'risk',
      'opportunity',
      'question',
      'summary',
      'follow-up',
      'reference',
      'other',
    ];

    if (validCategories.includes(category as TopicSemanticCategory)) {
      return category as TopicSemanticCategory;
    }

    // カテゴリが見つからない場合は、内容から推測
    const contentLower = (title + ' ' + content).toLowerCase();
    if (contentLower.includes('決定') || contentLower.includes('decision')) {
      return 'decision';
    }
    if (contentLower.includes('課題') || contentLower.includes('問題') || contentLower.includes('issue')) {
      return 'issue';
    }
    if (contentLower.includes('リスク') || contentLower.includes('risk')) {
      return 'risk';
    }
    if (contentLower.includes('要約') || contentLower.includes('まとめ') || contentLower.includes('summary')) {
      return 'summary';
    }
    if (contentLower.includes('質問') || contentLower.includes('question')) {
      return 'question';
    }
    if (contentLower.includes('アクション') || contentLower.includes('action') || contentLower.includes('タスク')) {
      return 'action-item';
    }

    return 'other';
  } catch (error) {
    console.error('セマンティックカテゴリ生成エラー:', error);
    // エラー時はデフォルト値を返す
    return 'other';
  }
}

/**
 * 重要度を自動判定
 */
export async function generateImportance(
  title: string,
  content: string,
  model: string = 'gpt-4o-mini'
): Promise<TopicImportance> {
  const systemPrompt = `あなたは議事録のトピックの重要度を判定する専門家です。
以下のトピックを以下の3段階の重要度で評価してください：

- high: 高（重要な決定、緊急の課題、重要なリスクなど）
- medium: 中（通常の議論、一般的な情報共有など）
- low: 低（参考情報、軽微な話題など）

評価結果は、重要度のみを返してください（説明は不要）。`;

  const userPrompt = `以下のトピックの重要度を評価してください：

タイトル: ${title}
内容: ${content.substring(0, 500)}`;

  try {
    const result = await callGPTAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], model);

    const importance = result.toLowerCase().trim();
    if (importance === 'high' || importance === 'medium' || importance === 'low') {
      return importance as TopicImportance;
    }

    // デフォルトは中
    return 'medium';
  } catch (error) {
    console.error('重要度生成エラー:', error);
    return 'medium';
  }
}

/**
 * キーワードを自動抽出
 */
export async function generateKeywords(
  title: string,
  content: string,
  maxKeywords: number = 5,
  model: string = 'gpt-4o-mini'
): Promise<string[]> {
  const systemPrompt = `あなたは議事録のトピックから重要なキーワードを抽出する専門家です。
以下のトピックから、最も重要なキーワードを${maxKeywords}個まで抽出してください。

キーワードは、カンマ区切りで返してください（日本語でも英語でも可）。
説明は不要で、キーワードのみを返してください。`;

  const userPrompt = `以下のトピックからキーワードを抽出してください：

タイトル: ${title}
内容: ${content.substring(0, 500)}`;

  try {
    const result = await callGPTAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], model);

    // カンマ区切りで分割
    const keywords = result
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, maxKeywords);

    return keywords;
  } catch (error) {
    console.error('キーワード生成エラー:', error);
    return [];
  }
}

/**
 * 要約を自動生成
 */
export async function generateSummary(
  title: string,
  content: string,
  maxLength: number = 100,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const systemPrompt = `あなたは議事録のトピックを要約する専門家です。
以下のトピックを簡潔に要約してください。

要約は${maxLength}文字以内で、重要なポイントを簡潔にまとめてください。
説明や補足は不要で、要約のみを返してください。`;

  const userPrompt = `以下のトピックを要約してください：

タイトル: ${title}
内容: ${content}`;

  try {
    const result = await callGPTAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], model);

    // 文字数制限
    const summary = result.trim();
    if (summary.length > maxLength) {
      return summary.substring(0, maxLength - 3) + '...';
    }

    return summary;
  } catch (error) {
    console.error('要約生成エラー:', error);
    return '';
  }
}

/**
 * トピックメタデータを一括生成
 */
export async function generateTopicMetadata(
  title: string,
  content: string,
  model: string = 'gpt-4o-mini'
): Promise<Partial<Pick<TopicMetadata, 'semanticCategory' | 'importance' | 'keywords' | 'summary'>>> {
  try {
    console.log('🤖 トピックメタデータのAI生成を開始:', { title, contentLength: content.length, model });

    // 並列で生成（パフォーマンス向上）
    const [semanticCategory, importance, keywords, summary] = await Promise.all([
      generateSemanticCategory(title, content, model),
      generateImportance(title, content, model),
      generateKeywords(title, content, 5, model),
      generateSummary(title, content, 100, model),
    ]);

    const metadata = {
      semanticCategory,
      importance,
      keywords: keywords.length > 0 ? keywords : undefined,
      summary: summary || undefined,
    };

    console.log('✅ トピックメタデータのAI生成完了:', metadata);
    return metadata;
  } catch (error) {
    console.error('❌ トピックメタデータ生成エラー:', error);
    // エラー時は空のメタデータを返す
    return {};
  }
}

/**
 * エンティティを抽出（NER: Named Entity Recognition）
 */
export async function extractEntities(
  title: string,
  content: string,
  model: string = 'gpt-4o-mini'
): Promise<Entity[]> {
  // ローカルモデルかGPT-5シリーズかどうかを判定
  const isLocalModel = model.startsWith('qwen') || 
                       model.startsWith('llama') || 
                       model.startsWith('mistral') ||
                       model.includes(':latest') ||
                       model.includes(':instruct');
  const isGPT5 = model.startsWith('gpt-5');

  const systemPrompt = (isLocalModel || isGPT5)
    ? `あなたはテキストからエンティティ（登場人物・モノ）を抽出する専門家です。
以下のテキストから、以下のタイプのエンティティを抽出してください：

- person: 人（顧客、社員、担当者など）
- company: 会社（トヨタ、CTC、OpenAIなど）
- product: 製品（ChatGPT、GPU、ERPなど）
- project: プロジェクト
- organization: 組織（部署、チームなど）
- location: 場所
- technology: 技術・ツール
- other: その他

**重要: 結果は必ずJSON形式の配列で返してください。説明文やマークダウンは一切不要です。JSONのみを返してください。**

出力形式（この形式を厳密に守ること）:
[
  {
    "name": "エンティティ名",
    "type": "エンティティタイプ",
    "aliases": ["別名1", "別名2"],
    "metadata": {
      "role": "役割（オプション）",
      "department": "部署（オプション）"
    }
  }
]

JSON以外の文字は一切含めないでください。`
    : `あなたはテキストからエンティティ（登場人物・モノ）を抽出する専門家です。
以下のテキストから、以下のタイプのエンティティを抽出してください：

- person: 人（顧客、社員、担当者など）
- company: 会社（トヨタ、CTC、OpenAIなど）
- product: 製品（ChatGPT、GPU、ERPなど）
- project: プロジェクト
- organization: 組織（部署、チームなど）
- location: 場所
- technology: 技術・ツール
- other: その他

結果はJSON形式で返してください：
[
  {
    "name": "エンティティ名",
    "type": "エンティティタイプ",
    "aliases": ["別名1", "別名2"],
    "metadata": {
      "role": "役割（オプション）",
      "department": "部署（オプション）"
    }
  }
]`;

  const userPrompt = `以下のテキストからエンティティを抽出してください：

タイトル: ${title}
内容: ${content.substring(0, 2000)}`;

  try {
    const result = await callGPTAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], model);

    // JSONをパース
    let entities: any[] = [];
    try {
      // JSONコードブロックを除去（より堅牢な方法）
      let jsonStr = result.trim();
      
      // すべてのバッククォートを除去（マークダウンのコードブロック記号）
      // 複数行にわたるコードブロックを処理
      jsonStr = jsonStr.replace(/```json\s*/gi, ''); // ```json を除去（大文字小文字を区別しない）
      jsonStr = jsonStr.replace(/```\s*/g, ''); // ``` を除去
      jsonStr = jsonStr.replace(/\s*```/g, ''); // 末尾の ``` を除去
      jsonStr = jsonStr.replace(/`/g, ''); // 残っているバッククォートをすべて除去
      
      // JSONの開始位置を探す（[ または {）
      const startIndex = jsonStr.search(/[\[\{]/);
      if (startIndex !== -1) {
        jsonStr = jsonStr.substring(startIndex);
      }
      
      // JSONの終了位置を探す（対応する ] または }）
      let braceCount = 0;
      let bracketCount = 0;
      let endIndex = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        // 文字列内かどうかを追跡（エスケープを考慮）
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        // 文字列外でのみ括弧をカウント
        if (!inString) {
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          
          // 最初の文字が [ の場合は ] で終わる、{ の場合は } で終わる
          if (jsonStr[0] === '[' && bracketCount === 0 && i > 0) {
            endIndex = i + 1;
            break;
          }
          if (jsonStr[0] === '{' && braceCount === 0 && i > 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      // 終了位置が見つからない場合、または文字列が途中で切れている場合は、可能な限り修復を試みる
      if (endIndex === -1 || inString) {
        // 文字列が途中で切れている場合、最後の閉じ括弧を探す
        let lastBracketIndex = jsonStr.lastIndexOf(']');
        let lastBraceIndex = jsonStr.lastIndexOf('}');
        
        if (jsonStr[0] === '[' && lastBracketIndex > 0) {
          endIndex = lastBracketIndex + 1;
        } else if (jsonStr[0] === '{' && lastBraceIndex > 0) {
          endIndex = lastBraceIndex + 1;
        } else {
          // 修復できない場合は、最後の有効な閉じ括弧までを使用
          endIndex = Math.max(lastBracketIndex, lastBraceIndex) + 1;
          if (endIndex <= 0) {
            throw new Error('JSONの終了位置が見つかりません');
          }
        }
        
        // 途中で切れた文字列を修復（最後のオブジェクトを閉じる）
        if (inString) {
          jsonStr = jsonStr.substring(0, endIndex);
          // 最後のオブジェクトが不完全な場合、閉じ括弧を追加
          let lastOpenBrace = jsonStr.lastIndexOf('{');
          let lastCloseBrace = jsonStr.lastIndexOf('}');
          if (lastOpenBrace > lastCloseBrace) {
            // 最後のオブジェクトが閉じられていない場合、閉じ括弧を追加
            jsonStr = jsonStr.substring(0, endIndex) + '}';
            // 配列も閉じる必要がある場合
            if (jsonStr[0] === '[') {
              jsonStr += ']';
            }
          }
        }
      }
      
      if (endIndex !== -1 && endIndex <= jsonStr.length) {
        jsonStr = jsonStr.substring(0, endIndex);
      }
      
      // 最終的なクリーンアップ
      jsonStr = jsonStr.trim();
      
      // 不完全なJSONを修復（最後のオブジェクトが不完全な場合）
      if (jsonStr.endsWith(',')) {
        jsonStr = jsonStr.slice(0, -1);
      }
      
      // JSONパース
      entities = JSON.parse(jsonStr);
    } catch (parseError: any) {
      console.warn('エンティティ抽出結果のパースエラー:', parseError);
      console.warn('パース対象の文字列（最初の1000文字）:', result.substring(0, 1000));
      console.warn('パース対象の文字列（最後の500文字）:', result.substring(Math.max(0, result.length - 500)));
      console.warn('パース対象の文字列（全体の長さ）:', result.length);
      // フォールバック: 簡易的な抽出を試みる
      return [];
    }

    // Entity型に変換（IDとタイムスタンプは後で付与）
    const now = new Date().toISOString();
    return entities
      .filter((e: any) => e.name && e.type)
      .map((e: any) => ({
        name: e.name.trim(),
        type: e.type as EntityType,
        aliases: e.aliases || [],
        metadata: e.metadata || {},
      } as Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>))
      .map((e, index) => ({
        ...e,
        id: `entity_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
      } as Entity));
  } catch (error) {
    console.error('❌ エンティティ抽出エラー:', error);
    return [];
  }
}

/**
 * リレーションを抽出
 */
export async function extractRelations(
  title: string,
  content: string,
  entities: Entity[],
  model: string = 'gpt-4o-mini'
): Promise<Relation[]> {
  if (entities.length === 0) {
    return [];
  }

  const entityList = entities.map(e => `- ${e.name} (${e.type})`).join('\n');

  // ローカルモデルかGPT-5シリーズかどうかを判定
  const isLocalModel = model.startsWith('qwen') || 
                       model.startsWith('llama') || 
                       model.startsWith('mistral') ||
                       model.includes(':latest') ||
                       model.includes(':instruct');
  const isGPT5 = model.startsWith('gpt-5');

  const systemPrompt = (isLocalModel || isGPT5)
    ? `あなたはテキストからエンティティ間の関係性を抽出する専門家です。
以下のエンティティリストとテキストから、エンティティ間の関係性を抽出してください。

**リレーションタイプ:**
- subsidiary: 「AはBの子会社」
- uses: 「CはDを導入」
- invests: 「EはFに出資」
- employs: 「GはHを雇用」
- partners: 「IはJと提携」
- competes: 「KはLと競合」
- supplies: 「MはNに供給」
- owns: 「OはPを所有」
- located-in: 「QはRに所在」
- works-for: 「SはTで働く」
- manages: 「UはVを管理」
- reports-to: 「WはXに報告」
- related-to: 「YはZに関連」（汎用的な関係）
- other: その他

**重要: 結果は必ずJSON形式の配列で返してください。説明文やマークダウンは一切不要です。JSONのみを返してください。必ず完全なJSONを返してください（途中で切れないようにしてください）。**

出力形式（この形式を厳密に守ること）:
[
  {
    "sourceEntityName": "起点エンティティ名",
    "targetEntityName": "終点エンティティ名",
    "relationType": "リレーションタイプ",
    "description": "自然言語での説明（例: AはBの子会社）",
    "confidence": 0.9
  }
]

JSON以外の文字は一切含めないでください。配列は必ず ] で閉じ、各オブジェクトは必ず } で閉じてください。`
    : `あなたはテキストからエンティティ間の関係性を抽出する専門家です。
以下のエンティティリストとテキストから、エンティティ間の関係性を抽出してください。

**リレーションタイプ:**
- subsidiary: 「AはBの子会社」
- uses: 「CはDを導入」
- invests: 「EはFに出資」
- employs: 「GはHを雇用」
- partners: 「IはJと提携」
- competes: 「KはLと競合」
- supplies: 「MはNに供給」
- owns: 「OはPを所有」
- located-in: 「QはRに所在」
- works-for: 「SはTで働く」
- manages: 「UはVを管理」
- reports-to: 「WはXに報告」
- related-to: 「YはZに関連」（汎用的な関係）
- other: その他

結果はJSON形式で返してください。必ず完全なJSONを返してください（途中で切れないようにしてください）：
[
  {
    "sourceEntityName": "起点エンティティ名",
    "targetEntityName": "終点エンティティ名",
    "relationType": "リレーションタイプ",
    "description": "自然言語での説明（例: AはBの子会社）",
    "confidence": 0.9
  }
]

重要: JSONは必ず完全な形式で返してください。配列は必ず ] で閉じ、各オブジェクトは必ず } で閉じてください。`;

  const userPrompt = `以下のエンティティとテキストから関係性を抽出してください：

**エンティティリスト:**
${entityList}

**テキスト:**
タイトル: ${title}
内容: ${content.substring(0, 2000)}`;

  try {
    const result = await callGPTAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], model);

    // JSONをパース
    let relations: any[] = [];
    try {
      // JSONコードブロックを除去（より堅牢な方法）
      let jsonStr = result.trim();
      
      // すべてのバッククォートを除去（マークダウンのコードブロック記号）
      // 複数行にわたるコードブロックを処理
      jsonStr = jsonStr.replace(/```json\s*/gi, ''); // ```json を除去（大文字小文字を区別しない）
      jsonStr = jsonStr.replace(/```\s*/g, ''); // ``` を除去
      jsonStr = jsonStr.replace(/\s*```/g, ''); // 末尾の ``` を除去
      jsonStr = jsonStr.replace(/`/g, ''); // 残っているバッククォートをすべて除去
      
      // JSONの開始位置を探す（[ または {）
      const startIndex = jsonStr.search(/[\[\{]/);
      if (startIndex !== -1) {
        jsonStr = jsonStr.substring(startIndex);
      }
      
      // JSONの終了位置を探す（対応する ] または }）
      let braceCount = 0;
      let bracketCount = 0;
      let endIndex = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        // 文字列内かどうかを追跡（エスケープを考慮）
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        // 文字列外でのみ括弧をカウント
        if (!inString) {
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          
          // 最初の文字が [ の場合は ] で終わる、{ の場合は } で終わる
          if (jsonStr[0] === '[' && bracketCount === 0 && i > 0) {
            endIndex = i + 1;
            break;
          }
          if (jsonStr[0] === '{' && braceCount === 0 && i > 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      // 終了位置が見つからない場合、または文字列が途中で切れている場合は、可能な限り修復を試みる
      if (endIndex === -1 || inString) {
        console.warn('⚠️ JSONが不完全です。修復を試みます...');
        
        // 文字列が途中で切れている場合、最後の完全なオブジェクトを探す
        // 配列内の各オブジェクトを個別にパースできるようにする
        let lastCompleteObjectEnd = -1;
        let currentBraceCount = 0;
        let currentBracketCount = 0;
        let currentInString = false;
        let currentEscapeNext = false;
        
        // 配列の開始位置を確認
        if (jsonStr[0] === '[') {
          currentBracketCount = 1;
        }
        
        // 最後の完全なオブジェクトの終了位置を探す
        for (let i = 1; i < jsonStr.length; i++) {
          const char = jsonStr[i];
          
          if (currentEscapeNext) {
            currentEscapeNext = false;
            continue;
          }
          if (char === '\\') {
            currentEscapeNext = true;
            continue;
          }
          if (char === '"') {
            currentInString = !currentInString;
            continue;
          }
          
          if (!currentInString) {
            if (char === '{') currentBraceCount++;
            if (char === '}') {
              currentBraceCount--;
              // オブジェクトが閉じられた時点で、その位置を記録
              if (currentBraceCount === 0 && jsonStr[i + 1] === ',') {
                lastCompleteObjectEnd = i + 1; // カンマも含める
              } else if (currentBraceCount === 0) {
                lastCompleteObjectEnd = i + 1;
              }
            }
            if (char === '[') currentBracketCount++;
            if (char === ']') currentBracketCount--;
          }
        }
        
        // 最後の完全なオブジェクトまでを使用
        if (lastCompleteObjectEnd > 0) {
          jsonStr = jsonStr.substring(0, lastCompleteObjectEnd);
          // 最後のカンマを除去
          if (jsonStr.endsWith(',')) {
            jsonStr = jsonStr.slice(0, -1);
          }
          // 配列を閉じる
          if (jsonStr[0] === '[') {
            jsonStr += ']';
          }
          console.log('✅ 不完全なJSONを修復しました。最後の完全なオブジェクトまでを使用します。');
        } else {
          // 修復できない場合は、最後の閉じ括弧を探す
          let lastBracketIndex = jsonStr.lastIndexOf(']');
          let lastBraceIndex = jsonStr.lastIndexOf('}');
          
          if (jsonStr[0] === '[' && lastBracketIndex > 0) {
            endIndex = lastBracketIndex + 1;
            jsonStr = jsonStr.substring(0, endIndex);
          } else if (jsonStr[0] === '{' && lastBraceIndex > 0) {
            endIndex = lastBraceIndex + 1;
            jsonStr = jsonStr.substring(0, endIndex);
          } else {
            // 修復できない場合は、エラーをスロー
            throw new Error('JSONの終了位置が見つかりません。レスポンスが途中で切れている可能性があります。');
          }
        }
      } else {
        if (endIndex !== -1 && endIndex <= jsonStr.length) {
          jsonStr = jsonStr.substring(0, endIndex);
        }
      }
      
      // 最終的なクリーンアップ
      jsonStr = jsonStr.trim();
      
      // 不完全なJSONを修復（最後のオブジェクトが不完全な場合）
      if (jsonStr.endsWith(',')) {
        jsonStr = jsonStr.slice(0, -1);
      }
      
      // JSONパース
      relations = JSON.parse(jsonStr);
      console.log(`✅ リレーション抽出成功: ${relations.length}件`);
    } catch (parseError: any) {
      console.warn('リレーション抽出結果のパースエラー:', parseError);
      console.warn('パース対象の文字列（最初の1000文字）:', result.substring(0, 1000));
      console.warn('パース対象の文字列（最後の500文字）:', result.substring(Math.max(0, result.length - 500)));
      console.warn('パース対象の文字列（全体の長さ）:', result.length);
      return [];
    }

    // エンティティ名からタイプ情報を除去する関数（例: "Merge (company)" → "Merge"）
    const normalizeEntityName = (name: string): string => {
      // 末尾のタイプ情報（例: "(company)", "(product)"など）を除去
      return name.replace(/\s*\([^)]+\)\s*$/, '').trim();
    };

    // エンティティ名からIDをマッピング（大文字小文字を無視、タイプ情報も除去）
    const entityMap = new Map<string, string>();
    const entityNameToIdMap = new Map<string, string>(); // 大文字小文字を無視したマッピング
    const normalizedEntityNameToIdMap = new Map<string, string>(); // タイプ情報を除去したマッピング
    
    entities.forEach(e => {
      entityMap.set(e.name, e.id);
      entityNameToIdMap.set(e.name.toLowerCase(), e.id);
      // タイプ情報を除去した名前でもマッピング
      const normalizedName = normalizeEntityName(e.name);
      if (normalizedName !== e.name) {
        normalizedEntityNameToIdMap.set(normalizedName.toLowerCase(), e.id);
      }
    });
    
    console.log(`📊 エンティティマップ: ${entityMap.size}件`, Array.from(entityMap.keys()));

    // Relation型に変換（IDとタイムスタンプは後で付与）
    const now = new Date().toISOString();
    const mappedRelations = relations
      .filter((r: any) => {
        if (!r.sourceEntityName || !r.targetEntityName || !r.relationType) {
          console.warn('⚠️ 不完全なリレーションをスキップ:', r);
          return false;
        }
        return true;
      })
      .map((r: any) => {
        // エンティティ名を正規化（タイプ情報を除去）
        const normalizedSourceName = normalizeEntityName(r.sourceEntityName);
        const normalizedTargetName = normalizeEntityName(r.targetEntityName);
        
        // まず正確な名前で検索、見つからない場合は正規化した名前で検索、最後に大文字小文字を無視して検索
        let sourceId = entityMap.get(r.sourceEntityName);
        let targetId = entityMap.get(r.targetEntityName);
        
        if (!sourceId) {
          sourceId = entityMap.get(normalizedSourceName);
        }
        if (!targetId) {
          targetId = entityMap.get(normalizedTargetName);
        }
        
        if (!sourceId) {
          sourceId = entityNameToIdMap.get(r.sourceEntityName?.toLowerCase() || '');
        }
        if (!targetId) {
          targetId = entityNameToIdMap.get(r.targetEntityName?.toLowerCase() || '');
        }
        
        if (!sourceId) {
          sourceId = normalizedEntityNameToIdMap.get(normalizedSourceName.toLowerCase());
        }
        if (!targetId) {
          targetId = normalizedEntityNameToIdMap.get(normalizedTargetName.toLowerCase());
        }

        if (!sourceId || !targetId) {
          console.warn('⚠️ エンティティIDが見つかりません:', {
            sourceEntityName: r.sourceEntityName,
            normalizedSourceName: normalizedSourceName,
            targetEntityName: r.targetEntityName,
            normalizedTargetName: normalizedTargetName,
            availableEntities: Array.from(entityMap.keys()),
            availableEntitiesLowercase: Array.from(entityNameToIdMap.keys()),
            normalizedEntities: Array.from(normalizedEntityNameToIdMap.keys()),
          });
          return null;
        }

        return {
          sourceEntityId: sourceId,
          targetEntityId: targetId,
          relationType: r.relationType as RelationType,
          description: r.description || `${r.sourceEntityName}は${r.targetEntityName}と${r.relationType}の関係`,
          confidence: r.confidence || 0.8,
        } as Omit<Relation, 'id' | 'topicId' | 'createdAt' | 'updatedAt'>;
      })
      .filter((r): r is Omit<Relation, 'id' | 'topicId' | 'createdAt' | 'updatedAt'> => r !== null);
    
    console.log(`✅ リレーションマッピング完了: ${mappedRelations.length}件（元のリレーション: ${relations.length}件）`);
    
    return mappedRelations.map((r, index) => ({
      ...r,
      id: `relation_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      topicId: '', // topicIdは呼び出し側で設定
      createdAt: now,
      updatedAt: now,
    } as Relation));
  } catch (error) {
    console.error('❌ リレーション抽出エラー:', error);
    return [];
  }
}
