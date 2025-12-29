'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SaveIcon, DownloadIcon, BackIcon } from './Icons';

// CSSアニメーション（スピナー用）
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface HeaderSectionProps {
  title: string;
  savingStatus: 'idle' | 'saving' | 'saved';
  downloadingJson: boolean;
  downloadingHtml: boolean;
  hasUnsavedChanges: boolean;
  organizationId: string;
  allOrganizations: Array<{ id: string; name: string; title?: string }>;
  onSave: () => void;
  onDownloadJson: () => void;
  onDownloadHtml: () => void;
  onOrganizationChange: (newOrganizationId: string) => Promise<void>;
}

export default function HeaderSection({
  title,
  savingStatus,
  downloadingJson,
  downloadingHtml,
  hasUnsavedChanges,
  organizationId,
  allOrganizations,
  onSave,
  onDownloadJson,
  onDownloadHtml,
  onOrganizationChange,
}: HeaderSectionProps) {
  const router = useRouter();
  const [isChangingOrganization, setIsChangingOrganization] = React.useState(false);
  const [selectValue, setSelectValue] = React.useState(organizationId);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingOrganizationId, setPendingOrganizationId] = React.useState<string | null>(null);

  // organizationIdが変更されたら、selectValueも更新
  React.useEffect(() => {
    setSelectValue(organizationId);
  }, [organizationId]);

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newOrganizationId = e.target.value;
    console.log('🔄 [HeaderSection] handleOrganizationChange called:', {
      newValue: newOrganizationId,
      currentOrganizationId: organizationId,
      selectValue,
      isChangingOrganization,
      savingStatus,
    });

    if (!newOrganizationId || newOrganizationId === organizationId) {
      // 同じ組織が選択された場合は何もしない
      console.log('⚠️ [HeaderSection] 同じ組織が選択されました');
      return;
    }

    // 確認モーダルを表示
    setPendingOrganizationId(newOrganizationId);
    setShowConfirmModal(true);
  };

  const handleConfirmOrganizationChange = async () => {
    if (!pendingOrganizationId) return;

    setShowConfirmModal(false);
    const newOrganizationId = pendingOrganizationId;
    setPendingOrganizationId(null);

    // 確認された場合のみ、selectの値を更新
    setSelectValue(newOrganizationId);

    try {
      console.log('✅ [HeaderSection] 組織変更を開始:', newOrganizationId);
      setIsChangingOrganization(true);
      await onOrganizationChange(newOrganizationId);
      // 成功した場合は、ページ遷移が行われるため、ここでは何もしない
      console.log('✅ [HeaderSection] 組織変更が完了しました');
    } catch (error: any) {
      console.error('❌ [HeaderSection] 組織変更エラー:', error);
      alert(`組織の変更に失敗しました: ${error?.message || '不明なエラー'}`);
      // エラーが発生した場合は、selectの値を元に戻す
      setSelectValue(organizationId);
    } finally {
      setIsChangingOrganization(false);
    }
  };

  const handleCancelOrganizationChange = () => {
    setShowConfirmModal(false);
    setPendingOrganizationId(null);
    setSelectValue(organizationId); // 元の値に戻す
  };

  return (
    <>
      <style>{spinnerStyle}</style>
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '24px 32px',
        marginBottom: '32px',
        borderBottom: '1px solid #E5E7EB',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '4px',
              height: '32px',
              backgroundColor: '#0066CC',
              borderRadius: '2px',
            }} />
            <h1 style={{ 
              margin: 0, 
              fontSize: '28px', 
              fontWeight: 600,
              color: '#1F2937',
              letterSpacing: '-0.01em',
              lineHeight: '1.3',
            }}>
              {title}
            </h1>
          </div>
          <p style={{ 
            margin: 0,
            marginLeft: '20px',
            fontSize: '14px', 
            color: '#6B7280',
            lineHeight: '1.5',
          }}>
            議事録アーカイブ
          </p>
        </div>
        
        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {savingStatus !== 'idle' && (
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: savingStatus === 'saving' ? '#6B7280' : '#10B981',
              backgroundColor: savingStatus === 'saving' ? '#F3F4F6' : '#D1FAE5',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {savingStatus === 'saving' ? '💾 保存中...' : '✅ 保存完了'}
            </div>
          )}
          {downloadingJson && (
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: '#6B7280',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(107, 114, 128, 0.3)',
                borderTop: '2px solid #6B7280',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              JSONダウンロード中...
            </div>
          )}
          {downloadingHtml && (
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: '#6B7280',
              backgroundColor: '#F3F4F6',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(107, 114, 128, 0.3)',
                borderTop: '2px solid #6B7280',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              HTMLダウンロード中...
            </div>
          )}
          <button
            onClick={onSave}
            disabled={savingStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: savingStatus === 'saving' ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#10B981';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title="編集内容を保存します"
          >
            <SaveIcon size={18} color="white" />
          </button>
          <button
            onClick={onDownloadJson}
            disabled={downloadingJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: downloadingJson ? '#9CA3AF' : '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingJson ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: downloadingJson ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!downloadingJson) {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingJson) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={downloadingJson ? 'JSONファイルをダウンロード中...' : 'JSONファイルをダウンロード'}
          >
            {downloadingJson ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <DownloadIcon size={18} color="white" />
            )}
          </button>
          <button
            onClick={onDownloadHtml}
            disabled={downloadingHtml}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: downloadingHtml ? '#9CA3AF' : '#8B5CF6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingHtml ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: downloadingHtml ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!downloadingHtml) {
                e.currentTarget.style.backgroundColor = '#7C3AED';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingHtml) {
                e.currentTarget.style.backgroundColor = '#8B5CF6';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={downloadingHtml ? 'HTMLファイルをダウンロード中...' : 'HTMLファイルをダウンロード'}
          >
            {downloadingHtml ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <DownloadIcon size={18} color="white" />
            )}
          </button>
          <button
            onClick={async () => {
              try {
                if (hasUnsavedChanges) {
                  const { tauriConfirm } = await import('@/lib/orgApi');
                  const confirmed = await tauriConfirm('保存されていない変更があります。このページを離れますか？', 'ページを離れる確認');
                  if (!confirmed) {
                    return;
                  }
                }
                router.push(`/organization/detail?id=${organizationId}&tab=meetingNotes`);
              } catch (error) {
                console.error('❌ [戻るボタン] エラーが発生しましたが、ページ遷移を続行します:', error);
                router.push(`/organization/detail?id=${organizationId}&tab=meetingNotes`);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: 0.9,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280';
              e.currentTarget.style.opacity = '0.9';
            }}
            title="戻る"
          >
            <BackIcon size={18} color="white" />
          </button>
        </div>
      </div>
      
      {/* 組織選択ドロップダウン */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <label style={{
          fontSize: '13px',
          fontWeight: '500',
          color: '#374151',
          whiteSpace: 'nowrap',
        }}>
          所属組織:
        </label>
        {allOrganizations.length === 0 ? (
          <div style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '14px',
            color: '#6B7280',
            fontStyle: 'italic',
          }}>
            組織データを読み込み中...
          </div>
        ) : (
          <select
            value={selectValue}
            onChange={handleOrganizationChange}
            disabled={isChangingOrganization || savingStatus === 'saving'}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: isChangingOrganization || savingStatus === 'saving' ? '#F3F4F6' : '#FFFFFF',
              color: '#111827',
              cursor: isChangingOrganization || savingStatus === 'saving' ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onFocus={(e) => {
              if (!isChangingOrganization && savingStatus !== 'saving') {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {allOrganizations.map((org) => {
              const displayName = org.name || org.title || org.id;
              const englishName = org.title && org.name && org.title !== org.name ? org.title : null;
              return (
                <option key={org.id} value={org.id}>
                  {displayName}{englishName ? ` (${englishName})` : ''}
                </option>
              );
            })}
          </select>
        )}
        {isChangingOrganization && (
          <div style={{
            fontSize: '12px',
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid #3B82F6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            移動中...
          </div>
        )}
      </div>
    </div>

    {/* 組織変更確認モーダル（埋め込み再生成の警告を含む） */}
    {showConfirmModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleCancelOrganizationChange}
      >
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1A1A1A',
            marginBottom: '16px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            組織の移動
          </h3>
          <div style={{
            padding: '16px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <p style={{
              fontSize: '14px',
              color: '#92400E',
              margin: 0,
              lineHeight: '1.6',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontWeight: '500',
            }}>
              ⚠️ 重要な注意事項
            </p>
            <p style={{
              fontSize: '13px',
              color: '#78350F',
              margin: '8px 0 0 0',
              lineHeight: '1.6',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              議事録を移動すると、関連するすべての個別トピックも一緒に移動します。<br />
              <strong>移動後は、ナレッジグラフページで埋め込みベクトルの再生成が必要です。</strong><br />
              再生成を行わないと、RAG検索やAIアシスタントが正しく動作しない可能性があります。
            </p>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#4B5563',
            marginBottom: '24px',
            lineHeight: '1.6',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            議事録を別の組織に移動しますか？<br />
            この操作は元に戻せません。
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              type="button"
              onClick={handleCancelOrganizationChange}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#9CA3AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleConfirmOrganizationChange}
              disabled={isChangingOrganization}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                backgroundColor: isChangingOrganization ? '#9CA3AF' : '#EF4444',
                border: 'none',
                borderRadius: '6px',
                cursor: isChangingOrganization ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                if (!isChangingOrganization) {
                  e.currentTarget.style.backgroundColor = '#DC2626';
                }
              }}
              onMouseLeave={(e) => {
                if (!isChangingOrganization) {
                  e.currentTarget.style.backgroundColor = '#EF4444';
                }
              }}
            >
              移動する
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

