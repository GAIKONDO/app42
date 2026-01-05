'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIGenerationComparisonView from './AIGenerationComparisonView';

interface DescriptionSectionProps {
  localDescription: string;
  setLocalDescription: (description: string) => void;
  descriptionTextareaId: string;
  isEditingDescription: boolean;
  setIsEditingDescription: (editing: boolean) => void;
  setAIGenerationTarget: (target: 'description' | 'objective' | null) => void;
  setAIGenerationInput: (input: string) => void;
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  setAiSummaryLength: (length: number) => void;
  setAiCustomPrompt: (prompt: string) => void;
  setIsAIGenerationModalOpen: (open: boolean) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: 'description' | 'objective' | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | null) => void;
  setOriginalContent: (content: string | null) => void;
}

export default function DescriptionSection({
  localDescription,
  setLocalDescription,
  descriptionTextareaId,
  isEditingDescription,
  setIsEditingDescription,
  setAIGenerationTarget,
  setAIGenerationInput,
  setSelectedTopicIdsForAI,
  setAiSummaryFormat,
  setAiSummaryLength,
  setAiCustomPrompt,
  setIsAIGenerationModalOpen,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
}: DescriptionSectionProps) {
  const handleOpenAIModal = () => {
    setAIGenerationTarget('description');
    setAIGenerationInput('');
    setSelectedTopicIdsForAI([]);
    setAiSummaryFormat('auto');
    setAiSummaryLength(1000);
    setAiCustomPrompt('');
    setIsAIGenerationModalOpen(true);
  };

  const handleUndo = () => {
    setLocalDescription(originalContent || '');
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  const handleKeep = () => {
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: '600', color: '#374151' }}>
            説明
          </label>
          {isEditingDescription && (
            <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
              ID: {descriptionTextareaId}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {!isEditingDescription && (
            <button
              onClick={handleOpenAIModal}
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
            onClick={() => {
              setIsEditingDescription(!isEditingDescription);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              padding: 0,
              backgroundColor: isEditingDescription ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: isEditingDescription ? '#10B981' : '#9CA3AF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              opacity: isEditingDescription ? 1 : 0.3,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isEditingDescription) {
                e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.color = '#6B7280';
              }
            }}
            onMouseLeave={(e) => {
              if (!isEditingDescription) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.3';
                e.currentTarget.style.color = '#9CA3AF';
              }
            }}
            title={isEditingDescription ? '完了' : '編集'}
          >
            {isEditingDescription ? (
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
      {!isAIGenerationModalOpen && aiGeneratedTarget === 'description' && (
        <AIGenerationComparisonView
          aiGeneratedContent={aiGeneratedContent}
          originalContent={originalContent}
          onUndo={handleUndo}
          onKeep={handleKeep}
        />
      )}
      
      {isEditingDescription ? (
        <textarea
          id={descriptionTextareaId}
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          placeholder="施策の説明を入力（マークダウン記法対応）"
          rows={8}
          style={{
            width: '100%',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'monospace',
            resize: 'vertical',
            lineHeight: '1.6',
          }}
        />
      ) : (
        <div
          style={{
            padding: '16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            minHeight: '100px',
          }}
        >
          {localDescription ? (
            <div
              className="markdown-content"
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {localDescription}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
              説明が入力されていません。「編集」ボタンから追加してください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

