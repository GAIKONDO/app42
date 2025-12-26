'use client';

interface ParentFile {
  id: string;
  name: string;
  data: any;
}

interface SiteOption {
  id: string;
  label: string;
}

interface AddGraphvizModalProps {
  isOpen: boolean;
  newGraphvizId: string;
  newGraphvizName: string;
  newGraphvizDescription: string;
  newGraphvizType: string;
  newGraphvizParentId: string;
  selectedSiteId: string;
  selectedParentSites: SiteOption[];
  parentFiles?: ParentFile[];
  loadingParentFiles?: boolean;
  savingGraphviz: boolean;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTypeChange: (type: string) => void;
  onParentIdChange: (parentId: string) => void;
  onSiteIdChange: (siteId: string) => void;
}

export default function AddGraphvizModal({
  isOpen,
  newGraphvizId,
  newGraphvizName,
  newGraphvizDescription,
  newGraphvizType,
  newGraphvizParentId,
  selectedSiteId = '',
  selectedParentSites = [],
  parentFiles = [],
  loadingParentFiles = false,
  savingGraphviz,
  onClose,
  onSave,
  onNameChange,
  onDescriptionChange,
  onTypeChange,
  onParentIdChange,
  onSiteIdChange,
}: AddGraphvizModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => {
        if (!savingGraphviz) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #F3F4F6' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#111827',
          }}>
            新しいGraphvizファイルを追加
          </h3>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '14px', 
            color: '#6B7280',
          }}>
            Graphvizファイルの情報を入力してください
          </p>
        </div>

        {/* ユニークIDセクション */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: '#F9FAFB',
          borderRadius: '12px', 
          border: '1px solid #E5E7EB',
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6B7280',
          }}>
            ユニークID
          </label>
          <div style={{ 
            fontSize: '14px', 
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', 
            color: '#111827', 
            fontWeight: '600',
            wordBreak: 'break-all',
          }}>
            {newGraphvizId || '生成中...'}
          </div>
        </div>

        {/* 名前入力 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            <span>名前</span>
            <span style={{ 
              marginLeft: '6px',
              color: '#EF4444',
              fontSize: '16px',
            }}>*</span>
          </label>
          <input
            type="text"
            value={newGraphvizName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Graphvizファイルの名前を入力"
            autoFocus
            disabled={savingGraphviz}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingGraphviz ? '#F3F4F6' : '#FFFFFF',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              if (!savingGraphviz) {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* タイプ選択 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            <span>タイプ</span>
            <span style={{ 
              marginLeft: '6px',
              color: '#EF4444',
              fontSize: '16px',
            }}>*</span>
          </label>
          <select
            value={newGraphvizType}
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={savingGraphviz}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingGraphviz ? '#F3F4F6' : '#FFFFFF',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: savingGraphviz ? 'not-allowed' : 'pointer',
            }}
            onFocus={(e) => {
              if (!savingGraphviz) {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="site-topology">棟間ネットワーク (site-topology)</option>
            <option value="site-equipment">棟内機器構成 (site-equipment)</option>
            <option value="rack-servers">ラック内サーバー (rack-servers)</option>
            <option value="server-details">機器詳細 (server-details)</option>
            <option value="topology">トポロジ (topology)</option>
            <option value="device">デバイス (device)</option>
            <option value="links">リンク (links)</option>
            <option value="intent">インテント (intent)</option>
          </select>
        </div>

        {/* 親カード選択（site-equipment, rack-servers, server-detailsの場合のみ表示） */}
        {(newGraphvizType === 'site-equipment' || newGraphvizType === 'rack-servers' || newGraphvizType === 'server-details') && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              marginBottom: '10px', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
            }}>
              <span>
                {newGraphvizType === 'site-equipment' && '親棟'}
                {newGraphvizType === 'rack-servers' && '親棟内機器構成'}
                {newGraphvizType === 'server-details' && '親ラック内サーバー'}
              </span>
              <span style={{ 
                marginLeft: '6px',
                color: '#EF4444',
                fontSize: '16px',
              }}>*</span>
            </label>
            {loadingParentFiles ? (
              <div style={{ 
                padding: '12px 16px',
                border: '2px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '15px',
                color: '#6B7280',
                textAlign: 'center',
              }}>
                読み込み中...
              </div>
            ) : (!parentFiles || parentFiles.length === 0) ? (
              <div style={{ 
                padding: '12px 16px',
                border: '2px solid #FEE2E2',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
              }}>
                {newGraphvizType === 'site-equipment' && '親棟のカードが見つかりません。先に棟間ネットワークを作成してください。'}
                {newGraphvizType === 'rack-servers' && '親棟内機器構成のカードが見つかりません。先に棟内機器構成を作成してください。'}
                {newGraphvizType === 'server-details' && '親ラック内サーバーのカードが見つかりません。先にラック内サーバーを作成してください。'}
              </div>
            ) : (
              <select
                value={newGraphvizParentId}
                onChange={(e) => onParentIdChange(e.target.value)}
                disabled={savingGraphviz}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '10px',
                  fontSize: '15px',
                  color: '#111827',
                  backgroundColor: savingGraphviz ? '#F3F4F6' : '#FFFFFF',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: savingGraphviz ? 'not-allowed' : 'pointer',
                }}
                onFocus={(e) => {
                  if (!savingGraphviz) {
                    e.target.style.borderColor = 'var(--color-primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">選択してください</option>
                {(parentFiles || []).map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name} {file.data?.label ? `(${file.data.label})` : ''}
                  </option>
                ))}
              </select>
            )}
            
            {/* Site選択（site-equipmentの場合、親カード選択後に表示） */}
            {newGraphvizType === 'site-equipment' && newGraphvizParentId && selectedParentSites.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                }}>
                  <span>Site ID</span>
                  <span style={{ 
                    marginLeft: '6px',
                    color: '#EF4444',
                    fontSize: '16px',
                  }}>*</span>
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => onSiteIdChange(e.target.value)}
                  disabled={savingGraphviz}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '10px',
                    fontSize: '15px',
                    color: '#111827',
                    backgroundColor: savingGraphviz ? '#F3F4F6' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: savingGraphviz ? 'not-allowed' : 'pointer',
                  }}
                  onFocus={(e) => {
                    if (!savingGraphviz) {
                      e.target.style.borderColor = 'var(--color-primary)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">選択してください</option>
                  {selectedParentSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.label} (ID: {site.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* 説明入力 */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            説明
          </label>
          <textarea
            value={newGraphvizDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Graphvizファイルの説明を入力（任意）"
            disabled={savingGraphviz}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingGraphviz ? '#F3F4F6' : '#FFFFFF',
              minHeight: '100px',
              resize: 'vertical',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              if (!savingGraphviz) {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={savingGraphviz}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savingGraphviz ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: savingGraphviz ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onSave}
            disabled={savingGraphviz || !newGraphvizName.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: savingGraphviz || !newGraphvizName.trim() ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savingGraphviz || !newGraphvizName.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {savingGraphviz ? '保存中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}

