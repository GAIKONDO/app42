import type { Category } from './types';
import { generateUniqueCategoryId } from './utils';

/**
 * 全カテゴリーを取得（SQLiteまたはSupabaseから取得）
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getCategories] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('categories');
        
        // Supabaseから取得したデータは既に配列形式
        const resultArray = Array.isArray(result) ? result : [];
        
        console.log('📖 [getCategories] Supabaseから取得:', resultArray.length, '件');
        
        const categories: Category[] = resultArray.map((item: any) => {
          // Supabaseから取得したデータは直接オブジェクト形式
          const itemId = item.id;
          const data = item;
          
          // createdAtとupdatedAtがFirestoreのTimestamp形式の場合、ISO文字列に変換
          let createdAt: any = null;
          let updatedAt: any = null;
          
          if (data.createdAt) {
            if (data.createdAt.seconds) {
              // Firestore Timestamp形式
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAt = data.createdAt;
            }
          }
          
          if (data.updatedAt) {
            if (data.updatedAt.seconds) {
              // Firestore Timestamp形式
              updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
            } else if (typeof data.updatedAt === 'string') {
              updatedAt = data.updatedAt;
            }
          }
          
          return {
            id: itemId,
            title: data.title || '',
            description: data.description || '',
            parentCategoryId: data.parentCategoryId || undefined,
            position: data.position ?? null,
            createdAt: createdAt,
            updatedAt: updatedAt,
          };
        }).filter((category: Category) => category.id && category.title);
        
        // positionでソート
        categories.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getCategories] 取得成功（Supabaseから取得）:', categories.length, '件');
        return categories;
      } catch (error: any) {
        console.error('❌ [getCategories] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getCategories] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('collection_get', {
          collectionName: 'categories',
        });
        
        console.log('📖 [getCategories] collection_get結果:', {
          resultType: typeof result,
          isArray: Array.isArray(result),
          isObject: result && typeof result === 'object' && !Array.isArray(result),
          resultKeys: result && typeof result === 'object' ? Object.keys(result) : null,
        });
        
        // 結果が配列でない場合（オブジェクトの場合）、配列に変換
        let resultArray: any[] = [];
        if (Array.isArray(result)) {
          resultArray = result;
        } else if (result && typeof result === 'object') {
          // オブジェクトの場合は、値の配列に変換
          resultArray = Object.values(result);
        } else {
          console.log('⚠️ [getCategories] 結果が配列でもオブジェクトでもありません:', result);
          return [];
        }
        
        console.log('📖 [getCategories] 変換後の配列長:', resultArray.length);
        
        if (resultArray.length > 0) {
          console.log('📖 [getCategories] サンプルデータ（最初の1件）:', JSON.stringify(resultArray[0], null, 2));
        }
        
        const categories: Category[] = resultArray.map((item: any) => {
          // idはitem.idにあり、dataの中にはない
          const itemId = item.id;
          const data = item.data || item;
          
          // createdAtとupdatedAtがFirestoreのTimestamp形式の場合、ISO文字列に変換
          let createdAt: any = null;
          let updatedAt: any = null;
          
          if (data.createdAt) {
            if (data.createdAt.seconds) {
              // Firestore Timestamp形式
              createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAt = data.createdAt;
            }
          }
          
          if (data.updatedAt) {
            if (data.updatedAt.seconds) {
              // Firestore Timestamp形式
              updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
            } else if (typeof data.updatedAt === 'string') {
              updatedAt = data.updatedAt;
            }
          }
          
          return {
            id: itemId,
            title: data.title || '',
            description: data.description || '',
            parentCategoryId: data.parentCategoryId || undefined,
            position: data.position ?? null,
            createdAt: createdAt,
            updatedAt: updatedAt,
          };
        }).filter((category: Category) => category.id && category.title);
        
        // positionでソート
        categories.sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
        
        console.log('✅ [getCategories] 取得成功（SQLiteから直接取得）:', categories.length, '件');
        return categories;
      } catch (error: any) {
        console.error('❌ [getCategories] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<Category[]>('/api/categories');
      
      console.log('📖 [getCategories] API結果:', result);
      
      const categories = Array.isArray(result) ? result : [];
      console.log('📖 [getCategories] 全データ数:', categories.length);
      
      const normalizedCategories = categories
        .filter((category: Category) => category.id && category.title)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      
      console.log('✅ [getCategories] 取得成功:', normalizedCategories.length, '件');
      return normalizedCategories;
    } catch (error: any) {
      console.error('❌ [getCategories] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getCategories] エラー:', error);
    return [];
  }
}

/**
 * カテゴリーを取得（ID指定、SQLiteから取得）
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    console.log('📖 [getCategoryById] 開始（SQLiteから取得）:', { categoryId });
    
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('doc_get', {
          collectionName: 'categories',
          docId: categoryId,
        });
        
        if (!result || !result.data) {
          console.log('⚠️ [getCategoryById] データが見つかりませんでした');
          return null;
        }
        
        const data = result.data;
        const category: Category = {
          id: data.id,
          title: data.title || '',
          description: data.description || '',
          parentCategoryId: data.parentCategoryId || undefined,
          position: data.position ?? null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
        
        console.log('✅ [getCategoryById] 取得成功');
        return category;
      } catch (error: any) {
        console.error('❌ [getCategoryById] Tauriコマンドエラー:', error);
        return null;
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<Category>(`/api/categories/${categoryId}`);
      
      console.log('📖 [getCategoryById] API結果:', result);
      
      if (result && (result.id || result.title)) {
        const category: Category = {
          ...result,
        };
        
        console.log('✅ [getCategoryById] 取得成功');
        return category;
      }
      
      console.log('⚠️ [getCategoryById] データが見つかりませんでした');
      return null;
    } catch (error: any) {
      if (error.message && error.message.includes('404')) {
        console.log('⚠️ [getCategoryById] カテゴリーが見つかりませんでした');
        return null;
      }
      console.error('❌ [getCategoryById] APIエラー:', error);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getCategoryById] エラー:', error);
    return null;
  }
}

/**
 * カテゴリーを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveCategory(category: Partial<Category>): Promise<string> {
  try {
    const categoryId = category.id || generateUniqueCategoryId();
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`💾 [saveCategory] 開始（${useSupabase ? 'Supabase' : 'SQLite'}に保存）:`, { 
      categoryId, 
      title: category.title,
      hasId: !!category.id 
    });
    
    const now = new Date().toISOString();
    const categoryData: any = {
      id: categoryId,
      title: category.title || '',
      description: category.description || '',
      parentCategoryId: category.parentCategoryId || null,
      position: category.position ?? null,
      createdAt: category.createdAt || now,
      updatedAt: now,
    };
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { setDocViaDataSource } = await import('../dataSourceAdapter');
        await setDocViaDataSource('categories', categoryId, categoryData);
        console.log('✅ [saveCategory] カテゴリーを保存しました（Supabase経由）:', categoryId);
        return categoryId;
      } catch (error: any) {
        console.error('❌ [saveCategory] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_set', {
        collectionName: 'categories',
        docId: categoryId,
        data: categoryData,
      });
      
      console.log('✅ [saveCategory] カテゴリーを保存しました（Tauriコマンド経由）:', categoryId);
      return categoryId;
    }
    
    // その他の環境（API経由）
    const { apiPost, apiPut } = await import('../apiClient');
    
    const apiCategoryData: any = {
      title: category.title || '',
      description: category.description || '',
      parentCategoryId: category.parentCategoryId || null,
      position: category.position ?? null,
    };
    
    let savedCategory: Category;
    
    if (category.id) {
      console.log('📝 [saveCategory] 既存カテゴリーを更新:', categoryId);
      savedCategory = await apiPut<Category>(`/api/categories/${categoryId}`, apiCategoryData);
    } else {
      console.log('📝 [saveCategory] 新規カテゴリーを作成');
      savedCategory = await apiPost<Category>('/api/categories', apiCategoryData);
    }
    
    console.log('✅ [saveCategory] カテゴリーを保存しました:', savedCategory.id);
    return savedCategory.id;
  } catch (error: any) {
    console.error('❌ [saveCategory] カテゴリーの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * カテゴリーを削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteCategory] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { categoryId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        await deleteDocViaDataSource('categories', categoryId);
        console.log('✅ [deleteCategory] カテゴリーを削除しました（Supabase経由）:', categoryId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteCategory] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_delete', {
        collectionName: 'categories',
        docId: categoryId,
      });
      
      console.log('✅ [deleteCategory] カテゴリーを削除しました（Tauriコマンド経由）:', categoryId);
      return;
    }
    
    // その他の環境（API経由）
    const { apiDelete } = await import('../apiClient');
    
    await apiDelete(`/api/categories/${categoryId}`);
    
    console.log('✅ [deleteCategory] カテゴリーを削除しました:', categoryId);
  } catch (error: any) {
    console.error('❌ [deleteCategory] カテゴリーの削除に失敗しました:', error);
    throw error;
  }
}

/**
 * 複数のカテゴリーのpositionを一括更新
 */
export async function updateCategoryPositions(
  updates: Array<{ categoryId: string; position: number }>
): Promise<void> {
  try {
    console.log('🔄 [updateCategoryPositions] 開始:', updates.length, '件');
    
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      // 各カテゴリーのpositionを個別に更新
      for (const update of updates) {
        const category = await getCategoryById(update.categoryId);
        if (category) {
          await saveCategory({
            ...category,
            position: update.position,
          });
        }
      }
      
      console.log('✅ [updateCategoryPositions] 更新完了');
    } else {
      const { apiPost } = await import('../apiClient');
      await apiPost('/api/categories/positions', { updates });
    }
  } catch (error: any) {
    console.error('❌ [updateCategoryPositions] 更新に失敗しました:', error);
    throw error;
  }
}

