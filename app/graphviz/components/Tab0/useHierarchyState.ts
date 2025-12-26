/**
 * 階層状態管理フック
 * タブ0の階層的なナビゲーション状態を管理
 */

import { useState, useCallback } from 'react';

export type HierarchyLevel = 'all' | 'sites' | 'racks' | 'equipment' | 'server-details';

export interface BreadcrumbItem {
  id: string;
  label: string;
  type: HierarchyLevel;
}

export interface HierarchyState {
  currentLevel: HierarchyLevel;
  selectedSiteId?: string;
  selectedRackId?: string;
  selectedEquipmentId?: string;
  selectedServerId?: string;
  breadcrumbs: BreadcrumbItem[];
}

export function useHierarchyState() {
  const [state, setState] = useState<HierarchyState>({
    currentLevel: 'all',
    breadcrumbs: [],
  });
  
  const navigateToLevel = useCallback((
    level: HierarchyLevel,
    nodeId?: string,
    nodeLabel?: string
  ) => {
    setState(prev => {
      const newBreadcrumbs = [...prev.breadcrumbs];
      
      // レベル順序
      const levelOrder: HierarchyLevel[] = ['all', 'sites', 'racks', 'equipment', 'server-details'];
      const currentIndex = levelOrder.indexOf(prev.currentLevel);
      const newIndex = levelOrder.indexOf(level);
      
      if (level === 'all') {
        // 全体表示に戻る場合、ブレッドクラムをクリア
        newBreadcrumbs.length = 0;
      } else if (nodeId && nodeLabel) {
        if (newIndex <= currentIndex) {
          // 上位レベルまたは同じレベルに移動する場合、ブレッドクラムを切り詰める
          newBreadcrumbs.splice(newIndex);
        } else {
          // 下位レベルに進む場合、ブレッドクラムを追加
          // 同じレベルの項目が既にある場合は置き換え
          const existingIndex = newBreadcrumbs.findIndex(b => b.type === level);
          if (existingIndex >= 0) {
            newBreadcrumbs.splice(existingIndex);
          }
          newBreadcrumbs.push({ id: nodeId, label: nodeLabel, type: level });
        }
      }
      
      return {
        currentLevel: level,
        selectedSiteId: level === 'sites' ? nodeId : (level === 'all' ? undefined : prev.selectedSiteId),
        selectedRackId: level === 'racks' ? nodeId : (level === 'sites' || level === 'all' ? undefined : prev.selectedRackId),
        selectedEquipmentId: level === 'equipment' ? nodeId : undefined,
        selectedServerId: level === 'server-details' ? nodeId : undefined,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);
  
  const navigateToBreadcrumb = useCallback((index: number) => {
    setState(prev => {
      if (index < -1 || index >= prev.breadcrumbs.length) {
        return prev;
      }
      
      if (index === -1) {
        // 全体表示に戻る
        return {
          currentLevel: 'all',
          breadcrumbs: [],
        };
      }
      
      const targetBreadcrumb = prev.breadcrumbs[index];
      if (!targetBreadcrumb) {
        return prev;
      }
      
      const newBreadcrumbs = prev.breadcrumbs.slice(0, index + 1);
      
      return {
        currentLevel: targetBreadcrumb.type,
        selectedSiteId: targetBreadcrumb.type === 'sites' ? targetBreadcrumb.id : 
                       (['racks', 'equipment', 'server-details'].includes(targetBreadcrumb.type) ? prev.selectedSiteId : undefined),
        selectedRackId: targetBreadcrumb.type === 'racks' ? targetBreadcrumb.id : 
                       (['equipment', 'server-details'].includes(targetBreadcrumb.type) ? prev.selectedRackId : undefined),
        selectedEquipmentId: targetBreadcrumb.type === 'equipment' ? targetBreadcrumb.id : undefined,
        selectedServerId: targetBreadcrumb.type === 'server-details' ? targetBreadcrumb.id : undefined,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);
  
  const reset = useCallback(() => {
    setState({
      currentLevel: 'all',
      breadcrumbs: [],
    });
  }, []);
  
  // 階層を一度に設定する関数（server-details用）
  const setHierarchy = useCallback((
    levels: Array<{ level: HierarchyLevel; nodeId: string; nodeLabel: string }>
  ) => {
    setState(prev => {
      const newBreadcrumbs: BreadcrumbItem[] = [];
      const levelOrder: HierarchyLevel[] = ['all', 'sites', 'racks', 'equipment', 'server-details'];
      
      // レベル順にソート
      const sortedLevels = [...levels].sort((a, b) => {
        const aIndex = levelOrder.indexOf(a.level);
        const bIndex = levelOrder.indexOf(b.level);
        return aIndex - bIndex;
      });
      
      // ブレッドクラムを構築
      for (const { level, nodeId, nodeLabel } of sortedLevels) {
        newBreadcrumbs.push({ id: nodeId, label: nodeLabel, type: level });
      }
      
      // 最後のレベルを現在のレベルとして設定
      const lastLevel = sortedLevels[sortedLevels.length - 1];
      
      return {
        currentLevel: lastLevel.level,
        selectedSiteId: sortedLevels.find(l => l.level === 'sites')?.nodeId || prev.selectedSiteId,
        selectedRackId: sortedLevels.find(l => l.level === 'racks')?.nodeId || prev.selectedRackId,
        selectedEquipmentId: sortedLevels.find(l => l.level === 'equipment')?.nodeId || undefined,
        selectedServerId: sortedLevels.find(l => l.level === 'server-details')?.nodeId || undefined,
        breadcrumbs: newBreadcrumbs,
      };
    });
  }, []);
  
  return {
    state,
    navigateToLevel,
    navigateToBreadcrumb,
    reset,
    setHierarchy,
  };
}

