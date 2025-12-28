'use client';

/**
 * 検索設定コンポーネント
 */

import React, { useState, useEffect } from 'react';
import {
  getSearchConfig,
  setSearchConfig,
  resetSearchConfig,
  type SearchConfig,
} from '@/lib/knowledgeGraphRAG/searchConfig';
import { bm25IndexCache } from '@/lib/knowledgeGraphRAG';

/**
 * キャッシュクリア確認モーダル
 */
function ClearCacheModal({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
          BM25キャッシュのクリア
        </h3>
        <p style={{ marginBottom: '24px', fontSize: '14px', color: '#6B7280', lineHeight: '1.5' }}>
          BM25インデックスのキャッシュをクリアしますか？<br />
          次回検索時にインデックスを再構築します。
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            クリア
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SearchSettings() {
  const [config, setConfig] = useState<SearchConfig>(getSearchConfig());
  const [saved, setSaved] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);

  useEffect(() => {
    setConfig(getSearchConfig());
    updateCacheStats();
  }, []);

  const updateCacheStats = () => {
    try {
      const stats = bm25IndexCache.getStats();
      setCacheStats(stats);
    } catch (error) {
      console.warn('キャッシュ統計の取得エラー:', error);
    }
  };

  const handleSave = () => {
    setSearchConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('設定をデフォルトに戻しますか？')) {
      resetSearchConfig();
      setConfig(getSearchConfig());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleClearCache = () => {
    setIsClearCacheModalOpen(true);
  };

  const handleConfirmClearCache = () => {
    bm25IndexCache.clear();
    updateCacheStats();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-border-color)',
      borderRadius: '8px',
      backgroundColor: 'var(--color-surface)',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
        検索設定
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
        BM25検索とクエリルーターの有効/無効を設定できます。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ padding: '20px', border: '1px solid var(--color-border-color)', borderRadius: '5px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600 }}>BM25検索</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
            キーワードベースの検索を有効化します。固有名詞や専門用語の検索精度が向上します。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.enableBM25}
              onChange={(e) => setConfig({ ...config, enableBM25: e.target.checked })}
            />
            <span>BM25検索を有効化</span>
          </label>
        </div>

        <div style={{ padding: '20px', border: '1px solid var(--color-border-color)', borderRadius: '5px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600 }}>クエリルーター</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
            クエリの種類を自動的に分析し、最適な検索戦略を選択します。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.enableRouter}
              onChange={(e) => setConfig({ ...config, enableRouter: e.target.checked })}
            />
            <span>クエリルーターを有効化</span>
          </label>
        </div>

        <div style={{ padding: '20px', border: '1px solid var(--color-border-color)', borderRadius: '5px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600 }}>ハイブリッド検索</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
            デフォルトでハイブリッド検索（ベクトル検索 + BM25検索）を使用します。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config.useHybridSearchByDefault}
              onChange={(e) => setConfig({ ...config, useHybridSearchByDefault: e.target.checked })}
            />
            <span>デフォルトでハイブリッド検索を使用</span>
          </label>
        </div>

        {cacheStats && (
          <div style={{ padding: '20px', border: '1px solid var(--color-border-color)', borderRadius: '5px', backgroundColor: 'var(--color-background)' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', fontWeight: 600 }}>BM25キャッシュ統計</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
              キャッシュサイズ: {cacheStats.size} / {cacheStats.maxSize}
            </p>
            {cacheStats.entries.length > 0 && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--color-text)' }}>
                  キャッシュエントリ詳細
                </summary>
                <ul style={{ marginTop: '10px', paddingLeft: '20px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  {cacheStats.entries.map((entry: any, index: number) => (
                    <li key={index}>
                      {entry.key}: {entry.documentCount}件 (経過時間: {Math.floor(entry.age / 1000)}秒)
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <button
              onClick={handleClearCache}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              キャッシュをクリア
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            保存
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-text-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            デフォルトに戻す
          </button>
        </div>

        {saved && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '5px',
              border: '1px solid #c3e6cb',
              fontSize: '14px',
            }}
          >
            {cacheStats?.size === 0 ? 'キャッシュをクリアしました' : '設定を保存しました'}
          </div>
        )}

        <ClearCacheModal
          isOpen={isClearCacheModalOpen}
          onClose={() => setIsClearCacheModalOpen(false)}
          onConfirm={handleConfirmClearCache}
        />

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'var(--color-background)', borderRadius: '5px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>現在の設定</h3>
          <pre style={{ 
            backgroundColor: 'var(--color-surface)', 
            padding: '10px', 
            borderRadius: '3px', 
            overflow: 'auto',
            fontSize: '12px',
            color: 'var(--color-text)',
          }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffc107' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>注意事項</h3>
          <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px', color: '#856404' }}>
            <li>設定はブラウザのlocalStorageに保存されます</li>
            <li>設定変更後は、検索を再実行すると反映されます</li>
            <li>BM25検索を無効にすると、ベクトル検索のみが使用されます</li>
            <li>クエリルーターを無効にすると、従来の検索方式が使用されます</li>
            <li>キャッシュをクリアすると、次回検索時にインデックスを再構築します</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

