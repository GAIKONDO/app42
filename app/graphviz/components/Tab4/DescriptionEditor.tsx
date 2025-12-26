/**
 * 説明文編集コンポーネント
 */

'use client';

import { useState, useCallback } from 'react';
import { updateGraphvizYamlFile } from '@/lib/graphvizApi';

interface DescriptionEditorProps {
  yamlFileId: string | null;
  description: string;
  onDescriptionUpdated?: (description: string) => void;
}

export function DescriptionEditor({ yamlFileId, description, onDescriptionUpdated }: DescriptionEditorProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [isUpdatingDescription, setIsUpdatingDescription] = useState(false);

  // 説明文編集を開始
  const handleStartEditDescription = useCallback(() => {
    if (!yamlFileId) {
      alert('ファイルが保存されていません。先にファイルを保存してください。');
      return;
    }
    setEditingDescription(description);
    setIsEditingDescription(true);
  }, [yamlFileId, description]);

  // 説明文を保存
  const handleSaveDescription = useCallback(async () => {
    if (!yamlFileId) {
      return;
    }

    setIsUpdatingDescription(true);
    try {
      const updatedFile = await updateGraphvizYamlFile(yamlFileId, {
        description: editingDescription.trim() || undefined,
      });
      setIsEditingDescription(false);
      if (onDescriptionUpdated) {
        onDescriptionUpdated(updatedFile.description || '');
      }
    } catch (error: any) {
      console.error('説明文の更新に失敗:', error);
      alert(`説明文の更新に失敗しました: ${error.message}`);
      // エラー時は編集前の値に戻す
      setEditingDescription(description);
    } finally {
      setIsUpdatingDescription(false);
    }
  }, [yamlFileId, editingDescription, description, onDescriptionUpdated]);

  // 説明文編集をキャンセル
  const handleCancelEditDescription = useCallback(() => {
    setEditingDescription(description);
    setIsEditingDescription(false);
  }, [description]);

  if (!yamlFileId) {
    return null;
  }

  return (
    <div style={{
      marginBottom: '12px',
      padding: '12px 16px',
      backgroundColor: '#F9FAFB',
      border: isEditingDescription ? '2px solid #4262FF' : '1px solid #E5E7EB',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 500,
        color: '#6B7280',
        marginBottom: '8px',
      }}>
        説明
      </div>
      {isEditingDescription ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                // Cmd/Ctrl + Enter で保存
                e.preventDefault();
                handleSaveDescription();
              } else if (e.key === 'Escape') {
                // Esc でキャンセル
                e.preventDefault();
                handleCancelEditDescription();
              }
            }}
            onBlur={handleSaveDescription}
            autoFocus
            disabled={isUpdatingDescription}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '2px solid #4262FF',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#1F2937',
              backgroundColor: '#FFFFFF',
              minHeight: '80px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              lineHeight: '1.5',
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            fontSize: '11px',
            color: '#6B7280',
          }}>
            <span>Cmd/Ctrl + Enter で保存、Esc でキャンセル</span>
          </div>
        </div>
      ) : (
        <div
          onDoubleClick={handleStartEditDescription}
          style={{
            fontSize: '14px',
            color: description ? '#1F2937' : '#9CA3AF',
            lineHeight: '1.5',
            cursor: 'pointer',
            padding: '4px 0',
            minHeight: '20px',
            userSelect: 'none',
          }}
          title="ダブルクリックで編集"
        >
          {description || '説明がありません（ダブルクリックで追加）'}
        </div>
      )}
    </div>
  );
}

