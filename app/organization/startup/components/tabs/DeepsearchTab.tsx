'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Startup, DeepSearchData } from '@/lib/orgApi';
import { saveStartup } from '@/lib/orgApi/startups';
import { generateUniqueId } from '@/lib/orgApi';
import { EditIcon, SaveIcon } from '@/components/Icons';
import { GPT_MODELS } from '@/components/AIAssistantPanel/constants';
import { getAvailableOllamaModels } from '@/lib/pageGeneration';

interface DeepsearchTabProps {
  startup: Startup | null;
  organizationId: string;
  setStartup?: (startup: Startup) => void;
}

export default function DeepsearchTab({
  startup,
  organizationId,
  setStartup,
}: DeepsearchTabProps) {
  const [content, setContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [deepSearchId, setDeepSearchId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [urlContent, setUrlContent] = useState<string>(''); // URLの内容をコピー＆ペーストするためのテキストエリア
  
  // モデル選択の状態
  const [researchModelType, setResearchModelType] = useState<'gpt' | 'local'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deepsearchResearchModelType');
      return (saved as 'gpt' | 'local') || 'gpt';
    }
    return 'gpt';
  });
  const [researchSelectedModel, setResearchSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deepsearchResearchSelectedModel');
      return saved || 'gpt-5-mini';
    }
    return 'gpt-5-mini';
  });
  const [localModels, setLocalModels] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingLocalModels, setLoadingLocalModels] = useState(false);

  // 保存されたDeepsearchデータを読み込む
  useEffect(() => {
    if (!startup) return;

    if (startup.deepSearch) {
      const saved = startup.deepSearch;
      console.log('📖 [DeepsearchTab] 保存されたデータを読み込み:', {
        id: saved.id,
        contentLength: saved.content?.length || 0,
      });
      setDeepSearchId(saved.id);
      setContent(saved.content || '');
    } else {
      console.log('📖 [DeepsearchTab] 保存されたデータなし');
      if (deepSearchId) {
        console.log('📖 [DeepsearchTab] 新しいstartupにデータなし、IDをクリア');
        setDeepSearchId(null);
      }
    }
  }, [startup?.id, startup?.deepSearch]);

  // ローカルモデルを読み込む
  useEffect(() => {
    if (researchModelType === 'local') {
      loadLocalModels();
    }
  }, [researchModelType]);

  const loadLocalModels = async () => {
    setLoadingLocalModels(true);
    try {
      const models = await getAvailableOllamaModels();
      if (models.length > 0) {
        const formattedModels = models.map(model => {
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
            value: model.name,
            label: label,
          };
        });
        setLocalModels(formattedModels);
        if (formattedModels.length > 0 && !researchSelectedModel.startsWith('gpt')) {
          setResearchSelectedModel(formattedModels[0].value);
        }
      } else {
        setLocalModels([]);
      }
    } catch (error) {
      console.error('ローカルモデルの取得エラー:', error);
      setLocalModels([]);
    } finally {
      setLoadingLocalModels(false);
    }
  };

  // モデルタイプが変更されたら、デフォルトモデルを設定
  useEffect(() => {
    if (researchModelType === 'gpt') {
      setResearchSelectedModel('gpt-5-mini');
      if (typeof window !== 'undefined') {
        localStorage.setItem('deepsearchResearchSelectedModel', 'gpt-5-mini');
      }
    } else if (researchModelType === 'local' && localModels.length > 0) {
      setResearchSelectedModel(localModels[0].value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('deepsearchResearchSelectedModel', localModels[0].value);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('deepsearchResearchModelType', researchModelType);
    }
  }, [researchModelType, localModels]);

  // 選択されたモデルが変更されたら保存
  useEffect(() => {
    if (researchSelectedModel && typeof window !== 'undefined') {
      localStorage.setItem('deepsearchResearchSelectedModel', researchSelectedModel);
    }
  }, [researchSelectedModel]);

  // 簡易調査を実行
  const handleSimpleResearch = async () => {
    if (!startup) {
      alert('スタートアップ情報がありません');
      return;
    }

    const startupName = startup.title || '';
    const hpUrl = startup.hpUrl || '';

    if (!startupName && !hpUrl) {
      alert('スタートアップ名またはHP URLが必要です');
      return;
    }

    try {
      setIsResearching(true);

      // 選択されたモデルを使用
      const aiModelType = researchModelType;
      const aiSelectedModel = researchSelectedModel;

      // システムプロンプト
      const systemPrompt = `あなたはスタートアップの情報を調査・分析する専門家です。
提供されたスタートアップ名とHP URLから、以下の項目について徹底的に調査し、マークダウン形式で結果をまとめてください。

**重要な指示:**
- モデルがWeb検索機能やブラウザ機能を持っている場合は、積極的に活用してください。
- 提供されたURLに関する情報を、Web検索や知識ベースから可能な限り収集してください。
- 一般的な知識ベースだけでなく、最新の情報を取得するためにWeb検索を優先的に使用してください。
- 複数の情報源から情報を収集し、可能な限り詳細な情報を提供してください。

**調査項目:**
1. 会社概要（設立年、所在地、代表者、従業員数など）
2. ミッションとビジョン
3. 製品・サービス概要（主要機能、ターゲット顧客、提供価値）
4. 出資VC（主要な出資元VC、投資ラウンド）
5. ファンドレイズの状況（シリーズ、調達金額、最終調達時期）
6. 競合他社・類似製品（主要な競合、差別化ポイント）

**出力形式:**
マークダウン形式で、見出し（##）を使って各項目を整理してください。
各項目について、可能な限り詳細な情報を提供してください。
情報が見つからない場合は「情報が見つかりませんでした」と記載してください。
URLが提供されている場合は、そのURLに関する情報を必ず含めてください。`;

      // ユーザープロンプト
      const userPrompt = `以下のスタートアップについて、徹底的に調査してください。

**スタートアップ名:** ${startupName || '(未設定)'}
**HP URL:** ${hpUrl || '(未設定)'}

**調査指示:**
${hpUrl ? `
1. 提供されたHP URL（${hpUrl}）に関する情報を、Web検索機能や知識ベースを活用して収集してください。
2. 以下の検索キーワードで情報を収集してください：
   - "${startupName} site:${hpUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}" （サイト内検索）
   - "${startupName} ${hpUrl}" （スタートアップ名とURLの組み合わせ）
   - "${startupName} 会社概要" または "${startupName} about"
   - "${startupName} 製品" または "${startupName} product"
   - "${startupName} サービス" または "${startupName} service"
   - "${startupName} ファンドレイズ" または "${startupName} funding"
   - "${startupName} VC 投資" または "${startupName} venture capital"
   - "${startupName} 競合" または "${startupName} competitor"
3. 以下の外部ソースからも情報を収集してください：
   - Crunchbase: "${startupName} Crunchbase"
   - LinkedIn: "${startupName} LinkedIn"
   - TechCrunch: "${startupName} TechCrunch"
   - プレスリリース: "${startupName} press release"
   - ニュース記事: "${startupName} news"
4. URLのドメイン名（${hpUrl.replace(/^https?:\/\//, '').split('/')[0]}）から、会社名やサービス名を推測し、それも検索に活用してください。
` : `
1. スタートアップ名「${startupName}」でWeb検索を実行してください。
2. 以下のキーワードで追加検索を行ってください：
   - "${startupName} 会社概要" または "${startupName} about"
   - "${startupName} 製品" または "${startupName} product"
   - "${startupName} サービス" または "${startupName} service"
   - "${startupName} ファンドレイズ" または "${startupName} funding"
   - "${startupName} VC 投資" または "${startupName} venture capital"
   - "${startupName} 競合" または "${startupName} competitor"
3. 以下の外部ソースからも情報を収集してください：
   - Crunchbase: "${startupName} Crunchbase"
   - LinkedIn: "${startupName} LinkedIn"
   - TechCrunch: "${startupName} TechCrunch"
   - プレスリリース: "${startupName} press release"
   - ニュース記事: "${startupName} news"
`}

**重要:** モデルがWeb検索機能を持っている場合は、上記の検索キーワードを使用して積極的にWeb検索を実行してください。
Web検索ができない場合は、知識ベースから可能な限り詳細な情報を提供してください。

上記の情報を基に、指定された調査項目について、可能な限り詳細な情報を含めてマークダウン形式でまとめてください。
各項目について、具体的な数値、日付、固有名詞を含めてください。
情報源が分かる場合は、その情報源も記載してください（例：「Crunchbaseによると...」「TechCrunchの記事によると...」）。`;

      // AI APIを呼び出し
      const isLocalModel = aiModelType === 'local' ||
                           aiSelectedModel.startsWith('qwen') || 
                           aiSelectedModel.startsWith('llama') || 
                           aiSelectedModel.startsWith('mistral') ||
                           aiSelectedModel.includes(':latest') ||
                           aiSelectedModel.includes(':instruct');

      let responseText = '';
      if (isLocalModel) {
        // Ollama API
        const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiSelectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 4000,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama APIエラー: ${response.status}`);
        }

        const data = await response.json();
        responseText = data.message?.content?.trim() || '';
      } else {
        // OpenAI API
        let apiKey: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            const { getAPIKey } = await import('@/lib/security');
            apiKey = getAPIKey('openai') || undefined;
          } catch (error) {
            console.warn('APIキーの取得に失敗:', error);
          }
        }

        if (!apiKey) {
          throw new Error('OpenAI APIキーが設定されていません');
        }

        const apiUrl = 'https://api.openai.com/v1/chat/completions';
        
        // モデルによって適切なパラメータを使用
        // 新しいモデル（o1、o3、gpt-5など）はmax_completion_tokens、temperatureは1のみサポート
        // gpt-5、gpt-5.1、gpt-5-mini、gpt-5-nano、gpt-5-pro、gpt-5.1-chat-latest、gpt-5-chat-latest、gpt-5.1-codex、gpt-5-codex など
        const isNewModel = aiSelectedModel.includes('o1') || 
                          aiSelectedModel.includes('o3') ||
                          aiSelectedModel.startsWith('gpt-5') ||
                          aiSelectedModel.startsWith('gpt-4.1');
        
        // リクエストを送信する関数（タイムアウト付き）
        // タイムアウト時間を延長（5分=300秒）: 長い調査結果を生成する場合に時間がかかる可能性があるため
        const makeRequest = async (useTemperature: boolean, useMaxTokens: boolean, useMaxCompletionTokens: boolean, timeoutMs: number = 300000) => {
          const requestBody: any = {
            model: aiSelectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          };
          
          if (useTemperature && !isNewModel) {
            requestBody.temperature = 0.7;
          }
          
          if (useMaxTokens && !isNewModel) {
            requestBody.max_tokens = 4000;
          }
          
          if (useMaxCompletionTokens || isNewModel) {
            requestBody.max_completion_tokens = 4000;
          }
          
          // リクエストボディをログに出力（デバッグ用）
          console.log('🔍 [簡易調査] リクエスト送信:', {
            model: aiSelectedModel,
            useTemperature,
            useMaxTokens,
            useMaxCompletionTokens,
            requestBody: {
              ...requestBody,
              messages: requestBody.messages.map((m: any) => ({
                role: m.role,
                contentLength: m.content?.length || 0,
              })),
            },
          });
          
          // AbortControllerでタイムアウトを実装
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          
          try {
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
          } catch (error: any) {
            clearTimeout(timeoutId);
            // タイムアウトエラーの場合
            if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('timed out')) {
              throw new Error('リクエストがタイムアウトしました（5分）。処理に時間がかかっている可能性があります。しばらく待ってから再試行してください。');
            }
            // ネットワークエラーの場合
            if (error.message === 'Load failed' || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
              throw new Error('ネットワークエラーが発生しました。インターネット接続を確認してください。');
            }
            throw error;
          }
        };
        
        // エラーメッセージを取得する関数（詳細情報を含む）
        const getErrorMessage = async (response: Response): Promise<{ message: string; fullError?: any }> => {
          try {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || '';
            return { message: errorMessage, fullError: errorData };
          } catch {
            return { message: '' };
          }
        };
        
        // 最初のリクエスト: 新しいモデルの場合はtemperatureを除外、古いモデルの場合は両方設定
        let response = await makeRequest(!isNewModel, !isNewModel, isNewModel);
        
        // エラーが発生した場合のフォールバック処理
        if (!response.ok) {
          const errorInfo = await getErrorMessage(response);
          const errorMessage = errorInfo.message;
          
          // エラー詳細をログに出力
          console.error('❌ [簡易調査] APIエラー:', {
            status: response.status,
            statusText: response.statusText,
            errorMessage: errorMessage,
            fullError: errorInfo.fullError,
          });
          
          // temperatureエラーが発生した場合
          if (errorMessage.includes('temperature')) {
            // temperatureを除外して再試行
            // max_tokensエラーも含まれている場合は、max_completion_tokensを試す
            if (errorMessage.includes('max_tokens') || errorMessage.includes('max_completion_tokens') || isNewModel) {
              response = await makeRequest(false, false, true);
            } else {
              // max_tokensを使用
              response = await makeRequest(false, true, false);
            }
          }
          // max_tokensエラーが発生した場合（temperatureエラーではない）
          else if (errorMessage.includes('max_tokens') && (errorMessage.includes('max_completion_tokens') || errorMessage.includes('not supported'))) {
            // max_completion_tokensを使用、temperatureは設定しない（新しいモデルの可能性があるため）
            response = await makeRequest(false, false, true);
          }
          
          // まだエラーが発生している場合
          if (!response.ok) {
            const finalErrorInfo = await getErrorMessage(response);
            const finalErrorMessage = finalErrorInfo.message;
            
            // エラー詳細をログに出力
            console.error('❌ [簡易調査] 再試行後もエラー:', {
              status: response.status,
              statusText: response.statusText,
              errorMessage: finalErrorMessage,
              fullError: finalErrorInfo.fullError,
            });
            
            // 最後の試行: temperatureとmax_tokensを除外し、max_completion_tokensのみ使用
            if (finalErrorMessage.includes('temperature') || finalErrorMessage.includes('max_tokens')) {
              response = await makeRequest(false, false, true);
            }
            
            // それでもエラーが発生している場合
            if (!response.ok) {
              const lastErrorInfo = await getErrorMessage(response);
              const lastErrorMessage = lastErrorInfo.message;
              
              // 最終エラー詳細をログに出力
              console.error('❌ [簡易調査] 最終エラー:', {
                status: response.status,
                statusText: response.statusText,
                errorMessage: lastErrorMessage,
                fullError: lastErrorInfo.fullError,
              });
              
              // エラーメッセージを構築
              let detailedError = `OpenAI APIエラー: ${response.status}`;
              if (lastErrorMessage) {
                detailedError += ` - ${lastErrorMessage}`;
              }
              if (lastErrorInfo.fullError?.error?.type) {
                detailedError += ` (タイプ: ${lastErrorInfo.fullError.error.type})`;
              }
              if (lastErrorInfo.fullError?.error?.code) {
                detailedError += ` (コード: ${lastErrorInfo.fullError.error.code})`;
              }
              if (!lastErrorMessage) {
                detailedError += ' - 不明なエラー';
              }
              
              throw new Error(detailedError);
            }
          }
        }

        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content?.trim() || '';
      }

      if (!responseText) {
        throw new Error('調査結果が取得できませんでした');
      }

      // 調査結果をcontentに設定し、編集モードにする
      setContent(responseText);
      setIsEditing(true);
      alert('簡易調査が完了しました。結果を確認して保存してください。');
    } catch (error: any) {
      console.error('簡易調査エラー:', error);
      let errorMessage = '不明なエラー';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.name === 'AbortError') {
        errorMessage = 'リクエストがタイムアウトしました。時間をかけて再試行してください。';
      } else if (error?.message === 'Load failed' || error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      }
      
      alert(`簡易調査に失敗しました: ${errorMessage}`);
    } finally {
      setIsResearching(false);
    }
  };

  // Deepsearchデータを保存
  const saveDeepSearchData = async () => {
    if (!startup) return;
    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const deepSearchData: DeepSearchData = {
        id: deepSearchId || `deepsearch_${generateUniqueId()}`,
        content: content,
        createdAt: deepSearchId && startup.deepSearch?.createdAt
          ? startup.deepSearch.createdAt
          : now,
        updatedAt: now,
      };

      const updatedStartup = {
        ...startup,
        deepSearch: deepSearchData,
      };

      console.log('💾 [DeepsearchTab] 保存開始:', {
        startupId: startup.id,
        deepSearchId: deepSearchData.id,
        contentLength: deepSearchData.content.length,
      });

      await saveStartup(updatedStartup);

      setDeepSearchId(deepSearchData.id);

      if (setStartup) {
        setStartup(updatedStartup as Startup);
      }

      setIsEditing(false);
      alert('Deepsearchデータを保存しました');
    } catch (error) {
      console.error('Deepsearchデータの保存に失敗しました:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A', margin: 0, marginBottom: '4px' }}>
            Deepsearch
          </h2>
          {deepSearchId && (
            <div style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace' }}>
              ID: {deepSearchId}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {!isEditing && (
            <>
              {/* モデル選択UI */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>モデルタイプ:</span>
                  <select
                    value={researchModelType}
                    onChange={(e) => {
                      const newType = e.target.value as 'gpt' | 'local';
                      setResearchModelType(newType);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('deepsearchResearchModelType', newType);
                      }
                    }}
                    disabled={isResearching}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      color: '#1A1A1A',
                      cursor: isResearching ? 'not-allowed' : 'pointer',
                      minWidth: '100px',
                      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    <option value="gpt">GPT</option>
                    <option value="local">ローカル</option>
                  </select>
                </label>
                <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>モデル:</span>
                  <select
                    value={researchSelectedModel}
                    onChange={(e) => {
                      setResearchSelectedModel(e.target.value);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('deepsearchResearchSelectedModel', e.target.value);
                      }
                    }}
                    disabled={isResearching || loadingLocalModels}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      color: '#1A1A1A',
                      cursor: isResearching || loadingLocalModels ? 'not-allowed' : 'pointer',
                      minWidth: '160px',
                      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {loadingLocalModels ? (
                      <option>読み込み中...</option>
                    ) : researchModelType === 'gpt' ? (
                      GPT_MODELS.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))
                    ) : localModels.length > 0 ? (
                      localModels.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))
                    ) : (
                      <option>モデルが見つかりません</option>
                    )}
                  </select>
                </label>
              </div>
              <button
                onClick={handleSimpleResearch}
                disabled={isResearching || !startup}
                style={{
                  padding: '10px 20px',
                  border: '1.5px solid #10B981',
                  borderRadius: '8px',
                  backgroundColor: isResearching || !startup ? '#F3F4F6' : '#FFFFFF',
                  color: isResearching || !startup ? '#9CA3AF' : '#10B981',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isResearching || !startup ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (!isResearching && startup) {
                    e.currentTarget.style.borderColor = '#059669';
                    e.currentTarget.style.backgroundColor = '#ECFDF5';
                    e.currentTarget.style.color = '#059669';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isResearching && startup) {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#10B981';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onFocus={(e) => {
                  if (!isResearching && startup) {
                    e.currentTarget.style.borderColor = '#059669';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!isResearching && startup) {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                {isResearching ? (
                  <>
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{
                        animation: 'spin 1s linear infinite',
                      }}
                    >
                      <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    調査中...
                  </>
                ) : (
                  '簡易調査'
                )}
              </button>
              <button
                onClick={() => {
                  // TODO: Deepsearchの機能を実装
                  console.log('Deepsearchボタンがクリックされました');
                }}
                style={{
                  padding: '10px 20px',
                  border: '1.5px solid #3B82F6',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#3B82F6',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.color = '#2563EB';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.color = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                Deepsearch
              </button>
            </>
          )}
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  if (startup?.deepSearch) {
                    setContent(startup.deepSearch.content || '');
                  } else {
                    setContent('');
                  }
                  setIsEditing(false);
                }}
                style={{
                  padding: '10px 20px',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3B82F6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                キャンセル
              </button>
              <button
                onClick={saveDeepSearchData}
                disabled={isSaving}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isSaving ? '#9CA3AF' : '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSaving ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onFocus={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)';
                  }
                }}
                onBlur={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                <SaveIcon size={16} color="#FFFFFF" />
                {isSaving ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '10px 20px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#6B7280',
                fontSize: '14px',
                fontWeight: '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#6B7280';
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#9CA3AF';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <EditIcon size={16} color="currentColor" />
              編集
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="マークダウン形式で入力してください..."
            style={{
              width: '100%',
              minHeight: '500px',
              padding: '16px',
              border: '1.5px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              lineHeight: '1.6',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
            }}
          />
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
            💡 マークダウン形式で記述できます。見出し、リスト、リンク、コードブロックなどが使用できます。
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '24px',
            border: '1.5px solid #E5E7EB',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            minHeight: '500px',
          }}
        >
          {content ? (
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.8',
                color: '#1A1A1A',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
              Deepsearchコンテンツが入力されていません。「編集」ボタンから追加してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

