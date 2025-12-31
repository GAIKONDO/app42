import type { VC } from './types';
import { generateUniqueVcId } from './utils';

/**
 * 全VCを取得（SQLiteまたはSupabaseから取得）
 */
export async function getVcs(): Promise<VC[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getVcs] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('vcs');
        
        // Supabaseから取得したデータは既に配列形式
        const resultArray = Array.isArray(result) ? result : [];
        
        const vcs: VC[] = resultArray.map((item: any) => {
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
        }).filter((vc: VC) => vc.id && vc.title);
        
        // positionでソート
        vcs.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getVcs] 取得成功（Supabaseから取得）:', vcs.length, '件');
        return vcs;
      } catch (error: any) {
        console.error('❌ [getVcs] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getVcs] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('collection_get', {
          collectionName: 'vcs',
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
        
        const vcs: VC[] = resultArray.map((item: any) => {
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
        }).filter((vc: VC) => vc.id && vc.title);
        
        // positionでソート
        vcs.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getVcs] 取得成功:', vcs.length, '件');
        return vcs;
      } catch (error: any) {
        console.error('❌ [getVcs] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<VC[]>('/api/vcs');
      const vcs = Array.isArray(result) ? result : [];
      
      const normalizedVcs = vcs
        .filter((vc: VC) => vc.id && vc.title)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      
      return normalizedVcs;
    } catch (error: any) {
      console.error('❌ [getVcs] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getVcs] エラー:', error);
    return [];
  }
}

/**
 * VCを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveVc(vc: Partial<VC>): Promise<VC> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`💾 [saveVc] 開始（${useSupabase ? 'Supabase' : 'SQLite'}に保存）:`, { vcId: vc.id, title: vc.title });
    
    const vcId = vc.id || generateUniqueVcId();
    const now = new Date().toISOString();
    
    const dataToSave: any = {
      id: vcId,
      title: vc.title || '',
      description: vc.description || '',
      position: vc.position ?? null,
      createdAt: vc.createdAt || now,
      updatedAt: now,
    };
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        await setDocViaDataSource('vcs', vcId, dataToSave);
        console.log('✅ [saveVc] 保存成功（Supabase経由）:', vcId);
        
        return {
          id: vcId,
          title: dataToSave.title,
          description: dataToSave.description,
          position: dataToSave.position,
          createdAt: dataToSave.createdAt,
          updatedAt: dataToSave.updatedAt,
        };
      } catch (error: any) {
        console.error('❌ [saveVc] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_set', {
        collectionName: 'vcs',
        docId: vcId,
        data: dataToSave,
      });
      
      console.log('✅ [saveVc] 保存成功（Tauriコマンド経由）:', vcId);
      
      return {
        id: vcId,
        title: dataToSave.title,
        description: dataToSave.description,
        position: dataToSave.position,
        createdAt: dataToSave.createdAt,
        updatedAt: dataToSave.updatedAt,
      };
    }
    
    // その他の環境（API経由）
    const { apiPost, apiPut } = await import('../apiClient');
    
    if (vc.id) {
      const result = await apiPut<VC>(`/api/vcs/${vc.id}`, vc);
      return result;
    } else {
      const result = await apiPost<VC>('/api/vcs', vc);
      return result;
    }
  } catch (error: any) {
    console.error('❌ [saveVc] エラー:', error);
    throw error;
  }
}

/**
 * VCを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteVc(vcId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteVc] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { vcId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        await deleteDocViaDataSource('vcs', vcId);
        console.log('✅ [deleteVc] 削除成功（Supabase経由）:', vcId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteVc] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_delete', {
        collectionName: 'vcs',
        docId: vcId,
      });
      
      console.log('✅ [deleteVc] 削除成功（Tauriコマンド経由）:', vcId);
      return;
    }
    
    // その他の環境（API経由）
    const { apiDelete } = await import('../apiClient');
    await apiDelete(`/api/vcs/${vcId}`);
  } catch (error: any) {
    console.error('❌ [deleteVc] エラー:', error);
    throw error;
  }
}

/**
 * VCの順序を更新（SQLiteまたはSupabaseで更新）
 */
export async function updateVcPositions(updates: { vcId: string; position: number }[]): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🔄 [updateVcPositions] 開始（${useSupabase ? 'Supabase' : 'SQLite'}で更新）:`, updates.length, '件');
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        const { getDocViaDataSource, setDocViaDataSource } = await import('../dataSourceAdapter');
        
        // 各VCのpositionを更新
        for (const update of updates) {
          const existingVc = await getDocViaDataSource('vcs', update.vcId);
          
          if (existingVc) {
            const dataToUpdate = {
              ...existingVc,
              position: update.position,
              updatedAt: new Date().toISOString(),
            };
            
            await setDocViaDataSource('vcs', update.vcId, dataToUpdate);
          }
        }
        
        console.log('✅ [updateVcPositions] 更新成功（Supabase経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateVcPositions] Supabase更新エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      // 各VCのpositionを更新
      for (const update of updates) {
        const existingVc = await callTauriCommand('doc_get', {
          collectionName: 'vcs',
          docId: update.vcId,
        });
        
        if (existingVc && existingVc.data) {
          const dataToUpdate = {
            ...existingVc.data,
            position: update.position,
            updatedAt: new Date().toISOString(),
          };
          
          await callTauriCommand('doc_set', {
            collectionName: 'vcs',
            docId: update.vcId,
            data: dataToUpdate,
          });
        }
      }
      
      console.log('✅ [updateVcPositions] 更新成功（Tauriコマンド経由）');
      return;
    }
    
    // その他の環境（API経由）
    const { apiPost } = await import('../apiClient');
    await apiPost('/api/vcs/update-positions', { updates });
  } catch (error: any) {
    console.error('❌ [updateVcPositions] エラー:', error);
    throw error;
  }
}

