'use client';

import React from 'react';
import type { ViewModeToggleProps } from './types';

export default function ViewModeToggle({
  viewMode,
  setViewMode,
  displayMode,
  setDisplayMode,
  favoriteFilter,
  setFavoriteFilter,
}: ViewModeToggleProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      {displayMode !== 'bizdev' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('all')}
            style={{
              padding: '8px 16px',
              backgroundColor: viewMode === 'all' ? '#3B82F6' : '#E5E7EB',
              color: viewMode === 'all' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            サブカテゴリー表示
          </button>
          <button
            onClick={() => setViewMode('parent-only')}
            style={{
              padding: '8px 16px',
              backgroundColor: viewMode === 'parent-only' ? '#3B82F6' : '#E5E7EB',
              color: viewMode === 'parent-only' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            親カテゴリー表示
          </button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
        <button
          onClick={() => setDisplayMode('box')}
          style={{
            padding: '8px 16px',
            backgroundColor: displayMode === 'box' ? '#3B82F6' : '#E5E7EB',
            color: displayMode === 'box' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          ボックス形式
        </button>
        <button
          onClick={() => setDisplayMode('landscape')}
          style={{
            padding: '8px 16px',
            backgroundColor: displayMode === 'landscape' ? '#3B82F6' : '#E5E7EB',
            color: displayMode === 'landscape' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          ランドスケープ形式
        </button>
        <button
          onClick={() => setDisplayMode('bizdev')}
          style={{
            padding: '8px 16px',
            backgroundColor: displayMode === 'bizdev' ? '#3B82F6' : '#E5E7EB',
            color: displayMode === 'bizdev' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          Biz-Dev形式
        </button>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
        <button
          onClick={() => setFavoriteFilter('all')}
          style={{
            padding: '8px 16px',
            backgroundColor: favoriteFilter === 'all' ? '#3B82F6' : '#E5E7EB',
            color: favoriteFilter === 'all' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          すべて
        </button>
        <button
          onClick={() => setFavoriteFilter('favorite')}
          style={{
            padding: '8px 16px',
            backgroundColor: favoriteFilter === 'favorite' ? '#F59E0B' : '#E5E7EB',
            color: favoriteFilter === 'favorite' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={favoriteFilter === 'favorite' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          お気に入りのみ
        </button>
      </div>
    </div>
  );
}

