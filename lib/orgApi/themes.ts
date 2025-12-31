import type { Theme } from './types';
import { generateUniqueThemeId } from './utils';

/**
 * 全テーマを取得（SupabaseまたはSQLiteから取得）
 */
export async function getThemes(): Promise<Theme[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getThemes] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('themes');
        
        if (!result || !Array.isArray(result)) {
          console.log('⚠️ [getThemes] 結果が配列ではありません:', result);
          return [];
        }
        
        const themes: Theme[] = result.map((item: any) => {
          let initiativeIds: string[] = [];
          const initiativeIdsData = item.initiativeIds || item.initiativeids;
          if (initiativeIdsData) {
            if (Array.isArray(initiativeIdsData)) {
              initiativeIds = initiativeIdsData;
            } else if (typeof initiativeIdsData === 'string') {
              try {
                initiativeIds = JSON.parse(initiativeIdsData);
              } catch (e) {
                console.warn('⚠️ [getThemes] initiativeIdsのパースエラー:', e);
                initiativeIds = [];
              }
            }
          }
          
          return {
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            initiativeIds: initiativeIds,
            position: item.position ?? null,
            createdAt: item.createdAt || item.createdat || null,
            updatedAt: item.updatedAt || item.updatedat || null,
          };
        }).filter((theme: Theme) => theme.id && theme.title);
        
        // positionでソート
        themes.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          if (posA !== posB) return posA - posB;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        console.log('✅ [getThemes] 取得成功（Supabaseから取得）:', themes.length, '件');
        console.log('📊 [getThemes] position一覧:', themes.map(t => `${t.id}:${t.position ?? 'null'}`).join(', '));
        return themes;
      } catch (error: any) {
        console.error('❌ [getThemes] Supabase取得エラー:', error);
        return [];
      }
    }
    
    // SQLite使用時（Tauriコマンド経由）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('get_themes_cmd', {});
        
        if (!result || !Array.isArray(result)) {
          console.log('⚠️ [getThemes] 結果が配列ではありません:', result);
          return [];
        }
        
        const themes: Theme[] = result.map((item: any) => {
          let initiativeIds: string[] = [];
          if (item.initiativeIds) {
            if (Array.isArray(item.initiativeIds)) {
              initiativeIds = item.initiativeIds;
            } else if (typeof item.initiativeIds === 'string') {
              try {
                initiativeIds = JSON.parse(item.initiativeIds);
              } catch (e) {
                console.warn('⚠️ [getThemes] initiativeIdsのパースエラー:', e);
                initiativeIds = [];
              }
            }
          }
          
          return {
            id: item.id,
            title: item.title || '',
            description: item.description || '',
            initiativeIds: initiativeIds,
            position: item.position ?? null,
            createdAt: item.createdAt || null,
            updatedAt: item.updatedAt || null,
          };
        }).filter((theme: Theme) => theme.id && theme.title);
        
        console.log('✅ [getThemes] 取得成功（SQLiteから直接取得）:', themes.length, '件');
        console.log('📊 [getThemes] position一覧:', themes.map(t => `${t.id}:${t.position ?? 'null'}`).join(', '));
        return themes;
      } catch (error: any) {
        console.error('❌ [getThemes] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<Theme[]>('/api/themes');
      
      console.log('📖 [getThemes] API結果:', result);
      
      const themes = Array.isArray(result) ? result : [];
      console.log('📖 [getThemes] 全データ数:', themes.length);
      
      if (themes.length > 0) {
        console.log('📖 [getThemes] 生データサンプル (最初の1件):', JSON.stringify(themes[0], null, 2));
      }
      
      const normalizedThemes = themes.map((theme: any) => ({
        ...theme,
        initiativeIds: Array.isArray(theme.initiativeIds) 
          ? theme.initiativeIds 
          : (theme.initiativeIds ? [theme.initiativeIds].filter(Boolean) : []),
      })).filter((theme: Theme) => theme.id && theme.title);
      
      console.log('✅ [getThemes] 取得成功:', normalizedThemes.length, '件');
      return normalizedThemes;
    } catch (error: any) {
      console.error('❌ [getThemes] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getThemes] エラー:', error);
    return [];
  }
}

/**
 * テーマを取得（ID指定、SQLiteから取得）
 */
export async function getThemeById(themeId: string): Promise<Theme | null> {
  try {
    console.log('📖 [getThemeById] 開始（SQLiteから取得）:', { themeId });
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<Theme>(`/api/themes/${themeId}`);
      
      console.log('📖 [getThemeById] API結果:', result);
      
      if (result && (result.id || result.title)) {
        const theme: Theme = {
          ...result,
          initiativeIds: Array.isArray(result.initiativeIds) 
            ? result.initiativeIds 
            : (result.initiativeIds ? [result.initiativeIds].filter(Boolean) : []),
        };
        
        console.log('✅ [getThemeById] 取得成功');
        return theme;
      }
      
      console.log('⚠️ [getThemeById] データが見つかりませんでした');
      return null;
    } catch (error: any) {
      if (error.message && error.message.includes('404')) {
        console.log('⚠️ [getThemeById] テーマが見つかりませんでした');
        return null;
      }
      console.error('❌ [getThemeById] APIエラー:', error);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getThemeById] エラー:', error);
    return null;
  }
}

/**
 * テーマを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveTheme(theme: Partial<Theme>): Promise<string> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    const themeId = theme.id || generateUniqueThemeId();
    console.log(`💾 [saveTheme] 開始（${useSupabase ? 'Supabase' : 'SQLite'}に保存）:`, { 
      themeId, 
      title: theme.title,
      hasId: !!theme.id 
    });
    
    const now = new Date().toISOString();
    const initiativeIds = Array.isArray(theme.initiativeIds) 
      ? theme.initiativeIds 
      : (theme.initiativeIds ? [theme.initiativeIds].filter(Boolean) : []);
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource, setDocViaDataSource } = await import('../dataSourceAdapter');
        
        // 新規作成時はpositionを自動設定（最大position+1）
        let position = theme.position ?? null;
        if (!theme.id && position === null) {
          const existingThemes = await getCollectionViaDataSource('themes');
          const maxPosition = existingThemes.reduce((max: number, t: any) => {
            const pos = t.position ?? 0;
            return Math.max(max, pos);
          }, -1);
          position = maxPosition + 1;
        }
        
        const themeData: any = {
          id: themeId,
          title: theme.title || '',
          description: theme.description || '',
          initiativeIds: JSON.stringify(initiativeIds),
          position: position,
          createdAt: theme.createdAt || now,
          updatedAt: now,
        };
        
        await setDocViaDataSource('themes', themeId, themeData);
        console.log('✅ [saveTheme] テーマを保存しました（Supabase経由）:', themeId);
        return themeId;
      } catch (error: any) {
        console.error('❌ [saveTheme] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauriコマンド経由）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      const themeData: any = {
        id: themeId,
        title: theme.title || '',
        description: theme.description || '',
        initiativeIds: Array.isArray(theme.initiativeIds) ? theme.initiativeIds : (theme.initiativeIds ? [theme.initiativeIds].filter(Boolean) : []),
        createdAt: theme.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (Array.isArray(themeData.initiativeIds)) {
        themeData.initiativeIds = JSON.stringify(themeData.initiativeIds);
      }
      
      await callTauriCommand('doc_set', {
        collectionName: 'themes',
        docId: themeId,
        data: themeData,
      });
      
      console.log('✅ [saveTheme] テーマを保存しました（Tauriコマンド経由）:', themeId);
      return themeId;
    }
    
    const { apiPost, apiPut } = await import('../apiClient');
    
    const themeData: any = {
      title: theme.title || '',
      description: theme.description || '',
      initiativeIds: Array.isArray(theme.initiativeIds) ? theme.initiativeIds : [],
    };
    
    let savedTheme: Theme;
    
    if (theme.id) {
      console.log('📝 [saveTheme] 既存テーマを更新:', themeId);
      savedTheme = await apiPut<Theme>(`/api/themes/${themeId}`, themeData);
    } else {
      console.log('📝 [saveTheme] 新規テーマを作成');
      savedTheme = await apiPost<Theme>('/api/themes', themeData);
    }
    
    console.log('✅ [saveTheme] テーマを保存しました:', savedTheme.id);
    return savedTheme.id;
  } catch (error: any) {
    console.error('❌ [saveTheme] テーマの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * テーマを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteTheme(themeId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteTheme] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { themeId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        await deleteDocViaDataSource('themes', themeId);
        console.log('✅ [deleteTheme] テーマを削除しました（Supabase経由）:', themeId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteTheme] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauriコマンド経由）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_delete', {
        collectionName: 'themes',
        docId: themeId,
      });
      
      console.log('✅ [deleteTheme] テーマを削除しました（Tauriコマンド経由）:', themeId);
      return;
    }
    
    const { apiDelete } = await import('../apiClient');
    
    await apiDelete(`/api/themes/${themeId}`);
    
    console.log('✅ [deleteTheme] テーマを削除しました:', themeId);
  } catch (error: any) {
    console.error('❌ [deleteTheme] テーマの削除に失敗しました:', error);
    throw error;
  }
}

/**
 * 複数のテーマのpositionを一括更新（SQLiteまたはSupabaseで更新）
 */
export async function updateThemePositions(
  updates: Array<{ themeId: string; position: number }>
): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🔄 [updateThemePositions] 開始（${useSupabase ? 'Supabase' : 'SQLite'}で更新）:`, updates.length, '件');
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
        const { getDocViaDataSource, setDocViaDataSource } = await import('../dataSourceAdapter');
        
        for (const update of updates) {
          const existingTheme = await getDocViaDataSource('themes', update.themeId);
          if (existingTheme) {
            const dataToUpdate = {
              ...existingTheme,
              position: update.position,
              updatedAt: new Date().toISOString(),
            };
            await setDocViaDataSource('themes', update.themeId, dataToUpdate);
          }
        }
        
        console.log('✅ [updateThemePositions] 更新成功（Supabase経由）');
        return;
      } catch (error: any) {
        console.error('❌ [updateThemePositions] Supabase更新エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauriコマンド経由）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      const updatesArray: Array<[string, number]> = updates.map(u => [u.themeId, u.position]);
      await callTauriCommand('update_theme_positions_cmd', {
        updates: updatesArray,
      });
      
      console.log('✅ [updateThemePositions] 更新完了');
    } else {
      const { apiPost } = await import('../apiClient');
      await apiPost('/api/themes/positions', { updates });
    }
  } catch (error: any) {
    console.error('❌ [updateThemePositions] 更新に失敗しました:', error);
    throw error;
  }
}

