'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ContentSectionProps {
  isEditing: boolean;
  editingContent: string;
  setEditingContent: (content: string) => void;
}

export default function ContentSection({
  isEditing,
  editingContent,
  setEditingContent,
}: ContentSectionProps) {
  return (
    <div style={{ marginTop: '32px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
        詳細コンテンツ
      </label>
      {isEditing ? (
        <div>
          <textarea
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
            placeholder="詳細コンテンツをマークダウン形式で入力してください..."
            style={{
              width: '100%',
              minHeight: '500px',
              padding: '12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              lineHeight: '1.6',
            }}
          />
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
            💡 マークダウン形式で記述できます（例: **太字**, *斜体*, `コード`, # 見出し, - リストなど）
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '6px',
            minHeight: '400px',
            border: '1px solid #E5E7EB',
          }}
        >
          {editingContent ? (
            <div
              className="markdown-content"
              style={{
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {editingContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
              詳細コンテンツがありません。編集ボタンから追加してください。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

