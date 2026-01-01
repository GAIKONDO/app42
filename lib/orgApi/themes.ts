import type { Theme } from './types';
import { generateUniqueThemeId } from './utils';

/**
 * 全テーマを取得（SupabaseまたはSQLiteから取得）
 */
export async function getThemes(): Promise<Theme[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getThemes] 開始（Supabaseから取得）');
    
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
        throw error;
      }
  } catch (error: any) {
    console.error('❌ [getThemes] エラー:', error);
    throw error;
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
    // Supabase専用（環境変数チェック不要）
    const themeId = theme.id || generateUniqueThemeId();
    console.log('💾 [saveTheme] 開始（Supabaseに保存）:', { 
      themeId, 
      title: theme.title,
      hasId: !!theme.id 
    });
    
    const now = new Date().toISOString();
    const initiativeIds = Array.isArray(theme.initiativeIds) 
      ? theme.initiativeIds 
      : (theme.initiativeIds ? [theme.initiativeIds].filter(Boolean) : []);
    
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
    console.error('❌ [saveTheme] テーマの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * テーマを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteTheme(themeId: string): Promise<void> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteTheme] 開始（Supabaseから削除）:', { themeId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('themes', themeId);
    console.log('✅ [deleteTheme] テーマを削除しました（Supabase経由）:', themeId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🔄 [updateThemePositions] 開始（Supabaseで更新）:', updates.length, '件');
    
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
  } catch (error: any) {
    console.error('❌ [updateThemePositions] 更新に失敗しました:', error);
    throw error;
  }
}

