'use client';

/**
 * Supabase設定検証ページ
 * 環境変数とSupabase接続を確認
 */

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { verifySupabaseConfig, displayConfigStatus, type SupabaseConfigStatus } from '@/lib/utils/verifySupabaseConfig';

export default function SupabaseConfigCheckPage() {
  const [status, setStatus] = useState<SupabaseConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConfig = async () => {
      setIsLoading(true);
      try {
        const result = await verifySupabaseConfig();
        setStatus(result);
        displayConfigStatus(result);
      } catch (error: any) {
        console.error('設定検証エラー:', error);
        setStatus({
          isConfigured: false,
          isConnected: false,
          errors: [error.message || '設定検証中にエラーが発生しました'],
          warnings: [],
          info: {
            useSupabase: process.env.NEXT_PUBLIC_USE_SUPABASE === 'true',
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

  const handleRecheck = async () => {
    setIsLoading(true);
    try {
      const result = await verifySupabaseConfig();
      setStatus(result);
      displayConfigStatus(result);
    } catch (error: any) {
      console.error('設定検証エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Supabase設定検証</h1>

        {isLoading ? (
          <div className="p-4 bg-gray-100 rounded">検証中...</div>
        ) : status ? (
          <div className="space-y-4">
            {/* 基本情報 */}
            <div className="p-4 border rounded">
              <h2 className="text-lg font-semibold mb-2">基本情報</h2>
              <div className="space-y-1">
                <div>
                  <span className="font-medium">データソース: </span>
                  {status.info.useSupabase ? (
                    <span className="text-green-600">✅ Supabase</span>
                  ) : (
                    <span className="text-gray-600">ローカルSQLite</span>
                  )}
                </div>
                {status.info.useSupabase && (
                  <>
                    <div>
                      <span className="font-medium">Supabase URL: </span>
                      <span className={status.info.supabaseUrl ? 'text-green-600' : 'text-red-600'}>
                        {status.info.supabaseUrl || '未設定'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">APIキー: </span>
                      <span className={status.info.hasAnonKey ? 'text-green-600' : 'text-red-600'}>
                        {status.info.hasAnonKey ? '✅ 設定済み' : '❌ 未設定'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">接続状態: </span>
                      <span className={status.isConnected ? 'text-green-600' : 'text-red-600'}>
                        {status.isConnected ? '✅ 接続成功' : '❌ 接続失敗'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* エラー */}
            {status.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <h2 className="text-lg font-semibold text-red-800 mb-2">❌ エラー</h2>
                <ul className="list-disc list-inside space-y-1">
                  {status.errors.map((error, index) => (
                    <li key={index} className="text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 警告 */}
            {status.warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ 警告</h2>
                <ul className="list-disc list-inside space-y-1">
                  {status.warnings.map((warning, index) => (
                    <li key={index} className="text-yellow-700">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 成功メッセージ */}
            {status.isConfigured && status.isConnected && status.errors.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h2 className="text-lg font-semibold text-green-800 mb-2">✅ 設定は正常です</h2>
                <p className="text-green-700">
                  Supabase設定は正常に動作しています。リアルタイム同期と共同編集機能が使用できます。
                </p>
              </div>
            )}

            {/* 再確認ボタン */}
            <button
              onClick={handleRecheck}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              再確認
            </button>

            {/* 設定方法のリンク */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h2 className="text-lg font-semibold mb-2">設定方法</h2>
              <p className="text-sm text-gray-700 mb-2">
                Supabaseを使用するには、`.env.local`ファイルに以下の環境変数を設定してください：
              </p>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
              <p className="text-sm text-gray-700 mt-2">
                詳細は <code className="bg-gray-100 px-1 rounded">README_SUPABASE_SETUP.md</code> を参照してください。
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-700">設定検証に失敗しました</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

