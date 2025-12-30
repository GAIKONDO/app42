'use client';

import { useState } from 'react';

interface NDARenewalAlertProps {
  approaching: Array<{ id: string; title: string }>;
  overdue: Array<{ id: string; title: string }>;
  onClose?: () => void;
}

export function NDARenewalAlert({ approaching, overdue, onClose }: NDARenewalAlertProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (approaching.length === 0 && overdue.length === 0) {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px',
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    }}>
      {/* ヘッダー */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span style={{ fontWeight: '600', fontSize: '14px', color: '#92400E' }}>
            NDA更新アラート
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#6B7280',
              padding: '4px',
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#6B7280',
                padding: '4px',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* コンテンツ */}
      {isExpanded && (
        <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }}>
          {/* 更新日が近づいている */}
          {approaching.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#92400E',
              }}>
                NDAの更新日が近づいています（対象：{approaching.length}件）
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: '#374151',
              }}>
                {approaching.map((item) => (
                  <li key={item.id} style={{ marginBottom: '4px' }}>
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 更新期限を過ぎている */}
          {overdue.length > 0 && (
            <div>
              <div style={{
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#DC2626',
              }}>
                NDAを更新してください（対象：{overdue.length}件）
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: '#374151',
              }}>
                {overdue.map((item) => (
                  <li key={item.id} style={{ marginBottom: '4px' }}>
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

