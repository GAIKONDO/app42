import type { Status } from './types';
import { generateUniqueStatusId } from './utils';

/**
 * 全ステータスを取得（SQLiteまたはSupabaseから取得）
 */
export async function getStatuses(): Promise<Status[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getStatuses] 開始（Supabaseから取得）');
    
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
    console.error('❌ [getStatuses] エラー:', error);
    throw error;
  }
}

/**
 * ステータスを取得（ID指定）
 */
export async function getStatusById(statusId: string): Promise<Status | null> {
  try {
    // Supabase専用（環境変数チェック不要）
    const { getDocViaDataSource } = await import('../dataSourceAdapter');
    const data = await getDocViaDataSource('statuses', statusId);
    
    if (data) {
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
    console.error('❌ [getStatusById] エラー:', error);
    return null;
  }
}

/**
 * ステータスを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveStatus(status: Partial<Status> & { title: string }): Promise<Status> {
  try {
    // Supabase専用（環境変数チェック不要）
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
    
    const { setDocViaDataSource } = await import('../dataSourceAdapter');
    await setDocViaDataSource('statuses', statusId, statusData);
    console.log('✅ [saveStatus] 保存成功（Supabase経由）:', statusId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteStatus] 開始（Supabaseから削除）:', { statusId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('statuses', statusId);
    console.log('✅ [deleteStatus] 削除成功（Supabase経由）:', statusId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🔄 [updateStatusPositions] 開始（Supabaseで更新）:', statuses.length, '件');
    
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
  } catch (error: any) {
    console.error('❌ [updateStatusPositions] エラー:', error);
    throw error;
  }
}

