/**
 * ベクトル検索の設定と切り替え
 * ChromaDBとSupabase（pgvector）を環境変数で切り替え可能にする
 */

/**
 * ベクトル検索のバックエンドタイプ
 */
export type VectorSearchBackend = 'chromadb' | 'supabase';

/**
 * 使用するベクトル検索バックエンドを取得
 * 
 * 環境変数の優先順位:
 * 1. NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true → Supabase
 * 2. NEXT_PUBLIC_USE_SUPABASE=true → Supabase（既存のSupabase設定を利用）
 * 3. それ以外 → ChromaDB（デフォルト）
 */
export function getVectorSearchBackend(): VectorSearchBackend {
  // 明示的にSupabaseベクトル検索を指定
  if (process.env.NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH === 'true') {
    return 'supabase';
  }

  // 既存のSupabase設定がある場合、Supabaseを使用
  if (process.env.NEXT_PUBLIC_USE_SUPABASE === 'true') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      return 'supabase';
    }
  }

  // デフォルトはChromaDB
  return 'chromadb';
}

/**
 * ChromaDBを使用するかどうか
 * 後方互換性のため、既存のshouldUseChroma()関数の代替
 */
export function shouldUseChroma(): boolean {
  return getVectorSearchBackend() === 'chromadb';
}

/**
 * Supabaseを使用するかどうか
 */
export function shouldUseSupabase(): boolean {
  return getVectorSearchBackend() === 'supabase';
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
    isChromaDB: backend === 'chromadb',
    isSupabase: backend === 'supabase',
    config: {
      useSupabaseVectorSearch: process.env.NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH,
      useSupabase: process.env.NEXT_PUBLIC_USE_SUPABASE,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : undefined,
    },
  };
}

