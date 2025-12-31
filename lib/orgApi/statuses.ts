import type { Status } from './types';
import { generateUniqueStatusId } from './utils';

/**
 * 全ステータスを取得（SQLiteまたはSupabaseから取得）
 */
export async function getStatuses(): Promise<Status[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getStatuses] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('statuses');
        
        // Supabaseから取得したデータは既に配列形式
        const resultArray = Array.isArray(result) ? result : [];
        
        const statuses: Status[] = resultArray.map((item: any) => {
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
        }).filter((status: Status) => status.id && status.title);
        
        // positionでソート
        statuses.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getStatuses] 取得成功（Supabaseから取得）:', statuses.length, '件');
        return statuses;
      } catch (error: any) {
        console.error('❌ [getStatuses] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getStatuses] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('collection_get', {
          collectionName: 'statuses',
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
        
        const statuses: Status[] = resultArray.map((item: any) => {
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
        }).filter((status: Status) => status.id && status.title);
        
        // positionでソート
        statuses.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getStatuses] 取得成功:', statuses.length, '件');
        return statuses;
      } catch (error: any) {
        console.error('❌ [getStatuses] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<Status[]>('/api/statuses');
      const statuses = Array.isArray(result) ? result : [];
      
      const normalizedStatuses = statuses
        .filter((status: Status) => status.id && status.title)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      
      return normalizedStatuses;
    } catch (error: any) {
      console.error('❌ [getStatuses] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getStatuses] エラー:', error);
    return [];
  }
}

/**
 * ステータスを取得（ID指定）
 */
export async function getStatusById(statusId: string): Promise<Status | null> {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'statuses',
          docId: statusId,
        });
        
        if (result && result.data) {
          const data = result.data;
          return {
            id: statusId,
            title: data.title || '',
            description: data.description || '',
            position: data.position ?? null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
        
        return null;
      } catch (error: any) {
        console.error('❌ [getStatusById] Tauriコマンドエラー:', error);
        return null;
      }
    }
    
    const { apiGet } = await import('../apiClient');
    const result = await apiGet<Status>(`/api/statuses/${statusId}`);
    return result || null;
  } catch (error: any) {
    console.error('❌ [getStatusById] エラー:', error);
    return null;
  }
}

/**
 * ステータスを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveStatus(status: Partial<Status> & { title: string }): Promise<Status> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    const now = new Date().toISOString();
    const statusId = status.id || generateUniqueStatusId();
    
    const statusData: Status = {
      id: statusId,
      title: status.title,
      description: status.description || '',
      position: status.position ?? null,
      createdAt: status.createdAt || now,
      updatedAt: now,
    };
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        await setDocViaDataSource('statuses', statusId, statusData);
        console.log('✅ [saveStatus] 保存成功（Supabase経由）:', statusId);
        return statusData;
      } catch (error: any) {
        console.error('❌ [saveStatus] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        await callTauriCommand('doc_set', {
          collectionName: 'statuses',
          docId: statusId,
          data: statusData,
        });
        
        console.log('✅ [saveStatus] 保存成功（Tauriコマンド経由）:', statusId);
        return statusData;
      } catch (error: any) {
        console.error('❌ [saveStatus] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiPost, apiPut } = await import('../apiClient');
    if (status.id) {
      await apiPut(`/api/statuses/${statusId}`, statusData);
    } else {
      await apiPost('/api/statuses', statusData);
    }
    
    return statusData;
  } catch (error: any) {
    console.error('❌ [saveStatus] エラー:', error);
    throw error;
  }
}

/**
 * ステータスを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteStatus(statusId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteStatus] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { statusId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        await deleteDocViaDataSource('statuses', statusId);
        console.log('✅ [deleteStatus] 削除成功（Supabase経由）:', statusId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteStatus] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        await callTauriCommand('doc_delete', {
          collectionName: 'statuses',
          docId: statusId,
        });
        
        console.log('✅ [deleteStatus] 削除成功（Tauriコマンド経由）:', statusId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteStatus] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiDelete } = await import('../apiClient');
    await apiDelete(`/api/statuses/${statusId}`);
  } catch (error: any) {
    console.error('❌ [deleteStatus] エラー:', error);
    throw error;
  }
}

/**
 * ステータスの順序を更新（SQLiteまたはSupabaseで更新）
 */
export async function updateStatusPositions(statuses: Status[]): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🔄 [updateStatusPositions] 開始（${useSupabase ? 'Supabase' : 'SQLite'}で更新）:`, statuses.length, '件');
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        
        // 各ステータスのpositionを更新
        for (let i = 0; i < statuses.length; i++) {
          const status = statuses[i];
          const dataToUpdate = {
            ...status,
            position: i,
            updatedAt: new Date().toISOString(),
          };
          
          await setDocViaDataSource('statuses', status.id, dataToUpdate);
        }
        
        console.log('✅ [updateStatusPositions] 更新成功（Supabase経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateStatusPositions] Supabase更新エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        // 各ステータスのpositionを更新
        for (let i = 0; i < statuses.length; i++) {
          const status = statuses[i];
          await callTauriCommand('doc_set', {
            collectionName: 'statuses',
            docId: status.id,
            data: {
              ...status,
              position: i,
              updatedAt: new Date().toISOString(),
            },
          });
        }
        
        console.log('✅ [updateStatusPositions] 更新成功（Tauriコマンド経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateStatusPositions] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiPut } = await import('../apiClient');
    await apiPut('/api/statuses/positions', { statuses });
  } catch (error: any) {
    console.error('❌ [updateStatusPositions] エラー:', error);
    throw error;
  }
}

