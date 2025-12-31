import type { BizDevPhase } from './types';
import { generateUniqueBizDevPhaseId } from './utils';

/**
 * 全Biz-Devフェーズを取得（SQLiteまたはSupabaseから取得）
 */
export async function getBizDevPhases(): Promise<BizDevPhase[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getBizDevPhases] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
        const result = await getCollectionViaDataSource('bizdevphases');
        
        // Supabaseから取得したデータは既に配列形式
        const resultArray = Array.isArray(result) ? result : [];
        
        const bizDevPhases: BizDevPhase[] = resultArray.map((item: any) => {
          // Supabaseから取得したデータは直接オブジェクト形式
          const itemId = item.id;
          const data = item;
          
          // createdAtとupdatedAtがFirestoreのTimestamp形式の場合、ISO文字列に変換
          let createdAt: any = null;
          let updatedAt: any = null;
          
          if (data.createdAt) {
            if (data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAt = data.createdAt;
            }
          }
          
          if (data.updatedAt) {
            if (data.updatedAt.seconds) {
              updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
            } else if (typeof data.updatedAt === 'string') {
              updatedAt = data.updatedAt;
            }
          }
          
          return {
            id: itemId,
            title: data.title || '',
            description: data.description || '',
            position: data.position ?? null,
            createdAt: createdAt,
            updatedAt: updatedAt,
          };
        }).filter((phase: BizDevPhase) => phase.id && phase.title);
        
        // positionでソート
        bizDevPhases.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getBizDevPhases] 取得成功（Supabaseから取得）:', bizDevPhases.length, '件');
        return bizDevPhases;
      } catch (error: any) {
        console.error('❌ [getBizDevPhases] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getBizDevPhases] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('collection_get', {
          collectionName: 'bizDevPhases',
        });
        
        // 結果が配列でない場合（オブジェクトの場合）、配列に変換
        let resultArray: any[] = [];
        if (Array.isArray(result)) {
          resultArray = result;
        } else if (result && typeof result === 'object') {
          resultArray = Object.values(result);
        } else {
          return [];
        }
        
        const bizDevPhases: BizDevPhase[] = resultArray.map((item: any) => {
          const itemId = item.id;
          const data = item.data || item;
          
          // createdAtとupdatedAtがFirestoreのTimestamp形式の場合、ISO文字列に変換
          let createdAt: any = null;
          let updatedAt: any = null;
          
          if (data.createdAt) {
            if (data.createdAt.seconds) {
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAt = data.createdAt;
            }
          }
          
          if (data.updatedAt) {
            if (data.updatedAt.seconds) {
              updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
            } else if (typeof data.updatedAt === 'string') {
              updatedAt = data.updatedAt;
            }
          }
          
          return {
            id: itemId,
            title: data.title || '',
            description: data.description || '',
            position: data.position ?? null,
            createdAt: createdAt,
            updatedAt: updatedAt,
          };
        }).filter((phase: BizDevPhase) => phase.id && phase.title);
        
        // positionでソート
        bizDevPhases.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getBizDevPhases] 取得成功（SQLiteから直接取得）:', bizDevPhases.length, '件');
        return bizDevPhases;
      } catch (error: any) {
        console.error('❌ [getBizDevPhases] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<BizDevPhase[]>('/api/bizDevPhases');
      const bizDevPhases = Array.isArray(result) ? result : [];
      
      const normalizedPhases = bizDevPhases
        .filter((phase: BizDevPhase) => phase.id && phase.title)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      
      return normalizedPhases;
    } catch (error: any) {
      console.error('❌ [getBizDevPhases] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getBizDevPhases] エラー:', error);
    return [];
  }
}

/**
 * Biz-Devフェーズを取得（ID指定）
 */
export async function getBizDevPhaseById(phaseId: string): Promise<BizDevPhase | null> {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'bizDevPhases',
          docId: phaseId,
        });
        
        if (result && result.data) {
          const data = result.data;
          return {
            id: phaseId,
            title: data.title || '',
            description: data.description || '',
            position: data.position ?? null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
        
        return null;
      } catch (error: any) {
        console.error('❌ [getBizDevPhaseById] Tauriコマンドエラー:', error);
        return null;
      }
    }
    
    const { apiGet } = await import('../apiClient');
    const result = await apiGet<BizDevPhase>(`/api/bizDevPhases/${phaseId}`);
    return result || null;
  } catch (error: any) {
    console.error('❌ [getBizDevPhaseById] エラー:', error);
    return null;
  }
}

/**
 * Biz-Devフェーズを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveBizDevPhase(phase: Partial<BizDevPhase> & { title: string }): Promise<BizDevPhase> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    const now = new Date().toISOString();
    const phaseId = phase.id || generateUniqueBizDevPhaseId();
    
    const phaseData: BizDevPhase = {
      id: phaseId,
      title: phase.title,
      description: phase.description || '',
      position: phase.position ?? null,
      createdAt: phase.createdAt || now,
      updatedAt: now,
    };
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
        await setDocViaDataSource('bizdevphases', phaseId, phaseData);
        console.log('✅ [saveBizDevPhase] 保存成功（Supabase経由）:', phaseId);
        return phaseData;
      } catch (error: any) {
        console.error('❌ [saveBizDevPhase] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        await callTauriCommand('doc_set', {
          collectionName: 'bizDevPhases',
          docId: phaseId,
          data: phaseData,
        });
        
        console.log('✅ [saveBizDevPhase] 保存成功（Tauriコマンド経由）:', phaseId);
        return phaseData;
      } catch (error: any) {
        console.error('❌ [saveBizDevPhase] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiPost, apiPut } = await import('../apiClient');
    if (phase.id) {
      await apiPut(`/api/bizDevPhases/${phaseId}`, phaseData);
    } else {
      await apiPost('/api/bizDevPhases', phaseData);
    }
    
    return phaseData;
  } catch (error: any) {
    console.error('❌ [saveBizDevPhase] エラー:', error);
    throw error;
  }
}

/**
 * Biz-Devフェーズを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteBizDevPhase(phaseId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteBizDevPhase] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { phaseId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
        await deleteDocViaDataSource('bizdevphases', phaseId);
        console.log('✅ [deleteBizDevPhase] 削除成功（Supabase経由）:', phaseId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteBizDevPhase] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        await callTauriCommand('doc_delete', {
          collectionName: 'bizDevPhases',
          docId: phaseId,
        });
        
        console.log('✅ [deleteBizDevPhase] 削除成功（Tauriコマンド経由）:', phaseId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteBizDevPhase] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiDelete } = await import('../apiClient');
    await apiDelete(`/api/bizDevPhases/${phaseId}`);
  } catch (error: any) {
    console.error('❌ [deleteBizDevPhase] エラー:', error);
    throw error;
  }
}

/**
 * Biz-Devフェーズの順序を更新（SQLiteまたはSupabaseで更新）
 */
export async function updateBizDevPhasePositions(phases: BizDevPhase[]): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🔄 [updateBizDevPhasePositions] 開始（${useSupabase ? 'Supabase' : 'SQLite'}で更新）:`, phases.length, '件');
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        
        // 各Biz-Devフェーズのpositionを更新
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          const dataToUpdate = {
            ...phase,
            position: i,
            updatedAt: new Date().toISOString(),
          };
          
          // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
          await setDocViaDataSource('bizdevphases', phase.id, dataToUpdate);
        }
        
        console.log('✅ [updateBizDevPhasePositions] 更新成功（Supabase経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateBizDevPhasePositions] Supabase更新エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        // 各Biz-Devフェーズのpositionを更新
        for (let i = 0; i < phases.length; i++) {
          const phase = phases[i];
          await callTauriCommand('doc_set', {
            collectionName: 'bizDevPhases',
            docId: phase.id,
            data: {
              ...phase,
              position: i,
              updatedAt: new Date().toISOString(),
            },
          });
        }
        
        console.log('✅ [updateBizDevPhasePositions] 更新成功（Tauriコマンド経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateBizDevPhasePositions] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiPut } = await import('../apiClient');
    await apiPut('/api/bizDevPhases/positions', { phases });
  } catch (error: any) {
    console.error('❌ [updateBizDevPhasePositions] エラー:', error);
    throw error;
  }
}

