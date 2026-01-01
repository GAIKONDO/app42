import type { VC } from './types';
import { generateUniqueVcId } from './utils';

/**
 * 全VCを取得（SQLiteまたはSupabaseから取得）
 */
export async function getVcs(): Promise<VC[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getVcs] 開始（Supabaseから取得）');
    
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
    console.error('❌ [getVcs] エラー:', error);
    throw error;
  }
}

/**
 * VCを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveVc(vc: Partial<VC>): Promise<VC> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('💾 [saveVc] 開始（Supabaseに保存）:', { vcId: vc.id, title: vc.title });
    
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
    console.error('❌ [saveVc] エラー:', error);
    throw error;
  }
}

/**
 * VCを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteVc(vcId: string): Promise<void> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteVc] 開始（Supabaseから削除）:', { vcId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('vcs', vcId);
    console.log('✅ [deleteVc] 削除成功（Supabase経由）:', vcId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🔄 [updateVcPositions] 開始（Supabaseで更新）:', updates.length, '件');
    
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
  } catch (error: any) {
    console.error('❌ [updateVcPositions] エラー:', error);
    throw error;
  }
}

