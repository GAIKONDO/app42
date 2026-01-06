'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAvailableLocalModels } from '@/lib/localModel/getAvailableModels';
import { getAvailableLFM2Models } from '@/lib/localModel/getAvailableLFM2Models';
import { GPT_MODELS, GEMINI_MODELS, CLAUDE_MODELS } from '@/components/AIAssistantPanel/constants';
import type { TopicInfo, Startup, Category, VC, Department, Status, EngagementLevel, BizDevPhase } from '@/lib/orgApi';
import type { ModelInfo } from '@/components/AIAssistantPanel/types';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'description' | 'objective' | 'evaluation' | null;
  topics: TopicInfo[];
  localTopicIds: string[];
  selectedTopicIdsForAI: string[];
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  aiGenerationInput: string;
  setAIGenerationInput: (input: string) => void;
  aiSummaryFormat: 'auto' | 'bullet' | 'paragraph' | 'custom';
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  aiSummaryLength: number;
  setAiSummaryLength: (length: number) => void;
  aiCustomPrompt: string;
  setAiCustomPrompt: (prompt: string) => void;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | 'evaluation' | null) => void;
  setOriginalContent: (content: string | null) => void;
  localDescription: string;
  localObjective: string;
  localEvaluation: string;
  setLocalDescription: (description: string) => void;
  setLocalObjective: (objective: string) => void;
  setLocalEvaluation: (evaluation: string) => void;
  setIsEditingDescription: (isEditing: boolean) => void;
  setIsEditingObjective: (isEditing: boolean) => void;
  setIsEditingEvaluation: (isEditing: boolean) => void;
  startup: Startup | null;
  categories: Category[];
  vcs: VC[];
  departments: Department[];
  statuses: Status[];
  engagementLevels: EngagementLevel[];
  bizDevPhases: BizDevPhase[];
  // 競合比較セクションの解説用の追加プロパティ
  comparisonSectionType?: 'general' | 'function' | 'target' | null;
  comparisonSectionLabel?: string;
}

export default function AIGenerationModal({
  isOpen,
  onClose,
  target,
  topics,
  localTopicIds,
  selectedTopicIdsForAI,
  setSelectedTopicIdsForAI,
  aiGenerationInput,
  setAIGenerationInput,
  aiSummaryFormat,
  setAiSummaryFormat,
  aiSummaryLength,
  setAiSummaryLength,
  aiCustomPrompt,
  setAiCustomPrompt,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
  localDescription,
  localObjective,
  localEvaluation,
  setLocalDescription,
  setLocalObjective,
  setLocalEvaluation,
  setIsEditingDescription,
  setIsEditingObjective,
  setIsEditingEvaluation,
  startup,
  categories,
  vcs,
  departments,
  statuses,
  engagementLevels,
  bizDevPhases,
  comparisonSectionType,
  comparisonSectionLabel,
}: AIGenerationModalProps) {
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  type ModelType = 'gpt' | 'gemini' | 'claude' | 'local' | 'local-lfm';
  const [aiModelType, setAiModelType] = useState<ModelType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationModelType');
      return (saved as ModelType) || 'gpt';
    }
    return 'gpt';
  });
  const [aiSelectedModel, setAiSelectedModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiGenerationSelectedModel');
      return saved || 'gpt-5-mini';
    }
    return 'gpt-5-mini';
  });
  const [aiLocalModels, setAiLocalModels] = useState<ModelInfo[]>([]);
  const [aiLfm2Models, setAiLfm2Models] = useState<ModelInfo[]>([]);
  const [loadingAiLocalModels, setLoadingAiLocalModels] = useState(false);

  const availableAiModels: ModelInfo[] = 
    aiModelType === 'gpt' ? GPT_MODELS :
    aiModelType === 'gemini' ? GEMINI_MODELS :
    aiModelType === 'claude' ? CLAUDE_MODELS :
    aiModelType === 'local-lfm' ? aiLfm2Models :
    aiLocalModels;

  useEffect(() => {
    if (aiModelType === 'local' && isOpen) {
      loadAiLocalModels();
    } else if (aiModelType === 'local-lfm' && isOpen) {
      loadAiLfm2Models();
    }
  }, [aiModelType, isOpen]);

  // モデルタイプが変更されたら、デフォルトモデルを設定
  useEffect(() => {
    if (aiModelType === 'gpt' && GPT_MODELS.length > 0) {
      setAiSelectedModel('gpt-5-mini');
    } else if (aiModelType === 'gemini' && GEMINI_MODELS.length > 0) {
      setAiSelectedModel(GEMINI_MODELS[0].value);
    } else if (aiModelType === 'claude' && CLAUDE_MODELS.length > 0) {
      setAiSelectedModel(CLAUDE_MODELS[0].value);
    } else if (aiModelType === 'local' && aiLocalModels.length > 0) {
      setAiSelectedModel(aiLocalModels[0].value);
    } else if (aiModelType === 'local-lfm' && aiLfm2Models.length > 0) {
      setAiSelectedModel(aiLfm2Models[0].value);
    }
  }, [aiModelType, aiLocalModels, aiLfm2Models]);

  useEffect(() => {
    if (aiModelType) {
      localStorage.setItem('aiGenerationModelType', aiModelType);
    }
  }, [aiModelType]);

  useEffect(() => {
    if (aiSelectedModel) {
      localStorage.setItem('aiGenerationSelectedModel', aiSelectedModel);
    }
  }, [aiSelectedModel]);

  const loadAiLocalModels = async () => {
    setLoadingAiLocalModels(true);
    try {
      const models = await getAvailableLocalModels();
      if (models.length > 0) {
        const formattedModels: ModelInfo[] = models.map(model => {
          let label = model.name;
          if (model.name.includes(':')) {
            const [name, tag] = model.name.split(':');
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            const spacedName = formattedName.replace(/([a-z])(\d)/g, '$1 $2');
            if (tag === 'latest') {
              label = `${spacedName} (Latest)`;
            } else {
              const formattedTag = tag.replace(/(\d)([a-z])/g, (match, num, letter) => `${num}${letter.toUpperCase()}`);
              label = `${spacedName} ${formattedTag}`;
            }
          } else {
            label = model.name.charAt(0).toUpperCase() + model.name.slice(1);
          }
          return {
            value: model.model,
            label: label,
            inputPrice: '無料',
            outputPrice: '無料',
          };
        });
        setAiLocalModels(formattedModels);
      } else {
        setAiLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setAiLocalModels([]);
    } finally {
      setLoadingAiLocalModels(false);
    }
  };

  const loadAiLfm2Models = async () => {
    setLoadingAiLocalModels(true);
    try {
      const models = await getAvailableLFM2Models();
      if (models.length > 0) {
        const formattedModels: ModelInfo[] = models.map(model => ({
          value: model.model,
          label: model.name,
          inputPrice: '無料',
          outputPrice: '無料',
        }));
        setAiLfm2Models(formattedModels);
      } else {
        setAiLfm2Models([]);
      }
    } catch (error) {
      console.error('LFM2モデルの取得エラー:', error);
      setAiLfm2Models([]);
    } finally {
      setLoadingAiLocalModels(false);
    }
  };

  const handleClose = () => {
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
    setAIGenerationInput('');
    setSelectedTopicIdsForAI([]);
    setAiSummaryFormat('auto');
    setAiSummaryLength(500);
    setAiCustomPrompt('');
    onClose();
  };

  const handleApply = () => {
    if (target === 'description') {
      setLocalDescription(aiGeneratedContent || '');
      setIsEditingDescription(true);
    } else if (target === 'objective') {
      setLocalObjective(aiGeneratedContent || '');
      setIsEditingObjective(true);
    } else if (target === 'evaluation') {
      setLocalEvaluation(aiGeneratedContent || '');
      setIsEditingEvaluation(true);
    }
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
    handleClose();
  };

  const generateAISummary = async (inputText: string, selectedTopics: TopicInfo[]): Promise<string> => {
    try {
      setIsAIGenerating(true);
      
      // トピックの内容を結合
      const topicsContent = selectedTopics.map(topic => `【${topic.title}】\n${topic.content}`).join('\n\n');
      
      // スタートアップの一般情報を取得
      let startupInfo = '';
      if (startup) {
        const infoParts: string[] = [];
        infoParts.push(`スタートアップ名: ${startup.title}`);
        
        if (startup.categoryIds && startup.categoryIds.length > 0) {
          const categoryNames = startup.categoryIds
            .map(id => categories.find(c => c.id === id)?.title)
            .filter(Boolean)
            .join('、');
          if (categoryNames) {
            infoParts.push(`カテゴリ: ${categoryNames}`);
          }
        }
        
        if (startup.status) {
          const statusName = statuses.find(s => s.id === startup.status)?.title || startup.status;
          infoParts.push(`ステータス: ${statusName}`);
        }
        
        if (startup.engagementLevel) {
          const engagementName = engagementLevels.find(e => e.id === startup.engagementLevel)?.title || startup.engagementLevel;
          infoParts.push(`エンゲージメントレベル: ${engagementName}`);
        }
        
        if (startup.bizDevPhase) {
          const phaseName = bizDevPhases.find(p => p.id === startup.bizDevPhase)?.title || startup.bizDevPhase;
          infoParts.push(`Biz-Devフェーズ: ${phaseName}`);
        }
        
        if (startup.relatedVCS && startup.relatedVCS.length > 0) {
          const vcNames = startup.relatedVCS
            .map(id => vcs.find(v => v.id === id)?.title)
            .filter(Boolean)
            .join('、');
          if (vcNames) {
            infoParts.push(`関連VC: ${vcNames}`);
          }
        }
        
        if (startup.responsibleDepartments && startup.responsibleDepartments.length > 0) {
          const deptNames = startup.responsibleDepartments
            .map(id => departments.find(d => d.id === id)?.title)
            .filter(Boolean)
            .join('、');
          if (deptNames) {
            infoParts.push(`主管事業部署: ${deptNames}`);
          }
        }
        
        if (startup.hpUrl) {
          infoParts.push(`HP URL: ${startup.hpUrl}`);
        }
        
        if (infoParts.length > 0) {
          startupInfo = `【スタートアップ基本情報】\n${infoParts.join('\n')}`;
        }
      }
      
      // 要約形式に応じた指示を生成
      let formatInstruction = '';
      switch (aiSummaryFormat) {
        case 'bullet':
          formatInstruction = `箇条書き形式で要約を作成してください。各項目は「-」または「1.」で始まる箇条書きとして出力してください。`;
          break;
        case 'paragraph':
          formatInstruction = `段落形式で要約を作成してください。複数の段落に分けて、読みやすい文章として出力してください。`;
          break;
        case 'custom':
          formatInstruction = aiCustomPrompt || '要約を作成してください。';
          break;
        case 'auto':
        default:
          formatInstruction = `以下のマークダウン記法を使用して、読みやすく構造化された要約を作成してください：
- 見出し（##, ###）でセクションを分ける
- 箇条書き（- または 1.）で重要なポイントを列挙
- **太字**で重要なキーワードを強調
- 必要に応じて段落を分けて読みやすくする`;
          break;
      }
      
      // プロンプトを作成（マークダウン形式で出力するように指示）
      // 競合比較セクションの解説の場合は、専用のシステムプロンプトを使用
      let systemPrompt: string;
      if (comparisonSectionType && comparisonSectionLabel) {
        // 競合比較セクションの解説用のシステムプロンプト
        systemPrompt = `あなたはスタートアップの競合比較分析の専門家です。競合比較マトリクスのセクション解説を作成する専門家として、提供された情報を基に、約${aiSummaryLength}文字で簡潔かつ明確な解説文をマークダウン記法で作成してください。

【重要な指示】
- この解説は「${comparisonSectionLabel}」セクションの解説文です
- スタートアップの基本情報や概要を要約するのではなく、このセクションの比較軸とマトリクスの内容を分析し、そのセクションの特徴や洞察を説明する解説文を作成してください
- 比較軸の意味や、マトリクスに記録された評価やバッジの内容を踏まえて、このセクションで比較されている観点の重要性や、各スタートアップの特徴を説明してください
- セクションの比較結果から読み取れる洞察や、このセクションで明らかになった差別化要因などを含めてください

${formatInstruction}

出力は必ずマークダウン形式で、プレーンテキストではなく、適切にフォーマットされたマークダウンとして出力してください。`;
      } else {
        // 通常の要約用のシステムプロンプト（スタートアップの概要説明など）
        systemPrompt = `あなたはビジネス文書の要約を専門とするアシスタントです。提供された情報を基に、約${aiSummaryLength}文字で簡潔かつ明確な要約をマークダウン記法で作成してください。

${formatInstruction}

出力は必ずマークダウン形式で、プレーンテキストではなく、適切にフォーマットされたマークダウンとして出力してください。`;
      }
      
      // プロンプトを構築（スタートアップ情報、概要、トピックの順）
      const promptParts: string[] = [];
      if (startupInfo) {
        promptParts.push(startupInfo);
      }
      if (inputText) {
        promptParts.push(`【概要】\n${inputText}`);
      }
      if (topicsContent) {
        promptParts.push(`【関連トピック】\n${topicsContent}`);
      }
      
      const userPrompt = `以下の情報を基に、約${aiSummaryLength}文字で要約をマークダウン形式で作成してください。\n\n${promptParts.join('\n\n')}`;
      
      // モデルタイプに応じてAPIを呼び出し
      if (aiModelType === 'gemini') {
        // Gemini APIを呼び出し
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
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
        const geminiMessages = [
          { role: 'user' as const, parts: [{ text: `[システム指示] ${systemPrompt}` }] },
          { role: 'user' as const, parts: [{ text: userPrompt }] },
        ];

        const requestBody = {
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: aiSummaryLength + 200,
          },
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiSelectedModel}:generateContent?key=${apiKey}`, {
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
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        
        if (!summary) {
          console.error('Gemini API応答:', data);
          throw new Error('AIからの応答が空でした。APIの応答を確認してください。');
        }
        
        return summary;
      } else if (aiModelType === 'claude') {
        // Claude APIを呼び出し
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
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

        const requestBody: any = {
          model: aiSelectedModel,
          messages: [
            { role: 'user', content: userPrompt }
          ],
          max_tokens: aiSummaryLength + 200,
          temperature: 0.7,
          system: systemPrompt,
        };

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
        const summary = data.content?.[0]?.text?.trim() || '';
        
        if (!summary) {
          console.error('Claude API応答:', data);
          throw new Error('AIからの応答が空でした。APIの応答を確認してください。');
        }
        
        return summary;
      } else if (aiModelType === 'local' || aiModelType === 'local-lfm') {
        // Ollama APIまたはLFM2 APIを呼び出し
        if (aiModelType === 'local-lfm') {
          // LFM2 API (LlamaCpp Server) を呼び出し
          let baseUrl: string;
          if (typeof window !== 'undefined') {
            baseUrl = localStorage.getItem('NEXT_PUBLIC_LLAMA_CPP_API_URL') || process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080';
          } else {
            baseUrl = process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080';
          }
          
          // ベースURLから/v1/chat/completionsを除く
          const cleanBaseUrl = baseUrl.replace(/\/v1\/.*$/, '').replace(/\/$/, '');
          const chatUrl = `${cleanBaseUrl}/v1/chat/completions`;
          
          // システムメッセージを最初のユーザーメッセージに統合（llama-serverの形式に合わせる）
          const messages = [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
          ];
          
          const response = await fetch(chatUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiSelectedModel,
              messages: messages,
              temperature: 0.7,
              max_tokens: aiSummaryLength + 200,
              stream: false,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`LFM2 APIエラー: ${response.status} ${response.statusText}. ${errorText}`);
          }
          
          const data = await response.json();
          console.log('LFM2 API応答:', data);
          
          const summary = data.choices?.[0]?.message?.content?.trim() || '';
          
          if (!summary) {
            console.error('LFM2 API応答（完全）:', JSON.stringify(data, null, 2));
            throw new Error('AIからの応答が空でした。APIの応答を確認してください。応答構造: ' + JSON.stringify(Object.keys(data)));
          }
          
          return summary;
        } else {
          // Ollama API
          apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiSelectedModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              stream: false,
              options: {
                temperature: 0.7,
                num_predict: aiSummaryLength + 200,
              },
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Ollama APIエラー: ${response.status} ${response.statusText}. ${errorText}`);
          }
          
          const data = await response.json();
          console.log('Ollama API応答:', data);
          
          // 複数のパターンで応答を取得
          const summary = data.message?.content?.trim() || 
                         data.content?.trim() || 
                         data.response?.trim() || '';
          
          if (!summary) {
            console.error('Ollama API応答（完全）:', JSON.stringify(data, null, 2));
            throw new Error('AIからの応答が空でした。APIの応答を確認してください。応答構造: ' + JSON.stringify(Object.keys(data)));
          }
          
          return summary;
        }
      } else {
        // OpenAI APIを呼び出し
        // APIキーを取得: 設定ページ > localStorage > 環境変数の順
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
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
        
        const requestBody: any = {
          model: aiSelectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        };
        
        if (aiSelectedModel.startsWith('gpt-5')) {
          // GPT-5シリーズでは、推論トークンとコンテンツトークンの合計がmax_completion_tokens
          // 推論に使われるトークンも考慮して、余裕を持たせる
          requestBody.max_completion_tokens = Math.max(aiSummaryLength + 500, 1500);
        } else {
          requestBody.max_tokens = aiSummaryLength + 200;
          requestBody.temperature = 0.7;
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`GPT APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        console.log('OpenAI API応答:', data);
        
        // GPT-5シリーズの場合、レスポンス構造が異なる可能性があるため、複数のパターンを試す
        let summary = '';
        const choice = data.choices?.[0];
        
        if (choice?.message?.content) {
          summary = choice.message.content.trim();
        } else if (data.content) {
          summary = typeof data.content === 'string' ? data.content.trim() : '';
        } else if (data.message?.content) {
          summary = data.message.content.trim();
        }
        
        // GPT-5シリーズでcontentが空の場合、finish_reasonを確認
        if (!summary && aiSelectedModel.startsWith('gpt-5')) {
          const finishReason = choice?.finish_reason;
          const usage = data.usage;
          
          if (finishReason === 'length') {
            const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens || 0;
            const totalTokens = usage?.completion_tokens || 0;
            throw new Error(
              `トークン制限に達しました。推論トークン: ${reasoningTokens}, 合計トークン: ${totalTokens}。` +
              `max_completion_tokensを増やすか、プロンプトを短くしてください。`
            );
          }
          
          // reasoningフィールドがあるか確認
          if (choice?.message?.reasoning) {
            console.warn('GPT-5シリーズでreasoningフィールドが見つかりましたが、contentが空です。');
          }
          
          console.error('OpenAI API応答（完全）:', JSON.stringify(data, null, 2));
          throw new Error(
            `AIからの応答が空でした。finish_reason: ${finishReason || '不明'}, ` +
            `推論トークン: ${usage?.completion_tokens_details?.reasoning_tokens || 0}。` +
            `APIの応答を確認してください。`
          );
        }
        
        if (!summary) {
          console.error('OpenAI API応答（完全）:', JSON.stringify(data, null, 2));
          throw new Error('AIからの応答が空でした。APIの応答を確認してください。応答構造: ' + JSON.stringify(Object.keys(data)));
        }
        
        return summary;
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      throw error;
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleGenerate = async () => {
    try {
      // スタートアップ情報、概要入力、またはトピックのいずれかがあれば生成可能
      const hasStartupInfo = startup && startup.title;
      const hasInput = aiGenerationInput.trim().length > 0;
      const hasTopics = selectedTopicIdsForAI.length > 0;
      
      if (!hasStartupInfo && !hasInput && !hasTopics) {
        alert('概要入力、関連トピックの選択、またはスタートアップ情報のいずれかが必要です');
        return;
      }

      const linkedTopics = topics.filter(topic => localTopicIds.includes(topic.id));
      const selectedTopics = linkedTopics.filter(topic => selectedTopicIdsForAI.includes(topic.id));
      const summary = await generateAISummary(aiGenerationInput, selectedTopics);

      const currentContent = target === 'description' ? localDescription : target === 'objective' ? localObjective : localEvaluation;
      setOriginalContent(currentContent || '');
      setAiGeneratedContent(summary);
      setAiGeneratedTarget(target);
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message || '不明なエラー'}`);
    }
  };

  if (!isOpen || !target) return null;

  const linkedTopics = topics.filter(topic => localTopicIds.includes(topic.id));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '95%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
            AIで作文 - {comparisonSectionType && comparisonSectionLabel ? `${comparisonSectionLabel}セクションの解説` : target === 'description' ? '説明' : '注力アクション'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* AIモデル選択 */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
              AIモデル選択
            </label>

            {/* モデルタイプ選択 */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {(['gpt', 'gemini', 'claude', 'local', 'local-lfm'] as const).map((type) => (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      border: `2px solid ${aiModelType === type ? '#3B82F6' : '#D1D5DB'}`,
                      borderRadius: '6px',
                      backgroundColor: aiModelType === type ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                    }}
                  >
                    <input
                      type="radio"
                      name="aiModelType"
                      value={type}
                      checked={aiModelType === type}
                      onChange={(e) => setAiModelType(e.target.value as ModelType)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>
                      {type === 'gpt' ? 'GPT' : 
                       type === 'gemini' ? 'Gemini' : 
                       type === 'claude' ? 'Claude' : 
                       type === 'local-lfm' ? 'ローカル（LFM）' : 
                       'ローカル'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* モデル選択 */}
            {(aiModelType === 'local' || aiModelType === 'local-lfm') && loadingAiLocalModels && (
              <div style={{ padding: '8px', fontSize: '12px', color: '#6B7280' }}>
                🔄 利用可能なモデルを取得中...
              </div>
            )}
            {(aiModelType === 'local' || aiModelType === 'local-lfm') && !loadingAiLocalModels && availableAiModels.length === 0 && (
              <div style={{ padding: '8px', fontSize: '12px', color: '#DC2626' }}>
                ⚠️ 利用可能な{aiModelType === 'local-lfm' ? 'LFM2' : 'ローカル'}モデルが見つかりませんでした
              </div>
            )}
            {availableAiModels.length > 0 && (
              <select
                value={aiSelectedModel}
                onChange={(e) => setAiSelectedModel(e.target.value)}
                disabled={loadingAiLocalModels}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: loadingAiLocalModels ? 'not-allowed' : 'pointer',
                }}
              >
                {availableAiModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label} {model.inputPrice !== '無料' && `(${model.inputPrice}/${model.outputPrice})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 要約形式選択 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
              要約形式
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[
                { value: 'auto', label: 'おまかせ' },
                { value: 'bullet', label: '箇条書き' },
                { value: 'paragraph', label: '説明文' },
                { value: 'custom', label: 'カスタム' },
              ].map((format) => (
                <button
                  key={format.value}
                  type="button"
                  onClick={() => setAiSummaryFormat(format.value as 'auto' | 'bullet' | 'paragraph' | 'custom')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: aiSummaryFormat === format.value ? '#111827' : '#FFFFFF',
                    color: aiSummaryFormat === format.value ? '#FFFFFF' : '#374151',
                    border: `1px solid ${aiSummaryFormat === format.value ? '#111827' : '#D1D5DB'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (aiSummaryFormat !== format.value) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (aiSummaryFormat !== format.value) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  {format.label}
                </button>
              ))}
            </div>

            {/* 文字数選択（おまかせ、箇条書き、説明文の場合） */}
            {aiSummaryFormat !== 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#6B7280' }}>
                  文字数: {aiSummaryLength}文字
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={aiSummaryLength}
                  onChange={(e) => setAiSummaryLength(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: '#E5E7EB',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                  <span>200文字</span>
                  <span>2000文字</span>
                </div>
              </div>
            )}

            {/* カスタムプロンプト入力（カスタム選択時） */}
            {aiSummaryFormat === 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                  カスタム指示（プロンプト）
                </label>
                <textarea
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  placeholder="例: 3つの主要なポイントを箇条書きで、各ポイントは2-3文で説明してください。"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </div>

          {/* 概要入力 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
              概要（任意）
            </label>
            <textarea
              value={aiGenerationInput}
              onChange={(e) => setAIGenerationInput(e.target.value)}
              placeholder="要約したい内容を入力してください（任意）"
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* リンクしている個別トピック選択 */}
          {linkedTopics.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                関連トピックを選択（任意）
              </label>
              <div
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  padding: '12px',
                }}
              >
                {linkedTopics.map((topic) => (
                  <label
                    key={topic.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      marginBottom: '8px',
                      border: selectedTopicIdsForAI.includes(topic.id) ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      borderRadius: '6px',
                      backgroundColor: selectedTopicIdsForAI.includes(topic.id) ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTopicIdsForAI.includes(topic.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTopicIdsForAI([...selectedTopicIdsForAI, topic.id]);
                        } else {
                          setSelectedTopicIdsForAI(selectedTopicIdsForAI.filter(id => id !== topic.id));
                        }
                      }}
                      style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#111827', marginBottom: '4px' }}>
                        {topic.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                        {topic.content.substring(0, 200)}{topic.content.length > 200 ? '...' : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
              リンクしている個別トピックがありません
            </div>
          )}

          {/* AI生成結果のプレビュー */}
          {aiGeneratedContent && originalContent != null && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ marginBottom: '16px', fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                AI生成結果のプレビュー
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                {/* 既存の内容 */}
                <div>
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#6B7280' }}>
                    既存の内容
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '6px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                  >
                    {originalContent ? (
                      <div
                        className="markdown-content"
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.8',
                          color: '#374151',
                        }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {originalContent}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                        内容がありません
                      </p>
                    )}
                  </div>
                </div>
                {/* AI生成結果 */}
                <div>
                  <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                    AI生成結果
                  </div>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                  >
                    <div
                      className="markdown-content"
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.8',
                        color: '#374151',
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiGeneratedContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setAiGeneratedContent(null);
                    setAiGeneratedTarget(null);
                    setOriginalContent(null);
                    setAIGenerationInput('');
                    setSelectedTopicIdsForAI([]);
                    setAiSummaryFormat('auto');
                    setAiSummaryLength(500);
                    setAiCustomPrompt('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleApply}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#111827',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#111827';
                  }}
                >
                  適用する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          {!aiGeneratedContent && (
            <button
              onClick={handleGenerate}
              disabled={isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0)}
              style={{
                padding: '10px 20px',
                backgroundColor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) ? '#9CA3AF' : '#3B82F6',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isAIGenerating || (!aiGenerationInput.trim() && selectedTopicIdsForAI.length === 0) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isAIGenerating ? (
                <>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <span>🤖</span>
                  <span>要約を生成</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

