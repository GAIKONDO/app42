'use client';

import type { GraphvizYamlFile } from '@/lib/graphvizApi';

interface CardViewProps {
  files: GraphvizYamlFile[];
  editingGraphvizId: string | null;
  editingGraphvizName: string;
  savingEdit: boolean;
  onFileClick: (fileId: string) => void;
  onStartEdit: (file: GraphvizYamlFile) => void;
  onCancelEdit: () => void;
  onSaveEdit: (fileId: string) => void;
  onEditNameChange: (name: string) => void;
  onDeleteClick: (fileId: string, fileName: string) => void;
}

export default function CardView({
  files,
  editingGraphvizId,
  editingGraphvizName,
  savingEdit,
  onFileClick,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onDeleteClick,
}: CardViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
      }}
    >
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => onFileClick(file.id)}
          style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F9FAFB';
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            {editingGraphvizId === file.id ? (
              <div style={{ flex: 1, marginRight: '8px' }}>
                <input
                  type="text"
                  value={editingGraphvizName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  autoFocus
                  disabled={savingEdit}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px solid #3B82F6',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 600,
                    backgroundColor: savingEdit ? '#F3F4F6' : '#FFFFFF',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSaveEdit(file.id);
                    } else if (e.key === 'Escape') {
                      onCancelEdit();
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelEdit();
                    }}
                    disabled={savingEdit}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#F3F4F6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: savingEdit ? 'not-allowed' : 'pointer',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveEdit(file.id);
                    }}
                    disabled={savingEdit}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: savingEdit ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {savingEdit ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h4 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClick(file.id);
                  }}
                  style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    flex: 1,
                    margin: 0,
                    marginBottom: file.description ? '4px' : 0,
                  }}
                >
                  {file.name}
                </h4>
                <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEdit(file);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      backgroundColor: 'transparent',
                      color: '#9CA3AF',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      opacity: 0.3,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                      e.currentTarget.style.opacity = '0.6';
                      e.currentTarget.style.color = '#6B7280';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.opacity = '0.3';
                      e.currentTarget.style.color = '#9CA3AF';
                    }}
                    title="編集"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
              </>
            )}
            {editingGraphvizId !== file.id && (
              <div style={{ display: 'flex', gap: '2px', marginLeft: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(file.id, file.name);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    backgroundColor: 'transparent',
                    color: '#9CA3AF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    opacity: 0.3,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                    e.currentTarget.style.opacity = '0.6';
                    e.currentTarget.style.color = '#9CA3AF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.opacity = '0.3';
                    e.currentTarget.style.color = '#9CA3AF';
                  }}
                  title="削除"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {file.description && (
            <p style={{
              fontSize: '14px',
              color: 'var(--color-text-light)',
              margin: 0,
              marginBottom: '8px',
            }}>
              {file.description}
            </p>
          )}

          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            fontSize: '12px',
            color: 'var(--color-text-light)',
            marginTop: '8px',
          }}>
            {file.yamlType && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#E0E7FF',
                color: '#3730A3',
                borderRadius: '4px',
                fontSize: '11px',
              }}>
                {file.yamlType}
              </span>
            )}
            <span>
              {(() => {
                const timestamp = typeof file.createdAt === 'string' 
                  ? (isNaN(Number(file.createdAt)) ? file.createdAt : Number(file.createdAt) * 1000)
                  : file.createdAt;
                const date = new Date(timestamp);
                return isNaN(date.getTime()) ? '日付不明' : date.toLocaleDateString('ja-JP');
              })()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

