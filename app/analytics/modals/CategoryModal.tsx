import { useState, useEffect } from 'react';
import { saveCategory, getCategories, type Category } from '@/lib/orgApi';

interface CategoryModalProps {
  isOpen: boolean;
  editingCategory: Category | null;
  categoryFormTitle: string;
  categoryFormDescription: string;
  categoryFormParentId: string | null;
  categories: Category[];
  showEditCategoriesModal: boolean;
  onClose: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onParentIdChange: (parentId: string | null) => void;
  onCategorySaved: (categories: Category[]) => void;
  onEditCategoriesModalReopen?: () => void;
}

export default function CategoryModal({
  isOpen,
  editingCategory,
  categoryFormTitle,
  categoryFormDescription,
  categoryFormParentId,
  categories,
  showEditCategoriesModal,
  onClose,
  onTitleChange,
  onDescriptionChange,
  onParentIdChange,
  onCategorySaved,
  onEditCategoriesModalReopen,
}: CategoryModalProps) {
  if (!isOpen) return null;

  // 親カテゴリーとして選択可能なカテゴリー（現在編集中のカテゴリーとその子孫を除外）
  const availableParentCategories = categories.filter(cat => {
    if (!editingCategory) return true; // 新規作成時はすべて選択可能
    if (cat.id === editingCategory.id) return false; // 自分自身は除外
    // 子孫カテゴリーも除外（循環参照を防ぐ）
    let currentId: string | undefined = cat.id;
    while (currentId) {
      const parent = categories.find(c => c.id === currentId);
      if (!parent || !parent.parentCategoryId) break;
      if (parent.parentCategoryId === editingCategory.id) return false;
      currentId = parent.parentCategoryId;
    }
    return true;
  });

  const handleSave = async () => {
    if (!categoryFormTitle.trim()) {
      alert('タイトルを入力してください');
      return;
    }
    
    try {
      if (editingCategory) {
        await saveCategory({
          id: editingCategory.id,
          title: categoryFormTitle.trim(),
          description: categoryFormDescription.trim() || undefined,
          parentCategoryId: categoryFormParentId || undefined,
          position: editingCategory.position,
        });
      } else {
        await saveCategory({
          title: categoryFormTitle.trim(),
          description: categoryFormDescription.trim() || undefined,
          parentCategoryId: categoryFormParentId || undefined,
        });
      }
      
      const refreshedCategories = await getCategories();
      onCategorySaved(refreshedCategories);
      onClose();
      
      if (showEditCategoriesModal && onEditCategoriesModalReopen) {
        onEditCategoriesModalReopen();
      }
    } catch (error: any) {
      console.error('カテゴリーの保存に失敗しました:', error);
      alert('カテゴリーの保存に失敗しました');
    }
  };

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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          marginBottom: '20px',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1A1A1A',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          {editingCategory ? 'カテゴリーを編集' : 'カテゴリーを追加'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            タイトル <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={categoryFormTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1.5px solid #E0E0E0',
              borderRadius: '6px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            placeholder="カテゴリーのタイトルを入力"
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            親カテゴリー
          </label>
          <div 
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '8px',
              maxHeight: availableParentCategories.length >= 10 ? '200px' : 'none',
              overflowY: availableParentCategories.length >= 10 ? 'auto' : 'visible',
              paddingRight: availableParentCategories.length >= 10 ? '4px' : '0',
              scrollbarWidth: 'thin',
              scrollbarColor: '#D1D5DB #F3F4F6',
            }}
          >
            <button
              type="button"
              onClick={() => onParentIdChange(null)}
              style={{
                padding: '8px 16px',
                border: `1px solid ${!categoryFormParentId ? '#4262FF' : '#D1D5DB'}`,
                borderRadius: '6px',
                backgroundColor: !categoryFormParentId ? '#EFF6FF' : '#FFFFFF',
                color: !categoryFormParentId ? '#4262FF' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: !categoryFormParentId ? '500' : '400',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (categoryFormParentId) {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#9CA3AF';
                }
              }}
              onMouseLeave={(e) => {
                if (categoryFormParentId) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }
              }}
            >
              なし（トップレベル）
            </button>
            {availableParentCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onParentIdChange(cat.id)}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${categoryFormParentId === cat.id ? '#4262FF' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  backgroundColor: categoryFormParentId === cat.id ? '#EFF6FF' : '#FFFFFF',
                  color: categoryFormParentId === cat.id ? '#4262FF' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: categoryFormParentId === cat.id ? '500' : '400',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (categoryFormParentId !== cat.id) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#9CA3AF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (categoryFormParentId !== cat.id) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }
                }}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            説明
          </label>
          <textarea
            value={categoryFormDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1.5px solid #E0E0E0',
              borderRadius: '6px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              resize: 'vertical',
            }}
            placeholder="カテゴリーの説明を入力（任意）"
          />
        </div>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1A1A1A',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #E0E0E0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#FFFFFF',
              backgroundColor: '#4262FF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {editingCategory ? '更新' : '作成'}
          </button>
        </div>
      </div>
    </div>
  );
}

