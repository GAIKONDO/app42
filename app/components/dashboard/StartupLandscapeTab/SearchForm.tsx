'use client';

import React from 'react';
import { toggleStartupFavorite } from '@/lib/orgApi';
import type { Startup } from '@/lib/orgApi';
import type { SearchFormProps } from './types';

export default function SearchForm({
  searchQuery,
  setSearchQuery,
  showSearchSuggestions,
  setShowSearchSuggestions,
  searchInputFocused,
  setSearchInputFocused,
  searchSuggestions,
  startups,
  setStartups,
}: SearchFormProps) {
  return (
    <div style={{ 
      marginBottom: '24px',
    }} data-search-input>
      <div style={{
        position: 'relative',
        maxWidth: '500px',
      }}>
        <input
          type="text"
          placeholder="スタートアップ名で検索..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSearchSuggestions(true);
          }}
          onFocus={() => {
            setSearchInputFocused(true);
            if (searchSuggestions.length > 0) {
              setShowSearchSuggestions(true);
            }
          }}
          onBlur={() => {
            setSearchInputFocused(false);
            // 少し遅延させてから閉じる（候補クリックを可能にするため）
            setTimeout(() => {
              setShowSearchSuggestions(false);
            }, 200);
          }}
          style={{
            width: '100%',
            padding: '12px 16px 12px 44px',
            border: '1.5px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            color: '#1A1A1A',
            transition: 'all 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3B82F6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <div style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9CA3AF',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowSearchSuggestions(false);
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        
        {/* 予測変換ドロップダウン */}
        {showSearchSuggestions && searchSuggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
          }}>
            {searchSuggestions.map((startup, index) => (
              <div
                key={startup.id || index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: index < searchSuggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery(startup.title);
                    setShowSearchSuggestions(false);
                  }}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#1A1A1A',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {startup.title}
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!startup.id) return;
                    try {
                      const newFavoriteState = await toggleStartupFavorite(startup.id);
                      // ローカル状態を更新
                      setStartups(prev => prev.map(s => 
                        s.id === startup.id ? { ...s, isFavorite: newFavoriteState } : s
                      ));
                    } catch (error: any) {
                      console.error('❌ お気に入りの切り替えに失敗しました:', error);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    backgroundColor: 'transparent',
                    color: startup.isFavorite ? '#F59E0B' : '#9CA3AF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    opacity: startup.isFavorite ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    marginLeft: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = '#F59E0B';
                    e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = startup.isFavorite ? 1 : 0.5;
                    e.currentTarget.style.color = startup.isFavorite ? '#F59E0B' : '#9CA3AF';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title={startup.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={startup.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

