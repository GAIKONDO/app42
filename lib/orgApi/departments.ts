import type { Department } from './types';
import { generateUniqueDepartmentId } from './utils';

/**
 * 全部署を取得（SQLiteまたはSupabaseから取得）
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getDepartments] 開始（Supabaseから取得）');
    
    const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
    const result = await getCollectionViaDataSource('departments');
    
    // Supabaseから取得したデータは既に配列形式
    const resultArray = Array.isArray(result) ? result : [];
    
    const departments: Department[] = resultArray.map((item: any) => {
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
    }).filter((dept: Department) => dept.id && dept.title);
    
    // positionでソート
    departments.sort((a, b) => {
      const posA = a.position ?? 999999;
      const posB = b.position ?? 999999;
      return posA - posB;
    });
    
    console.log('✅ [getDepartments] 取得成功（Supabaseから取得）:', departments.length, '件');
    return departments;
  } catch (error: any) {
    console.error('❌ [getDepartments] エラー:', error);
    throw error;
  }
}

/**
 * 部署を保存（SQLiteまたはSupabaseに保存）
 */
export async function saveDepartment(department: Partial<Department>): Promise<Department> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('💾 [saveDepartment] 開始（Supabaseに保存）:', { deptId: department.id, title: department.title });
    
    const deptId = department.id || generateUniqueDepartmentId();
    const now = new Date().toISOString();
    
    const dataToSave: any = {
      id: deptId,
      title: department.title || '',
      description: department.description || '',
      position: department.position ?? null,
      createdAt: department.createdAt || now,
      updatedAt: now,
    };
    
    const { setDocViaDataSource } = await import('../dataSourceAdapter');
    await setDocViaDataSource('departments', deptId, dataToSave);
    console.log('✅ [saveDepartment] 保存成功（Supabase経由）:', deptId);
    
    return {
      id: deptId,
      title: dataToSave.title,
      description: dataToSave.description,
      position: dataToSave.position,
      createdAt: dataToSave.createdAt,
      updatedAt: dataToSave.updatedAt,
    };
  } catch (error: any) {
    console.error('❌ [saveDepartment] エラー:', error);
    throw error;
  }
}

/**
 * 部署を削除（SQLiteまたはSupabaseから削除）
 */
export async function deleteDepartment(departmentId: string): Promise<void> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteDepartment] 開始（Supabaseから削除）:', { departmentId });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('departments', departmentId);
    console.log('✅ [deleteDepartment] 削除成功（Supabase経由）:', departmentId);
  } catch (error: any) {
    console.error('❌ [deleteDepartment] エラー:', error);
    throw error;
  }
}

/**
 * 部署の順序を更新（SQLiteまたはSupabaseで更新）
 */
export async function updateDepartmentPositions(updates: { departmentId: string; position: number }[]): Promise<void> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('🔄 [updateDepartmentPositions] 開始（Supabaseで更新）:', updates.length, '件');
    
    const { getDocViaDataSource, setDocViaDataSource } = await import('../dataSourceAdapter');
    
    // 各部署のpositionを更新
    for (const update of updates) {
      const existingDept = await getDocViaDataSource('departments', update.departmentId);
      
      if (existingDept) {
        const dataToUpdate = {
          ...existingDept,
          position: update.position,
          updatedAt: new Date().toISOString(),
        };
        
        await setDocViaDataSource('departments', update.departmentId, dataToUpdate);
      }
    }
    
    console.log('✅ [updateDepartmentPositions] 更新成功（Supabase経由）');
  } catch (error: any) {
    console.error('❌ [updateDepartmentPositions] エラー:', error);
    throw error;
  }
}

