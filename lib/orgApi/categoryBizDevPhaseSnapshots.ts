/**
 * カテゴリー・Biz-Devフェーズスナップショット関連のAPI
 */

import type { Category, BizDevPhase, Startup } from './types';

export interface CategoryBizDevPhaseSnapshot {
  id: string;
  snapshotDate: string; // YYYY-MM形式
  categoryCounts: Record<string, number>; // カテゴリーID -> 数値
  bizDevPhaseCounts: Record<string, number>; // Biz-DevフェーズID -> 数値
  createdAt: string;
  updatedAt: string;
}

/**
 * 現在のカテゴリーとBiz-Devフェーズの数値を集計
 */
export function calculateCurrentCounts(
  startups: Startup[],
  categories: Category[],
  bizDevPhases: BizDevPhase[]
): {
  categoryCounts: Record<string, number>;
  bizDevPhaseCounts: Record<string, number>;
} {
  const categoryCounts: Record<string, number> = {};
  const bizDevPhaseCounts: Record<string, number> = {};

  // カテゴリーの初期化
  categories.forEach(category => {
    categoryCounts[category.id] = 0;
  });

  // Biz-Devフェーズの初期化
  bizDevPhases.forEach(phase => {
    bizDevPhaseCounts[phase.id] = 0;
  });

  // スタートアップを集計
  startups.forEach(startup => {
    // カテゴリーの集計
    if (startup.categoryIds && Array.isArray(startup.categoryIds)) {
      startup.categoryIds.forEach(categoryId => {
        if (categoryCounts[categoryId] !== undefined) {
          categoryCounts[categoryId]++;
        }
      });
    }

    // Biz-Devフェーズの集計
    if (startup.bizDevPhase) {
      if (bizDevPhaseCounts[startup.bizDevPhase] !== undefined) {
        bizDevPhaseCounts[startup.bizDevPhase]++;
      }
    }
  });

  return { categoryCounts, bizDevPhaseCounts };
}

/**
 * スナップショットを保存
 */
export async function saveCategoryBizDevPhaseSnapshot(
  snapshotDate: string,
  categoryCounts: Record<string, number>,
  bizDevPhaseCounts: Record<string, number>
): Promise<CategoryBizDevPhaseSnapshot> {
  try {
    const now = new Date().toISOString();
    const snapshotId = `snapshot_${snapshotDate}`;

    const snapshotData: CategoryBizDevPhaseSnapshot = {
      id: snapshotId,
      snapshotDate,
      categoryCounts,
      bizDevPhaseCounts,
      createdAt: now,
      updatedAt: now,
    };

    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');

      try {
        await callTauriCommand('doc_set', {
          collectionName: 'categoryBizDevPhaseSnapshots',
          docId: snapshotId,
          data: {
            ...snapshotData,
            categoryCounts: JSON.stringify(categoryCounts),
            bizDevPhaseCounts: JSON.stringify(bizDevPhaseCounts),
          },
        });

        console.log('✅ [saveCategoryBizDevPhaseSnapshot] 保存成功:', snapshotId);
        return snapshotData;
      } catch (error: any) {
        console.error('❌ [saveCategoryBizDevPhaseSnapshot] Tauriコマンドエラー:', error);
        throw error;
      }
    }

    const { apiPost, apiPut } = await import('../apiClient');
    const dataToSend = {
      snapshotDate,
      categoryCounts: JSON.stringify(categoryCounts),
      bizDevPhaseCounts: JSON.stringify(bizDevPhaseCounts),
    };

    try {
      // 既存のスナップショットを確認
      const existing = await getCategoryBizDevPhaseSnapshotByDate(snapshotDate);
      if (existing) {
        await apiPut(`/api/categoryBizDevPhaseSnapshots/${snapshotId}`, dataToSend);
      } else {
        await apiPost('/api/categoryBizDevPhaseSnapshots', {
          id: snapshotId,
          ...dataToSend,
        });
      }
    } catch (error: any) {
      console.error('❌ [saveCategoryBizDevPhaseSnapshot] APIエラー:', error);
      throw error;
    }

    return snapshotData;
  } catch (error: any) {
    console.error('❌ [saveCategoryBizDevPhaseSnapshot] エラー:', error);
    throw error;
  }
}

/**
 * すべてのスナップショットを取得
 */
export async function getAllCategoryBizDevPhaseSnapshots(): Promise<CategoryBizDevPhaseSnapshot[]> {
  try {
    // Supabaseに切り替えているため、直接API版を使用
    const { apiGet } = await import('../apiClient');
    const result = await apiGet<CategoryBizDevPhaseSnapshot[]>('/api/categoryBizDevPhaseSnapshots');
    
    // JSON文字列をパース
    return result.map(snapshot => ({
      ...snapshot,
      categoryCounts: typeof snapshot.categoryCounts === 'string' 
        ? JSON.parse(snapshot.categoryCounts) 
        : snapshot.categoryCounts,
      bizDevPhaseCounts: typeof snapshot.bizDevPhaseCounts === 'string'
        ? JSON.parse(snapshot.bizDevPhaseCounts)
        : snapshot.bizDevPhaseCounts,
    }));
  } catch (error: any) {
    // タイムアウトエラーやAPIエンドポイント未実装の場合は警告レベルで処理
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('timeout') || errorMessage.includes('API request timeout')) {
      // APIエンドポイントが未実装の場合は正常な動作として扱う
      console.warn('⚠️ [getAllCategoryBizDevPhaseSnapshots] APIエンドポイントが未実装またはタイムアウト（スナップショット機能は使用できません）');
    } else {
      console.warn('⚠️ [getAllCategoryBizDevPhaseSnapshots] エラー:', errorMessage);
    }
    return [];
  }
}

/**
 * 指定された日付のスナップショットを取得
 */
export async function getCategoryBizDevPhaseSnapshotByDate(
  snapshotDate: string
): Promise<CategoryBizDevPhaseSnapshot | null> {
  try {
    const snapshotId = `snapshot_${snapshotDate}`;

    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');

      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'categoryBizDevPhaseSnapshots',
          docId: snapshotId,
        });

        if (!result || !result.data) {
          return null;
        }

        const data = result.data;
        
        // JSON文字列をパース
        let categoryCounts: Record<string, number> = {};
        let bizDevPhaseCounts: Record<string, number> = {};
        
        if (data.categoryCounts) {
          if (typeof data.categoryCounts === 'string') {
            try {
              categoryCounts = JSON.parse(data.categoryCounts);
            } catch (e) {
              console.warn('⚠️ [getCategoryBizDevPhaseSnapshotByDate] categoryCounts JSONパースエラー:', e);
            }
          } else if (typeof data.categoryCounts === 'object') {
            categoryCounts = data.categoryCounts;
          }
        }
        
        if (data.bizDevPhaseCounts) {
          if (typeof data.bizDevPhaseCounts === 'string') {
            try {
              bizDevPhaseCounts = JSON.parse(data.bizDevPhaseCounts);
            } catch (e) {
              console.warn('⚠️ [getCategoryBizDevPhaseSnapshotByDate] bizDevPhaseCounts JSONパースエラー:', e);
            }
          } else if (typeof data.bizDevPhaseCounts === 'object') {
            bizDevPhaseCounts = data.bizDevPhaseCounts;
          }
        }

        return {
          id: data.id || snapshotId,
          snapshotDate: data.snapshotDate || snapshotDate,
          categoryCounts,
          bizDevPhaseCounts,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        } as CategoryBizDevPhaseSnapshot;
      } catch (error: any) {
        console.error('❌ [getCategoryBizDevPhaseSnapshotByDate] Tauriコマンドエラー:', error);
        return null;
      }
    }

    const { apiGet } = await import('../apiClient');
    try {
      const result = await apiGet<CategoryBizDevPhaseSnapshot>(`/api/categoryBizDevPhaseSnapshots/${snapshotId}`);
      
      return {
        ...result,
        categoryCounts: typeof result.categoryCounts === 'string' 
          ? JSON.parse(result.categoryCounts) 
          : result.categoryCounts,
        bizDevPhaseCounts: typeof result.bizDevPhaseCounts === 'string'
          ? JSON.parse(result.bizDevPhaseCounts)
          : result.bizDevPhaseCounts,
      };
    } catch (error: any) {
      // 404エラーの場合はnullを返す
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('❌ [getCategoryBizDevPhaseSnapshotByDate] エラー:', error);
    return null;
  }
}

/**
 * スナップショットを削除
 */
export async function deleteCategoryBizDevPhaseSnapshot(snapshotId: string): Promise<void> {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');

      try {
        await callTauriCommand('doc_delete', {
          collectionName: 'categoryBizDevPhaseSnapshots',
          docId: snapshotId,
        });

        console.log('✅ [deleteCategoryBizDevPhaseSnapshot] 削除成功:', snapshotId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteCategoryBizDevPhaseSnapshot] Tauriコマンドエラー:', error);
        throw error;
      }
    }

    const { apiDelete } = await import('../apiClient');
    await apiDelete(`/api/categoryBizDevPhaseSnapshots/${snapshotId}`);
  } catch (error: any) {
    console.error('❌ [deleteCategoryBizDevPhaseSnapshot] エラー:', error);
    throw error;
  }
}

