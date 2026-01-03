/**
 * スタートアップランドスケープ表示タブ
 * カテゴリー別にスタートアップを表示
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  getAllStartups, 
  getCategories, 
  getBizDevPhases,
  getStatuses,
  toggleStartupFavorite,
  type Startup, 
  type Category,
  type BizDevPhase,
  type Status,
} from '@/lib/orgApi';

interface StartupLandscapeTabProps {
  // 必要に応じてpropsを追加
}

export function StartupLandscapeTab({}: StartupLandscapeTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedBizDevPhaseIds, setSelectedBizDevPhaseIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'parent-only'>('all');
  const [displayMode, setDisplayMode] = useState<'box' | 'landscape' | 'bizdev'>('bizdev');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showBizDevPhaseFilter, setShowBizDevPhaseFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [favoriteFilter, setFavoriteFilter] = useState<'all' | 'favorite'>('all');

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriesData, startupsData, bizDevPhasesData, statusesData] = await Promise.all([
          getCategories().catch((err) => {
            console.warn('カテゴリーの取得に失敗しました:', err);
            return [];
          }),
          getAllStartups().catch((err) => {
            console.warn('スタートアップの取得に失敗しました:', err);
            return [];
          }),
          getBizDevPhases().catch((err) => {
            console.warn('Biz-Devフェーズの取得に失敗しました:', err);
            return [];
          }),
          getStatuses().catch((err) => {
            console.warn('ステータスの取得に失敗しました:', err);
            return [];
          }),
        ]);

        setCategories(categoriesData);
        setStartups(startupsData);
        setBizDevPhases(bizDevPhasesData);
        setStatuses(statusesData);
      } catch (err: any) {
        console.error('データの読み込みに失敗しました:', err);
        setError(`データの読み込みに失敗しました: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 検索候補を取得（スタートアップオブジェクトの配列）
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) {
      return [];
    }
    
    const query = searchQuery.trim().toLowerCase();
    const matchingStartups = startups
      .filter(startup => startup.title.toLowerCase().includes(query))
      .slice(0, 10); // 最大10件まで表示
    
    // 重複を除去（タイトルで）
    const seenTitles = new Set<string>();
    return matchingStartups.filter(startup => {
      if (seenTitles.has(startup.title)) {
        return false;
      }
      seenTitles.add(startup.title);
      return true;
    });
  }, [startups, searchQuery]);

  // ドロップダウンを外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-filter-dropdown]')) {
        setShowCategoryFilter(false);
        setShowBizDevPhaseFilter(false);
      }
      if (!target.closest('[data-search-input]')) {
        setShowSearchSuggestions(false);
      }
    };

    if (showCategoryFilter || showBizDevPhaseFilter || showSearchSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCategoryFilter, showBizDevPhaseFilter, showSearchSuggestions]);

  // 親カテゴリーのみを取得
  const parentCategories = useMemo(() => {
    return categories.filter(cat => !cat.parentCategoryId).sort((a, b) => {
      const posA = a.position ?? 999999;
      const posB = b.position ?? 999999;
      return posA - posB;
    });
  }, [categories]);

  // 親カテゴリーとその子カテゴリーを階層的に取得
  const categoryHierarchy = useMemo(() => {
    return parentCategories.map(parent => {
      const children = categories
        .filter(cat => cat.parentCategoryId === parent.id)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      return {
        parent,
        children,
      };
    });
  }, [categories, parentCategories]);

  // 選択されたカテゴリーとBiz-Devフェーズ、検索クエリでフィルタリングされたスタートアップを取得
  const filteredStartups = useMemo(() => {
    let filtered = startups;
    
    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(startup => 
        startup.title.toLowerCase().includes(query)
      );
    }
    
    // カテゴリーでフィルタリング（複数選択対応）
    if (selectedCategoryIds.size > 0) {
      // 選択されたカテゴリーとその子カテゴリーを取得
      const getCategoryAndChildren = (categoryId: string): string[] => {
        const categoryIds = [categoryId];
        const childCategories = categories.filter(c => c.parentCategoryId === categoryId);
        childCategories.forEach(child => {
          categoryIds.push(...getCategoryAndChildren(child.id));
        });
        return categoryIds;
      };
      
      const targetCategoryIds = new Set<string>();
      selectedCategoryIds.forEach(categoryId => {
        const categoryAndChildren = getCategoryAndChildren(categoryId);
        categoryAndChildren.forEach(id => targetCategoryIds.add(id));
      });
      
      filtered = filtered.filter(startup => 
        startup.categoryIds && 
        startup.categoryIds.some(catId => targetCategoryIds.has(catId))
      );
    }
    
    // Biz-Devフェーズでフィルタリング（複数選択対応）
    if (selectedBizDevPhaseIds.size > 0) {
      filtered = filtered.filter(startup => 
        startup.bizDevPhase && selectedBizDevPhaseIds.has(startup.bizDevPhase)
      );
    }
    
    // お気に入りでフィルタリング
    if (favoriteFilter === 'favorite') {
      filtered = filtered.filter(startup => startup.isFavorite === true);
    }
    
    return filtered;
  }, [startups, selectedCategoryIds, selectedBizDevPhaseIds, categories, searchQuery, favoriteFilter]);

  // カテゴリー別にスタートアップをグループ化（フィルター適用済みのスタートアップを使用）
  const startupsByCategory = useMemo(() => {
    const grouped: Record<string, Startup[]> = {};
    
    // すべてのカテゴリー（親と子）を初期化
    categories.forEach(category => {
      grouped[category.id] = [];
    });
    
    // フィルター適用済みのスタートアップを使用
    filteredStartups.forEach(startup => {
      if (startup.categoryIds && startup.categoryIds.length > 0) {
        startup.categoryIds.forEach(categoryId => {
          if (grouped[categoryId]) {
            grouped[categoryId].push(startup);
          }
        });
      }
    });
    
    return grouped;
  }, [filteredStartups, categories]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '14px',
        }}>
          <strong>エラー:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>
          スタートアップランドスケープ
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
          カテゴリー別にスタートアップを表示します
        </p>
      </div>

      {/* 検索フォーム */}
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

      {/* フィルターとビューモード */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* カテゴリーフィルター */}
          <div style={{ position: 'relative' }} data-filter-dropdown>
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginRight: '8px' }}>
              カテゴリー:
            </label>
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              style={{
                padding: '8px 36px 8px 12px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: selectedCategoryIds.size > 0 ? '#1F2937' : '#9CA3AF',
                fontWeight: selectedCategoryIds.size > 0 ? '500' : '400',
                cursor: 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                transition: 'all 0.2s ease',
              }}
            >
              {selectedCategoryIds.size > 0 
                ? `${selectedCategoryIds.size}件選択中`
                : 'すべてのカテゴリー'}
            </button>
            {showCategoryFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '250px',
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '8px',
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                    カテゴリーを選択
                  </span>
                  {selectedCategoryIds.size > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategoryIds(new Set());
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                    >
                      クリア
                    </button>
                  )}
                </div>
                {parentCategories.map(category => (
                  <label
                    key={category.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.has(category.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedCategoryIds);
                        if (e.target.checked) {
                          newSet.add(category.id);
                        } else {
                          newSet.delete(category.id);
                        }
                        setSelectedCategoryIds(newSet);
                      }}
                      style={{
                        marginRight: '8px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#1A1A1A' }}>
                      {category.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedCategoryIds.size > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '8px',
              }}>
                {Array.from(selectedCategoryIds).map(categoryId => {
                  const category = parentCategories.find(c => c.id === categoryId);
                  if (!category) return null;
                  return (
                    <span
                      key={categoryId}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {category.title}
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedCategoryIds);
                          newSet.delete(categoryId);
                          setSelectedCategoryIds(newSet);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1E40AF',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '14px',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Biz-Devフェーズフィルター */}
          <div style={{ position: 'relative' }} data-filter-dropdown>
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginRight: '8px' }}>
              Biz-Devフェーズ:
            </label>
            <button
              onClick={() => setShowBizDevPhaseFilter(!showBizDevPhaseFilter)}
              style={{
                padding: '8px 36px 8px 12px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: selectedBizDevPhaseIds.size > 0 ? '#1F2937' : '#9CA3AF',
                fontWeight: selectedBizDevPhaseIds.size > 0 ? '500' : '400',
                cursor: 'pointer',
                minWidth: '200px',
                textAlign: 'left',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                transition: 'all 0.2s ease',
              }}
            >
              {selectedBizDevPhaseIds.size > 0 
                ? `${selectedBizDevPhaseIds.size}件選択中`
                : 'すべてのBiz-Devフェーズ'}
            </button>
            {showBizDevPhaseFilter && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                minWidth: '250px',
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '8px',
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #E5E7EB',
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>
                    Biz-Devフェーズを選択
                  </span>
                  {selectedBizDevPhaseIds.size > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBizDevPhaseIds(new Set());
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                    >
                      クリア
                    </button>
                  )}
                </div>
                {bizDevPhases.map(phase => (
                  <label
                    key={phase.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBizDevPhaseIds.has(phase.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedBizDevPhaseIds);
                        if (e.target.checked) {
                          newSet.add(phase.id);
                        } else {
                          newSet.delete(phase.id);
                        }
                        setSelectedBizDevPhaseIds(newSet);
                      }}
                      style={{
                        marginRight: '8px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#1A1A1A' }}>
                      {phase.title}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedBizDevPhaseIds.size > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '8px',
              }}>
                {Array.from(selectedBizDevPhaseIds).map(phaseId => {
                  const phase = bizDevPhases.find(p => p.id === phaseId);
                  if (!phase) return null;
                  return (
                    <span
                      key={phaseId}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {phase.title}
                      <button
                        onClick={() => {
                          const newSet = new Set(selectedBizDevPhaseIds);
                          newSet.delete(phaseId);
                          setSelectedBizDevPhaseIds(newSet);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1E40AF',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '14px',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
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
      </div>

      {/* 統計情報カード */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {/* カテゴリー数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            カテゴリー数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {parentCategories.length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件のカテゴリー
          </div>
        </div>

        {/* サブカテゴリー数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            サブカテゴリー数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {categories.filter(c => c.parentCategoryId).length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件のサブカテゴリー
          </div>
        </div>

        {/* 全企業数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            全企業数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {selectedCategoryIds.size > 0 || selectedBizDevPhaseIds.size > 0 ? filteredStartups.length : startups.length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件の企業
          </div>
        </div>

        {/* お気に入り企業数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            お気に入り企業数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {startups.filter(s => s.isFavorite === true).length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件の企業
          </div>
        </div>
      </div>

      {/* カテゴリー別スタートアップ表示 */}
      {displayMode === 'bizdev' ? (
        // Biz-Dev形式
        <BizDevPhaseView
          filteredStartups={filteredStartups}
          bizDevPhases={bizDevPhases}
          statuses={statuses}
        />
      ) : displayMode === 'landscape' ? (
        // ランドスケープ形式
        <LandscapeView
          selectedCategoryIds={selectedCategoryIds}
          filteredStartups={filteredStartups}
          categoryHierarchy={categoryHierarchy}
          startupsByCategory={startupsByCategory}
          categories={categories}
          viewMode={viewMode}
          bizDevPhases={bizDevPhases}
        />
      ) : selectedCategoryIds.size > 0 ? (
        // 選択されたカテゴリーのみ表示（囲まれたボックス形式）
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '2px solid #3B82F6',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
        }}>
          <div style={{
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #F3F4F6',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1A1A1A',
                  margin: 0,
                  marginBottom: '8px',
                }}>
                  {selectedCategoryIds.size === 1 
                    ? categories.find(c => c.id === Array.from(selectedCategoryIds)[0])?.title
                    : `${selectedCategoryIds.size}件のカテゴリー`}
                </h3>
                {selectedCategoryIds.size === 1 && categories.find(c => c.id === Array.from(selectedCategoryIds)[0])?.description && (
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    margin: 0,
                  }}>
                    {categories.find(c => c.id === Array.from(selectedCategoryIds)[0])?.description}
                  </p>
                )}
              </div>
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}>
                {filteredStartups.length}件
              </div>
            </div>
          </div>
          
          {filteredStartups.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                ? '1fr' 
                : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px',
            }}>
              {filteredStartups.map(startup => (
                <StartupCard 
                  key={startup.id} 
                  startup={startup}
                  bizDevPhases={bizDevPhases}
                  statuses={statuses}
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: '14px',
            }}>
              選択されたカテゴリーにスタートアップはありません
            </div>
          )}
        </div>
      ) : (
        // すべてのカテゴリーを表示（親カテゴリーの中にサブカテゴリーをネスト）
        <div>
          {categoryHierarchy.map(({ parent, children }) => {
            const parentStartups = startupsByCategory[parent.id] || [];
            const hasChildStartups = children.some(child => {
              const childStartups = startupsByCategory[child.id] || [];
              return childStartups.length > 0;
            });
            
            // 親カテゴリーのみ表示モードでは、親カテゴリーに直接紐づいているスタートアップと子カテゴリーのスタートアップをすべて親カテゴリーに表示
            if (viewMode === 'parent-only') {
              // 重複を避けるためにSetを使用
              const startupSet = new Set<string>();
              const allStartupsForParent: Startup[] = [];
              
              // 親カテゴリーに直接紐づいているスタートアップを追加
              parentStartups.forEach(startup => {
                if (startup.id && !startupSet.has(startup.id)) {
                  startupSet.add(startup.id);
                  allStartupsForParent.push(startup);
                }
              });
              
              // 子カテゴリーのスタートアップを追加
              children.forEach(child => {
                const childStartups = startupsByCategory[child.id] || [];
                childStartups.forEach(startup => {
                  if (startup.id && !startupSet.has(startup.id)) {
                    startupSet.add(startup.id);
                    allStartupsForParent.push(startup);
                  }
                });
              });
              
              if (allStartupsForParent.length === 0) return null;
              
              return (
                <CategorySection
                  key={parent.id}
                  category={parent}
                  startups={allStartupsForParent}
                  level={0}
                  bizDevPhases={bizDevPhases}
                  statuses={statuses}
                />
              );
            }
            
            // すべて表示モードでは、親カテゴリーの中にサブカテゴリーをネスト（親カテゴリーに直接紐づくスタートアップは表示しない）
            if (!hasChildStartups) return null;
            
            return (
              <ParentCategorySection
                key={parent.id}
                parent={parent}
                parentStartups={parentStartups}
                children={children}
                startupsByCategory={startupsByCategory}
                bizDevPhases={bizDevPhases}
                statuses={statuses}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// 親カテゴリーセクションコンポーネント（サブカテゴリーをネスト）
interface ParentCategorySectionProps {
  parent: Category;
  parentStartups: Startup[];
  children: Category[];
  startupsByCategory: Record<string, Startup[]>;
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

function ParentCategorySection({ 
  parent, 
  parentStartups, 
  children, 
  startupsByCategory,
  bizDevPhases, 
  statuses 
}: ParentCategorySectionProps) {
  const totalStartups = children.reduce((sum, child) => sum + (startupsByCategory[child.id] || []).length, 0);
  
  return (
    <div style={{
      marginBottom: '32px',
      padding: '24px',
      backgroundColor: '#FFFFFF',
      border: '2px solid #3B82F6',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
    }}
    >
      {/* 親カテゴリーヘッダー */}
      <div style={{
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #F3F4F6',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1A1A1A',
              margin: 0,
              marginBottom: '8px',
              lineHeight: '1.3',
            }}>
              {parent.title}
            </h3>
            {parent.description && (
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.5',
              }}>
                {parent.description}
              </p>
            )}
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}>
            {totalStartups}件
          </div>
        </div>
      </div>
      
      {/* サブカテゴリーをネスト表示 */}
      {children.map(child => {
        const childStartups = startupsByCategory[child.id] || [];
        if (childStartups.length === 0) return null;
        
        return (
          <div key={child.id} style={{
            marginTop: '24px',
            padding: '20px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
          }}>
            {/* サブカテゴリーヘッダー */}
            <div style={{
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    margin: 0,
                    marginBottom: '4px',
                  }}>
                    {child.title}
                  </h4>
                  {child.description && (
                    <p style={{
                      fontSize: '13px',
                      color: '#6B7280',
                      margin: 0,
                    }}>
                      {child.description}
                    </p>
                  )}
                </div>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}>
                  {childStartups.length}件
                </div>
              </div>
            </div>
            
            {/* サブカテゴリーのスタートアップ */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                ? '1fr' 
                : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px',
            }}>
              {childStartups.map(startup => (
                <StartupCard 
                  key={startup.id} 
                  startup={startup}
                  bizDevPhases={bizDevPhases}
                  statuses={statuses}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// カテゴリーセクションコンポーネント（単一カテゴリー用）
interface CategorySectionProps {
  category: Category;
  startups: Startup[];
  level: number;
  parentTitle?: string;
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

function CategorySection({ category, startups, level, parentTitle, bizDevPhases, statuses }: CategorySectionProps) {
  const categoryTitle = parentTitle ? `${parentTitle} / ${category.title}` : category.title;
  
  return (
    <div style={{
      marginBottom: '32px',
      padding: '24px',
      backgroundColor: '#FFFFFF',
      border: level === 0 ? '2px solid #3B82F6' : '1px solid #E5E7EB',
      borderRadius: '16px',
      boxShadow: level === 0 
        ? '0 4px 12px rgba(59, 130, 246, 0.1)' 
        : '0 2px 8px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      if (level === 0) {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.15)';
      } else {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      }
    }}
    onMouseLeave={(e) => {
      if (level === 0) {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
      } else {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
      }
    }}
    >
      {/* カテゴリーヘッダー */}
      <div style={{
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid #F3F4F6',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: level === 0 ? '24px' : '20px',
              fontWeight: level === 0 ? '700' : '600',
              color: '#1A1A1A',
              margin: 0,
              marginBottom: '8px',
              lineHeight: '1.3',
            }}>
              {categoryTitle}
            </h3>
            {category.description && (
              <p style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.5',
              }}>
                {category.description}
              </p>
            )}
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: level === 0 ? '#EFF6FF' : '#F3F4F6',
            color: level === 0 ? '#1E40AF' : '#374151',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
          }}>
            {startups.length}件
          </div>
        </div>
      </div>
      
      {/* スタートアップグリッド */}
      {startups.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
            ? '1fr' 
            : 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}>
          {startups.map(startup => (
            <StartupCard 
              key={startup.id} 
              startup={startup}
              bizDevPhases={bizDevPhases}
              statuses={statuses}
            />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#9CA3AF',
          fontSize: '14px',
        }}>
          このカテゴリーにスタートアップはありません
        </div>
      )}
    </div>
  );
}

// ランドスケープ表示コンポーネント
interface LandscapeViewProps {
  selectedCategoryIds: Set<string>;
  filteredStartups: Startup[];
  categoryHierarchy: Array<{ parent: Category; children: Category[] }>;
  startupsByCategory: Record<string, Startup[]>;
  categories: Category[];
  viewMode: 'all' | 'parent-only';
  bizDevPhases: BizDevPhase[];
}

function LandscapeView({
  selectedCategoryIds,
  filteredStartups,
  categoryHierarchy,
  startupsByCategory,
  categories,
  viewMode,
  bizDevPhases,
}: LandscapeViewProps) {
  if (selectedCategoryIds.size > 0) {
    // 選択されたカテゴリーのみ表示
    const selectedCategories = Array.from(selectedCategoryIds)
      .map(id => categories.find(c => c.id === id))
      .filter((c): c is Category => c !== undefined);
    
    if (selectedCategories.length === 0) return null;

    return (
      <div>
        {selectedCategories.map(category => (
          <div key={category.id} style={{
            padding: '32px',
            backgroundColor: '#F9FAFB',
            borderRadius: '16px',
            marginBottom: '32px',
          }}>
            <div style={{
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '3px solid #3B82F6',
            }}>
              <h3 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: 0,
                marginBottom: '8px',
              }}>
                {category.title}
              </h3>
              <div style={{
                fontSize: '16px',
                color: '#6B7280',
                fontWeight: '500',
              }}>
                {filteredStartups.filter(startup => 
                  startup.categoryIds && 
                  startup.categoryIds.includes(category.id)
                ).length}件のスタートアップ
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                ? 'repeat(auto-fill, minmax(140px, 1fr))'
                : 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}>
              {filteredStartups
                .filter(startup => 
                  startup.categoryIds && 
                  startup.categoryIds.includes(category.id)
                )
                .map(startup => (
                  <CompactStartupItem key={startup.id} startup={startup} bizDevPhases={bizDevPhases} />
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // すべてのカテゴリーをマップ形式で表示
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
        ? '1fr'
        : 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '24px',
    }}>
      {categoryHierarchy.map(({ parent, children }) => {
        const parentStartups = startupsByCategory[parent.id] || [];
        const hasChildStartups = children.some(child => {
          const childStartups = startupsByCategory[child.id] || [];
          return childStartups.length > 0;
        });

        if (viewMode === 'parent-only') {
          // 重複を避けるためにSetを使用
          const startupSet = new Set<string>();
          const allStartupsForParent: Startup[] = [];
          
          // 親カテゴリーに直接紐づいているスタートアップを追加
          parentStartups.forEach(startup => {
            if (startup.id && !startupSet.has(startup.id)) {
              startupSet.add(startup.id);
              allStartupsForParent.push(startup);
            }
          });
          
          // 子カテゴリーのスタートアップを追加
          children.forEach(child => {
            const childStartups = startupsByCategory[child.id] || [];
            childStartups.forEach(startup => {
              if (startup.id && !startupSet.has(startup.id)) {
                startupSet.add(startup.id);
                allStartupsForParent.push(startup);
              }
            });
          });
          
          if (allStartupsForParent.length === 0) return null;

          return (
            <div key={parent.id} style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '2px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '2px solid #3B82F6',
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1A1A1A',
                  margin: 0,
                  marginBottom: '4px',
                }}>
                  {parent.title}
                </h3>
                <div style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  fontWeight: '500',
                }}>
                  {allStartupsForParent.length}件
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '10px',
              }}>
                {allStartupsForParent.map(startup => (
                  <CompactStartupItem key={startup.id} startup={startup} bizDevPhases={bizDevPhases} />
                ))}
              </div>
            </div>
          );
        }

        if (!hasChildStartups) return null;

        const totalStartups = children.reduce((sum, child) => sum + (startupsByCategory[child.id] || []).length, 0);

        return (
          <div key={parent.id} style={{
            padding: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '2px solid #E5E7EB',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '2px solid #3B82F6',
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1A1A1A',
                margin: 0,
                marginBottom: '4px',
              }}>
                {parent.title}
              </h3>
              <div style={{
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: '500',
              }}>
                {totalStartups}件
              </div>
            </div>
            
            {children.map(child => {
              const childStartups = startupsByCategory[child.id] || [];
              if (childStartups.length === 0) return null;

              return (
                <div key={child.id} style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#374151',
                    margin: 0,
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #E5E7EB',
                  }}>
                    {child.title}
                    <span style={{ marginLeft: '8px', fontSize: '13px', fontWeight: '400', color: '#9CA3AF' }}>
                      ({childStartups.length})
                    </span>
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '10px',
                  }}>
                    {childStartups.map(startup => (
                      <CompactStartupItem key={startup.id} startup={startup} bizDevPhases={bizDevPhases} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// コンパクトなスタートアップアイテムコンポーネント
interface CompactStartupItemProps {
  startup: Startup;
  bizDevPhases: BizDevPhase[];
}

function CompactStartupItem({ startup, bizDevPhases }: CompactStartupItemProps) {
  const handleClick = () => {
    if (startup.organizationId && startup.id) {
      window.location.href = `/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`;
    }
  };

  // Biz-Devフェーズを取得
  const bizDevPhase = startup.bizDevPhase 
    ? bizDevPhases.find(p => p.id === startup.bizDevPhase)
    : null;
  
  // 特定のBiz-Devフェーズかどうかを判定
  const isSpecialPhase = bizDevPhase && (
    bizDevPhase.title.includes('全社取扱商材') || 
    bizDevPhase.title.includes('CTCA関連')
  );

  const isFavorite = startup.isFavorite === true;
  
  // 色の決定ロジック
  let defaultBgColor: string;
  let defaultBorderColor: string;
  let hoverBgColor: string;
  let hoverBorderColor: string;
  
  if (isFavorite) {
    defaultBgColor = '#FEF3C7';
    defaultBorderColor = '#F59E0B';
    hoverBgColor = '#FDE68A';
    hoverBorderColor = '#F59E0B';
  } else if (isSpecialPhase) {
    // 全社取扱商材またはCTCA関連の場合は青色系
    defaultBgColor = '#EFF6FF';
    defaultBorderColor = '#3B82F6';
    hoverBgColor = '#DBEAFE';
    hoverBorderColor = '#2563EB';
  } else {
    defaultBgColor = '#FFFFFF';
    defaultBorderColor = '#E5E7EB';
    hoverBgColor = '#EFF6FF';
    hoverBorderColor = '#3B82F6';
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '10px 14px',
        backgroundColor: defaultBgColor,
        border: `1px solid ${defaultBorderColor}`,
        borderRadius: '8px',
        cursor: startup.organizationId ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        fontSize: '13px',
        fontWeight: '500',
        color: '#1A1A1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '44px',
        textAlign: 'center',
        boxShadow: isFavorite 
          ? '0 2px 4px rgba(245, 158, 11, 0.1)' 
          : isSpecialPhase 
            ? '0 2px 4px rgba(59, 130, 246, 0.15)' 
            : 'none',
      }}
      onMouseEnter={(e) => {
        if (startup.organizationId) {
          e.currentTarget.style.borderColor = hoverBorderColor;
          e.currentTarget.style.backgroundColor = hoverBgColor;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isFavorite 
            ? '0 4px 12px rgba(245, 158, 11, 0.3)' 
            : isSpecialPhase
              ? '0 4px 12px rgba(59, 130, 246, 0.25)'
              : '0 4px 12px rgba(59, 130, 246, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = defaultBorderColor;
        e.currentTarget.style.backgroundColor = defaultBgColor;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isFavorite 
          ? '0 2px 4px rgba(245, 158, 11, 0.1)' 
          : isSpecialPhase 
            ? '0 2px 4px rgba(59, 130, 246, 0.15)' 
            : 'none';
      }}
    >
      <span style={{
        lineHeight: '1.4',
        wordBreak: 'break-word',
      }}>{startup.title}</span>
    </div>
  );
}

// スタートアップカードコンポーネント
interface StartupCardProps {
  startup: Startup;
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

// Biz-Devフェーズ形式のビューコンポーネント
interface BizDevPhaseViewProps {
  filteredStartups: Startup[];
  bizDevPhases: BizDevPhase[];
  statuses: Status[];
}

function BizDevPhaseView({ filteredStartups, bizDevPhases, statuses }: BizDevPhaseViewProps) {
  // スタートアップをBiz-Devフェーズでグループ化
  const startupsByPhase = new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();
  
  // フェーズごとにグループ化
  for (const startup of filteredStartups) {
    const phaseId = startup.bizDevPhase || 'none';
    if (!startupsByPhase.has(phaseId)) {
      const phase = phaseId === 'none' ? null : bizDevPhases.find(p => p.id === phaseId) || null;
      startupsByPhase.set(phaseId, { phase, startups: [] });
    }
    startupsByPhase.get(phaseId)!.startups.push(startup);
  }

  // 管理タブと同じ順番で表示（getBizDevPhases()が返す順番 = position順）
  // まず、bizDevPhasesの順番に従ってフェーズIDを並べ、その後「未設定」を追加
  const sortedPhaseIds: string[] = [];
  
  // bizDevPhasesの順番に従って追加（getBizDevPhases()は既にpositionでソート済み）
  for (const phase of bizDevPhases) {
    if (startupsByPhase.has(phase.id) && startupsByPhase.get(phase.id)!.startups.length > 0) {
      sortedPhaseIds.push(phase.id);
    }
  }
  
  // 未設定のフェーズを最後に追加
  if (startupsByPhase.has('none') && startupsByPhase.get('none')!.startups.length > 0) {
    sortedPhaseIds.push('none');
  }

  if (sortedPhaseIds.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        color: '#6B7280',
        fontSize: '14px',
      }}>
        スタートアップが登録されていません
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {sortedPhaseIds.map((phaseId) => {
        const phaseData = startupsByPhase.get(phaseId);
        if (!phaseData || phaseData.startups.length === 0) return null;
        
        const phaseTitle = phaseData.phase ? phaseData.phase.title : 'Biz-Devフェーズ未設定';
        
        return (
          <div key={phaseId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <h4 style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#6B7280',
                margin: 0,
              }}>
                {phaseTitle} ({phaseData.startups.length}件)
              </h4>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                  ? 'repeat(auto-fill, minmax(140px, 1fr))'
                  : 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px',
              }}
            >
              {phaseData.startups.map((startup) => (
                <CompactStartupItem
                  key={startup.id}
                  startup={startup}
                  bizDevPhases={bizDevPhases}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StartupCard({ startup, bizDevPhases, statuses }: StartupCardProps) {
  const bizDevPhase = startup.bizDevPhase 
    ? bizDevPhases.find(p => p.id === startup.bizDevPhase)
    : null;
  const handleClick = () => {
    if (startup.organizationId && startup.id) {
      window.location.href = `/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`;
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        cursor: startup.organizationId ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        if (startup.organizationId) {
          e.currentTarget.style.borderColor = '#3B82F6';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.backgroundColor = '#F9FAFB';
      }}
    >
      <div style={{
        fontSize: '15px',
        fontWeight: '600',
        color: '#1A1A1A',
        lineHeight: '1.4',
        marginBottom: '12px',
      }}>
        {startup.title}
      </div>
      
      {bizDevPhase && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          <span style={{
            padding: '4px 10px',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '500',
          }}>
            {bizDevPhase.title}
          </span>
        </div>
      )}
    </div>
  );
}

