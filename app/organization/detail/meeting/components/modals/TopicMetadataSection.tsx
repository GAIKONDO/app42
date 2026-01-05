'use client';

import type { TopicSemanticCategory, TopicImportance } from '@/types/topicMetadata';
import { generateTopicMetadata } from '@/lib/topicMetadataGeneration';
import { devLog } from '../../utils';

interface TopicMetadataSectionProps {
  topicTitle: string;
  topicContent: string;
  topicSemanticCategory: TopicSemanticCategory | '';
  topicKeywords: string;
  topicSummary: string;
  topicImportance: TopicImportance | '';
  pendingMetadata: {
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicImportance;
    keywords?: string[];
    summary?: string;
  } | null;
  topicMetadataModelType: 'gpt' | 'local' | 'local-lfm';
  topicMetadataSelectedModel: string;
  topicMetadataMode: 'overwrite' | 'merge';
  topicMetadataLocalModels: Array<{ value: string; label: string }>;
  loadingTopicMetadataLocalModels: boolean;
  isGeneratingMetadata: boolean;
  setTopicSemanticCategory: (value: TopicSemanticCategory | '') => void;
  setTopicKeywords: (value: string) => void;
  setTopicSummary: (value: string) => void;
  setTopicImportance: (value: TopicImportance | '') => void;
  setPendingMetadata: (value: {
    semanticCategory?: TopicSemanticCategory;
    importance?: TopicImportance;
    keywords?: string[];
    summary?: string;
  } | null) => void;
  setTopicMetadataModelType: (value: 'gpt' | 'local' | 'local-lfm') => void;
  setTopicMetadataSelectedModel: (value: string) => void;
  setTopicMetadataMode: (value: 'overwrite' | 'merge') => void;
  setIsGeneratingMetadata: (value: boolean) => void;
  onGenerateEntitiesAndRelations?: () => Promise<void>;
}

export default function TopicMetadataSection({
  topicTitle,
  topicContent,
  topicSemanticCategory,
  topicKeywords,
  topicSummary,
  topicImportance,
  pendingMetadata,
  topicMetadataModelType,
  topicMetadataSelectedModel,
  topicMetadataMode,
  topicMetadataLocalModels,
  loadingTopicMetadataLocalModels,
  isGeneratingMetadata,
  setTopicSemanticCategory,
  setTopicKeywords,
  setTopicSummary,
  setTopicImportance,
  setPendingMetadata,
  setTopicMetadataModelType,
  setTopicMetadataSelectedModel,
  setTopicMetadataMode,
  setIsGeneratingMetadata,
  onGenerateEntitiesAndRelations,
}: TopicMetadataSectionProps) {
  const handleGenerateMetadata = async () => {
    if (!topicTitle.trim() || !topicContent.trim()) {
      alert('タイトルと内容を入力してからAI生成を実行してください。');
      return;
    }
    
    setIsGeneratingMetadata(true);
    try {
      const metadata = await generateTopicMetadata(topicTitle, topicContent, topicMetadataSelectedModel);
      
      let finalMetadata = metadata;
      if (topicMetadataMode === 'merge') {
        finalMetadata = {
          semanticCategory: topicSemanticCategory || metadata.semanticCategory,
          importance: topicImportance || metadata.importance,
          keywords: topicKeywords && topicKeywords.trim() ? topicKeywords.split(',').map(k => k.trim()) : metadata.keywords,
          summary: topicSummary || metadata.summary,
        };
      }
      
      setPendingMetadata(finalMetadata);
      devLog('✅ AI生成完了:', finalMetadata);
      
      // エンティティとリレーションも生成
      if (onGenerateEntitiesAndRelations) {
        await onGenerateEntitiesAndRelations();
      }
    } catch (error: any) {
      console.error('❌ AI生成エラー:', error);
      alert(`メタデータの生成に失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
        メタデータ
      </div>
      
      <div>
        {/* モデル選択とモード選択 */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>タイプ:</span>
              <select
                value={topicMetadataModelType}
                onChange={(e) => {
                  const newType = e.target.value as 'gpt' | 'local' | 'local-lfm';
                  setTopicMetadataModelType(newType);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('topicMetadataGenerationModelType', newType);
                  }
                  if (newType === 'gpt') {
                    setTopicMetadataSelectedModel('gpt-5-mini');
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('topicMetadataGenerationModel', 'gpt-5-mini');
                    }
                  }
                }}
                disabled={isGeneratingMetadata}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875em',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1a1a1a',
                  cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="gpt">GPT</option>
                <option value="local">ローカル</option>
                <option value="local-lfm">ローカル（LFM）</option>
              </select>
            </label>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>AIモデル:</span>
              <select
                value={topicMetadataSelectedModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setTopicMetadataSelectedModel(newModel);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('topicMetadataGenerationModel', newModel);
                  }
                }}
                disabled={isGeneratingMetadata || loadingTopicMetadataLocalModels}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875em',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1a1a1a',
                  cursor: isGeneratingMetadata || loadingTopicMetadataLocalModels ? 'not-allowed' : 'pointer',
                  minWidth: '140px',
                }}
              >
                {loadingTopicMetadataLocalModels ? (
                  <option>読み込み中...</option>
                ) : topicMetadataModelType === 'gpt' ? (
                  <>
                    <option value="gpt-5.1">gpt-5.1</option>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5-mini">gpt-5-mini</option>
                    <option value="gpt-5-nano">gpt-5-nano</option>
                    <option value="gpt-4.1">gpt-4.1</option>
                    <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                    <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                  </>
                ) : (topicMetadataModelType === 'local' || topicMetadataModelType === 'local-lfm') && topicMetadataLocalModels.length === 0 ? (
                  <option>モデルが見つかりません</option>
                ) : (
                  topicMetadataLocalModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>モード:</span>
              <select
                value={topicMetadataMode}
                onChange={(e) => {
                  const newMode = e.target.value as 'overwrite' | 'merge';
                  setTopicMetadataMode(newMode);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('topicMetadataGenerationMode', newMode);
                  }
                }}
                disabled={isGeneratingMetadata}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.875em',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1a1a1a',
                  cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="overwrite">上書き</option>
                <option value="merge">追加</option>
              </select>
            </label>
            <button
              type="button"
              onClick={handleGenerateMetadata}
              disabled={isGeneratingMetadata || !topicTitle.trim() || !topicContent.trim()}
              style={{
                padding: '8px 16px',
                background: isGeneratingMetadata 
                  ? '#94A3B8' 
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isGeneratingMetadata ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: isGeneratingMetadata 
                  ? 'none' 
                  : '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
              onMouseEnter={(e) => {
                if (!isGeneratingMetadata) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGeneratingMetadata) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              {isGeneratingMetadata ? (
                <>
                  <span style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '2px solid #FFFFFF',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  AI生成中...
                </>
              ) : (
                <>
                  <span>🤖</span>
                  AI生成
                </>
              )}
            </button>
          </div>
          
          {/* 生成されたメタデータのプレビューと適用/キャンセルボタン */}
          {pendingMetadata && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                AI生成結果（プレビュー）
              </div>
              <div style={{ fontSize: '12px', color: '#166534', marginBottom: '12px', lineHeight: '1.6' }}>
                {pendingMetadata.semanticCategory && (
                  <div>セマンティックカテゴリ: {pendingMetadata.semanticCategory}</div>
                )}
                {pendingMetadata.importance && (
                  <div>重要度: {pendingMetadata.importance}</div>
                )}
                {pendingMetadata.keywords && pendingMetadata.keywords.length > 0 && (
                  <div>キーワード: {pendingMetadata.keywords.join(', ')}</div>
                )}
                {pendingMetadata.summary && (
                  <div>要約: {pendingMetadata.summary}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    // 生成されたメタデータを適用
                    if (pendingMetadata.semanticCategory) {
                      setTopicSemanticCategory(pendingMetadata.semanticCategory);
                    }
                    if (pendingMetadata.importance) {
                      setTopicImportance(pendingMetadata.importance);
                    }
                    if (pendingMetadata.keywords && pendingMetadata.keywords.length > 0) {
                      setTopicKeywords(pendingMetadata.keywords.join(', '));
                    }
                    if (pendingMetadata.summary) {
                      setTopicSummary(pendingMetadata.summary);
                    }
                    setPendingMetadata(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  適用する
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingMetadata(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* セマンティックカテゴリ */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontWeight: '600',
            color: '#475569',
            fontSize: '14px',
          }}>
            セマンティックカテゴリ
          </label>
          <select
            value={topicSemanticCategory}
            onChange={(e) => setTopicSemanticCategory(e.target.value as TopicSemanticCategory | '')}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0066CC';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
              e.currentTarget.style.backgroundColor = '#FAFBFC';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <option value="">選択してください</option>
            <option value="action-item">アクションアイテム</option>
            <option value="decision">決定事項</option>
            <option value="discussion">議論・討議</option>
            <option value="issue">課題・問題</option>
            <option value="risk">リスク</option>
            <option value="opportunity">機会</option>
            <option value="question">質問・疑問</option>
            <option value="summary">サマリー</option>
            <option value="follow-up">フォローアップ</option>
            <option value="reference">参照情報</option>
            <option value="other">その他</option>
          </select>
        </div>
        
        {/* 重要度 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontWeight: '600',
            color: '#475569',
            fontSize: '14px',
          }}>
            重要度
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
          }}>
            {(['high', 'medium', 'low'] as TopicImportance[]).map((importance) => (
              <button
                key={importance}
                type="button"
                onClick={() => setTopicImportance(topicImportance === importance ? '' : importance)}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${topicImportance === importance ? '#0066CC' : '#E2E8F0'}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: topicImportance === importance 
                    ? importance === 'high' ? '#FEF2F2' :
                      importance === 'medium' ? '#FEF3C7' : '#F0FDF4'
                    : '#FFFFFF',
                  color: topicImportance === importance
                    ? importance === 'high' ? '#DC2626' :
                      importance === 'medium' ? '#D97706' : '#16A34A'
                    : '#64748B',
                }}
                onMouseEnter={(e) => {
                  if (topicImportance !== importance) {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }
                }}
                onMouseLeave={(e) => {
                  if (topicImportance !== importance) {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                {importance === 'high' ? '🔴 高' :
                 importance === 'medium' ? '🟡 中' : '🟢 低'}
              </button>
            ))}
          </div>
        </div>
        
        {/* キーワード */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontWeight: '600',
            color: '#475569',
            fontSize: '14px',
          }}>
            キーワード
            <span style={{
              fontSize: '12px',
              fontWeight: 'normal',
              color: '#64748B',
              marginLeft: '6px',
            }}>
              (カンマ区切り)
            </span>
          </label>
          <input
            type="text"
            value={topicKeywords}
            onChange={(e) => setTopicKeywords(e.target.value)}
            placeholder="例: プロジェクト, 進捗, 報告"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '2px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '14px',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
              backgroundColor: '#FFFFFF',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0066CC';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
              e.currentTarget.style.backgroundColor = '#FAFBFC';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          />
        </div>
        
        {/* 要約 */}
        <div style={{ marginBottom: '0' }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontWeight: '600',
            color: '#475569',
            fontSize: '14px',
          }}>
            要約
            <span style={{
              fontSize: '12px',
              fontWeight: 'normal',
              color: '#64748B',
              marginLeft: '6px',
            }}>
              (AI生成または手動入力)
            </span>
          </label>
          <textarea
            value={topicSummary}
            onChange={(e) => setTopicSummary(e.target.value)}
            placeholder="トピックの要約を入力してください"
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px 14px',
              border: '2px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: '1.6',
              transition: 'all 0.2s ease',
              backgroundColor: '#FFFFFF',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0066CC';
              e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 204, 0.1)';
              e.currentTarget.style.backgroundColor = '#FAFBFC';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          />
        </div>
      </div>
    </div>
  );
}

