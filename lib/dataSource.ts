/**
 * データソース抽象化レイヤー
 * SQLiteとSupabaseを切り替え可能にするためのインターフェース
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

// データソースの選択
export function getDataSource(): DataSource {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  
  if (useSupabase) {
    // Supabaseデータソースを使用
    const { SupabaseDataSource } = require('./supabaseDataSource');
    return new SupabaseDataSource();
  } else {
    // ローカルSQLiteデータソースを使用
    const { LocalSQLiteDataSource } = require('./localSQLiteDataSource');
    return new LocalSQLiteDataSource();
  }
}

// シングルトンインスタンス
let dataSourceInstance: DataSource | null = null;
let lastUseSupabase: string | undefined = undefined;

export function getDataSourceInstance(): DataSource {
  const currentUseSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE;
  
  // 環境変数が変更された場合、インスタンスを再作成
  if (dataSourceInstance && lastUseSupabase !== currentUseSupabase) {
    console.log(`[DataSource] 環境変数が変更されました。データソースを再初期化します。`);
    console.log(`[DataSource] 前回: ${lastUseSupabase}, 現在: ${currentUseSupabase}`);
    dataSourceInstance = null;
  }
  
  if (!dataSourceInstance) {
    dataSourceInstance = getDataSource();
    lastUseSupabase = currentUseSupabase;
    
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`[DataSource] データソースを初期化しました: ${useSupabase ? 'Supabase' : 'ローカルSQLite'}`);
  }
  
  return dataSourceInstance;
}

