/**
 * Supabase設定検証ツール
 * 環境変数とSupabase接続を確認
 */

import { getDataSourceInstance } from '../dataSource';

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  isConnected: boolean;
  errors: string[];
  warnings: string[];
  info: {
    useSupabase: boolean;
    supabaseUrl?: string;
    hasAnonKey: boolean;
  };
}

/**
 * Supabase設定を検証
 */
export async function verifySupabaseConfig(): Promise<SupabaseConfigStatus> {
  const errors: string[] = [];
  const warnings: string[] = [];
  // Supabase専用（環境変数チェック不要、常にSupabaseを使用）
  const useSupabase = true;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 基本設定の確認
  if (!supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URLが設定されていません');
  }
  if (!supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEYが設定されていません');
  }

  // 接続確認
  let isConnected = false;
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const dataSource = getDataSourceInstance();
      // 簡単な接続テスト（organizationsテーブルから1件取得を試みる）
      await dataSource.collection_get('organizations', { limit: 1 });
      isConnected = true;
    } catch (error: any) {
      errors.push(`Supabase接続エラー: ${error.message}`);
      isConnected = false;
    }
  }

  // 警告の確認
  if (!supabaseUrl) {
    warnings.push('Supabase URLが設定されていません');
  }
  if (!supabaseAnonKey) {
    warnings.push('Supabase APIキーが設定されていません');
  }

  return {
    isConfigured: !!supabaseUrl && !!supabaseAnonKey,
    isConnected,
    errors,
    warnings,
    info: {
      useSupabase,
      supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    },
  };
}

/**
 * 設定検証結果を表示
 */
export function displayConfigStatus(status: SupabaseConfigStatus): void {
  console.log('=== Supabase設定検証結果 ===');
  console.log(`使用中: ${status.info.useSupabase ? '✅ Supabase' : '❌ ローカルSQLite'}`);
  
  if (status.info.useSupabase) {
    console.log(`URL: ${status.info.supabaseUrl || '未設定'}`);
    console.log(`APIキー: ${status.info.hasAnonKey ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`接続状態: ${status.isConnected ? '✅ 接続成功' : '❌ 接続失敗'}`);
  }

  if (status.errors.length > 0) {
    console.error('\n❌ エラー:');
    status.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (status.warnings.length > 0) {
    console.warn('\n⚠️ 警告:');
    status.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  if (status.isConfigured && status.isConnected) {
    console.log('\n✅ Supabase設定は正常です');
  } else {
    console.log('\n❌ Supabase設定に問題があります');
  }
}

