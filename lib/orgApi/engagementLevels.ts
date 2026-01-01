import type { EngagementLevel } from './types';
import { generateUniqueEngagementLevelId } from './utils';

/**
 * 全ねじ込み注力度を取得（SQLiteまたはSupabaseから取得）
 */
export async function getEngagementLevels(): Promise<EngagementLevel[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getEngagementLevels] 開始（Supabaseから取得）');
    
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
    console.error('❌ [getEngagementLevels] エラー:', error);
    throw error;
  }
}

/**
 * ねじ込み注力度を取得（ID指定）
 */
export async function getEngagementLevelById(levelId: string): Promise<EngagementLevel | null> {
  try {
    // Supabase専用（環境変数チェック不要）
    const { getDocViaDataSource } = await import('../dataSourceAdapter');
    const data = await getDocViaDataSource('engagementLevels', levelId);
    
    if (data) {
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
    console.error('❌ [getEngagementLevelById] エラー:', error);
    return null;
  }
}

/**
 * ねじ込み注力度を保存（SQLiteまたはSupabaseに保存）
 */
export async function saveEngagementLevel(level: Partial<EngagementLevel> & { title: string }): Promise<EngagementLevel> {
  try {
    // Supabase専用（環境変数チェック不要）
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
    
    const { setDocViaDataSource } = await import('../dataSourceAdapter');
    await setDocViaDataSource('engagementLevels', levelId, levelData);
    console.log('✅ [saveEngagementLevel] 保存成功（Supabase経由）:', levelId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteEngagementLevel] 開始（Supabaseから削除）:', { levelId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('engagementLevels', levelId);
    console.log('✅ [deleteEngagementLevel] 削除成功（Supabase経由）:', levelId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🔄 [updateEngagementLevelPositions] 開始（Supabaseで更新）:', levels.length, '件');
    
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
  } catch (error: any) {
    console.error('❌ [updateEngagementLevelPositions] エラー:', error);
    throw error;
  }
}

