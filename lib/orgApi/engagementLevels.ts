import type { EngagementLevel } from './types';
import { generateUniqueEngagementLevelId } from './utils';

/**
 * 全ねじ込み注力度を取得（SQLiteまたはSupabaseから取得）
 */
export async function getEngagementLevels(): Promise<EngagementLevel[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getEngagementLevels] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('engagementLevels');
        
        // Supabaseから取得したデータは既に配列形式
        const resultArray = Array.isArray(result) ? result : [];
        
        const engagementLevels: EngagementLevel[] = resultArray.map((item: any) => {
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
        }).filter((level: EngagementLevel) => level.id && level.title);
        
        // positionでソート
        engagementLevels.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getEngagementLevels] 取得成功（Supabaseから取得）:', engagementLevels.length, '件');
        return engagementLevels;
      } catch (error: any) {
        console.error('❌ [getEngagementLevels] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getEngagementLevels] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('collection_get', {
          collectionName: 'engagementLevels',
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
        
        const engagementLevels: EngagementLevel[] = resultArray.map((item: any) => {
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
        }).filter((level: EngagementLevel) => level.id && level.title);
        
        // positionでソート
        engagementLevels.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getEngagementLevels] 取得成功:', engagementLevels.length, '件');
        return engagementLevels;
      } catch (error: any) {
        console.error('❌ [getEngagementLevels] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<EngagementLevel[]>('/api/engagementLevels');
      const engagementLevels = Array.isArray(result) ? result : [];
      
      const normalizedLevels = engagementLevels
        .filter((level: EngagementLevel) => level.id && level.title)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      
      return normalizedLevels;
    } catch (error: any) {
      console.error('❌ [getEngagementLevels] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getEngagementLevels] エラー:', error);
    return [];
  }
}

/**
 * ねじ込み注力度を取得（ID指定）
 */
export async function getEngagementLevelById(levelId: string): Promise<EngagementLevel | null> {
  try {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'engagementLevels',
          docId: levelId,
        });
        
        if (result && result.data) {
          const data = result.data;
          return {
            id: levelId,
            title: data.title || '',
            description: data.description || '',
            position: data.position ?? null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        }
        
        return null;
      } catch (error: any) {
        console.error('❌ [getEngagementLevelById] Tauriコマンドエラー:', error);
        return null;
      }
    }
    
    const { apiGet } = await import('../apiClient');
    const result = await apiGet<EngagementLevel>(`/api/engagementLevels/${levelId}`);
    return result || null;
  } catch (error: any) {
    console.error('❌ [getEngagementLevelById] エラー:', error);
    return null;
  }
}

/**
 * ねじ込み注力度を保存（SQLiteまたはSupabaseに保存）
 */
export async function saveEngagementLevel(level: Partial<EngagementLevel> & { title: string }): Promise<EngagementLevel> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    const now = new Date().toISOString();
    const levelId = level.id || generateUniqueEngagementLevelId();
    
    const levelData: EngagementLevel = {
      id: levelId,
      title: level.title,
      description: level.description || '',
      position: level.position ?? null,
      createdAt: level.createdAt || now,
      updatedAt: now,
    };
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        await setDocViaDataSource('engagementLevels', levelId, levelData);
        console.log('✅ [saveEngagementLevel] 保存成功（Supabase経由）:', levelId);
        return levelData;
      } catch (error: any) {
        console.error('❌ [saveEngagementLevel] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        await callTauriCommand('doc_set', {
          collectionName: 'engagementLevels',
          docId: levelId,
          data: levelData,
        });
        
        console.log('✅ [saveEngagementLevel] 保存成功（Tauriコマンド経由）:', levelId);
        return levelData;
      } catch (error: any) {
        console.error('❌ [saveEngagementLevel] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiPost, apiPut } = await import('../apiClient');
    if (level.id) {
      await apiPut(`/api/engagementLevels/${levelId}`, levelData);
    } else {
      await apiPost('/api/engagementLevels', levelData);
    }
    
    return levelData;
  } catch (error: any) {
    console.error('❌ [saveEngagementLevel] エラー:', error);
    throw error;
  }
}

/**
 * ねじ込み注力度を削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteEngagementLevel(levelId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteEngagementLevel] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { levelId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        await deleteDocViaDataSource('engagementLevels', levelId);
        console.log('✅ [deleteEngagementLevel] 削除成功（Supabase経由）:', levelId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteEngagementLevel] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        await callTauriCommand('doc_delete', {
          collectionName: 'engagementLevels',
          docId: levelId,
        });
        
        console.log('✅ [deleteEngagementLevel] 削除成功（Tauriコマンド経由）:', levelId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteEngagementLevel] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiDelete } = await import('../apiClient');
    await apiDelete(`/api/engagementLevels/${levelId}`);
  } catch (error: any) {
    console.error('❌ [deleteEngagementLevel] エラー:', error);
    throw error;
  }
}

/**
 * ねじ込み注力度の順序を更新（SQLiteまたはSupabaseで更新）
 */
export async function updateEngagementLevelPositions(levels: EngagementLevel[]): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🔄 [updateEngagementLevelPositions] 開始（${useSupabase ? 'Supabase' : 'SQLite'}で更新）:`, levels.length, '件');
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        
        // 各ねじ込み注力度のpositionを更新
        for (let i = 0; i < levels.length; i++) {
          const level = levels[i];
          const dataToUpdate = {
            ...level,
            position: i,
            updatedAt: new Date().toISOString(),
          };
          
          await setDocViaDataSource('engagementLevels', level.id, dataToUpdate);
        }
        
        console.log('✅ [updateEngagementLevelPositions] 更新成功（Supabase経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateEngagementLevelPositions] Supabase更新エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        // 各ねじ込み注力度のpositionを更新
        for (let i = 0; i < levels.length; i++) {
          const level = levels[i];
          await callTauriCommand('doc_set', {
            collectionName: 'engagementLevels',
            docId: level.id,
            data: {
              ...level,
              position: i,
              updatedAt: new Date().toISOString(),
            },
          });
        }
        
        console.log('✅ [updateEngagementLevelPositions] 更新成功（Tauriコマンド経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateEngagementLevelPositions] Tauriコマンドエラー:', error);
        throw error;
      }
    }
    
    // その他の環境（API経由）
    const { apiPut } = await import('../apiClient');
    await apiPut('/api/engagementLevels/positions', { levels });
  } catch (error: any) {
    console.error('❌ [updateEngagementLevelPositions] エラー:', error);
    throw error;
  }
}

