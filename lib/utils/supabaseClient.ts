/**
 * Supabaseクライアントのシングルトン管理
 * 複数のSupabaseクライアントインスタンスを作成しないようにする
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Supabaseクライアントのシングルトンインスタンスを取得
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClientInstance) {
    console.log('[getSupabaseClient] 既存のインスタンスを返します');
    return supabaseClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[getSupabaseClient] 環境変数チェック:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    anonKeyLength: supabaseAnonKey?.length || 0,
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error(
      'Supabase環境変数が設定されていません。\n' +
      'NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。'
    );
    console.error('[getSupabaseClient] 環境変数エラー:', error);
    throw error;
  }

  console.log('[getSupabaseClient] Supabaseクライアントを作成中:', {
    url: supabaseUrl,
    anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...',
  });

  try {
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log('[getSupabaseClient] Supabaseクライアント作成成功');
    return supabaseClientInstance;
  } catch (error) {
    console.error('[getSupabaseClient] Supabaseクライアント作成エラー:', error);
    throw error;
  }
}

/**
 * Supabaseクライアントインスタンスをリセット（テスト用）
 */
export function resetSupabaseClient(): void {
  supabaseClientInstance = null;
}

