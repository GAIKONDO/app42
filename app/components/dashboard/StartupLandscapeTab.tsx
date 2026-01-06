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
  getVcs,
  type Startup, 
  type Category,
  type BizDevPhase,
  type Status,
  type VC,
} from '@/lib/orgApi';

import SearchForm from './StartupLandscapeTab/SearchForm';
import FilterDropdown from './StartupLandscapeTab/FilterDropdown';
import StatsCards from './StartupLandscapeTab/StatsCards';
import ViewModeToggle from './StartupLandscapeTab/ViewModeToggle';
import ParentCategorySection from './StartupLandscapeTab/ParentCategorySection';
import CategorySection from './StartupLandscapeTab/CategorySection';
import LandscapeView from './StartupLandscapeTab/LandscapeView';
import BizDevPhaseView from './StartupLandscapeTab/BizDevPhaseView';
import StartupCard from './StartupLandscapeTab/StartupCard';

import type { StartupLandscapeTabProps } from './StartupLandscapeTab/types';

export function StartupLandscapeTab({}: StartupLandscapeTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [vcs, setVcs] = useState<VC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedBizDevPhaseIds, setSelectedBizDevPhaseIds] = useState<Set<string>>(new Set());
  const [selectedVCIds, setSelectedVCIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'parent-only'>('all');
  const [displayMode, setDisplayMode] = useState<'box' | 'landscape' | 'bizdev'>('bizdev');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [showBizDevPhaseFilter, setShowBizDevPhaseFilter] = useState(false);
  const [showVCFilter, setShowVCFilter] = useState(false);
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

        const [categoriesData, startupsData, bizDevPhasesData, statusesData, vcsData] = await Promise.all([
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
          getVcs().catch((err) => {
            console.warn('VCの取得に失敗しました:', err);
            return [];
          }),
        ]);

        setCategories(categoriesData);
        setStartups(startupsData);
        setBizDevPhases(bizDevPhasesData);
        setStatuses(statusesData);
        setVcs(vcsData);
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
        setShowVCFilter(false);
      }
      if (!target.closest('[data-search-input]')) {
        setShowSearchSuggestions(false);
      }
    };

    if (showCategoryFilter || showBizDevPhaseFilter || showVCFilter || showSearchSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCategoryFilter, showBizDevPhaseFilter, showVCFilter, showSearchSuggestions]);

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
        startup.bizDevPhase !== undefined && selectedBizDevPhaseIds.has(startup.bizDevPhase)
      );
    }
    
    // 関連VCでフィルタリング（複数選択対応）
    if (selectedVCIds.size > 0) {
      filtered = filtered.filter(startup => 
        startup.relatedVCS && 
        startup.relatedVCS.some(vcId => selectedVCIds.has(vcId))
      );
    }
    
    // お気に入りでフィルタリング
    if (favoriteFilter === 'favorite') {
      filtered = filtered.filter(startup => startup.isFavorite === true);
    }
    
    return filtered;
  }, [startups, selectedCategoryIds, selectedBizDevPhaseIds, selectedVCIds, categories, searchQuery, favoriteFilter]);

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
      <SearchForm
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearchSuggestions={showSearchSuggestions}
        setShowSearchSuggestions={setShowSearchSuggestions}
        searchInputFocused={searchInputFocused}
        setSearchInputFocused={setSearchInputFocused}
        searchSuggestions={searchSuggestions}
        startups={startups}
        setStartups={setStartups}
      />

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
          <FilterDropdown
            label="カテゴリー"
            selectedIds={selectedCategoryIds}
            items={parentCategories}
            getItemId={(cat) => cat.id}
            getItemTitle={(cat) => cat.title}
            onSelectionChange={setSelectedCategoryIds}
            showFilter={showCategoryFilter}
            setShowFilter={setShowCategoryFilter}
          />

          {/* Biz-Devフェーズフィルター */}
          <FilterDropdown
            label="Biz-Devフェーズ"
            selectedIds={selectedBizDevPhaseIds}
            items={bizDevPhases}
            getItemId={(phase) => phase.id}
            getItemTitle={(phase) => phase.title}
            onSelectionChange={setSelectedBizDevPhaseIds}
            showFilter={showBizDevPhaseFilter}
            setShowFilter={setShowBizDevPhaseFilter}
          />

          {/* 関連VCフィルター */}
          <FilterDropdown
            label="関連VC"
            selectedIds={selectedVCIds}
            items={vcs}
            getItemId={(vc) => vc.id}
            getItemTitle={(vc) => vc.title}
            onSelectionChange={setSelectedVCIds}
            showFilter={showVCFilter}
            setShowFilter={setShowVCFilter}
          />
        </div>
        
        <ViewModeToggle
          viewMode={viewMode}
          setViewMode={setViewMode}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          favoriteFilter={favoriteFilter}
          setFavoriteFilter={setFavoriteFilter}
        />
      </div>

      {/* 統計情報カード */}
      <StatsCards
        parentCategoriesCount={parentCategories.length}
        subCategoriesCount={categories.filter(c => c.parentCategoryId).length}
        totalStartups={startups.length}
        filteredStartupsCount={filteredStartups.length}
        favoriteStartupsCount={startups.filter(s => s.isFavorite === true).length}
        hasFilters={selectedCategoryIds.size > 0 || selectedBizDevPhaseIds.size > 0 || selectedVCIds.size > 0}
      />

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


