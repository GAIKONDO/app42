'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIGenerationComparisonView from '../../sections/AIGenerationComparisonView';
import type { ComparisonSectionType } from './types';

interface SectionDescriptionEditorProps {
  description: string;
  sectionLabel: string;
  sectionType: ComparisonSectionType;
  onSave: (description: string) => void;
  onOpenAIModal: (sectionType: ComparisonSectionType) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: ComparisonSectionType | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  onUndo: () => void;
  onKeep: () => void;
}

export default function SectionDescriptionEditor({
  description,
  sectionLabel,
  sectionType,
  onSave,
  onOpenAIModal,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  onUndo,
  onKeep,
}: SectionDescriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingDescription, setEditingDescription] = useState(description);

  // descriptionが変更されたらeditingDescriptionも更新
  useEffect(() => {
    if (!isEditing) {
      setEditingDescription(description);
    }
  }, [description, isEditing]);

  const handleStartEdit = () => {
    setEditingDescription(description);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(editingDescription);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingDescription(description);
    setIsEditing(false);
  };

  return (
    <div style={{
      marginTop: '24px',
      padding: '20px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
        }}>
          {sectionLabel}セクションの解説
        </h4>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {!isEditing && (
            <button
              onClick={() => onOpenAIModal(sectionType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                backgroundColor: 'transparent',
                color: '#3B82F6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: 0.6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.6';
              }}
              title="AIで作文"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            onClick={isEditing ? handleSave : handleStartEdit}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            backgroundColor: isEditing ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            color: isEditing ? '#10B981' : '#9CA3AF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: isEditing ? 1 : 0.3,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isEditing) {
              e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.color = '#6B7280';
            }
          }}
          onMouseLeave={(e) => {
            if (!isEditing) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.opacity = '0.3';
              e.currentTarget.style.color = '#9CA3AF';
            }
          }}
          title={isEditing ? '保存' : description ? '編集' : '解説を追加'}
        >
          {isEditing ? (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          )}
        </button>
        </div>
      </div>

      {/* AI生成結果の比較ビュー（モーダルが閉じている時のみ表示） */}
      {!isAIGenerationModalOpen && aiGeneratedTarget === sectionType && (
        <AIGenerationComparisonView
          aiGeneratedContent={aiGeneratedContent}
          originalContent={originalContent}
          onUndo={onUndo}
          onKeep={onKeep}
        />
      )}

      {isEditing ? (
        <div>
          <textarea
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            placeholder="解説文をマークダウン形式で入力してください..."
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              lineHeight: '1.6',
              backgroundColor: '#FFFFFF',
            }}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
            💡 マークダウン形式で記述できます（例: **太字**, *斜体*, `コード`, # 見出し, - リストなど）
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            minHeight: '100px',
            border: '1px solid #E5E7EB',
          }}
        >
          {description ? (
            <div
              className="markdown-content"
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {description}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px', margin: 0 }}>
              解説文がありません。「解説を追加」ボタンから追加してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

