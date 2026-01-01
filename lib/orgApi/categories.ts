import type { Category } from './types';
import { generateUniqueCategoryId } from './utils';

/**
 * 全カテゴリーを取得（SQLiteまたはSupabaseから取得）
 */
export async function getCategories(): Promise<Category[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getCategories] 開始（Supabaseから取得）');
    
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
        throw error;
      }
  } catch (error: any) {
    console.error('❌ [getCategories] エラー:', error);
    throw error;
  }
}

/**
 * カテゴリーを取得（ID指定、SQLiteから取得）
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    console.log('📖 [getCategoryById] 開始（Supabaseから取得）:', { categoryId });
    
    // Supabase専用（環境変数チェック不要）
    const { getDocViaDataSource } = await import('../dataSourceAdapter');
    const result = await getDocViaDataSource('categories', categoryId);
    
    if (!result) {
      console.log('⚠️ [getCategoryById] データが見つかりませんでした');
      return null;
    }
    
    const data = result;
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
    console.error('❌ [getCategoryById] エラー:', error);
    return null;
  }
}

/**
 * カテゴリーを保存（SQLiteまたはSupabaseに保存）
 */
export async function saveCategory(category: Partial<Category>): Promise<string> {
  try {
    // Supabase専用（環境変数チェック不要）
    const categoryId = category.id || generateUniqueCategoryId();
    console.log('💾 [saveCategory] 開始（Supabaseに保存）:', { 
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
    
    const { setDocViaDataSource } = await import('../dataSourceAdapter');
    await setDocViaDataSource('categories', categoryId, categoryData);
    console.log('✅ [saveCategory] カテゴリーを保存しました（Supabase経由）:', categoryId);
    return categoryId;
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
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteCategory] 開始（Supabaseから削除）:', { categoryId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('categories', categoryId);
    console.log('✅ [deleteCategory] カテゴリーを削除しました（Supabase経由）:', categoryId);
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

