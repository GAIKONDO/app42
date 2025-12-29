'use client';

import { useState, useRef, useEffect } from 'react';
import type { Category } from '@/lib/orgApi';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onSelect: (categoryIds: string[]) => void;
}

export default function CategorySelector({ 
  categories, 
  selectedCategoryIds, 
  onSelect
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 親カテゴリー（トップレベル）を取得
  const topLevelCategories = categories.filter(cat => !cat.parentCategoryId);
  
  // 子カテゴリーを取得する関数
  const getChildren = (parentId: string) => categories.filter(cat => cat.parentCategoryId === parentId);

  // 選択されたカテゴリーを取得
  const getSelectedCategories = () => {
    return categories.filter(cat => selectedCategoryIds.includes(cat.id));
  };

  // クリックアウトサイドで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onSelect(selectedCategoryIds.filter(id => id !== categoryId));
    } else {
      onSelect([...selectedCategoryIds, categoryId]);
    }
  };

  const renderCategoryOption = (category: Category, level: number = 0) => {
    const isSelected = selectedCategoryIds.includes(category.id);
    const children = getChildren(category.id);
    const indent = level * 16;

    return (
      <div key={category.id}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleCategory(category.id);
          }}
          style={{
            padding: '8px 12px',
            paddingLeft: `${12 + indent}px`,
            fontSize: '14px',
            fontWeight: isSelected ? '600' : '400',
            color: isSelected ? '#4262FF' : '#1A1A1A',
            backgroundColor: isSelected ? '#E3F2FD' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* チェックボックス */}
          <div
            style={{
              width: '16px',
              height: '16px',
              border: `2px solid ${isSelected ? '#4262FF' : '#C4C4C4'}`,
              borderRadius: '4px',
              backgroundColor: isSelected ? '#4262FF' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M10 3L4.5 8.5L2 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span>{category.title}</span>
        </div>
        {children.map(child => renderCategoryOption(child, level + 1))}
      </div>
    );
  };

  const selectedCategories = getSelectedCategories();
  const removeCategory = (categoryId: string) => {
    onSelect(selectedCategoryIds.filter(id => id !== categoryId));
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        alignItems: 'center',
        minHeight: '42px',
      }}>
        {/* 選択されたカテゴリーのバッジ */}
        {selectedCategories.length === 0 ? (
          <div style={{
            padding: '8px 12px',
            fontSize: '14px',
            color: '#6B7280',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            すべて表示
          </div>
        ) : (
          selectedCategories.map((category) => (
            <div
              key={category.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#E3F2FD',
                border: '1px solid #4262FF',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#4262FF',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              <span>{category.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCategory(category.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  padding: 0,
                  margin: 0,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  color: '#4262FF',
                  transition: 'all 0.15s',
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
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M9 3L3 9M3 3L9 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ))
        )}
        
        {/* 全てクリアボタン */}
        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect([]);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6B7280',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#C4C4C4';
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.color = '#1A1A1A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E0E0E0';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M11 3L3 11M3 3L11 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>全てクリア</span>
          </button>
        )}
        
        {/* ドロップダウンボタン */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1A1A1A',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E0E0E0',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#C4C4C4';
            e.currentTarget.style.backgroundColor = '#F5F5F5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E0E0E0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>カテゴリーを選択</span>
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect([]);
            }}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: selectedCategoryIds.length === 0 ? '600' : '400',
              color: selectedCategoryIds.length === 0 ? '#4262FF' : '#1A1A1A',
              backgroundColor: selectedCategoryIds.length === 0 ? '#E3F2FD' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #F0F0F0',
            }}
            onMouseEnter={(e) => {
              if (selectedCategoryIds.length > 0) {
                e.currentTarget.style.backgroundColor = '#F5F5F5';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCategoryIds.length > 0) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: `2px solid ${selectedCategoryIds.length === 0 ? '#4262FF' : '#C4C4C4'}`,
                borderRadius: '4px',
                backgroundColor: selectedCategoryIds.length === 0 ? '#4262FF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {selectedCategoryIds.length === 0 && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span>すべて表示</span>
          </div>
          {topLevelCategories.map(category => renderCategoryOption(category))}
        </div>
      )}
    </div>
  );
}

