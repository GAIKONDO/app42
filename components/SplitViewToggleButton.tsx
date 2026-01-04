'use client';

import React from 'react';
import { useSplitView } from './SplitViewProvider';

export default function SplitViewToggleButton() {
  const { isSplitViewEnabled, toggleSplitView } = useSplitView();

  return (
    <button
      onClick={toggleSplitView}
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: isSplitViewEnabled ? 'rgba(59, 130, 246, 0.9)' : 'rgba(45, 45, 45, 0.9)',
        color: '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease',
        zIndex: 999,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
      }}
      title={isSplitViewEnabled ? '分割ビューを無効化' : '分割ビューを有効化'}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isSplitViewEnabled ? (
          // 分割ビュー無効化アイコン（結合）
          <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8M8 12h8" />
        ) : (
          // 分割ビュー有効化アイコン（分割）
          <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 8v8" />
        )}
      </svg>
    </button>
  );
}

