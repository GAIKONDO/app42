/**
 * ブレッドクラムコンポーネント
 * 現在の階層位置を表示し、クリックで移動可能
 */

'use client';

import type { BreadcrumbItem } from './useHierarchyState';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onItemClick: (index: number) => void;
  currentCardName?: string | null; // 全体レベルでカード名を表示する場合
}

export function Breadcrumb({ items, onItemClick, currentCardName }: BreadcrumbProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 16px',
      backgroundColor: '#F9FAFB',
      borderRadius: '8px',
      marginBottom: '16px',
      border: '1px solid #E5E7EB',
    }}>
      <span style={{ 
        fontSize: '14px', 
        color: '#6B7280',
        fontWeight: 500,
      }}>
        位置:
      </span>
      <button
        onClick={() => onItemClick(-1)}
        style={{
          padding: '4px 12px',
          fontSize: '14px',
          color: '#4262FF',
          backgroundColor: 'transparent',
          border: '1px solid #4262FF',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 500,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4262FF';
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#4262FF';
        }}
      >
        全体
      </button>
      {currentCardName && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '16px' }}>/</span>
          <span style={{
            padding: '4px 12px',
            fontSize: '14px',
            color: '#6B7280',
            fontWeight: 500,
          }}>
            {currentCardName}
          </span>
        </span>
      )}
      {items.map((item, index) => (
        <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#9CA3AF', fontSize: '16px' }}>/</span>
          <button
            onClick={() => onItemClick(index)}
            style={{
              padding: '4px 12px',
              fontSize: '14px',
              color: '#4262FF',
              backgroundColor: 'transparent',
              border: '1px solid #4262FF',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4262FF';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#4262FF';
            }}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  );
}

