import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink } from '@/components/RelationshipDiagram2D';
import type { Category, Startup } from '@/lib/orgApi';
import { devLog } from '../utils/devLog';

export function useCategoryStartupDiagramData({
  categories,
  startups,
  selectedCategoryIds,
}: {
  categories: Category[];
  startups: Startup[];
  selectedCategoryIds?: string[];
}) {
  const { nodes, links } = useMemo(() => {
    devLog('🔍 [カテゴリー-スタートアップ関係性図] useMemo実行:', {
      categoriesCount: categories.length,
      startupsCount: startups.length,
      selectedCategoryIds,
    });

    if (categories.length === 0) {
      devLog('🔍 [カテゴリー-スタートアップ関係性図] カテゴリーが存在しない');
      return { nodes: [], links: [] };
    }

    const diagramNodes: RelationshipNode[] = [];
    const diagramLinks: RelationshipLink[] = [];

    // 親カテゴリー（トップレベル）を取得
    let topLevelCategories = categories.filter(cat => !cat.parentCategoryId);
    
    // 選択されたカテゴリーがある場合、そのカテゴリーとその子孫のみを表示
    if (selectedCategoryIds && selectedCategoryIds.length > 0) {
      const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id));
      if (selectedCategories.length > 0) {
        // 選択されたカテゴリーの親カテゴリーを取得（再帰的に）
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
        
        // 選択されたカテゴリーのトップレベルカテゴリーを取得
        const topLevelCats = selectedCategories
          .map(cat => getTopLevelCategory(cat))
          .filter((cat, index, self) => self.findIndex(c => c.id === cat.id) === index);
        
        topLevelCategories = topLevelCats;
      }
    }

    // カテゴリー階層を構築
    const getChildren = (parentId: string) => categories.filter(cat => cat.parentCategoryId === parentId);
    
    // 選択されたカテゴリーとその子孫を取得する関数
    const shouldIncludeCategory = (category: Category): boolean => {
      if (!selectedCategoryIds || selectedCategoryIds.length === 0) {
        return true;
      }
      // 選択されたカテゴリー自体
      if (selectedCategoryIds.includes(category.id)) {
        return true;
      }
      // 選択されたカテゴリーの子孫かチェック
      const isDescendant = (cat: Category, selectedIds: string[]): boolean => {
        if (selectedIds.includes(cat.id)) {
          return true;
        }
        if (!cat.parentCategoryId) {
          return false;
        }
        const parent = categories.find(c => c.id === cat.parentCategoryId);
        if (!parent) {
          return false;
        }
        return isDescendant(parent, selectedIds);
      };
      return isDescendant(category, selectedCategoryIds);
    };

    // 親カテゴリーをノードに追加
    topLevelCategories.forEach((parentCategory) => {
      // 選択されたカテゴリーのみ表示する場合、親カテゴリーが選択されていない場合はスキップ
      if (selectedCategoryIds && selectedCategoryIds.length > 0 && !shouldIncludeCategory(parentCategory)) {
        return;
      }
      
      diagramNodes.push({
        id: `category_${parentCategory.id}`,
        label: parentCategory.title,
        type: 'category',
        data: { ...parentCategory, categoryType: 'parent' },
      });

      // 子カテゴリーを取得
      const childCategories = getChildren(parentCategory.id);

      // 子カテゴリーをノードに追加し、親へのリンクを作成
      childCategories.forEach((childCategory) => {
        // 選択されたカテゴリーのみ表示する場合、子カテゴリーが選択されていない場合はスキップ
        if (selectedCategoryIds && selectedCategoryIds.length > 0 && !shouldIncludeCategory(childCategory)) {
          return;
        }
        diagramNodes.push({
          id: `category_${childCategory.id}`,
          label: childCategory.title,
          type: 'category',
          data: { ...childCategory, categoryType: 'child' },
        });

        // 親カテゴリーから子カテゴリーへのリンク
        diagramLinks.push({
          source: `category_${parentCategory.id}`,
          target: `category_${childCategory.id}`,
          type: 'category-hierarchy',
        });

        // 子カテゴリーに紐づいているスタートアップを取得
        const relatedStartups = startups.filter(startup => 
          startup.categoryIds && startup.categoryIds.includes(childCategory.id)
        );

        // スタートアップをノードに追加し、子カテゴリーへのリンクを作成
        relatedStartups.forEach((startup) => {
          const startupNodeId = `startup_${startup.id}`;
          
          // スタートアップノードが既に存在するかチェック（複数のカテゴリーに紐づく場合）
          if (!diagramNodes.find(n => n.id === startupNodeId)) {
            diagramNodes.push({
              id: startupNodeId,
              label: startup.title,
              type: 'startup',
              data: startup,
            });
          }

          // 子カテゴリーからスタートアップへのリンク
          diagramLinks.push({
            source: `category_${childCategory.id}`,
            target: startupNodeId,
            type: 'startup-category',
          });
        });
      });

      // 親カテゴリーに直接紐づいているスタートアップ（子カテゴリーがない場合）
      if (childCategories.length === 0) {
        const relatedStartups = startups.filter(startup => 
          startup.categoryIds && startup.categoryIds.includes(parentCategory.id)
        );

        relatedStartups.forEach((startup) => {
          const startupNodeId = `startup_${startup.id}`;
          
          if (!diagramNodes.find(n => n.id === startupNodeId)) {
            diagramNodes.push({
              id: startupNodeId,
              label: startup.title,
              type: 'startup',
              data: startup,
            });
          }

          // 親カテゴリーからスタートアップへのリンク
          diagramLinks.push({
            source: `category_${parentCategory.id}`,
            target: startupNodeId,
            type: 'startup-category',
          });
        });
      }
    });

    // 無効なリンクをチェック
    const nodeIds = new Set(diagramNodes.map(n => n.id));
    const invalidLinks: Array<{ source: string; target: string; type?: string }> = [];
    diagramLinks.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
        invalidLinks.push({
          source: sourceId,
          target: targetId,
          type: link.type,
        });
      }
    });

    if (invalidLinks.length > 0) {
      console.error('❌ [カテゴリー-スタートアップ関係性図] 無効なリンク:', invalidLinks);
    }

    devLog('✅ [カテゴリー-スタートアップ関係性図] ノード数:', diagramNodes.length, 'リンク数:', diagramLinks.length);

    return { nodes: diagramNodes, links: diagramLinks };
  }, [categories, startups, selectedCategoryIds]);

  return { nodes, links };
}

