import React, { useState } from 'react';
import type { ComparisonSectionType, ComparisonAxis } from './types';

interface AxisOptionsEditModalProps {
  isOpen: boolean;
  section: ComparisonSectionType;
  axis: ComparisonAxis;
  onAddOption: (option: string) => void;
  onRemoveOption: (option: string) => void;
  onClose: () => void;
}

export default function AxisOptionsEditModal({
  isOpen,
  section,
  axis,
  onAddOption,
  onRemoveOption,
  onClose,
}: AxisOptionsEditModalProps) {
  const [newOptionInput, setNewOptionInput] = useState('');

  if (!isOpen) return null;

  const options = axis.options || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151',
        }}>
          選択肢を編集: {axis.label}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newOptionInput}
              onChange={(e) => setNewOptionInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newOptionInput.trim()) {
                  onAddOption(newOptionInput.trim());
                  setNewOptionInput('');
                }
              }}
              placeholder="新しい選択肢を入力"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            <button
              onClick={() => {
                if (newOptionInput.trim()) {
                  onAddOption(newOptionInput.trim());
                  setNewOptionInput('');
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4262FF',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              追加
            </button>
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {options.map((option, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#374151' }}>{option}</span>
              <button
                onClick={() => onRemoveOption(option)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#FEF2F2',
                  color: '#EF4444',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                削除
              </button>
            </div>
          ))}
          {options.length === 0 && (
            <p style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', margin: '16px 0' }}>
              選択肢がありません。上記の入力欄から追加してください。
            </p>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

