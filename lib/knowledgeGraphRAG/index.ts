/**
 * ナレッジグラフ統合RAG検索
 * エンティティ、リレーション、トピックを統合して検索する機能を提供
 * 
 * このモジュールは分割されたファイルから全ての公開APIを再エクスポートします。
 * 既存のコードとの互換性を保つため、`@/lib/knowledgeGraphRAG`からのインポートは
 * 引き続き動作します。
 */

// 型定義をエクスポート
export type {
  SearchResultType,
  TopicSummary,
  KnowledgeGraphSearchResult,
  SearchFilters,
  KnowledgeGraphContextResult,
} from './types';

// 検索関数をエクスポート
export { searchKnowledgeGraph } from './searchKnowledgeGraph';
export { searchEntities } from './searchEntities';
export { searchRelations } from './searchRelations';
export { searchTopics } from './searchTopics';

// コンテキスト生成関数をエクスポート
export {
  getKnowledgeGraphContext,
  getKnowledgeGraphContextWithResults,
  getIntegratedRAGContext,
  findRelatedEntities,
  findRelatedRelations,
} from './contextGeneration';

// ユーティリティ関数をエクスポート
export { formatSources } from './utils';

// ハイブリッド検索設定をエクスポート
export {
  DEFAULT_HYBRID_CONFIG,
  DEFAULT_HYBRID_WEIGHTS,
  type HybridWeights,
  type HybridSearchConfig,
} from './hybridSearch';

// クエリルーターをエクスポート
export {
  analyzeQuery,
  getSearchStrategy,
  logQueryAnalysis,
  type QueryType,
  type QueryAnalysis,
  type SearchStrategy,
} from './queryRouter';

// クエリルーターを使用した検索関数をエクスポート
export { searchKnowledgeGraphWithRouter } from './searchKnowledgeGraphWithRouter';

// BM25キャッシュ管理をエクスポート
export {
  bm25IndexCache,
} from './bm25IndexCache';

export {
  invalidateEntityCache,
  invalidateRelationCache,
  invalidateTopicCache,
  invalidateAllCache,
} from './bm25CacheInvalidation';

// BM25パラメータ調整をエクスポート
export {
  tuneBM25Parameters,
  RECOMMENDED_BM25_CONFIG,
  SHORT_DOCUMENT_CONFIG,
  LONG_DOCUMENT_CONFIG,
  type ParameterTuningResult,
} from './bm25ParameterTuning';

// 検索設定をエクスポート
export {
  getSearchConfig,
  setSearchConfig,
  resetSearchConfig,
  DEFAULT_SEARCH_CONFIG,
  type SearchConfig,
} from './searchConfig';

