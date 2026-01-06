import React from 'react';
import type { ComparisonSectionType } from './types';

interface DeleteAllConfirmModalProps {
  isOpen: boolean;
  section: ComparisonSectionType;
  axesCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const sectionLabels: Record<ComparisonSectionType, string> = {
  general: '一般',
  function: '機能',
  target: 'ターゲット層',
};

export default function DeleteAllConfirmModal({
  isOpen,
  section,
  axesCount,
  onConfirm,
  onCancel,
}: DeleteAllConfirmModalProps) {
  if (!isOpen) return null;

  return (
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
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '500px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
        }}>
          すべての比較軸を削除
        </h3>
        <p style={{
          margin: 0,
          marginBottom: '24px',
          fontSize: '14px',
          color: '#6B7280',
          lineHeight: '1.5',
        }}>
          {sectionLabels[section]}セクションのすべての比較軸（{axesCount}件）を削除しますか？<br />
          この操作は取り消せません。
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#EF4444';
            }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

