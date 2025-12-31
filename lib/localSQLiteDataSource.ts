/**
 * ローカルSQLiteデータソース実装
 * 既存のlocalFirebase.tsをラップしてDataSourceインターフェースを実装
 */

import { DataSource } from './dataSource';
import { callTauriCommand } from './localFirebase';

export class LocalSQLiteDataSource implements DataSource {
  async doc_get(collectionName: string, docId: string): Promise<any> {
    try {
      const result = await callTauriCommand('doc_get', { 
        collectionName, 
        docId 
      });
      
      if (!result || !result.data || result.exists === false) {
        return null;
      }
      
      return result.data;
    } catch (error: any) {
      const errorMessage = error?.message || error?.error || String(error || '');
      if (errorMessage.includes('no rows') || 
          errorMessage.includes('Query returned no rows') ||
          errorMessage.includes('ドキュメント取得エラー')) {
        return null;
      }
      throw error;
    }
  }

  async doc_set(collectionName: string, docId: string, data: any): Promise<void> {
    await callTauriCommand('doc_set', { 
      collectionName, 
      docId, 
      data 
    });
  }

  async doc_update(collectionName: string, docId: string, data: any): Promise<void> {
    await callTauriCommand('doc_update', { 
      collectionName, 
      docId, 
      data 
    });
  }

  async doc_delete(collectionName: string, docId: string): Promise<void> {
    await callTauriCommand('doc_delete', { 
      collectionName, 
      docId 
    });
  }

  async collection_get(collectionName: string, conditions?: any): Promise<any[]> {
    const results = await callTauriCommand('collection_get', { 
      collectionName,
      conditions 
    });
    
    return (results || []).map((r: any) => r.data || r);
  }

  async collection_add(collectionName: string, data: any): Promise<string> {
    const result = await callTauriCommand('collection_add', { 
      collectionName, 
      data 
    });
    
    return result.id || result;
  }

  async query_get(collectionName: string, conditions?: any): Promise<any[]> {
    const results = await callTauriCommand('query_get', { 
      collectionName, 
      conditions 
    });
    
    return (results || []).map((r: any) => r.data || r);
  }

  async sign_in(email: string, password: string): Promise<any> {
    const result = await callTauriCommand('sign_in', { email, password });
    return result;
  }

  async sign_up(email: string, password: string): Promise<any> {
    const result = await callTauriCommand('sign_up', { email, password });
    return result;
  }

  async sign_out(): Promise<void> {
    await callTauriCommand('sign_out', {});
  }

  async get_current_user(): Promise<any | null> {
    try {
      const result = await callTauriCommand('get_current_user', {});
      return result || null;
    } catch (error: any) {
      return null;
    }
  }
}

