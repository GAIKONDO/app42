'use client';

/**
 * BM25ハイブリッド検索の動作確認ページ
 */

import React, { useState } from 'react';
import { 
  searchKnowledgeGraph, 
  searchKnowledgeGraphWithRouter,
  DEFAULT_HYBRID_CONFIG, 
  type HybridSearchConfig,
  analyzeQuery,
  type QueryAnalysis,
} from '@/lib/knowledgeGraphRAG';
import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';

export default function TestBM25Page() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [vectorResults, setVectorResults] = useState<KnowledgeGraphSearchResult[]>([]);
  const [hybridResults, setHybridResults] = useState<KnowledgeGraphSearchResult[]>([]);
  const [routerResults, setRouterResults] = useState<KnowledgeGraphSearchResult[]>([]);
  const [queryAnalysis, setQueryAnalysis] = useState<QueryAnalysis | null>(null);
  const [searchTime, setSearchTime] = useState<{ vector: number; hybrid: number; router: number } | null>(null);
  const [hybridConfig, setHybridConfig] = useState<HybridSearchConfig>(DEFAULT_HYBRID_CONFIG);
  const [useRouter, setUseRouter] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('検索クエリを入力してください');
      return;
    }

    setIsSearching(true);
    setVectorResults([]);
    setHybridResults([]);
    setRouterResults([]);
    setQueryAnalysis(null);
    setSearchTime(null);

    try {
      // クエリ分析
      const analysis = analyzeQuery(query);
      setQueryAnalysis(analysis);

      // ベクトル検索のみ
      const vectorStart = performance.now();
      const vector = await searchKnowledgeGraph(query, 10);
      const vectorEnd = performance.now();
      const vectorTime = vectorEnd - vectorStart;

      // ハイブリッド検索
      const hybridStart = performance.now();
      const hybrid = await searchKnowledgeGraph(query, 10, undefined, true, 10000, hybridConfig);
      const hybridEnd = performance.now();
      const hybridTime = hybridEnd - hybridStart;

      // ルーター検索
      const routerStart = performance.now();
      const router = await searchKnowledgeGraphWithRouter(query, 10);
      const routerEnd = performance.now();
      const routerTime = routerEnd - routerStart;

      setVectorResults(vector);
      setHybridResults(hybrid);
      setRouterResults(router);
      setSearchTime({ vector: vectorTime, hybrid: hybridTime, router: routerTime });
    } catch (error) {
      console.error('検索エラー:', error);
      alert(`検索エラー: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>BM25ハイブリッド検索の動作確認</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>検索設定</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            検索クエリ:
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder="例: トヨタ自動車"
            />
          </label>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{ marginLeft: '10px', padding: '5px 15px' }}
          >
            {isSearching ? '検索中...' : '検索'}
          </button>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <h3>ハイブリッド検索設定</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <label>
              <input
                type="checkbox"
                checked={hybridConfig.useVector}
                onChange={(e) =>
                  setHybridConfig({ ...hybridConfig, useVector: e.target.checked })
                }
              />
              ベクトル検索を使用
            </label>
            <label>
              <input
                type="checkbox"
                checked={hybridConfig.useBM25}
                onChange={(e) =>
                  setHybridConfig({ ...hybridConfig, useBM25: e.target.checked })
                }
              />
              BM25検索を使用
            </label>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label>
              ベクトル検索の重み:
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={hybridConfig.weights.vector}
                onChange={(e) =>
                  setHybridConfig({
                    ...hybridConfig,
                    weights: {
                      ...hybridConfig.weights,
                      vector: parseFloat(e.target.value),
                    },
                  })
                }
                style={{ marginLeft: '10px', width: '80px' }}
              />
            </label>
            <label style={{ marginLeft: '20px' }}>
              BM25検索の重み:
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={hybridConfig.weights.bm25}
                onChange={(e) =>
                  setHybridConfig({
                    ...hybridConfig,
                    weights: {
                      ...hybridConfig.weights,
                      bm25: parseFloat(e.target.value),
                    },
                  })
                }
                style={{ marginLeft: '10px', width: '80px' }}
              />
            </label>
          </div>
        </div>
      </div>

      {queryAnalysis && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
          <h3>クエリ分析結果</h3>
          <p><strong>タイプ:</strong> {queryAnalysis.type}</p>
          <p><strong>信頼度:</strong> {(queryAnalysis.confidence * 100).toFixed(1)}%</p>
          <p><strong>キーワード:</strong> {queryAnalysis.keywords.join(', ') || 'なし'}</p>
          {queryAnalysis.entities.length > 0 && (
            <p><strong>固有名詞:</strong> {queryAnalysis.entities.join(', ')}</p>
          )}
          {queryAnalysis.reasons.length > 0 && (
            <details>
              <summary>判定理由</summary>
              <ul>
                {queryAnalysis.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {searchTime && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
          <h3>パフォーマンス</h3>
          <p>ベクトル検索のみ: {searchTime.vector.toFixed(2)}ms</p>
          <p>ハイブリッド検索: {searchTime.hybrid.toFixed(2)}ms</p>
          <p>ルーター検索: {searchTime.router.toFixed(2)}ms</p>
          <p>
            ハイブリッド検索のオーバーヘッド: {(searchTime.hybrid - searchTime.vector).toFixed(2)}ms (
            {((searchTime.hybrid / searchTime.vector - 1) * 100).toFixed(1)}%)
          </p>
          <p>
            ルーター検索のオーバーヘッド: {(searchTime.router - searchTime.vector).toFixed(2)}ms (
            {((searchTime.router / searchTime.vector - 1) * 100).toFixed(1)}%)
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div>
          <h2>ベクトル検索のみ ({vectorResults.length}件)</h2>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {vectorResults.length === 0 ? (
              <p>検索結果がありません</p>
            ) : (
              vectorResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  style={{
                    marginBottom: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {result.type}: {result.id}
                  </div>
                  <div>スコア: {result.score.toFixed(4)}</div>
                  <div>類似度: {result.similarity.toFixed(4)}</div>
                  {result.entity && (
                    <div>エンティティ: {result.entity.name} ({result.entity.type})</div>
                  )}
                  {result.relation && (
                    <div>
                      リレーション: {result.relation.relationType || result.relation.type}
                    </div>
                  )}
                  {result.topic && (
                    <div>トピック: {result.topic.title}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2>ハイブリッド検索 ({hybridResults.length}件)</h2>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {hybridResults.length === 0 ? (
              <p>検索結果がありません</p>
            ) : (
              hybridResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  style={{
                    marginBottom: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    backgroundColor: index < 3 ? '#fff9c4' : 'white',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {result.type}: {result.id}
                  </div>
                  <div>スコア: {result.score.toFixed(4)}</div>
                  <div>類似度: {result.similarity.toFixed(4)}</div>
                  {result.entity && (
                    <div>エンティティ: {result.entity.name} ({result.entity.type})</div>
                  )}
                  {result.relation && (
                    <div>
                      リレーション: {result.relation.relationType || result.relation.type}
                    </div>
                  )}
                  {result.topic && (
                    <div>トピック: {result.topic.title}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2>ルーター検索 ({routerResults.length}件)</h2>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {routerResults.length === 0 ? (
              <p>検索結果がありません</p>
            ) : (
              routerResults.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  style={{
                    marginBottom: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    backgroundColor: index < 3 ? '#c8e6c9' : 'white',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {result.type}: {result.id}
                  </div>
                  <div>スコア: {result.score.toFixed(4)}</div>
                  <div>類似度: {result.similarity.toFixed(4)}</div>
                  {result.entity && (
                    <div>エンティティ: {result.entity.name} ({result.entity.type})</div>
                  )}
                  {result.relation && (
                    <div>
                      リレーション: {result.relation.relationType || result.relation.type}
                    </div>
                  )}
                  {result.topic && (
                    <div>トピック: {result.topic.title}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
        <h3>確認ポイント</h3>
        <ul>
          <li>ハイブリッド検索の結果がベクトル検索と異なるか確認</li>
          <li>固有名詞を含むクエリで、BM25検索が効果的に機能しているか確認</li>
          <li>パフォーマンスのオーバーヘッドが許容範囲内か確認</li>
          <li>検索結果の順位が適切か確認</li>
        </ul>
      </div>
    </div>
  );
}

