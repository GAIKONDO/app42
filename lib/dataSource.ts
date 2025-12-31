/**
 * データソース抽象化レイヤー
 * Supabase専用
 */

export interface DataSource {
  // ドキュメント操作
  doc_get(collectionName: string, docId: string): Promise<any>;
  doc_set(collectionName: string, docId: string, data: any): Promise<void>;
  doc_update(collectionName: string, docId: string, data: any): Promise<void>;
  doc_delete(collectionName: string, docId: string): Promise<void>;
  
  // コレクション操作
  collection_get(collectionName: string, conditions?: any): Promise<any[]>;
  collection_add(collectionName: string, data: any): Promise<string>;
  
  // クエリ操作
  query_get(collectionName: string, conditions?: any): Promise<any[]>;
  
  // 認証操作
  sign_in(email: string, password: string): Promise<any>;
  sign_up(email: string, password: string): Promise<any>;
  sign_out(): Promise<void>;
  get_current_user(): Promise<any | null>;
  
  // リアルタイム同期（オプション）
  subscribe?(table: string, callback: (payload: any) => void): () => void;
  unsubscribe?(table: string): void;
}

// データソースの取得（常にSupabaseを使用）
export function getDataSource(): DataSource {
  console.log('[DataSource] Supabaseデータソースを使用します');
  const { SupabaseDataSource } = require('./supabaseDataSource');
  return new SupabaseDataSource();
}

// シングルトンインスタンス
let dataSourceInstance: DataSource | null = null;

export function getDataSourceInstance(): DataSource {
  if (!dataSourceInstance) {
    dataSourceInstance = getDataSource();
    console.log('[DataSource] データソースを初期化しました: Supabase');
  }
  
  return dataSourceInstance;
}

