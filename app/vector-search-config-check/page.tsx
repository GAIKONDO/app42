'use client';

/**
 * ベクトル検索設定確認ページ
 * ChromaDBとSupabase（pgvector）の切り替え設定を確認
 */

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { getVectorSearchConfig } from '@/lib/vectorSearchConfig';

export default function VectorSearchConfigCheckPage() {
  const [config, setConfig] = useState<ReturnType<typeof getVectorSearchConfig> | null>(null);

  useEffect(() => {
    const checkConfig = () => {
      const result = getVectorSearchConfig();
      setConfig(result);
      console.log('=== ベクトル検索設定 ===');
      console.log('バックエンド:', result.backend);
      console.log('ChromaDB使用:', result.isChromaDB);
      console.log('Supabase使用:', result.isSupabase);
      console.log('設定:', result.config);
    };

    checkConfig();
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">ベクトル検索設定確認</h1>

        {config ? (
          <div className="space-y-4">
            {/* 基本情報 */}
            <div className="p-4 border rounded">
              <h2 className="text-lg font-semibold mb-2">基本情報</h2>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">使用中のバックエンド: </span>
                  {config.backend === 'supabase' ? (
                    <span className="text-green-600 font-bold">✅ Supabase (pgvector)</span>
                  ) : (
                    <span className="text-blue-600 font-bold">✅ ChromaDB</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">ChromaDB使用: </span>
                  <span className={config.isChromaDB ? 'text-blue-600' : 'text-gray-400'}>
                    {config.isChromaDB ? '✅ はい' : '❌ いいえ'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Supabase使用: </span>
                  <span className={config.isSupabase ? 'text-green-600' : 'text-gray-400'}>
                    {config.isSupabase ? '✅ はい' : '❌ いいえ'}
                  </span>
                </div>
              </div>
            </div>

            {/* 環境変数設定 */}
            <div className="p-4 border rounded">
              <h2 className="text-lg font-semibold mb-2">環境変数設定</h2>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH: </span>
                  <span className={config.config.useSupabaseVectorSearch ? 'text-green-600' : 'text-gray-400'}>
                    {config.config.useSupabaseVectorSearch || '未設定'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">NEXT_PUBLIC_USE_SUPABASE: </span>
                  <span className={config.config.useSupabase ? 'text-green-600' : 'text-gray-400'}>
                    {config.config.useSupabase || '未設定'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL: </span>
                  <span className={config.config.supabaseUrl ? 'text-green-600' : 'text-red-600'}>
                    {config.config.supabaseUrl || '未設定'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY: </span>
                  <span className={config.config.supabaseAnonKey ? 'text-green-600' : 'text-red-600'}>
                    {config.config.supabaseAnonKey ? '✅ 設定済み' : '❌ 未設定'}
                  </span>
                </div>
              </div>
            </div>

            {/* 説明 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h2 className="text-lg font-semibold mb-2">設定の優先順位</h2>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>
                  <span className="font-medium">NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true</span> → Supabaseを使用
                </li>
                <li>
                  <span className="font-medium">NEXT_PUBLIC_USE_SUPABASE=true</span> かつ Supabase設定が完了 → Supabaseを使用
                </li>
                <li>それ以外 → ChromaDBを使用（デフォルト）</li>
              </ol>
            </div>

            {/* 現在の判定結果 */}
            <div className="p-4 bg-gray-50 border rounded">
              <h2 className="text-lg font-semibold mb-2">判定結果</h2>
              <p className="text-sm">
                現在の設定により、<span className="font-bold">
                  {config.backend === 'supabase' ? 'Supabase (pgvector)' : 'ChromaDB'}
                </span>が使用されています。
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-100 rounded">読み込み中...</div>
        )}
      </div>
    </Layout>
  );
}

