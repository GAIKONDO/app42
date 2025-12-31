'use client';

/**
 * Supabase動作確認用のテストページ
 * リアルタイム同期と共同編集機能の動作確認ができます
 */

import { useState, useEffect } from 'react';
import { useRealtimeSync, useCollaborativeEditing } from '@/lib/hooks';
import { getDataSourceInstance } from '@/lib/dataSource';
import Layout from '@/components/Layout';

export default function SupabaseTestPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('初期化中...');
  const dataSource = getDataSourceInstance();

  // データを取得
  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus('データを取得中...');
      const results = await dataSource.collection_get('organizations');
      setOrganizations(results || []);
      setStatus(`✅ ${results?.length || 0}件の組織を取得しました`);
    } catch (err: any) {
      setError(err.message || 'データ取得エラー');
      setStatus(`❌ エラー: ${err.message}`);
      console.error('データ取得エラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回データ取得
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // リアルタイム同期を有効化
  useRealtimeSync({
    table: 'organizations',
    enabled: true,
    onInsert: (payload) => {
      console.log('🆕 新しい組織が追加されました:', payload.new);
      setOrganizations(prev => [...prev, payload.new]);
      setStatus(`🆕 新しい組織が追加されました: ${payload.new?.name || payload.new?.id}`);
    },
    onUpdate: (payload) => {
      console.log('🔄 組織が更新されました:', payload.new);
      setOrganizations(prev =>
        prev.map(org => org.id === payload.new.id ? payload.new : org)
      );
      setStatus(`🔄 組織が更新されました: ${payload.new?.name || payload.new?.id}`);
    },
    onDelete: (payload) => {
      console.log('🗑️ 組織が削除されました:', payload.old);
      setOrganizations(prev =>
        prev.filter(org => org.id !== payload.old.id)
      );
      if (selectedOrgId === payload.old.id) {
        setSelectedOrgId(null);
      }
      setStatus(`🗑️ 組織が削除されました: ${payload.old?.name || payload.old?.id}`);
    },
  });

  // 新しい組織を追加
  const handleAddOrganization = async () => {
    if (!newOrgName.trim()) {
      alert('組織名を入力してください');
      return;
    }

    try {
      setStatus('組織を追加中...');
      const docId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await dataSource.doc_set('organizations', docId, {
        name: newOrgName,
        level: 0,
        levelName: '組織',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewOrgName('');
      setStatus(`✅ 組織を追加しました: ${newOrgName}`);
    } catch (err: any) {
      setError(err.message || '組織追加エラー');
      setStatus(`❌ エラー: ${err.message}`);
      console.error('組織追加エラー:', err);
    }
  };

  // 組織を削除
  const handleDeleteOrganization = async (orgId: string) => {
    if (!confirm('この組織を削除しますか？')) {
      return;
    }

    try {
      setStatus('組織を削除中...');
      await dataSource.doc_delete('organizations', orgId);
      setStatus(`✅ 組織を削除しました`);
    } catch (err: any) {
      setError(err.message || '組織削除エラー');
      setStatus(`❌ エラー: ${err.message}`);
      console.error('組織削除エラー:', err);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Supabase動作確認ページ</h1>

        {/* ステータス表示 */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <div className="font-semibold">ステータス:</div>
          <div>{status}</div>
          {error && (
            <div className="text-red-600 mt-2">エラー: {error}</div>
          )}
        </div>

        {/* データソース情報 */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <div className="font-semibold">データソース:</div>
          <div>
            {process.env.NEXT_PUBLIC_USE_SUPABASE === 'true' ? 'Supabase' : 'ローカルSQLite'}
          </div>
        </div>

        {/* 新しい組織を追加 */}
        <div className="mb-6 p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">新しい組織を追加</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="組織名を入力"
              className="flex-1 px-3 py-2 border rounded"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddOrganization();
                }
              }}
            />
            <button
              onClick={handleAddOrganization}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              追加
            </button>
          </div>
        </div>

        {/* 組織一覧 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">組織一覧 ({organizations.length}件)</h2>
            <button
              onClick={fetchOrganizations}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              disabled={isLoading}
            >
              {isLoading ? '読み込み中...' : '再読み込み'}
            </button>
          </div>

          {isLoading ? (
            <div>読み込み中...</div>
          ) : organizations.length === 0 ? (
            <div className="text-gray-500">組織がありません</div>
          ) : (
            <div className="space-y-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`p-3 border rounded cursor-pointer ${
                    selectedOrgId === org.id ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedOrgId(org.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{org.name || org.id}</div>
                      <div className="text-sm text-gray-500">
                        ID: {org.id} | Level: {org.level} | {org.levelName}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOrganization(org.id);
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 選択された組織の詳細（共同編集機能のデモ） */}
        {selectedOrgId && (
          <OrganizationEditDemo orgId={selectedOrgId} />
        )}
      </div>
    </Layout>
  );
}

/**
 * 組織編集デモコンポーネント（共同編集機能のデモ）
 */
function OrganizationEditDemo({ orgId }: { orgId: string }) {
  const { data, update, isLoading, error } = useCollaborativeEditing({
    table: 'organizations',
    docId: orgId,
    onConflict: (error) => {
      alert(`競合が発生しました！\n他のユーザーが更新しました。\n現在のバージョン: ${error.currentVersion}\nサーバーのバージョン: ${error.serverVersion}`);
    },
  });

  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (data) {
      setEditName(data.name || '');
    }
  }, [data]);

  const handleSave = async () => {
    if (!data) return;

    try {
      await update({
        name: editName,
      } as any);
      alert('保存しました！');
    } catch (err: any) {
      console.error('保存エラー:', err);
      alert(`保存エラー: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 p-4 border rounded">
        <div>読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-4 border rounded bg-red-50">
        <div className="text-red-600">エラー: {error.message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-6 p-4 border rounded">
        <div>データが見つかりません</div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 border rounded bg-yellow-50">
      <h3 className="text-lg font-semibold mb-2">組織編集（共同編集機能のデモ）</h3>
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium mb-1">組織名:</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="text-sm text-gray-600">
          バージョン: {data.version || 0} | 更新日時: {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          保存
        </button>
        <div className="text-xs text-gray-500 mt-2">
          💡 このページを複数のブラウザで開いて、リアルタイム同期と共同編集を確認できます
        </div>
      </div>
    </div>
  );
}

