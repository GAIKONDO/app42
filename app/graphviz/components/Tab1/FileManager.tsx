/**
 * Graphvizファイル管理コンポーネント
 * 保存・読み込み・削除機能を提供
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiSave, FiFolder, FiTrash2, FiX } from 'react-icons/fi';
import {
  createGraphvizYamlFile,
  createGraphvizDotFile,
  updateGraphvizYamlFile,
  getAllGraphvizYamlFiles,
  getGraphvizYamlFile,
  getGraphvizDotFile,
  deleteGraphvizYamlFile,
  type GraphvizYamlFile,
} from '@/lib/graphvizApi';
import { parseYamlFile } from '../utils/yamlToDotAdvanced';

interface FileManagerProps {
  yamlContent: string;
  dotCode: string;
  viewType: string;
  organizationId?: string; // 組織ID（オプション）
  currentFileId?: string | null; // 現在ロードしているファイルID（上書き保存用）
  onLoadFile: (yamlContent: string, dotCode?: string) => void;
  onFileSaved?: (fileId: string, fileName: string) => void; // ファイル保存時のコールバック
  onFileLoaded?: (fileId: string, fileName: string) => void; // ファイル読み込み時のコールバック
}

export function FileManager({ yamlContent, dotCode, viewType, organizationId, currentFileId, onLoadFile, onFileSaved, onFileLoaded }: FileManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<GraphvizYamlFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string>(''); // 上書きするファイルID
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; fileId: string; fileName: string } | null>(null);

  // ファイル一覧を取得
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const allFiles = await getAllGraphvizYamlFiles();
      setFiles(allFiles);
    } catch (error: any) {
      console.error('ファイル一覧の取得に失敗:', error);
      alert(`ファイル一覧の取得に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ファイルを保存（新規作成または上書き）
  const handleSave = useCallback(async () => {
    if (!saveName.trim()) {
      alert('ファイル名を入力してください');
      return;
    }

    if (!yamlContent || typeof yamlContent !== 'string' || !yamlContent.trim()) {
      alert('YAMLコンテンツが空です');
      return;
    }

    setIsLoading(true);
    try {
      // YAMLタイプを検出
      const parsed = parseYamlFile(yamlContent);
      const yamlType = parsed?.type || 'unknown';

      let yamlFile: GraphvizYamlFile;

      // 既存のファイルを上書きする場合
      if (selectedFileId) {
        // 既存ファイルを更新
        yamlFile = await updateGraphvizYamlFile(selectedFileId, {
          name: saveName,
          description: saveDescription || undefined,
          yamlContent: yamlContent,
          yamlType: yamlType !== 'unknown' ? yamlType : undefined,
        });
      } else {
        // 新規作成
        yamlFile = await createGraphvizYamlFile(saveName, yamlContent, {
          description: saveDescription || undefined,
          yamlType: yamlType !== 'unknown' ? yamlType : undefined,
          organizationId: organizationId || undefined,
        });
      }

      // DOTファイルを保存（DOTコードがある場合）
      if (dotCode && dotCode.trim()) {
        // ノード数とエッジ数を計算（簡易版）
        const nodeCount = (dotCode.match(/\[/g) || []).length;
        const edgeCount = (dotCode.match(/->/g) || []).length;

        // DOTファイルを保存（既存のものがあれば上書き、なければ新規作成）
        try {
          await createGraphvizDotFile(yamlFile.id, `${saveName} (DOT)`, dotCode, 'digraph', {
            description: saveDescription || undefined,
            viewType: viewType,
            nodeCount,
            edgeCount,
          });
        } catch (error: any) {
          // 既存のDOTファイルがある場合のエラーは無視（上書きできない場合は警告のみ）
          console.warn('DOTファイルの保存に失敗（既存ファイルがある可能性があります）:', error);
        }
      }

      alert(selectedFileId ? 'ファイルを上書きしました' : 'ファイルを保存しました');
      
      // コールバックを呼び出し
      if (onFileSaved) {
        onFileSaved(yamlFile.id, yamlFile.name);
      }
      
      setSaveName('');
      setSaveDescription('');
      setSelectedFileId('');
      setIsOpen(false);
      await loadFiles(); // ファイル一覧を更新
    } catch (error: any) {
      console.error('ファイルの保存に失敗:', error);
      alert(`ファイルの保存に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [saveName, saveDescription, selectedFileId, yamlContent, dotCode, viewType, organizationId, loadFiles, onFileSaved]);

  // 現在のファイルに上書き保存
  const handleOverwrite = useCallback(async () => {
    if (!currentFileId) {
      alert('上書きするファイルが選択されていません');
      return;
    }

    if (!yamlContent || typeof yamlContent !== 'string' || !yamlContent.trim()) {
      alert('YAMLコンテンツが空です');
      return;
    }

    setIsLoading(true);
    try {
      // 現在のファイル情報を取得
      const currentFile = await getGraphvizYamlFile(currentFileId);
      
      // YAMLタイプを検出
      const parsed = parseYamlFile(yamlContent);
      const yamlType = parsed?.type || 'unknown';

      // 既存ファイルを更新
      const yamlFile = await updateGraphvizYamlFile(currentFileId, {
        name: currentFile.name, // ファイル名は変更しない
        description: currentFile.description || undefined,
        yamlContent: yamlContent,
        yamlType: yamlType !== 'unknown' ? yamlType : undefined,
      });

      // DOTファイルを保存（DOTコードがある場合）
      if (dotCode && dotCode.trim()) {
        // ノード数とエッジ数を計算（簡易版）
        const nodeCount = (dotCode.match(/\[/g) || []).length;
        const edgeCount = (dotCode.match(/->/g) || []).length;

        // DOTファイルを保存（既存のものがあれば上書き、なければ新規作成）
        try {
          await createGraphvizDotFile(yamlFile.id, `${currentFile.name} (DOT)`, dotCode, 'digraph', {
            description: currentFile.description || undefined,
            viewType: viewType,
            nodeCount,
            edgeCount,
          });
        } catch (error: any) {
          // 既存のDOTファイルがある場合のエラーは無視（上書きできない場合は警告のみ）
          console.warn('DOTファイルの保存に失敗（既存ファイルがある可能性があります）:', error);
        }
      }

      alert('ファイルを上書き保存しました');
      
      // コールバックを呼び出し
      if (onFileSaved) {
        onFileSaved(yamlFile.id, yamlFile.name);
      }
      
      await loadFiles(); // ファイル一覧を更新
    } catch (error: any) {
      console.error('ファイルの上書き保存に失敗:', error);
      alert(`ファイルの上書き保存に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentFileId, yamlContent, dotCode, viewType, loadFiles, onFileSaved]);

  // ファイルを読み込み
  const handleLoad = useCallback(async (fileId: string) => {
    setIsLoading(true);
    try {
      const file = await getGraphvizYamlFile(fileId);
      
      // YAMLコンテンツの検証
      if (!file.yamlContent || typeof file.yamlContent !== 'string') {
        throw new Error('YAMLコンテンツが無効です。');
      }
      
      // 保存されたDOTファイルを取得（あれば）
      let savedDotCode: string | undefined;
      try {
        const dotFile = await getGraphvizDotFile(fileId);
        if (dotFile && dotFile.dotContent && typeof dotFile.dotContent === 'string') {
          savedDotCode = dotFile.dotContent;
        }
      } catch (dotError) {
        // DOTファイルが存在しない場合は無視（YAMLから再変換される）
        console.log('DOTファイルが見つかりません。YAMLから再変換します。');
      }
      
      onLoadFile(file.yamlContent, savedDotCode);
      
      // コールバックを呼び出し
      if (onFileLoaded) {
        onFileLoaded(file.id, file.name);
      }
      
      setIsOpen(false);
    } catch (error: any) {
      console.error('ファイルの読み込みに失敗:', error);
      alert(`ファイルの読み込みに失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onLoadFile]);

  // 削除確認モーダルを開く
  const handleDeleteClick = useCallback((fileId: string, fileName: string) => {
    setDeleteConfirm({ isOpen: true, fileId, fileName });
  }, []);

  // ファイルを削除
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return;

    setIsLoading(true);
    try {
      await deleteGraphvizYamlFile(deleteConfirm.fileId);
      setDeleteConfirm(null);
      await loadFiles(); // ファイル一覧を更新
    } catch (error: any) {
      console.error('ファイルの削除に失敗:', error);
      alert(`ファイルの削除に失敗しました: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [deleteConfirm, loadFiles]);

  // モーダルを開いたときにファイル一覧を取得
  useEffect(() => {
    if (isOpen) {
      loadFiles();
      // モーダルを開いたときに選択をリセット
      setSelectedFileId('');
      setSaveName('');
      setSaveDescription('');
    }
  }, [isOpen, loadFiles]);

  return (
    <>
      {/* 保存ボタン */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
          }}
          title="ファイルを保存・読み込み"
        >
          <FiSave size={16} />
          保存・読み込み
        </button>
        {currentFileId && (
          <button
            onClick={handleOverwrite}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading ? '#9CA3AF' : '#10B981',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
            }}
            title="現在のファイルに上書き保存"
          >
            <FiSave size={16} />
            {isLoading ? '保存中...' : '上書き保存'}
          </button>
        )}
      </div>

      {/* モーダル */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                ファイル管理
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '4px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* コンテンツ */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* 保存フォーム */}
              <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                  {selectedFileId ? 'ファイルを上書き' : '新規保存'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '4px' }}>
                      既存ファイルを上書き（オプション）
                    </label>
                    <select
                      value={selectedFileId}
                      onChange={(e) => {
                        const fileId = e.target.value;
                        setSelectedFileId(fileId);
                        if (fileId) {
                          const file = files.find(f => f.id === fileId);
                          if (file) {
                            setSaveName(file.name);
                            setSaveDescription(file.description || '');
                          }
                        } else {
                          setSaveName('');
                          setSaveDescription('');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="">新規作成</option>
                      {files.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '4px' }}>
                      ファイル名 *
                    </label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="例: network_topology"
                      disabled={!!selectedFileId}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: selectedFileId ? '#F3F4F6' : '#FFFFFF',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '4px' }}>
                      説明
                    </label>
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="ファイルの説明（任意）"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isLoading || !saveName.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isLoading || !saveName.trim() ? '#9CA3AF' : '#4262FF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isLoading || !saveName.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    {isLoading ? '保存中...' : selectedFileId ? '上書き保存' : '保存'}
                  </button>
                </div>
              </div>

              {/* ファイル一覧 */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '16px' }}>
                  保存済みファイル
                </h4>
                {isLoading && files.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    読み込み中...
                  </div>
                ) : files.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    保存済みファイルがありません
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {files.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '4px' }}>
                            {file.name}
                          </div>
                          {file.description && (
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                              {file.description}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {file.yamlType && (
                              <span style={{ marginRight: '8px' }}>タイプ: {file.yamlType}</span>
                            )}
                            <span>作成: {new Date(file.createdAt).toLocaleString('ja-JP')}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleLoad(file.id)}
                            disabled={isLoading}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#4262FF',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            <FiFolder size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(file.id, file.name)}
                            disabled={isLoading}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#EF4444',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isLoading ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
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
          onClick={() => !isLoading && setDeleteConfirm(null)}
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
              「<strong>{deleteConfirm.fileName}</strong>」を削除してもよろしいですか？
              <br />
              この操作は取り消せません。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: isLoading ? '#9CA3AF' : '#EF4444',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

