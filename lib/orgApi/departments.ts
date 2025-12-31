import type { Department } from './types';
import { generateUniqueDepartmentId } from './utils';

/**
 * 全部署を取得（SQLiteまたはSupabaseから取得）
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getDepartments] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
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
        console.error('❌ [getDepartments] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getDepartments] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      try {
        const result = await callTauriCommand('collection_get', {
          collectionName: 'departments',
        });
        
        // 結果が配列でない場合（オブジェクトの場合）、配列に変換
        let resultArray: any[] = [];
        if (Array.isArray(result)) {
          resultArray = result;
        } else if (result && typeof result === 'object') {
          resultArray = Object.values(result);
        } else {
          return [];
        }
        
        const departments: Department[] = resultArray.map((item: any) => {
          const itemId = item.id;
          const data = item.data || item;
          
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
        
        console.log('✅ [getDepartments] 取得成功:', departments.length, '件');
        return departments;
      } catch (error: any) {
        console.error('❌ [getDepartments] Tauriコマンドエラー:', error);
        return [];
      }
    }
    
    const { apiGet } = await import('../apiClient');
    
    try {
      const result = await apiGet<Department[]>('/api/departments');
      const departments = Array.isArray(result) ? result : [];
      
      const normalizedDepartments = departments
        .filter((dept: Department) => dept.id && dept.title)
        .sort((a, b) => {
          const posA = a.position ?? 999999;
          const posB = b.position ?? 999999;
          return posA - posB;
        });
      
      return normalizedDepartments;
    } catch (error: any) {
      console.error('❌ [getDepartments] APIエラー:', error);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getDepartments] エラー:', error);
    return [];
  }
}

/**
 * 部署を保存（SQLiteまたはSupabaseに保存）
 */
export async function saveDepartment(department: Partial<Department>): Promise<Department> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`💾 [saveDepartment] 開始（${useSupabase ? 'Supabase' : 'SQLite'}に保存）:`, { deptId: department.id, title: department.title });
    
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
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
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
        console.error('❌ [saveDepartment] Supabase保存エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_set', {
        collectionName: 'departments',
        docId: deptId,
        data: dataToSave,
      });
      
      console.log('✅ [saveDepartment] 保存成功（Tauriコマンド経由）:', deptId);
      
      return {
        id: deptId,
        title: dataToSave.title,
        description: dataToSave.description,
        position: dataToSave.position,
        createdAt: dataToSave.createdAt,
        updatedAt: dataToSave.updatedAt,
      };
    }
    
    // その他の環境（API経由）
    const { apiPost, apiPut } = await import('../apiClient');
    
    if (department.id) {
      const result = await apiPut<Department>(`/api/departments/${department.id}`, department);
      return result;
    } else {
      const result = await apiPost<Department>('/api/departments', department);
      return result;
    }
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
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🗑️ [deleteDepartment] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から削除）:`, { departmentId });
    
    // Supabase使用時はDataSource経由で削除
    if (useSupabase) {
      try {
        const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
        await deleteDocViaDataSource('departments', departmentId);
        console.log('✅ [deleteDepartment] 削除成功（Supabase経由）:', departmentId);
        return;
      } catch (error: any) {
        console.error('❌ [deleteDepartment] Supabase削除エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      await callTauriCommand('doc_delete', {
        collectionName: 'departments',
        docId: departmentId,
      });
      
      console.log('✅ [deleteDepartment] 削除成功（Tauriコマンド経由）:', departmentId);
      return;
    }
    
    // その他の環境（API経由）
    const { apiDelete } = await import('../apiClient');
    await apiDelete(`/api/departments/${departmentId}`);
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
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`🔄 [updateDepartmentPositions] 開始（${useSupabase ? 'Supabase' : 'SQLite'}で更新）:`, updates.length, '件');
    
    // Supabase使用時はDataSource経由で更新
    if (useSupabase) {
      try {
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
        return;
      } catch (error: any) {
        console.error('❌ [updateDepartmentPositions] Supabase更新エラー:', error);
        throw error;
      }
    }
    
    // SQLite使用時（Tauri環境）
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { callTauriCommand } = await import('../localFirebase');
      
      // 各部署のpositionを更新
      for (const update of updates) {
        const existingDept = await callTauriCommand('doc_get', {
          collectionName: 'departments',
          docId: update.departmentId,
        });
        
        if (existingDept && existingDept.data) {
          const dataToUpdate = {
            ...existingDept.data,
            position: update.position,
            updatedAt: new Date().toISOString(),
          };
          
          await callTauriCommand('doc_set', {
            collectionName: 'departments',
            docId: update.departmentId,
            data: dataToUpdate,
          });
        }
      }
      
      console.log('✅ [updateDepartmentPositions] 更新成功（Tauriコマンド経由）');
      return;
    }
    
    // その他の環境（API経由）
    const { apiPost } = await import('../apiClient');
    await apiPost('/api/departments/update-positions', { updates });
  } catch (error: any) {
    console.error('❌ [updateDepartmentPositions] エラー:', error);
    throw error;
  }
}

