'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, type OrgNodeData } from '@/lib/orgApi';
import { getThemes, getFocusInitiatives, type Theme, type FocusInitiative } from '@/lib/orgApi';
import { extractOrganizationsByDepth, type HierarchyLevel } from '../utils/organizationUtils';

// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};
const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

// モジュールレベルで初回読み込みフラグを管理（コンポーネントの再マウントに関係なく保持）
let globalIsInitialLoad = true;

interface UseDashboardDataProps {
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  selectedLevel: number | null;
  setSelectedLevel: (level: number | null) => void;
}

export function useDashboardData({
  selectedTypeFilter,
  selectedLevel,
  setSelectedLevel,
}: UseDashboardDataProps) {
  const [orgTree, setOrgTree] = useState<OrgNodeData | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [initiatives, setInitiatives] = useState<FocusInitiative[]>([]);
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyLevel[]>([]);
  // データが存在しない場合のみローディングを表示（ページ遷移時は表示しない）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // データ取得関数（Supabase最適化版）
  const loadData = useCallback(async (skipLoading = false) => {
    try {
      // skipLoadingがfalseで、かつ初回読み込み時のみローディングを表示（ページ遷移時はskipLoading=trueなので表示しない）
      if (!skipLoading && globalIsInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
      devLog('📖 [ダッシュボード] データ読み込み開始', { 
        selectedTypeFilter,
        useSupabase: useSupabase ? 'Supabase' : 'SQLite',
        skipLoading,
      });

      // 組織ツリーとテーマを並列取得（Supabase最適化）
      const startTime = performance.now();
      const [orgTreeData, themesData] = await Promise.all([
        getOrgTreeFromDb().then(data => {
          devLog('📖 [ダッシュボード] 組織ツリー取得完了');
          return data;
        }),
        getThemes().then(data => {
          devLog('📖 [ダッシュボード] テーマ取得完了:', data.length, '件');
          return data;
        }),
      ]);
      const loadTime = performance.now() - startTime;
      devLog(`⏱️ [ダッシュボード] 初期データ取得時間: ${loadTime.toFixed(2)}ms`);

      if (!orgTreeData) {
        setError('組織データが取得できませんでした');
        setLoading(false);
        return;
      }

      setOrgTree(orgTreeData);
      setThemes(themesData);

      // 階層レベルは組織ツリーから計算（typeフィルターを適用）
      const typeFilter: 'all' | 'organization' | 'company' | 'person' | undefined = selectedTypeFilter === 'all' ? undefined : selectedTypeFilter;
      const levels = extractOrganizationsByDepth(orgTreeData, typeFilter);
      setHierarchyLevels(levels);

      // 選択された階層レベルが存在しない場合、最初の階層レベルを選択
      if (selectedLevel === null || !levels.find(l => l.level === selectedLevel)) {
        if (levels.length > 0) {
          setSelectedLevel(levels[0].level);
        }
      }

      // 全組織の注力施策を取得（typeフィルターを適用）
      const allOrgs = getAllOrganizationsFromTree(orgTreeData);
      const filteredOrgs = typeFilter
        ? allOrgs.filter(org => {
            const orgType = (org as any).type || 'organization';
            return orgType === typeFilter;
          })
        : allOrgs;
      
      devLog('📖 [ダッシュボード] 全組織数:', allOrgs.length, 'フィルター後:', filteredOrgs.length);

      // 並列で各組織の施策を取得（Supabase最適化、エラーハンドリング改善）
      if (filteredOrgs.length > 0) {
        const initiativesStartTime = performance.now();
        const initiativePromises = filteredOrgs.map(org => 
          getFocusInitiatives(org.id).catch(error => {
            // 個別のエラーをログに記録し、空配列を返して処理を継続
            devWarn(`⚠️ [ダッシュボード] 組織「${org.name}」(ID: ${org.id})の施策取得エラー:`, error);
            return [] as FocusInitiative[];
          })
        );
        
        const initiativeResults = await Promise.all(initiativePromises);
        const initiativesLoadTime = performance.now() - initiativesStartTime;
        devLog(`⏱️ [ダッシュボード] 施策取得時間: ${initiativesLoadTime.toFixed(2)}ms (${filteredOrgs.length}組織)`);

        // 結果をフラット化
        const allInitiatives = initiativeResults.flat();
        
        // エラーが発生した組織数をカウント
        const errorCount = initiativeResults.filter((result, index) => {
          const org = filteredOrgs[index];
          return result.length === 0 && org;
        }).length;
        
        if (errorCount > 0) {
          devWarn(`⚠️ [ダッシュボード] ${errorCount}組織で施策取得に失敗しました（処理は継続します）`);
        }

        setInitiatives(allInitiatives);
        devLog('✅ [ダッシュボード] データ読み込み完了:', {
          themes: themesData.length,
          initiatives: allInitiatives.length,
          hierarchyLevels: levels.length,
          typeFilter: selectedTypeFilter,
          totalTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        });
      } else {
        setInitiatives([]);
        devLog('✅ [ダッシュボード] データ読み込み完了（組織なし）');
      }
      
      // 初回読み込み完了をマーク（モジュールレベルで管理）
      if (globalIsInitialLoad) {
        globalIsInitialLoad = false;
      }
    } catch (err: any) {
      console.error('❌ [ダッシュボード] データ読み込みエラー:', err);
      setError(`データの読み込みに失敗しました: ${err?.message || err}`);
      // エラー時も初回読み込み完了をマーク
      if (globalIsInitialLoad) {
        globalIsInitialLoad = false;
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTypeFilter, selectedLevel, setSelectedLevel]);

  // データ取得（selectedTypeFilter変更時）
  useEffect(() => {
    // データが既に存在する場合はローディングをスキップ（ページ遷移時は表示しない）
    const hasData = orgTree !== null || themes.length > 0;
    loadData(hasData);
  }, [loadData, selectedTypeFilter]); // selectedTypeFilterが変更されたときのみ再取得

  // ページがフォーカスされたときにデータを再取得（バックグラウンドで、ローディング表示なし）
  useEffect(() => {
    const handleFocus = () => {
      // 既にデータが存在する場合は、バックグラウンドで更新（ローディング表示なし）
      if (orgTree !== null || themes.length > 0) {
        devLog('🔄 [ダッシュボード] ページがフォーカスされました。バックグラウンドでデータを更新します。');
        loadData(true); // ローディング表示をスキップ
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData, orgTree, themes.length]);

  return {
    orgTree,
    themes,
    initiatives,
    hierarchyLevels,
    loading,
    error,
    setOrgTree,
    setThemes,
    setInitiatives,
    setHierarchyLevels,
    setError,
    reloadData: loadData,
  };
}

