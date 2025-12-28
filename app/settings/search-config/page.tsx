'use client';

/**
 * 検索設定ページ
 * BM25とクエリルーターの有効/無効を設定
 */

import React, { useState, useEffect } from 'react';
import {
  getSearchConfig,
  setSearchConfig,
  resetSearchConfig,
  type SearchConfig,
} from '@/lib/knowledgeGraphRAG/searchConfig';

export default function SearchConfigPage() {
  const [config, setConfig] = useState<SearchConfig>(getSearchConfig());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(getSearchConfig());
  }, []);

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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>検索設定</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        BM25検索とクエリルーターの有効/無効を設定できます。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h2 style={{ marginTop: 0 }}>BM25検索</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            キーワードベースの検索を有効化します。固有名詞や専門用語の検索精度が向上します。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={config.enableBM25}
              onChange={(e) => setConfig({ ...config, enableBM25: e.target.checked })}
            />
            BM25検索を有効化
          </label>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h2 style={{ marginTop: 0 }}>クエリルーター</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            クエリの種類を自動的に分析し、最適な検索戦略を選択します。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={config.enableRouter}
              onChange={(e) => setConfig({ ...config, enableRouter: e.target.checked })}
            />
            クエリルーターを有効化
          </label>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h2 style={{ marginTop: 0 }}>ハイブリッド検索</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            デフォルトでハイブリッド検索（ベクトル検索 + BM25検索）を使用します。
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={config.useHybridSearchByDefault}
              onChange={(e) => setConfig({ ...config, useHybridSearchByDefault: e.target.checked })}
            />
            デフォルトでハイブリッド検索を使用
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            保存
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
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
            }}
          >
            設定を保存しました
          </div>
        )}

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h3>現在の設定</h3>
          <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '3px', overflow: 'auto' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
          <h3>注意事項</h3>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>設定はブラウザのlocalStorageに保存されます</li>
            <li>設定変更後は、検索を再実行すると反映されます</li>
            <li>BM25検索を無効にすると、ベクトル検索のみが使用されます</li>
            <li>クエリルーターを無効にすると、従来の検索方式が使用されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

