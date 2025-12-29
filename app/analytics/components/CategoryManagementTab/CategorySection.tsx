'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Startup } from '@/lib/orgApi';
import { useCategoryManagement } from '../../hooks/useCategoryManagement';
import { useCategoryStartupDiagramData } from '../../hooks/useCategoryStartupDiagramData';
import ViewModeSelector from '../ViewModeSelector';
import CategorySelector from '../CategorySelector';
import type { RelationshipNode } from '@/components/RelationshipDiagram2D';
import dynamic from 'next/dynamic';
import { SubTabBar } from './SubTabBar';

const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

const DynamicRelationshipDiagram2D = dynamic(() => import('@/components/RelationshipDiagram2D'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      関係性図を読み込み中...
    </div>
  ),
});

const DynamicRelationshipBubbleChart = dynamic(() => import('@/components/RelationshipBubbleChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      バブルチャートを読み込み中...
    </div>
  ),
});

interface CategorySectionProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  startups: Startup[];
  categoryManagement: ReturnType<typeof useCategoryManagement>;
}

export function CategorySection({
  categories,
  setCategories,
  startups,
  categoryManagement,
}: CategorySectionProps) {
  const router = useRouter();
  const [categorySubTab, setCategorySubTab] = useState<'management' | 'diagram'>('diagram');
  const [viewMode, setViewMode] = useState<'diagram' | 'bubble' | 'bar'>('bar');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedBarCategoryId, setSelectedBarCategoryId] = useState<string | null>(null);
  
  const { nodes, links } = useCategoryStartupDiagramData({
    categories,
    startups,
    selectedCategoryIds,
  });

  // カテゴリーごとのスタートアップ件数を集計（サブカテゴリーごとに分ける）
  const categoryChartData = useMemo(() => {
    // 表示対象のカテゴリーを決定
    let targetCategories: Category[] = [];
    
    if (selectedCategoryIds.length === 0) {
      // 選択されていない場合は、すべての親カテゴリーを表示
      targetCategories = categories.filter(cat => !cat.parentCategoryId);
    } else {
      // 選択されたカテゴリーとその親カテゴリーを取得
      const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id));
      const getTopLevelCategory = (category: Category): Category => {
        if (!category.parentCategoryId) {
          return category;
        }
        const parent = categories.find(c => c.id === category.parentCategoryId);
        if (!parent) {
          return category;
        }
        return getTopLevelCategory(parent);
      };
      
      const topLevelCats = selectedCategories
        .map(cat => getTopLevelCategory(cat))
        .filter((cat, index, self) => self.findIndex(c => c.id === cat.id) === index);
      
      targetCategories = topLevelCats;
    }

    // 親カテゴリーごとに、サブカテゴリー（または親カテゴリーに直接紐づくもの）ごとの件数を集計
    const chartData: Array<{
      category: string;
      categoryId: string;
      subCategory: string;
      subCategoryId: string;
      count: number;
    }> = [];

    targetCategories.forEach(parentCategory => {
      // 親カテゴリーに直接紐づくスタートアップを取得
      const directStartups = startups.filter(startup => 
        startup.categoryIds && startup.categoryIds.includes(parentCategory.id)
      );
      
      if (directStartups.length > 0) {
        chartData.push({
          category: parentCategory.title,
          categoryId: parentCategory.id,
          subCategory: parentCategory.title, // 親カテゴリー自体もサブカテゴリーとして表示
          subCategoryId: parentCategory.id,
          count: directStartups.length,
        });
      }

      // 子カテゴリー（サブカテゴリー）を取得
      const childCategories = categories.filter(c => c.parentCategoryId === parentCategory.id);
      
      childCategories.forEach(childCategory => {
        // サブカテゴリーに紐づくスタートアップを取得（重複を除去）
        const childStartups = startups.filter(startup => 
          startup.categoryIds && startup.categoryIds.includes(childCategory.id)
        );
        
        if (childStartups.length > 0) {
          chartData.push({
            category: parentCategory.title,
            categoryId: parentCategory.id,
            subCategory: childCategory.title,
            subCategoryId: childCategory.id,
            count: childStartups.length,
          });
        }
      });
    });

    return chartData.filter(item => item.count > 0 || selectedCategoryIds.length === 0);
  }, [categories, startups, selectedCategoryIds]);

  const handleNodeClick = (node: RelationshipNode) => {
    // ノードクリック時の処理（必要に応じて実装）
  };

  // 統計情報を計算
  const statistics = useMemo(() => {
    // 表示対象のカテゴリーを決定
    let targetCategories: Category[] = [];
    
    if (selectedCategoryIds.length === 0) {
      targetCategories = categories.filter(cat => !cat.parentCategoryId);
    } else {
      const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id));
      const getTopLevelCategory = (category: Category): Category => {
        if (!category.parentCategoryId) {
          return category;
        }
        const parent = categories.find(c => c.id === category.parentCategoryId);
        if (!parent) {
          return category;
        }
        return getTopLevelCategory(parent);
      };
      
      const topLevelCats = selectedCategories
        .map(cat => getTopLevelCategory(cat))
        .filter((cat, index, self) => self.findIndex(c => c.id === cat.id) === index);
      
      targetCategories = topLevelCats;
    }

    // 親カテゴリー数
    const parentCategoryCount = targetCategories.length;
    
    // サブカテゴリー数（選択された親カテゴリーの子カテゴリー）
    const subCategoryCount = targetCategories.reduce((count, parentCat) => {
      const children = categories.filter(c => c.parentCategoryId === parentCat.id);
      return count + children.length;
    }, 0);
    
    // スタートアップ数（選択されたカテゴリーに紐づくスタートアップ、重複除去）
    const getCategoryStartups = (cat: Category): Startup[] => {
      const directStartups = startups.filter(startup => 
        startup.categoryIds && startup.categoryIds.includes(cat.id)
      );
      
      const childCategories = categories.filter(c => c.parentCategoryId === cat.id);
      const childStartups = childCategories.flatMap(childCat => getCategoryStartups(childCat));
      
      const allStartups = [...directStartups, ...childStartups];
      return Array.from(new Map(allStartups.map(s => [s.id, s])).values());
    };
    
    const allStartups = targetCategories.flatMap(cat => getCategoryStartups(cat));
    const uniqueStartups = Array.from(new Map(allStartups.map(s => [s.id, s])).values());
    const startupCount = uniqueStartups.length;
    
    return {
      parentCategoryCount,
      subCategoryCount,
      startupCount,
    };
  }, [categories, startups, selectedCategoryIds]);

  // 棒グラフのクリックイベントを処理
  const handleBarChartSignal = (signalName: string, value: any) => {
    if (signalName === 'clicked_theme' || signalName === 'click') {
      // VegaChartから送られてくるデータを処理
      let categoryName: string | null = null;
      let categoryId: string | null = null;
      
      if (value && value.category) {
        categoryName = value.category;
      } else if (value && value.categoryId) {
        categoryId = value.categoryId;
      } else if (value && value.themeId) {
        // テーマIDの場合は無視（カテゴリー用ではない）
        return;
      }
      
      // カテゴリー名からカテゴリーIDを取得
      if (categoryName) {
        const clickedCategory = categories.find(cat => cat.title === categoryName);
        if (clickedCategory) {
          setSelectedBarCategoryId(clickedCategory.id);
        }
      } else if (categoryId) {
        setSelectedBarCategoryId(categoryId);
      }
    }
  };

  // 選択されたカテゴリーに紐づくスタートアップを取得
  const getSelectedCategoryStartups = useMemo(() => {
    if (!selectedBarCategoryId) return [];

    const getCategoryStartups = (cat: Category): Startup[] => {
      const directStartups = startups.filter(startup => 
        startup.categoryIds && startup.categoryIds.includes(cat.id)
      );
      
      // 子カテゴリーを取得
      const childCategories = categories.filter(c => c.parentCategoryId === cat.id);
      const childStartups = childCategories.flatMap(childCat => getCategoryStartups(childCat));
      
      // 重複を除去
      const allStartups = [...directStartups, ...childStartups];
      return Array.from(new Map(allStartups.map(s => [s.id, s])).values());
    };

    const selectedCategory = categories.find(cat => cat.id === selectedBarCategoryId);
    if (!selectedCategory) return [];

    return getCategoryStartups(selectedCategory);
  }, [selectedBarCategoryId, categories, startups]);

  // 棒グラフの仕様を生成（積み上げ形式）
  const barChartSpec = useMemo(() => {
    if (categoryChartData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    // 親カテゴリーのリストを取得（domain用）
    const parentCategories = Array.from(new Set(categoryChartData.map(d => d.category)));
    // サブカテゴリーのリストを取得（凡例用）
    const subCategories = Array.from(new Set(categoryChartData.map(d => d.subCategory)));
    const maxColors = 20;

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'カテゴリーごとのスタートアップ件数（サブカテゴリー別）',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: categoryChartData,
      },
      layer: [
        // 1. 積み上げ棒グラフ
        {
          mark: {
            type: 'bar',
            tooltip: true,
            cursor: 'pointer',
            cornerRadiusTopLeft: 4,
            cornerRadiusTopRight: 4,
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
          encoding: {
            x: {
              field: 'category',
              type: 'ordinal',
              title: 'カテゴリー',
              scale: {
                domain: parentCategories,
              },
              axis: {
                labelAngle: isMobile ? -90 : -45,
                labelLimit: isMobile ? 50 : 120,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
            },
            y: {
              field: 'count',
              type: 'quantitative',
              title: 'スタートアップ件数',
              axis: {
                grid: true,
                gridColor: '#F3F4F6',
                gridOpacity: 0.5,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#6B7280',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 12,
                domain: true,
                domainColor: '#E5E7EB',
                domainWidth: 1,
                tickSize: 0,
              },
              stack: 'zero', // 積み上げグラフ
            },
            color: {
              field: 'subCategory',
              type: 'nominal',
              title: 'サブカテゴリー',
              scale: {
                scheme: subCategories.length <= maxColors ? 'category20' : 'category20b',
              },
              legend: {
                orient: isMobile ? 'bottom' : 'right',
                columns: isMobile ? 2 : 1,
                symbolLimit: subCategories.length > 20 ? 50 : undefined,
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#4B5563',
                labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
                titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
                titlePadding: 8,
                symbolType: 'circle',
                symbolSize: 80,
                padding: 8,
                offset: isMobile ? 0 : 20,
              },
            },
            tooltip: [
              { field: 'category', type: 'nominal', title: 'カテゴリー' },
              { field: 'subCategory', type: 'nominal', title: 'サブカテゴリー' },
              { field: 'count', type: 'quantitative', title: '件数', format: 'd' },
            ],
          },
        },
        // 2. カテゴリーごとの合計値を表示するテキストレイヤー
        {
          mark: {
            type: 'text',
            align: 'center',
            baseline: 'bottom',
            dy: -8,
            fontSize: isMobile ? 12 : 14,
            fontWeight: '600',
            fill: '#1A1A1A',
            font: 'var(--font-inter), var(--font-noto), sans-serif',
          },
          encoding: {
            x: {
              field: 'category',
              type: 'ordinal',
            },
            y: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
            },
            text: {
              aggregate: 'sum',
              field: 'count',
              type: 'quantitative',
              format: 'd',
            },
            tooltip: [
              { field: 'category', type: 'nominal', title: 'カテゴリー' },
              {
                aggregate: 'sum',
                field: 'count',
                type: 'quantitative',
                title: '合計件数',
                format: 'd',
              },
            ],
          },
        },
      ],
      config: {
        view: {
          stroke: 'transparent',
        },
        background: 'transparent',
        axis: {
          labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
          titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
        },
        style: {
          'bar': {
            stroke: '#FFFFFF',
            strokeWidth: 1,
          },
        },
      },
    };
  }, [categoryChartData]);

  return (
    <>
      {/* ヘッダー */}
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1A1A1A',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          カテゴリー管理
        </h3>
        {categorySubTab === 'management' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                categoryManagement.setShowEditCategoriesModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C4C4C4';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.333 2.00001C11.5084 1.82465 11.7163 1.68571 11.9447 1.59203C12.1731 1.49835 12.4173 1.4519 12.6637 1.45564C12.9101 1.45938 13.1533 1.51324 13.3788 1.6139C13.6043 1.71456 13.8075 1.8598 13.9767 2.04068C14.1459 2.22156 14.2775 2.43421 14.3639 2.66548C14.4503 2.89675 14.4896 3.14195 14.4795 3.38801C14.4694 3.63407 14.4101 3.8759 14.305 4.09868C14.1999 4.32146 14.0512 4.52059 13.8673 4.68401L5.54001 13.0113L1.33334 14.3333L2.65534 10.1267L11.333 2.00001Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              編集
            </button>
            <button
              type="button"
              onClick={() => {
                categoryManagement.setEditingCategory(null);
                categoryManagement.setCategoryFormTitle('');
                categoryManagement.setCategoryFormDescription('');
                categoryManagement.setCategoryFormParentId(null);
                categoryManagement.setShowCategoryModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                backgroundColor: '#4262FF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3151CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4262FF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              親カテゴリーを追加
            </button>
            <button
              type="button"
              onClick={() => {
                if (categories.length === 0) {
                  alert('サブカテゴリーを追加するには、まず親カテゴリーが必要です。');
                  return;
                }
                categoryManagement.setShowParentCategorySelectModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#4262FF',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #4262FF',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              サブカテゴリーを追加
            </button>
          </div>
        )}
      </div>

      <SubTabBar
        activeTab={categorySubTab}
        onTabChange={setCategorySubTab}
        managementLabel="カテゴリー管理"
        diagramLabel="カテゴリー関係性図"
      />

      {/* カテゴリー管理サブタブ */}
      {categorySubTab === 'management' && (
        <div>
          {categories.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FFFBF0', 
              border: '1.5px solid #FCD34D', 
              borderRadius: '8px',
              color: '#92400E',
              fontSize: '14px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              カテゴリーが見つかりません。カテゴリーを追加してください。
            </div>
          ) : (() => {
            // 階層構造を構築
            const topLevelCategories = categories.filter(cat => !cat.parentCategoryId);
            const getChildren = (parentId: string) => categories.filter(cat => cat.parentCategoryId === parentId);
            
            // 子カテゴリーを持つすべてのカテゴリーIDを取得
            const getAllCategoriesWithChildren = (): string[] => {
              return categories
                .filter(cat => {
                  const children = getChildren(cat.id);
                  return children.length > 0;
                })
                .map(cat => cat.id);
            };
            
            const toggleExpand = (categoryId: string) => {
              setExpandedCategories(prev => {
                const newSet = new Set(prev);
                if (newSet.has(categoryId)) {
                  newSet.delete(categoryId);
                } else {
                  newSet.add(categoryId);
                }
                return newSet;
              });
            };
            
            const expandAll = () => {
              const allCategoriesWithChildren = getAllCategoriesWithChildren();
              setExpandedCategories(new Set(allCategoriesWithChildren));
            };
            
            const collapseAll = () => {
              setExpandedCategories(new Set());
            };
            
            const renderCategory = (category: Category, level: number = 0) => {
              const children = getChildren(category.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedCategories.has(category.id);
              const indent = level * 20;
              
              return (
                <div key={category.id} style={{ marginBottom: '4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      paddingLeft: `${12 + indent}px`,
                      backgroundColor: selectedCategoryIds.includes(category.id) ? '#E3F2FD' : 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpand(category.id);
                      }
                      if (selectedCategoryIds.includes(category.id)) {
                        setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== category.id));
                      } else {
                        setSelectedCategoryIds([...selectedCategoryIds, category.id]);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedCategoryIds.includes(category.id)) {
                        e.currentTarget.style.backgroundColor = '#F5F5F5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedCategoryIds.includes(category.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* 展開/折りたたみアイコン */}
                    {hasChildren && (
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          marginRight: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                          fontSize: '10px',
                          transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▶
                      </div>
                    )}
                    {!hasChildren && (
                      <div style={{ width: '22px', marginRight: '0px' }} />
                    )}
                    
                    {/* フォルダアイコン */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      marginRight: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: hasChildren ? '#FFB800' : '#8E8E93',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H8.37868C8.7765 3 9.15804 3.15804 9.43934 3.43934L10.5607 4.56066C10.842 4.84196 11.2235 5 11.6213 5H16.5C17.3284 5 18 5.67157 18 6.5V15.5C18 16.3284 17.3284 17 16.5 17H3.5C2.67157 17 2 16.3284 2 15.5V4.5Z" />
                      </svg>
                    </div>
                    
                    {/* カテゴリー名 */}
                    <div style={{
                      flex: 1,
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#1A1A1A',
                      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {category.title}
                    </div>
                    
                    {/* 説明がある場合のインジケーター */}
                    {category.description && (
                      <div style={{
                        marginLeft: '8px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#4262FF',
                        opacity: 0.6,
                      }} />
                    )}
                  </div>
                  
                  {/* 子カテゴリー（展開時のみ表示） */}
                  {hasChildren && isExpanded && (
                    <div style={{ marginLeft: '0px' }}>
                      {children.map(child => renderCategory(child, level + 1))}
                    </div>
                  )}
                </div>
              );
            };
            
            return (
              <div>
                {/* 一括展開/折りたたみボタン */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    type="button"
                    onClick={expandAll}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#4262FF',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #4262FF',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 150ms',
                      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    すべて展開
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#6B7280',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 150ms',
                      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F5F5F5';
                      e.currentTarget.style.borderColor = '#C4C4C4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E0E0E0';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    すべて折りたたみ
                  </button>
                </div>
                
                {/* カテゴリーリスト */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  padding: '8px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                }}>
                  {topLevelCategories.map(category => renderCategory(category))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* カテゴリー関係性図サブタブ */}
      {categorySubTab === 'diagram' && (
        <div>
          {/* フィルターとビューモード選択 */}
          <div style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <CategorySelector
                categories={categories}
                selectedCategoryIds={selectedCategoryIds}
                onSelect={setSelectedCategoryIds}
              />
            </div>
            <ViewModeSelector
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          {/* 統計情報カード */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(3, 1fr)',
            gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
            marginBottom: '32px',
          }}>
            {/* カテゴリー数カード */}
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
                {statistics.parentCategoryCount}
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

            {/* サブカテゴリー数カード */}
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
                background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
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
                {statistics.subCategoryCount}
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

            {/* スタートアップ数カード */}
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
                background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
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
                スタートアップ数
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
                {statistics.startupCount}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件のスタートアップ
              </div>
            </div>
          </div>

          {/* 2D関係性図、バブルチャート、または棒グラフ */}
          {viewMode === 'bar' ? (
            barChartSpec && categoryChartData.length > 0 ? (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  padding: '24px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #F3F4F6',
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      margin: 0,
                      fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                    }}>
                      カテゴリー別スタートアップ件数
                    </h3>
                  </div>
                  <DynamicVegaChart
                    spec={barChartSpec}
                    language="vega-lite"
                    chartData={categoryChartData}
                    noBorder={true}
                    onSignal={(signalName: string, value: any) => {
                      // VegaChartのクリックイベントを処理
                      if (signalName === 'clicked_theme' || signalName === 'click') {
                        // item.datumからカテゴリー情報を取得
                        if (value && value.datum) {
                          const datum = value.datum;
                          // サブカテゴリーIDがある場合はサブカテゴリーを選択、なければ親カテゴリーを選択
                          if (datum.subCategoryId) {
                            setSelectedBarCategoryId(datum.subCategoryId);
                          } else if (datum.categoryId) {
                            setSelectedBarCategoryId(datum.categoryId);
                          } else if (datum.category) {
                            const clickedCategory = categories.find(cat => cat.title === datum.category);
                            if (clickedCategory) {
                              setSelectedBarCategoryId(clickedCategory.id);
                            }
                          }
                        } else if (value && value.subCategoryId) {
                          setSelectedBarCategoryId(value.subCategoryId);
                        } else if (value && value.categoryId) {
                          setSelectedBarCategoryId(value.categoryId);
                        } else if (value && value.category) {
                          const clickedCategory = categories.find(cat => cat.title === value.category);
                          if (clickedCategory) {
                            setSelectedBarCategoryId(clickedCategory.id);
                          }
                        }
                      }
                    }}
                  />
                </div>
                
                {/* 選択されたカテゴリーのスタートアップ一覧 */}
                {selectedBarCategoryId && getSelectedCategoryStartups.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <div style={{
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1A1A1A',
                        margin: 0,
                        fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                      }}>
                        {categories.find(cat => cat.id === selectedBarCategoryId)?.title} に紐づくスタートアップ
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6B7280',
                        }}>
                          ({getSelectedCategoryStartups.length}件)
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setSelectedBarCategoryId(null)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#6B7280',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E0E0E0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F5F5F5';
                          e.currentTarget.style.borderColor = '#C4C4C4';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E0E0E0';
                        }}
                      >
                        閉じる
                      </button>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '16px',
                    }}>
                      {getSelectedCategoryStartups.map((startup) => (
                        <div
                          key={startup.id}
                          onClick={() => {
                            if (startup.organizationId && startup.id) {
                              router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                            }
                          }}
                          style={{
                            padding: '16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            cursor: startup.organizationId ? 'pointer' : 'default',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            if (startup.organizationId) {
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                              e.currentTarget.style.borderColor = '#4262FF';
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (startup.organizationId) {
                              e.currentTarget.style.backgroundColor = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1A1A1A',
                            marginBottom: '8px',
                            fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                          }}>
                            {startup.title}
                          </div>
                          {startup.description && (
                            <div style={{
                              fontSize: '14px',
                              color: '#6B7280',
                              marginTop: '8px',
                              lineHeight: '1.5',
                              fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {startup.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#6B7280',
                fontSize: '14px',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                カテゴリーまたはスタートアップが登録されていません。
              </div>
            )
          ) : nodes.length > 0 ? (
            <div style={{ marginBottom: '32px' }}>
              {viewMode === 'diagram' ? (
                <DynamicRelationshipDiagram2D
                  width={1200}
                  height={800}
                  nodes={nodes}
                  links={links}
                  onNodeClick={handleNodeClick}
                  maxNodes={1000}
                />
              ) : (
                <DynamicRelationshipBubbleChart
                  width={1200}
                  height={800}
                  nodes={nodes}
                  links={links}
                  onNodeClick={handleNodeClick}
                />
              )}
            </div>
          ) : (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              color: '#6B7280',
              fontSize: '14px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              カテゴリーまたはスタートアップが登録されていません。
            </div>
          )}
        </div>
      )}
    </>
  );
}


