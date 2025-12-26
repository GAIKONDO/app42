'use client';

import type { GraphvizYamlFile } from '@/lib/graphvizApi';

interface ListViewProps {
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

export default function ListView({
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
}: ListViewProps) {
  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#6B7280',
              borderRight: '1px solid #E5E7EB',
            }}>
              名前
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#6B7280',
              borderRight: '1px solid #E5E7EB',
            }}>
              タイプ
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#6B7280',
              borderRight: '1px solid #E5E7EB',
            }}>
              説明
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#6B7280',
              borderRight: '1px solid #E5E7EB',
            }}>
              作成日
            </th>
            <th style={{ 
              padding: '12px 16px', 
              textAlign: 'center', 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#6B7280',
              width: '100px',
            }}>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file, index) => (
            <tr
              key={file.id}
              onClick={() => onFileClick(file.id)}
              style={{
                borderBottom: index < files.length - 1 ? '1px solid #E5E7EB' : 'none',
                cursor: editingGraphvizId !== file.id ? 'pointer' : 'default',
                backgroundColor: editingGraphvizId === file.id ? '#F9FAFB' : '#FFFFFF',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (editingGraphvizId !== file.id) {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (editingGraphvizId !== file.id) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              <td style={{ 
                padding: '12px 16px', 
                borderRight: '1px solid #E5E7EB',
              }}>
                {editingGraphvizId === file.id ? (
                  <input
                    type="text"
                    value={editingGraphvizName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    autoFocus
                    disabled={savingEdit}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: '2px solid #3B82F6',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 600,
                      backgroundColor: savingEdit ? '#F3F4F6' : '#FFFFFF',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        onSaveEdit(file.id);
                      } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        onCancelEdit();
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {file.name}
                  </span>
                )}
              </td>
              <td style={{ 
                padding: '12px 16px', 
                borderRight: '1px solid #E5E7EB',
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
              </td>
              <td style={{ 
                padding: '12px 16px', 
                borderRight: '1px solid #E5E7EB',
                color: '#6B7280',
                fontSize: '13px',
              }}>
                {file.description || '-'}
              </td>
              <td style={{ 
                padding: '12px 16px', 
                borderRight: '1px solid #E5E7EB',
                color: '#6B7280',
                fontSize: '13px',
              }}>
                {(() => {
                  const timestamp = typeof file.createdAt === 'string' 
                    ? (isNaN(Number(file.createdAt)) ? file.createdAt : Number(file.createdAt) * 1000)
                    : file.createdAt;
                  const date = new Date(timestamp);
                  return isNaN(date.getTime()) ? '日付不明' : date.toLocaleDateString('ja-JP');
                })()}
              </td>
              <td style={{ 
                padding: '12px 16px', 
                textAlign: 'center',
              }}>
                {editingGraphvizId === file.id ? (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
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
                ) : (
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit(file);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        backgroundColor: 'transparent',
                        color: '#6B7280',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderColor = '#D1D5DB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                      title="編集"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClick(file.id, file.name);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        padding: 0,
                        backgroundColor: 'transparent',
                        color: '#EF4444',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FEE2E2';
                        e.currentTarget.style.borderColor = '#FCA5A5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                      title="削除"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

