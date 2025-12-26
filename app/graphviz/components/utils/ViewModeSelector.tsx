/**
 * 2D/3D表示モード切り替えコンポーネント
 */

'use client';

import { useState } from 'react';

export type ViewMode = '2d' | '3d';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ViewModeSelector({
  mode,
  onModeChange,
  className,
  style,
}: ViewModeSelectorProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => onModeChange('2d')}
        style={{
          padding: '6px 16px',
          fontSize: '13px',
          fontWeight: mode === '2d' ? 600 : 400,
          backgroundColor: mode === '2d' ? '#3B82F6' : '#F3F4F6',
          color: mode === '2d' ? '#FFFFFF' : '#6B7280',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={(e) => {
          if (mode !== '2d') {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }
        }}
        onMouseLeave={(e) => {
          if (mode !== '2d') {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }
        }}
        title="2D表示（Graphviz）"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 3H17V17H3V3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 9H17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9 3V17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        2D表示
      </button>

      <button
        type="button"
        onClick={() => onModeChange('3d')}
        style={{
          padding: '6px 16px',
          fontSize: '13px',
          fontWeight: mode === '3d' ? 600 : 400,
          backgroundColor: mode === '3d' ? '#3B82F6' : '#F3F4F6',
          color: mode === '3d' ? '#FFFFFF' : '#6B7280',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        onMouseEnter={(e) => {
          if (mode !== '3d') {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }
        }}
        onMouseLeave={(e) => {
          if (mode !== '3d') {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }
        }}
        title="3D表示（Three.js）"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2L2 7L10 12L18 7L10 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 17L10 12L18 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 12L10 7L18 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        3D表示
      </button>
    </div>
  );
}

