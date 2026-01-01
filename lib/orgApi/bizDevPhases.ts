import type { BizDevPhase } from './types';
import { generateUniqueBizDevPhaseId } from './utils';

/**
 * 全Biz-Devフェーズを取得（SQLiteまたはSupabaseから取得）
 */
export async function getBizDevPhases(): Promise<BizDevPhase[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getBizDevPhases] 開始（Supabaseから取得）');
    
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
    console.error('❌ [getBizDevPhases] エラー:', error);
    throw error;
  }
}

/**
 * Biz-Devフェーズを取得（ID指定）
 */
export async function getBizDevPhaseById(phaseId: string): Promise<BizDevPhase | null> {
  try {
    // Supabase専用（環境変数チェック不要）
    const { getDocViaDataSource } = await import('../dataSourceAdapter');
    // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
    const data = await getDocViaDataSource('bizdevphases', phaseId);
    
    if (data) {
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
    console.error('❌ [getBizDevPhaseById] エラー:', error);
    return null;
  }
}

/**
 * Biz-Devフェーズを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveBizDevPhase(phase: Partial<BizDevPhase> & { title: string }): Promise<BizDevPhase> {
  try {
    // Supabase専用（環境変数チェック不要）
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
    
    const { setDocViaDataSource } = await import('../dataSourceAdapter');
    // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
    await setDocViaDataSource('bizdevphases', phaseId, phaseData);
    console.log('✅ [saveBizDevPhase] 保存成功（Supabase経由）:', phaseId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteBizDevPhase] 開始（Supabaseから削除）:', { phaseId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
    await deleteDocViaDataSource('bizdevphases', phaseId);
    console.log('✅ [deleteBizDevPhase] 削除成功（Supabase経由）:', phaseId);
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
    // Supabase専用（環境変数チェック不要）
    console.log('🔄 [updateBizDevPhasePositions] 開始（Supabaseで更新）:', phases.length, '件');
    
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
  } catch (error: any) {
    console.error('❌ [updateBizDevPhasePositions] エラー:', error);
    throw error;
  }
}

