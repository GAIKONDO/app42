/**
 * 関連ファイル管理コンポーネント
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { FiUpload, FiTrash2 } from 'react-icons/fi';
import { saveGraphvizYamlFileAttachment, getGraphvizYamlFileAttachments, deleteGraphvizYamlFileAttachment } from '@/lib/graphvizApi';
import { callTauriCommand } from '@/lib/localFirebase';

interface RelatedFile {
  path: string;
  description?: string;
  detailedDescription?: string;
  id?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

interface RelatedFilesSectionProps {
  yamlFileId: string | null;
  organizationId: string | null;
}

export function RelatedFilesSection({ yamlFileId, organizationId }: RelatedFilesSectionProps) {
  const [relatedFiles, setRelatedFiles] = useState<RelatedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ path: string; fileName: string } | null>(null);

  // 関連ファイルを読み込む
  const loadRelatedFiles = useCallback(async (yamlFileId: string) => {
    if (!yamlFileId) return;
    setIsLoadingFiles(true);
    try {
      const files = await getGraphvizYamlFileAttachments(yamlFileId);
      setRelatedFiles(files);
    } catch (error) {
      console.error('関連ファイルの読み込みエラー:', error);
      setRelatedFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // YAMLファイルIDが変更されたら関連ファイルを読み込む
  useEffect(() => {
    if (yamlFileId && organizationId) {
      loadRelatedFiles(yamlFileId);
    } else {
      setRelatedFiles([]);
    }
  }, [yamlFileId, organizationId, loadRelatedFiles]);

  // ファイルアップロード
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !yamlFileId || !organizationId) {
      if (!yamlFileId) {
        alert('ファイルが保存されていません。先にファイルを保存してください。');
      }
      return;
    }

    setUploadingFile(true);
    try {
      const result = await saveGraphvizYamlFileAttachment(
        organizationId,
        yamlFileId,
        file,
        fileDescription.trim() || undefined,
        undefined // detailedDescription
      );

      if (result.success) {
        await loadRelatedFiles(yamlFileId);
        alert('ファイルを保存しました。');
        setFileDescription('');
        event.target.value = '';
      } else {
        alert(`ファイルの保存に失敗しました: ${result.error}`);
      }
    } catch (error: any) {
      console.error('ファイルアップロードエラー:', error);
      alert(`ファイルのアップロードに失敗しました: ${error?.message || '不明なエラー'}`);
    } finally {
      setUploadingFile(false);
    }
  }, [yamlFileId, organizationId, fileDescription, loadRelatedFiles]);

  // ファイルを開く
  const handleOpenFile = useCallback(async (filePath: string) => {
    try {
      const result = await callTauriCommand('open_file', { filePath });
      if (!result || !result.success) {
        alert(`ファイルを開くことができませんでした: ${result?.error || '不明なエラー'}`);
      }
    } catch (error: any) {
      console.error('ファイルを開くエラー:', error);
      alert(`ファイルを開くことができませんでした: ${error?.message || '不明なエラー'}`);
    }
  }, []);

  // ファイル削除確認
  const handleDeleteFileClick = useCallback((filePath: string) => {
    const fileName = filePath.split('/').pop() || filePath;
    setFileToDelete({ path: filePath, fileName });
    setShowDeleteFileModal(true);
  }, []);

  // ファイル削除実行
  const handleConfirmDeleteFile = useCallback(async () => {
    if (!fileToDelete || !yamlFileId || !organizationId) return;

    try {
      await deleteGraphvizYamlFileAttachment(organizationId, yamlFileId, fileToDelete.path);
      await loadRelatedFiles(yamlFileId);
      setShowDeleteFileModal(false);
      setFileToDelete(null);
      alert('ファイルを削除しました。');
    } catch (error: any) {
      console.error('ファイル削除エラー:', error);
      alert(`ファイルの削除に失敗しました: ${error?.message || '不明なエラー'}`);
    }
  }, [fileToDelete, yamlFileId, organizationId, loadRelatedFiles]);

  // ファイル削除キャンセル
  const handleCancelDeleteFile = useCallback(() => {
    setShowDeleteFileModal(false);
    setFileToDelete(null);
  }, []);

  // ファイルアイコンを取得
  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '📷';
    if (['pdf'].includes(ext)) return '📄';
    if (['xlsx', 'xls'].includes(ext)) return '📊';
    if (['docx', 'doc'].includes(ext)) return '📝';
    if (['txt', 'md'].includes(ext)) return '📃';
    return '📎';
  };

  if (!yamlFileId) {
    return null;
  }

  return (
    <>
      <div style={{
        marginBottom: '12px',
        padding: '12px 16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#6B7280',
          marginBottom: '12px',
        }}>
          関連ファイル
        </div>
        
        {/* ファイルアップロード */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="file"
            id="file-upload-input"
            onChange={handleFileUpload}
            disabled={uploadingFile}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="file-upload-input"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: uploadingFile ? '#9CA3AF' : '#4262FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: uploadingFile ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <FiUpload size={16} />
            {uploadingFile ? 'アップロード中...' : 'ファイルをアップロード'}
          </label>
        </div>

        {/* アップロード済みファイルの表示 */}
        {isLoadingFiles ? (
          <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', fontSize: '14px', color: '#6B7280' }}>
            読み込み中...
          </div>
        ) : relatedFiles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relatedFiles.map((file, index) => {
              const fileName = file.path.split('/').pop() || file.path;
              return (
                <div
                  key={index}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => handleOpenFile(file.path)}
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#4262FF',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        marginBottom: '4px',
                        wordBreak: 'break-all',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#0051a8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#4262FF';
                      }}
                    >
                      {getFileIcon(fileName)} {file.fileName || fileName}
                    </div>
                    {file.path && (
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {file.path}
                      </div>
                    )}
                    {file.description && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        {file.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteFileClick(file.path)}
                    disabled={uploadingFile}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: uploadingFile ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="ファイルを削除"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', fontSize: '14px', color: '#9CA3AF', textAlign: 'center' }}>
            関連ファイルがありません
          </div>
        )}
      </div>

      {/* ファイル削除確認モーダル */}
      {showDeleteFileModal && fileToDelete && (
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
            zIndex: 2000,
          }}
          onClick={handleCancelDeleteFile}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
              ファイルを削除しますか？
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', lineHeight: '1.6' }}>
              「<strong>{fileToDelete.fileName}</strong>」を削除してもよろしいですか？
              <br />
              この操作は取り消せません。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCancelDeleteFile}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFile}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

