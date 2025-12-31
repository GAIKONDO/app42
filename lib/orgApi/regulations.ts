import { doc, getDoc, setDoc } from '../firestore';
import type { Regulation } from './types';
import { generateUniqueRegulationId } from './utils';

/**
 * 制度を取得
 */
export async function getRegulations(organizationId: string): Promise<Regulation[]> {
  try {
    console.log('📖 [getRegulations] 開始:', { organizationId });
    
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      console.log('📖 [getRegulations] collection_get呼び出し前:', { collectionName: 'regulations' });
      const result = await callTauriCommand('collection_get', {
        collectionName: 'regulations',
      });
      
      console.log('📖 [getRegulations] collection_get結果:', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        resultLength: Array.isArray(result) ? result.length : 'N/A',
      });
      
      const allRegulations = Array.isArray(result) ? result : [];
      console.log('📖 [getRegulations] 全データ数:', allRegulations.length);
      
      const filtered = allRegulations
        .filter((item: any) => {
          const data = item.data || item;
          const matches = data.organizationId === organizationId;
          if (!matches && allRegulations.length > 0) {
            console.log('📖 [getRegulations] フィルタ除外:', {
              itemId: data.id || item.id,
              itemOrganizationId: data.organizationId,
              targetOrganizationId: organizationId,
              match: matches,
            });
          }
          return matches;
        })
        .map((item: any) => {
          const data = item.data || item;
          return {
            id: data.id || item.id,
            organizationId: data.organizationId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Regulation;
        });
      
      console.log('📖 [getRegulations] フィルタ後:', {
        filteredCount: filtered.length,
        filteredIds: filtered.map(r => r.id),
      });
      
      const sorted = filtered.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
      console.log('📖 [getRegulations] 最終結果:', {
        count: sorted.length,
        regulations: sorted.map(r => ({ id: r.id, title: r.title, organizationId: r.organizationId })),
      });
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getRegulations] collection_getエラー:', {
        error: collectionError,
        errorMessage: collectionError?.message,
        errorStack: collectionError?.stack,
        collectionName: 'regulations',
      });
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getRegulations] エラー:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      organizationId,
    });
    return [];
  }
}

/**
 * 制度を保存
 */
export async function saveRegulation(regulation: Partial<Regulation>): Promise<string> {
  try {
    const regulationId = regulation.id || generateUniqueRegulationId();
    console.log('💾 [saveRegulation] 開始:', { regulationId, organizationId: regulation.organizationId, title: regulation.title });
    
    if (regulation.organizationId) {
      try {
        const orgDocRef = doc(null, 'organizations', regulation.organizationId);
        const orgDoc = await getDoc(orgDocRef);
        if (!orgDoc.exists()) {
          throw new Error(`組織ID "${regulation.organizationId}" がorganizationsテーブルに存在しません`);
        }
        console.log('✅ [saveRegulation] 組織IDの存在確認成功:', regulation.organizationId);
      } catch (orgCheckError: any) {
        const errorMessage = orgCheckError?.message || String(orgCheckError || '');
        if (errorMessage.includes('存在しません')) {
          throw new Error(`組織ID "${regulation.organizationId}" がorganizationsテーブルに存在しません。組織一覧ページから正しい組織を選択してください。`);
        }
        console.warn('⚠️ [saveRegulation] 組織IDの存在確認でエラー（続行します）:', errorMessage);
      }
    } else {
      throw new Error('organizationIdが指定されていません');
    }
    
    const docRef = doc(null, 'regulations', regulationId);
    const now = new Date().toISOString();
    
    const data: any = {
      id: regulationId,
      organizationId: regulation.organizationId!,
      title: regulation.title || '',
      description: regulation.description || '',
      content: regulation.content || '',
      updatedAt: now,
    };
    
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as Regulation;
        if (existingData?.createdAt) {
          data.createdAt = typeof existingData.createdAt === 'string' 
            ? existingData.createdAt 
            : (existingData.createdAt.toMillis ? new Date(existingData.createdAt.toMillis()).toISOString() : now);
        } else {
          data.createdAt = now;
        }
        console.log('💾 [saveRegulation] 既存ドキュメントを更新:', regulationId);
      } else {
        data.createdAt = now;
        console.log('💾 [saveRegulation] 新規ドキュメントを作成:', regulationId);
      }
    } catch (getDocError: any) {
      console.warn('⚠️ [saveRegulation] 既存ドキュメント確認エラー（新規作成として続行）:', getDocError?.message || getDocError);
      data.createdAt = now;
    }
    
    console.log('💾 [saveRegulation] setDoc呼び出し前:', { 
      collectionName: 'regulations', 
      docId: regulationId, 
      data: {
        id: data.id,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description ? data.description.substring(0, 50) + '...' : '',
        content: data.content ? data.content.substring(0, 50) + '...' : '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    });
    
    try {
      await setDoc(docRef, data);
      console.log('✅ [saveRegulation] データベース保存成功:', regulationId);
    } catch (setDocError: any) {
      console.error('❌ [saveRegulation] setDoc呼び出しエラー:', {
        error: setDocError,
        errorMessage: setDocError?.message,
        errorStack: setDocError?.stack,
        collectionName: 'regulations',
        docId: regulationId,
        dataKeys: Object.keys(data),
      });
      throw new Error(`制度の保存に失敗しました: ${setDocError?.message || '不明なエラー'}`);
    }
    
    return regulationId;
  } catch (error: any) {
    console.error('❌ [saveRegulation] 保存失敗:', error);
    throw error;
  }
}

/**
 * 制度を取得（ID指定）
 */
export async function getRegulationById(regulationId: string): Promise<Regulation | null> {
  try {
    console.log('📖 [getRegulationById] 開始:', { regulationId });
    
    if (!regulationId || regulationId.trim() === '') {
      console.warn('📖 [getRegulationById] 制度IDが空です');
      return null;
    }
    
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // Supabase使用時はDataSource経由で取得（SQLiteにフォールバックしない）
    if (useSupabase) {
      try {
        const { getDataSourceInstance } = await import('../dataSource');
        const dataSource = getDataSourceInstance();
        
        const data = await dataSource.doc_get('regulations', regulationId.trim());
        
        if (!data) {
          console.warn('📖 [getRegulationById] データが見つかりませんでした（Supabase）');
          return null;
        }
        
        const regulation: Regulation = {
          id: data.id || regulationId,
          organizationId: data.organizationId || data.organizationid || '',
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          createdAt: data.createdAt || data.createdat,
          updatedAt: data.updatedAt || data.updatedat,
        };
        
        console.log('📖 [getRegulationById] 変換後（Supabase）:', {
          id: regulation.id,
          title: regulation.title,
          organizationId: regulation.organizationId,
        });
        
        return regulation;
      } catch (supabaseError: any) {
        // Supabase取得エラーを処理（SQLiteにフォールバックしない）
        const errorMessage = supabaseError?.message || String(supabaseError || '');
        const isNoRowsError = errorMessage.includes('no rows') || 
                              errorMessage.includes('Query returned no rows') ||
                              errorMessage.includes('PGRST116') ||
                              errorMessage.includes('ドキュメント取得エラー') ||
                              errorMessage.includes('PGRST205') ||
                              errorMessage.includes('Could not find the table');
        
        if (!isNoRowsError) {
          console.warn('⚠️ [getRegulationById] Supabase経由の取得に失敗:', regulationId, supabaseError);
        }
        // Supabase使用時はSQLiteにフォールバックせず、nullを返す
        return null;
      }
    }
    
    // SQLite使用時はTauriコマンド経由
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      const result = await callTauriCommand('doc_get', {
        collectionName: 'regulations',
        docId: regulationId.trim(),
      });
      
      console.log('📖 [getRegulationById] doc_get結果:', {
        exists: result?.exists,
        data: result?.data,
      });
      
      if (result && result.exists && result.data) {
        const data = result.data;
        const regulation: Regulation = {
          id: data.id || regulationId,
          organizationId: data.organizationId || '',
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('📖 [getRegulationById] 変換後:', {
          id: regulation.id,
          title: regulation.title,
          organizationId: regulation.organizationId,
        });
        
        return regulation;
      }
      
      console.warn('📖 [getRegulationById] データが見つかりませんでした。result:', result);
      return null;
    } catch (docError: any) {
      console.error('📖 [getRegulationById] doc_getエラー:', docError);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getRegulationById] エラー:', error);
    return null;
  }
}

/**
 * 制度を削除
 */
export async function deleteRegulation(regulationId: string): Promise<void> {
  try {
    console.log('🗑️ [deleteRegulation] 開始:', regulationId);
    
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      await callTauriCommand('doc_delete', {
        collectionName: 'regulations',
        docId: regulationId,
      });
      
      console.log('✅ [deleteRegulation] 削除成功:', regulationId);
    } catch (deleteError: any) {
      const errorMessage = deleteError?.message || String(deleteError || '');
      console.error('❌ [deleteRegulation] 削除失敗:', {
        error: deleteError,
        errorMessage,
        regulationId,
      });
      throw new Error(`制度の削除に失敗しました: ${errorMessage || '不明なエラー'}`);
    }
  } catch (error: any) {
    console.error('❌ [deleteRegulation] エラー:', error);
    throw error;
  }
}

