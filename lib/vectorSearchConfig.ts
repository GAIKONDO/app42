/**
 * ベクトル検索の設定
 * Supabase（pgvector）専用
 */

/**
 * ベクトル検索のバックエンドタイプ
 * 現在はSupabaseのみサポート
 */
export type VectorSearchBackend = 'supabase';

/**
 * 使用するベクトル検索バックエンドを取得
 * Supabase専用（常に'supabase'を返す）
 */
export function getVectorSearchBackend(): VectorSearchBackend {
  // Supabase専用
  return 'supabase';
}

/**
 * ChromaDBを使用するかどうか
 * 後方互換性のため残しているが、常にfalseを返す
 * @deprecated ChromaDBは使用されていません。Supabaseを使用してください。
 */
export function shouldUseChroma(): boolean {
  return false;
}

/**
 * Supabaseを使用するかどうか
 * 常にtrueを返す（Supabase専用）
 */
export function shouldUseSupabase(): boolean {
  return true;
}

/**
 * ベクトル検索バックエンドの設定を確認
 */
export function getVectorSearchConfig(): {
  backend: VectorSearchBackend;
  isChromaDB: boolean;
  isSupabase: boolean;
  config: {
    useSupabaseVectorSearch: string | undefined;
    useSupabase: string | undefined;
    supabaseUrl: string | undefined;
    supabaseAnonKey: string | undefined;
  };
} {
  const backend = getVectorSearchBackend();
  
  return {
    backend,
    isChromaDB: false, // ChromaDBは使用されていません
    isSupabase: true, // Supabase専用
    config: {
      useSupabaseVectorSearch: process.env.NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH,
      useSupabase: process.env.NEXT_PUBLIC_USE_SUPABASE,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : undefined,
    },
  };
}

