'use client';

import { useState, useEffect } from 'react';
import { getAllStartups } from '@/lib/orgApi';
import type { Startup } from '@/lib/orgApi';

interface AddStartupModalProps {
  isOpen: boolean;
  newStartupId: string;
  newStartupTitle: string;
  newStartupDescription: string;
  savingStartup: boolean;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}

export default function AddStartupModal({
  isOpen,
  newStartupId,
  newStartupTitle,
  newStartupDescription,
  savingStartup,
  onClose,
  onSave,
  onTitleChange,
  onDescriptionChange,
}: AddStartupModalProps) {
  const [allStartups, setAllStartups] = useState<Startup[]>([]);
  const [duplicateStartups, setDuplicateStartups] = useState<Startup[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // 全組織のスタートアップを取得
  useEffect(() => {
    if (isOpen) {
      const loadAllStartups = async () => {
        try {
          const startups = await getAllStartups();
          setAllStartups(startups);
        } catch (error) {
          console.error('全組織のスタートアップ取得に失敗:', error);
        }
      };
      loadAllStartups();
    }
  }, [isOpen]);

  // タイトルが変更されたときに重複をチェック
  useEffect(() => {
    if (!isOpen || !newStartupTitle.trim()) {
      setDuplicateStartups([]);
      return;
    }

    setCheckingDuplicates(true);
    const trimmedTitle = newStartupTitle.trim();
    
    // タイトルが完全一致するスタートアップを検索（大文字小文字を区別しない）
    const duplicates = allStartups.filter(startup => 
      startup.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
    );
    
    setDuplicateStartups(duplicates);
    setCheckingDuplicates(false);
  }, [newStartupTitle, allStartups, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => {
        if (!savingStartup) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '560px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div style={{ marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #F3F4F6' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#111827',
          }}>
            新しいスタートアップを追加
          </h3>
          <p style={{ 
            margin: '8px 0 0 0', 
            fontSize: '14px', 
            color: '#6B7280',
          }}>
            スタートアップの情報を入力してください
          </p>
        </div>

        {/* ユニークIDセクション */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: '#F9FAFB',
          borderRadius: '12px', 
          border: '1px solid #E5E7EB',
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6B7280',
          }}>
            ユニークID
          </label>
          <div style={{ 
            fontSize: '14px', 
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace', 
            color: '#111827', 
            fontWeight: '600',
            wordBreak: 'break-all',
          }}>
            {newStartupId || '生成中...'}
          </div>
        </div>

        {/* タイトル入力 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            <span>タイトル</span>
            <span style={{ 
              marginLeft: '6px',
              color: '#EF4444',
              fontSize: '16px',
            }}>*</span>
          </label>
          <input
            type="text"
            value={newStartupTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="スタートアップのタイトルを入力"
            autoFocus
            disabled={savingStartup}
            onFocus={(e) => {
              if (!savingStartup) {
                e.target.style.borderColor = duplicateStartups.length > 0 ? '#EF4444' : 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = duplicateStartups.length > 0 ? '#EF4444' : '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${duplicateStartups.length > 0 ? '#EF4444' : '#E5E7EB'}`,
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingStartup ? '#F3F4F6' : '#FFFFFF',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {/* 重複チェック結果の表示 */}
          {checkingDuplicates && (
            <div style={{ 
              marginTop: '8px', 
              fontSize: '12px', 
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              重複をチェック中...
            </div>
          )}
          {!checkingDuplicates && duplicateStartups.length > 0 && (
            <div style={{ 
              marginTop: '8px', 
              padding: '12px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '8px',
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px',
                marginBottom: '8px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#DC2626',
                    marginBottom: '6px',
                  }}>
                    同じタイトルのスタートアップが既に存在します（{duplicateStartups.length}件）
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#991B1B',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    {duplicateStartups.slice(0, 3).map((startup, index) => (
                      <div key={startup.id} style={{ 
                        padding: '6px 8px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        border: '1px solid #FCA5A5',
                      }}>
                        <span style={{ fontWeight: '500' }}>{startup.title}</span>
                        {startup.organizationId && (
                          <span style={{ color: '#6B7280', marginLeft: '8px' }}>
                            (組織ID: {startup.organizationId.substring(0, 8)}...)
                          </span>
                        )}
                      </div>
                    ))}
                    {duplicateStartups.length > 3 && (
                      <div style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' }}>
                        他 {duplicateStartups.length - 3} 件の重複があります
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 説明入力 */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
          }}>
            説明
          </label>
          <textarea
            value={newStartupDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="スタートアップの説明を入力（任意）"
            disabled={savingStartup}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              fontSize: '15px',
              color: '#111827',
              backgroundColor: savingStartup ? '#F3F4F6' : '#FFFFFF',
              minHeight: '100px',
              resize: 'vertical',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => {
              if (!savingStartup) {
                e.target.style.borderColor = 'var(--color-primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={savingStartup}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savingStartup ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: savingStartup ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={onSave}
            disabled={savingStartup || !newStartupTitle.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: savingStartup || !newStartupTitle.trim() ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: savingStartup || !newStartupTitle.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {savingStartup ? '保存中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}

