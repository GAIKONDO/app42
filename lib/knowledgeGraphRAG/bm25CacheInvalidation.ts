/**
 * BM25インデックスキャッシュの無効化
 * データ更新時にキャッシュを無効化して整合性を保つ
 */

import { bm25IndexCache } from './bm25IndexCache';

/**
 * エンティティ更新時にキャッシュを無効化
 */
export function invalidateEntityCache(organizationId?: string): void {
  console.log('[BM25CacheInvalidation] エンティティキャッシュを無効化:', { organizationId });
  
  // 特定の組織のキャッシュのみを無効化する場合は、キャッシュキーを生成して削除
  // 現在の実装では、全キャッシュをクリア（将来的に改善可能）
  if (organizationId) {
    // 組織固有のキャッシュを削除するロジックを追加可能
    // 現時点では簡易的に全クリア
    bm25IndexCache.clear();
  } else {
    bm25IndexCache.clear();
  }
}

/**
 * リレーション更新時にキャッシュを無効化
 */
export function invalidateRelationCache(organizationId?: string): void {
  console.log('[BM25CacheInvalidation] リレーションキャッシュを無効化:', { organizationId });
  bm25IndexCache.clear();
}

/**
 * トピック更新時にキャッシュを無効化
 */
export function invalidateTopicCache(organizationId?: string): void {
  console.log('[BM25CacheInvalidation] トピックキャッシュを無効化:', { organizationId });
  bm25IndexCache.clear();
}

/**
 * すべてのキャッシュを無効化
 */
export function invalidateAllCache(): void {
  console.log('[BM25CacheInvalidation] すべてのキャッシュを無効化');
  bm25IndexCache.clear();
}

