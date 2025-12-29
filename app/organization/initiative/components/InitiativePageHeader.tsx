'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { FocusInitiative, OrgNodeData } from '@/lib/orgApi';

// CSSアニメーション（スピナー用）
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// アイコンコンポーネント
const SaveIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const DownloadIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const BackIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"></path>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

interface InitiativePageHeaderProps {
  orgData: OrgNodeData | null;
  initiative: FocusInitiative | null;
  organizationId: string;
  allOrganizations: Array<{ id: string; name: string; title?: string }>;
  savingStatus: 'idle' | 'saving' | 'saved';
  onSave: () => void;
  onDownloadJson: () => void;
  onOrganizationChange: (newOrganizationId: string) => Promise<void>;
  activeTab: string;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
}

export default function InitiativePageHeader({
  orgData,
  initiative,
  organizationId,
  allOrganizations,
  savingStatus,
  onSave,
  onDownloadJson,
  onOrganizationChange,
  activeTab,
  isEditing,
  setIsEditing,
  editingContent,
  setEditingContent,
}: InitiativePageHeaderProps) {
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
    console.log('🔄 [InitiativePageHeader] handleOrganizationChange called:', {
      newValue: newOrganizationId,
      currentOrganizationId: organizationId,
      selectValue,
      isChangingOrganization,
      savingStatus,
    });

    if (!newOrganizationId || newOrganizationId === organizationId) {
      // 同じ組織が選択された場合は何もしない
      console.log('⚠️ [InitiativePageHeader] 同じ組織が選択されました');
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
      console.log('✅ [InitiativePageHeader] 組織変更を開始:', newOrganizationId);
      setIsChangingOrganization(true);
      await onOrganizationChange(newOrganizationId);
      // 成功した場合は、ページ遷移が行われるため、ここでは何もしない
      console.log('✅ [InitiativePageHeader] 組織変更が完了しました');
    } catch (error: any) {
      console.error('❌ [InitiativePageHeader] 組織変更エラー:', error);
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
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>
            {orgData ? orgData.name : ''} / 注力施策
          </div>
          <h2 style={{ margin: 0 }}>{initiative?.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {activeTab === 'details' && (
          <>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                詳細を編集
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingContent(initiative?.content || '');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                編集を終了
              </button>
            )}
          </>
        )}
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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s, opacity 0.2s',
            opacity: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
            e.currentTarget.style.opacity = '1';
          }}
          title="JSONファイルをダウンロード"
        >
          <DownloadIcon size={18} color="white" />
        </button>
        <button
          onClick={() => {
            router.push(`/organization/detail?id=${organizationId}&tab=focusInitiatives`);
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

    {/* 組織変更確認モーダル */}
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
          maxWidth: '500px',
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
          <p style={{
            fontSize: '14px',
            color: '#4B5563',
            marginBottom: '24px',
            lineHeight: '1.6',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            注力施策を別の組織に移動しますか？<br />
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

