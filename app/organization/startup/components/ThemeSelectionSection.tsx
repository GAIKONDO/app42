'use client';

import React from 'react';
import type { Theme } from '@/lib/orgApi';

interface ThemeSelectionSectionProps {
  themes: Theme[];
  localThemeIds: string[];
  setLocalThemeIds: (ids: string[]) => void;
  isThemesExpanded: boolean;
  setIsThemesExpanded: (expanded: boolean) => void;
}

export default function ThemeSelectionSection({
  themes,
  localThemeIds,
  setLocalThemeIds,
  isThemesExpanded,
  setIsThemesExpanded,
}: ThemeSelectionSectionProps) {
  return (
    <div style={{ marginBottom: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px',
          cursor: 'pointer',
        }}
        onClick={() => setIsThemesExpanded(!isThemesExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', transition: 'transform 0.2s', transform: isThemesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
          <label style={{ display: 'block', fontWeight: '600', color: '#374151', fontSize: '16px', cursor: 'pointer' }}>
            関連テーマ（複数選択可能）
            {localThemeIds.length > 0 && (
              <span style={{ fontSize: '14px', fontWeight: '400', color: '#6B7280', marginLeft: '8px' }}>
                ({localThemeIds.length}件)
              </span>
            )}
          </label>
        </div>
      </div>
      
      {/* 開閉式の内容 */}
      {isThemesExpanded && (
        <>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
            この注力施策が関連する分析ページのテーマを選択してください
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {themes.map((theme) => {
              const isSelected = localThemeIds.includes(theme.id);
              return (
                <label
                  key={theme.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : '#D1D5DB'}`,
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalThemeIds([...localThemeIds, theme.id]);
                      } else {
                        setLocalThemeIds(localThemeIds.filter(id => id !== theme.id));
                      }
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  {theme.title}
                </label>
              );
            })}
          </div>
          {themes.length === 0 && (
            <div style={{ fontSize: '14px', color: '#9CA3AF', fontStyle: 'italic', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px dashed #D1D5DB' }}>
              テーマがありません。分析ページでテーマを作成してください。
            </div>
          )}
        </>
      )}
    </div>
  );
}

