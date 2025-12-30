'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Startup, BizDevPhase } from '@/lib/orgApi';
import { useCategoryManagement } from '../../hooks/useCategoryManagement';
import { useCategoryStartupDiagramData } from '../../hooks/useCategoryStartupDiagramData';
import ViewModeSelector from '../ViewModeSelector';
import CategorySelector from '../CategorySelector';
import type { RelationshipNode } from '@/components/RelationshipDiagram2D';
import dynamic from 'next/dynamic';
import { SubTabBar } from './SubTabBar';
import { formatStartupDate } from '@/lib/orgApi/utils';
import { StartupListModal } from './StartupListModal';

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
  bizDevPhases: BizDevPhase[];
  orderedBizDevPhases: BizDevPhase[];
  categoryManagement: ReturnType<typeof useCategoryManagement>;
}

export function CategorySection({
  categories,
  setCategories,
  startups,
  bizDevPhases,
  orderedBizDevPhases,
  categoryManagement,
}: CategorySectionProps) {
  const router = useRouter();
  const [categorySubTab, setCategorySubTab] = useState<'management' | 'diagram'>('diagram');
  const [viewMode, setViewMode] = useState<'diagram' | 'bubble' | 'bar' | 'matrix'>('matrix');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedBarCategoryId, setSelectedBarCategoryId] = useState<string | null>(null);
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{ parentCategoryId: string; bizDevPhaseId: string } | null>(null);
  const [matrixXAxisMode, setMatrixXAxisMode] = useState<'parent' | 'sub'>('parent');
  const [barXAxisMode, setBarXAxisMode] = useState<'parent' | 'sub'>('parent');
  const [selectedBizDevPhaseIds, setSelectedBizDevPhaseIds] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [showTotalStartupModal, setShowTotalStartupModal] = useState<boolean>(false);
  const [showMatchingStartupModal, setShowMatchingStartupModal] = useState<boolean>(false);

  // viewModeが'bar'以外に変更された時にフィルターをリセット
  useEffect(() => {
    if (viewMode !== 'bar') {
      setSelectedBizDevPhaseIds([]);
    }
  }, [viewMode]);
  
  const { nodes, links } = useCategoryStartupDiagramData({
    categories,
    startups,
    selectedCategoryIds,
  });

  // フィルター適用後のスタートアップを計算
  const filteredStartups = useMemo(() => {
    if (viewMode === 'bar' && selectedBizDevPhaseIds.length > 0) {
      return startups.filter(startup => {
        const hasBizDevPhase = (startup as any).bizDevPhase && selectedBizDevPhaseIds.includes((startup as any).bizDevPhase);
        return hasBizDevPhase;
      });
    }
    return startups;
  }, [startups, viewMode, selectedBizDevPhaseIds]);

  // カテゴリーごとのスタートアップ件数を集計（横軸モードに応じて、フィルター適用後）
  const categoryChartData = useMemo(() => {
    const startupsToUse = viewMode === 'bar' ? filteredStartups : startups;
    if (barXAxisMode === 'parent') {
      // 親カテゴリー × スタートアップ件数（積み上げなし）
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

      const chartData: Array<{
        category: string;
        categoryId: string;
        count: number;
      }> = [];

      targetCategories.forEach(parentCategory => {
        // 親カテゴリーまたはその子カテゴリーに紐づくスタートアップを取得
        const childCategoryIds = categories
          .filter(c => c.parentCategoryId === parentCategory.id)
          .map(c => c.id);
        const allCategoryIds = [parentCategory.id, ...childCategoryIds];
        
        const matchingStartups = startupsToUse.filter(startup => 
          startup.categoryIds && startup.categoryIds.some(catId => allCategoryIds.includes(catId))
        );
        
        chartData.push({
          category: parentCategory.title,
          categoryId: parentCategory.id,
          count: matchingStartups.length,
        });
      });

      return chartData.filter(item => item.count > 0 || selectedCategoryIds.length === 0);
    } else {
      // サブカテゴリー × スタートアップ件数
      let targetSubCategories: Category[] = [];
      
      if (selectedCategoryIds.length === 0) {
        targetSubCategories = categories.filter(cat => cat.parentCategoryId);
      } else {
        targetSubCategories = categories.filter(cat => 
          selectedCategoryIds.includes(cat.id) && cat.parentCategoryId
        );
      }

      const chartData: Array<{
        category: string;
        categoryId: string;
        count: number;
      }> = [];

      targetSubCategories.forEach(subCategory => {
        const matchingStartups = startupsToUse.filter(startup => 
          startup.categoryIds && startup.categoryIds.includes(subCategory.id)
        );
        
        chartData.push({
          category: subCategory.title,
          categoryId: subCategory.id,
          count: matchingStartups.length,
        });
      });

      return chartData.filter(item => item.count > 0 || selectedCategoryIds.length === 0);
    }
  }, [categories, startups, selectedCategoryIds, barXAxisMode, viewMode, filteredStartups]);

  // マトリクスデータを生成（親カテゴリー × Biz-Devフェーズ または サブカテゴリー × Biz-Devフェーズ）
  // orderedBizDevPhasesとorderedCategoriesの順序を使用（管理タブの順序に合わせる）
  const matrixData = useMemo(() => {
    // orderedBizDevPhasesが空の場合はbizDevPhasesを使用（フォールバック）
    const phasesToUse = orderedBizDevPhases.length > 0 ? orderedBizDevPhases : bizDevPhases;
    // orderedCategoriesが空の場合はcategoriesを使用（フォールバック）
    const orderedCategoriesToUse = categoryManagement.orderedCategories.length > 0 ? categoryManagement.orderedCategories : categories;

    if (matrixXAxisMode === 'parent') {
      // 親カテゴリー × Biz-Devフェーズ
      // 表示対象の親カテゴリーを決定
      let parentCategories: Category[] = [];
      
      if (selectedCategoryIds.length === 0) {
        // 選択されていない場合は、すべての親カテゴリーを表示（orderedCategoriesの順序を使用）
        parentCategories = orderedCategoriesToUse.filter(cat => !cat.parentCategoryId);
      } else {
        // 選択されたカテゴリーとその親カテゴリーを取得
        const selectedCategories = orderedCategoriesToUse.filter(cat => selectedCategoryIds.includes(cat.id));
        const getTopLevelCategory = (category: Category): Category => {
          if (!category.parentCategoryId) {
            return category;
          }
          const parent = orderedCategoriesToUse.find(c => c.id === category.parentCategoryId);
          if (!parent) {
            return category;
          }
          return getTopLevelCategory(parent);
        };
        
        const topLevelCats = selectedCategories
          .map(cat => getTopLevelCategory(cat))
          .filter((cat, index, self) => self.findIndex(c => c.id === cat.id) === index);
        
        // orderedCategoriesの順序を保持
        parentCategories = topLevelCats.sort((a, b) => {
          const indexA = orderedCategoriesToUse.findIndex(c => c.id === a.id);
          const indexB = orderedCategoriesToUse.findIndex(c => c.id === b.id);
          return indexA - indexB;
        });
      }

      // マトリクスデータを生成
      const data: Array<{
        category: string;
        categoryId: string;
        parentCategory?: string;
        parentCategoryId?: string;
        bizDevPhase: string;
        bizDevPhaseId: string;
        bizDevPhasePosition: number;
        count: number;
      }> = [];

      parentCategories.forEach(parentCategory => {
        phasesToUse.forEach((phase, index) => {
          // 親カテゴリーまたはその子カテゴリーに紐づくスタートアップで、かつ該当するBiz-Devフェーズのものを取得
          const childCategoryIds = orderedCategoriesToUse
            .filter(c => c.parentCategoryId === parentCategory.id)
            .map(c => c.id);
          const allCategoryIds = [parentCategory.id, ...childCategoryIds];
          
          const matchingStartups = startups.filter(startup => 
            startup.categoryIds && 
            startup.categoryIds.some(catId => allCategoryIds.includes(catId)) &&
            (startup as any).bizDevPhase === phase.id
          );
          
          data.push({
            category: parentCategory.title,
            categoryId: parentCategory.id,
            parentCategory: parentCategory.title,
            parentCategoryId: parentCategory.id,
            bizDevPhase: phase.title,
            bizDevPhaseId: phase.id,
            bizDevPhasePosition: index,
            count: matchingStartups.length,
          });
        });
      });

      return data;
    } else {
      // サブカテゴリー × Biz-Devフェーズ
      // 表示対象のサブカテゴリーを決定
      let subCategories: Category[] = [];
      
      if (selectedCategoryIds.length === 0) {
        // 選択されていない場合は、すべてのサブカテゴリーを表示（orderedCategoriesの順序を使用）
        subCategories = orderedCategoriesToUse.filter(cat => cat.parentCategoryId);
      } else {
        // 選択されたカテゴリーからサブカテゴリーのみを取得（orderedCategoriesの順序を使用）
        subCategories = orderedCategoriesToUse.filter(cat => 
          selectedCategoryIds.includes(cat.id) && cat.parentCategoryId
        );
      }

      // マトリクスデータを生成
      const data: Array<{
        category: string;
        categoryId: string;
        parentCategory?: string;
        parentCategoryId?: string;
        bizDevPhase: string;
        bizDevPhaseId: string;
        bizDevPhasePosition: number;
        count: number;
      }> = [];

      subCategories.forEach(subCategory => {
        const parentCategory = orderedCategoriesToUse.find(c => c.id === subCategory.parentCategoryId);
        phasesToUse.forEach((phase, index) => {
          // サブカテゴリーに紐づくスタートアップで、かつ該当するBiz-Devフェーズのものを取得
          const matchingStartups = startups.filter(startup => 
            startup.categoryIds && 
            startup.categoryIds.includes(subCategory.id) &&
            (startup as any).bizDevPhase === phase.id
          );
          
          data.push({
            category: subCategory.title,
            categoryId: subCategory.id,
            parentCategory: parentCategory?.title,
            parentCategoryId: parentCategory?.id,
            bizDevPhase: phase.title,
            bizDevPhaseId: phase.id,
            bizDevPhasePosition: index,
            count: matchingStartups.length,
          });
        });
      });

      return data;
    }
  }, [categories, startups, selectedCategoryIds, bizDevPhases, orderedBizDevPhases, categoryManagement.orderedCategories, matrixXAxisMode]);

  // マトリクスチャートの仕様を生成
  const matrixChartSpec = useMemo(() => {
    if (matrixData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // orderedBizDevPhasesが空の場合はbizDevPhasesを使用（フォールバック）
    const phasesToUse = orderedBizDevPhases.length > 0 ? orderedBizDevPhases : bizDevPhases;
    const chartHeight = isMobile ? 400 : Math.max(400, phasesToUse.length * 40 + 100);

    // カテゴリーの順序を取得（orderedCategoriesの順序を使用）
    const orderedCategoriesToUse = categoryManagement.orderedCategories.length > 0 ? categoryManagement.orderedCategories : categories;
    const categoryList = matrixXAxisMode === 'parent'
      ? Array.from(new Set(matrixData.map(d => d.parentCategoryId)))
          .map(id => orderedCategoriesToUse.find(c => c.id === id))
          .filter((c): c is Category => c !== undefined)
          .sort((a, b) => {
            const indexA = orderedCategoriesToUse.findIndex(c => c.id === a.id);
            const indexB = orderedCategoriesToUse.findIndex(c => c.id === b.id);
            return indexA - indexB;
          })
      : Array.from(new Set(matrixData.map(d => d.categoryId)))
          .map(id => orderedCategoriesToUse.find(c => c.id === id))
          .filter((c): c is Category => c !== undefined)
          .sort((a, b) => {
            const indexA = orderedCategoriesToUse.findIndex(c => c.id === a.id);
            const indexB = orderedCategoriesToUse.findIndex(c => c.id === b.id);
            return indexA - indexB;
          });

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'カテゴリー × Biz-Devフェーズ マトリクス',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 120 },
      data: {
        values: matrixData,
      },
      layer: [
        // 1. 背景のrect（ヒートマップ）
        {
          mark: {
            type: 'rect',
            tooltip: true,
            cursor: 'pointer',
            stroke: '#FFFFFF',
            strokeWidth: 2,
          },
          encoding: {
            x: {
              field: 'category',
              type: 'ordinal',
              title: matrixXAxisMode === 'parent' ? '親カテゴリー' : 'サブカテゴリー',
              scale: {
                domain: categoryList.map(c => c.title),
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
              field: 'bizDevPhase',
              type: 'ordinal',
              title: 'Biz-Devフェーズ',
              scale: {
                domain: phasesToUse.map(p => p.title),
              },
              axis: {
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
            color: {
              field: 'count',
              type: 'quantitative',
              scale: {
                scheme: 'blues',
                domain: [0, Math.max(...matrixData.map(d => d.count), 1)],
              },
              legend: {
                title: '件数',
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#6B7280',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
              },
            },
            tooltip: [
              { field: 'category', title: matrixXAxisMode === 'parent' ? '親カテゴリー' : 'サブカテゴリー' },
              { field: 'bizDevPhase', title: 'Biz-Devフェーズ' },
              { field: 'count', title: 'スタートアップ件数', format: ',d' },
            ],
          },
        },
        // 2. 数字のテキスト
        {
          mark: {
            type: 'text',
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
              field: 'bizDevPhase',
              type: 'ordinal',
            },
            text: {
              field: 'count',
              type: 'quantitative',
              format: 'd',
            },
            color: {
              condition: {
                test: 'datum.count > 0',
                value: '#1A1A1A',
              },
              value: '#9CA3AF',
            },
          },
        },
      ],
      selection: {
        clicked_cell: {
          type: 'single',
          on: 'click',
          fields: ['parentCategoryId', 'bizDevPhaseId'],
          empty: 'none',
        },
      },
    };
  }, [matrixData, categories, bizDevPhases, orderedBizDevPhases, categoryManagement.orderedCategories]);

  // 選択されたマトリクスセルに紐づくスタートアップを取得
  const getSelectedMatrixStartups = useMemo(() => {
    if (!selectedMatrixCell) return [];

    // 親カテゴリーまたはその子カテゴリーに紐づくスタートアップで、かつ該当するBiz-Devフェーズのものを取得
    const childCategoryIds = categories
      .filter(c => c.parentCategoryId === selectedMatrixCell.parentCategoryId)
      .map(c => c.id);
    const allCategoryIds = [selectedMatrixCell.parentCategoryId, ...childCategoryIds];

    return startups.filter(startup => 
      startup.categoryIds && 
      startup.categoryIds.some(catId => allCategoryIds.includes(catId)) &&
      startup.bizDevPhase === selectedMatrixCell.bizDevPhaseId
    );
  }, [selectedMatrixCell, startups, categories]);

  const handleNodeClick = (node: RelationshipNode) => {
    // ノードクリック時の処理（必要に応じて実装）
  };

  // 統計情報を計算
  const statistics = useMemo(() => {
    // 使用するスタートアップデータ（フィルター適用後）
    const startupsToUse = viewMode === 'bar' ? filteredStartups : startups;
    
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
    
    // 全スタートアップ数（フィルター適用後の全スタートアップ数）
    const totalStartupCount = startupsToUse.length;
    const totalStartups = startupsToUse;
    
    // 該当スタートアップ数（選択されたカテゴリーに紐づくスタートアップ、重複除去）
    const getCategoryStartups = (cat: Category): Startup[] => {
      const directStartups = startupsToUse.filter(startup => 
        startup.categoryIds && startup.categoryIds.includes(cat.id)
      );
      
      const childCategories = categories.filter(c => c.parentCategoryId === cat.id);
      const childStartups = childCategories.flatMap(childCat => getCategoryStartups(childCat));
      
      const allStartups = [...directStartups, ...childStartups];
      return Array.from(new Map(allStartups.map(s => [s.id, s])).values());
    };
    
    const allStartups = targetCategories.flatMap(cat => getCategoryStartups(cat));
    const uniqueStartups = Array.from(new Map(allStartups.map(s => [s.id, s])).values());
    const matchingStartupCount = uniqueStartups.length;
    const matchingStartups = uniqueStartups;
    
    return {
      parentCategoryCount,
      subCategoryCount,
      totalStartupCount,
      totalStartups,
      matchingStartupCount,
      matchingStartups,
    };
  }, [categories, startups, selectedCategoryIds, viewMode, filteredStartups]);

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

  // 選択されたカテゴリーに紐づくスタートアップを取得（フィルター適用後）
  const getSelectedCategoryStartups = useMemo(() => {
    if (!selectedBarCategoryId) return [];

    const startupsToUse = viewMode === 'bar' ? filteredStartups : startups;

    const getCategoryStartups = (cat: Category): Startup[] => {
      const directStartups = startupsToUse.filter(startup => 
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
  }, [selectedBarCategoryId, categories, startups, viewMode, filteredStartups]);

  // 選択されたカテゴリーのスタートアップをBiz-Devフェーズごとにグループ化
  const getSelectedCategoryStartupsByBizDevPhase = useMemo(() => {
    if (!selectedBarCategoryId || getSelectedCategoryStartups.length === 0) return new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();

    const grouped = new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();
    
    // Biz-Devフェーズ未設定のグループ
    const noPhaseStartups: Startup[] = [];
    
    getSelectedCategoryStartups.forEach(startup => {
      if (startup.bizDevPhase) {
        const phase = bizDevPhases.find(p => p.id === startup.bizDevPhase);
        if (phase) {
          const key = phase.id;
          if (!grouped.has(key)) {
            grouped.set(key, { phase, startups: [] });
          }
          grouped.get(key)!.startups.push(startup);
        } else {
          noPhaseStartups.push(startup);
        }
      } else {
        noPhaseStartups.push(startup);
      }
    });
    
    // Biz-Devフェーズ未設定のスタートアップがある場合は追加
    if (noPhaseStartups.length > 0) {
      grouped.set('no-phase', { phase: null, startups: noPhaseStartups });
    }
    
    return grouped;
  }, [selectedBarCategoryId, getSelectedCategoryStartups, bizDevPhases]);

  // 棒グラフの仕様を生成（横軸モードに応じて）
  const barChartSpec = useMemo(() => {
    if (categoryChartData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    // カテゴリーのリストを取得（domain用）
    const categoryList = Array.from(new Set(categoryChartData.map(d => d.category)))
      .map(catName => {
        const cat = categories.find(c => c.title === catName);
        return cat ? { title: cat.title, position: cat.position ?? 999999 } : { title: catName, position: 999999 };
      })
      .sort((a, b) => a.position - b.position)
      .map(c => c.title);

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: barXAxisMode === 'parent' ? '親カテゴリーごとのスタートアップ件数' : 'サブカテゴリーごとのスタートアップ件数',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: categoryChartData,
      },
      mark: {
        type: 'bar',
        tooltip: true,
        cursor: 'pointer',
        cornerRadiusTopLeft: 4,
        cornerRadiusTopRight: 4,
        color: '#4262FF',
      },
      encoding: {
        x: {
          field: 'category',
          type: 'ordinal',
          title: barXAxisMode === 'parent' ? '親カテゴリー' : 'サブカテゴリー',
          scale: {
            domain: categoryList,
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
        },
        tooltip: [
          { field: 'category', type: 'nominal', title: barXAxisMode === 'parent' ? '親カテゴリー' : 'サブカテゴリー' },
          { field: 'count', type: 'quantitative', title: '件数', format: 'd' },
        ],
      },
      selection: {
        clicked_theme: {
          type: 'single',
          on: 'click',
          fields: ['categoryId'],
          empty: 'none',
        },
      },
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
  }, [categoryChartData, barXAxisMode, categories]);

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
          </div>

          {/* 統計情報カード */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(4, 1fr)',
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

            {/* 全スタートアップ数カード */}
            <div 
              onClick={() => setShowTotalStartupModal(true)}
              style={{
                padding: '24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                全スタートアップ数
                {viewMode === 'bar' && selectedBizDevPhaseIds.length > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#4262FF',
                    backgroundColor: '#E0E8FF',
                    borderRadius: '4px',
                    textTransform: 'none',
                    letterSpacing: '0',
                  }}>
                    フィルター適用中
                  </span>
                )}
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
                {statistics.totalStartupCount}
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

            {/* 該当スタートアップ数カード */}
            <div 
              onClick={() => setShowMatchingStartupModal(true)}
              style={{
                padding: '24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                該当スタートアップ数
                {viewMode === 'bar' && selectedBizDevPhaseIds.length > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#4262FF',
                    backgroundColor: '#E0E8FF',
                    borderRadius: '4px',
                    textTransform: 'none',
                    letterSpacing: '0',
                  }}>
                    フィルター適用中
                  </span>
                )}
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
                {statistics.matchingStartupCount}
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

          {/* 表示モード選択 */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: viewMode === 'matrix' ? '600' : '400',
                color: viewMode === 'matrix' ? '#FFFFFF' : '#1A1A1A',
                backgroundColor: viewMode === 'matrix' ? '#4262FF' : '#FFFFFF',
                border: '1.5px solid',
                borderColor: viewMode === 'matrix' ? '#4262FF' : '#E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'matrix') {
                  e.currentTarget.style.borderColor = '#C4C4C4';
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'matrix') {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              マトリクス
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: viewMode === 'bar' ? '600' : '400',
                color: viewMode === 'bar' ? '#FFFFFF' : '#1A1A1A',
                backgroundColor: viewMode === 'bar' ? '#4262FF' : '#FFFFFF',
                border: '1.5px solid',
                borderColor: viewMode === 'bar' ? '#4262FF' : '#E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'bar') {
                  e.currentTarget.style.borderColor = '#C4C4C4';
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'bar') {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              棒グラフ
            </button>
          </div>

          {/* 棒グラフ表示時の横軸切り替え */}
          {viewMode === 'bar' && (
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setBarXAxisMode('parent');
                  setSelectedBarCategoryId(null); // 切り替え時に選択をクリア
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: barXAxisMode === 'parent' ? '600' : '400',
                  color: barXAxisMode === 'parent' ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: barXAxisMode === 'parent' ? '#4262FF' : '#FFFFFF',
                  border: '1.5px solid',
                  borderColor: barXAxisMode === 'parent' ? '#4262FF' : '#E0E0E0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (barXAxisMode !== 'parent') {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (barXAxisMode !== 'parent') {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                親カテゴリー
              </button>
              <button
                type="button"
                onClick={() => {
                  setBarXAxisMode('sub');
                  setSelectedBarCategoryId(null); // 切り替え時に選択をクリア
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: barXAxisMode === 'sub' ? '600' : '400',
                  color: barXAxisMode === 'sub' ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: barXAxisMode === 'sub' ? '#4262FF' : '#FFFFFF',
                  border: '1.5px solid',
                  borderColor: barXAxisMode === 'sub' ? '#4262FF' : '#E0E0E0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (barXAxisMode !== 'sub') {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (barXAxisMode !== 'sub') {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                サブカテゴリー
              </button>
            </div>
          )}

          {/* Biz-Devフェーズフィルター（棒グラフ表示時のみ） */}
          {viewMode === 'bar' && (
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}>
              <div 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                style={{
                  marginBottom: isFilterExpanded ? '12px' : '0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  transform: isFilterExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: '12px',
                }}>
                  ▶
                </span>
                Biz-Devフェーズでフィルター
                {selectedBizDevPhaseIds.length > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#4262FF',
                    backgroundColor: '#E0E8FF',
                    borderRadius: '4px',
                  }}>
                    {selectedBizDevPhaseIds.length}件選択中
                  </span>
                )}
              </div>
              {isFilterExpanded && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                {bizDevPhases.map(phase => {
                  const isSelected = selectedBizDevPhaseIds.includes(phase.id);
                  return (
                    <label
                      key={phase.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: isSelected ? '#E0E8FF' : '#FFFFFF',
                        border: `1.5px solid ${isSelected ? '#4262FF' : '#E0E0E0'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                        fontSize: '14px',
                        color: isSelected ? '#4262FF' : '#1A1A1A',
                        fontWeight: isSelected ? '500' : '400',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#F5F5F5';
                          e.currentTarget.style.borderColor = '#C4C4C4';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E0E0E0';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBizDevPhaseIds([...selectedBizDevPhaseIds, phase.id]);
                          } else {
                            setSelectedBizDevPhaseIds(selectedBizDevPhaseIds.filter(id => id !== phase.id));
                          }
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          accentColor: '#4262FF',
                        }}
                      />
                      <span>{phase.title}</span>
                    </label>
                  );
                })}
                {selectedBizDevPhaseIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBizDevPhaseIds([])}
                    style={{
                      padding: '8px 12px',
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
                    フィルターをクリア
                  </button>
                )}
                </div>
              )}
            </div>
          )}

          {/* マトリクス表示時の横軸切り替え */}
          {viewMode === 'matrix' && (
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setMatrixXAxisMode('parent');
                  setSelectedMatrixCell(null); // 切り替え時に選択をクリア
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: matrixXAxisMode === 'parent' ? '600' : '400',
                  color: matrixXAxisMode === 'parent' ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: matrixXAxisMode === 'parent' ? '#4262FF' : '#FFFFFF',
                  border: '1.5px solid',
                  borderColor: matrixXAxisMode === 'parent' ? '#4262FF' : '#E0E0E0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (matrixXAxisMode !== 'parent') {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (matrixXAxisMode !== 'parent') {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                親カテゴリー
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatrixXAxisMode('sub');
                  setSelectedMatrixCell(null); // 切り替え時に選択をクリア
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: matrixXAxisMode === 'sub' ? '600' : '400',
                  color: matrixXAxisMode === 'sub' ? '#FFFFFF' : '#1A1A1A',
                  backgroundColor: matrixXAxisMode === 'sub' ? '#4262FF' : '#FFFFFF',
                  border: '1.5px solid',
                  borderColor: matrixXAxisMode === 'sub' ? '#4262FF' : '#E0E0E0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (matrixXAxisMode !== 'sub') {
                    e.currentTarget.style.borderColor = '#C4C4C4';
                    e.currentTarget.style.backgroundColor = '#FAFAFA';
                  }
                }}
                onMouseLeave={(e) => {
                  if (matrixXAxisMode !== 'sub') {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                サブカテゴリー
              </button>
            </div>
          )}

          {/* 2D関係性図、バブルチャート、棒グラフ、またはマトリクス */}
          {viewMode === 'matrix' ? (
            matrixChartSpec && matrixData.length > 0 ? (
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
                      カテゴリー × Biz-Devフェーズ マトリクス
                    </h3>
                  </div>
                  <DynamicVegaChart
                    spec={matrixChartSpec}
                    language="vega-lite"
                    chartData={matrixData}
                    noBorder={true}
                    onSignal={(signalName: string, value: any) => {
                      console.log('📊 [CategorySection] Matrix signal received:', signalName, value);
                      if (signalName === 'clicked_cell' || signalName === 'click' || signalName === 'clicked_theme') {
                        if (value && value.datum) {
                          const datum = value.datum;
                          if (datum.parentCategoryId && datum.bizDevPhaseId) {
                            console.log('✅ [CategorySection] Setting matrix cell:', datum.parentCategoryId, datum.bizDevPhaseId);
                            setSelectedMatrixCell({
                              parentCategoryId: datum.parentCategoryId,
                              bizDevPhaseId: datum.bizDevPhaseId,
                            });
                          }
                        } else if (value && value.parentCategoryId && value.bizDevPhaseId) {
                          console.log('✅ [CategorySection] Setting matrix cell (direct):', value.parentCategoryId, value.bizDevPhaseId);
                          setSelectedMatrixCell({
                            parentCategoryId: value.parentCategoryId,
                            bizDevPhaseId: value.bizDevPhaseId,
                          });
                        }
                      }
                    }}
            />
          </div>

                {/* 選択されたマトリクスセルのスタートアップ一覧 */}
                {selectedMatrixCell && getSelectedMatrixStartups.length > 0 && (
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
                        {matrixXAxisMode === 'parent' 
                          ? categories.find(cat => cat.id === selectedMatrixCell.parentCategoryId)?.title
                          : categories.find(cat => cat.id === selectedMatrixCell.parentCategoryId)?.title} × {bizDevPhases.find(phase => phase.id === selectedMatrixCell.bizDevPhaseId)?.title} に紐づくスタートアップ
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6B7280',
                        }}>
                          ({getSelectedMatrixStartups.length}件)
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setSelectedMatrixCell(null)}
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
                          e.currentTarget.style.borderColor = '#C4C4C4';
                          e.currentTarget.style.backgroundColor = '#FAFAFA';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E0E0E0';
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        クリア
                      </button>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                        ? '1fr' 
                        : 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '16px',
                    }}>
                      {getSelectedMatrixStartups.map((startup) => (
                        <div
                          key={startup.id}
                          onClick={() => {
                            router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                          }}
                          style={{
                            padding: '16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#4262FF';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(66, 98, 255, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E5E7EB';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
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
                          {startup.createdAt && (() => {
                            const formattedDate = formatStartupDate(startup.createdAt);
                            return formattedDate ? (
                              <div style={{
                                fontSize: '12px',
                                color: '#9CA3AF',
                                marginTop: '8px',
                              }}>
                                作成日: {formattedDate}
                              </div>
                            ) : null;
                          })()}
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
                color: '#6B7280',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
              }}>
                マトリクスデータがありません。
              </div>
            )
          ) : viewMode === 'bar' ? (
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
                
                {/* 選択されたカテゴリーのスタートアップ一覧（Biz-Devフェーズごとにグループ化） */}
                {selectedBarCategoryId && getSelectedCategoryStartupsByBizDevPhase.size > 0 && (
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
                    
                    {/* Biz-Devフェーズごとにセクション分け */}
                    {Array.from(getSelectedCategoryStartupsByBizDevPhase.entries()).map(([phaseId, { phase, startups }]) => (
                      <div key={phaseId} style={{ marginBottom: '32px' }}>
                        <h5 style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#1A1A1A',
                          marginBottom: '16px',
                          paddingBottom: '8px',
                          borderBottom: '2px solid #E5E7EB',
                          fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                        }}>
                          {phase ? phase.title : 'Biz-Devフェーズ未設定'}
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '13px',
                            fontWeight: '400',
                            color: '#6B7280',
                          }}>
                            ({startups.length}件)
                          </span>
                        </h5>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                          gap: '16px',
                        }}>
                          {startups.map((startup) => (
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
                              {startup.createdAt && (() => {
                                const { formatStartupDate } = require('@/lib/orgApi/utils');
                                const formattedDate = formatStartupDate(startup.createdAt);
                                return formattedDate ? (
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#9CA3AF',
                                    marginTop: '8px',
                                  }}>
                                    作成日: {formattedDate}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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

      {/* スタートアップ一覧モーダル */}
      <StartupListModal
        isOpen={showTotalStartupModal}
        onClose={() => setShowTotalStartupModal(false)}
        startups={statistics.totalStartups || []}
        title="全スタートアップ一覧"
      />
      <StartupListModal
        isOpen={showMatchingStartupModal}
        onClose={() => setShowMatchingStartupModal(false)}
        startups={statistics.matchingStartups || []}
        title="該当スタートアップ一覧"
      />
    </>
  );
}


