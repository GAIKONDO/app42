/**
 * BM25インデックスのキャッシュ管理
 * 検索パフォーマンス向上のため、構築済みのインデックスをキャッシュ
 */

import { BM25Index } from '@/lib/bm25Search';

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  index: BM25Index;
  timestamp: number;
  documentCount: number;
  lastAccessTime: number;
}

/**
 * BM25インデックスのキャッシュマネージャー
 */
class BM25IndexCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number = 10; // 最大キャッシュ数
  private ttl: number = 30 * 60 * 1000; // 30分（ミリ秒）

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(
    collectionName: string,
    filters?: {
      organizationId?: string;
      entityType?: string;
      relationType?: string;
      topicSemanticCategory?: string;
    }
  ): string {
    const filterKey = filters
      ? JSON.stringify(filters)
      : 'all';
    return `${collectionName}:${filterKey}`;
  }

  /**
   * キャッシュからインデックスを取得
   */
  get(
    collectionName: string,
    filters?: {
      organizationId?: string;
      entityType?: string;
      relationType?: string;
      topicSemanticCategory?: string;
    }
  ): BM25Index | null {
    const key = this.getCacheKey(collectionName, filters);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTLチェック
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      console.log(`[BM25IndexCache] キャッシュが期限切れ: ${key}`);
      this.cache.delete(key);
      return null;
    }

    // 最終アクセス時刻を更新
    entry.lastAccessTime = now;
    console.log(`[BM25IndexCache] キャッシュから取得: ${key} (${entry.documentCount}件)`);
    return entry.index;
  }

  /**
   * キャッシュにインデックスを保存
   */
  set(
    collectionName: string,
    index: BM25Index,
    documentCount: number,
    filters?: {
      organizationId?: string;
      entityType?: string;
      relationType?: string;
      topicSemanticCategory?: string;
    }
  ): void {
    const key = this.getCacheKey(collectionName, filters);
    const now = Date.now();

    // キャッシュサイズ制限
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      index,
      timestamp: now,
      documentCount,
      lastAccessTime: now,
    });

    console.log(`[BM25IndexCache] キャッシュに保存: ${key} (${documentCount}件)`);
  }

  /**
   * 最も古いエントリを削除（LRU方式）
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessTime < oldestTime) {
        oldestTime = entry.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      console.log(`[BM25IndexCache] 最も古いキャッシュを削除: ${oldestKey}`);
      this.cache.delete(oldestKey);
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    console.log(`[BM25IndexCache] キャッシュをクリア (${this.cache.size}件)`);
    this.cache.clear();
  }

  /**
   * 期限切れのキャッシュを削除
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[BM25IndexCache] 期限切れキャッシュを削除: ${keysToDelete.length}件`);
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      key: string;
      documentCount: number;
      age: number;
      lastAccess: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      documentCount: entry.documentCount,
      age: now - entry.timestamp,
      lastAccess: now - entry.lastAccessTime,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries,
    };
  }

  /**
   * キャッシュ設定を更新
   */
  setConfig(config: { maxCacheSize?: number; ttl?: number }): void {
    if (config.maxCacheSize !== undefined) {
      this.maxCacheSize = config.maxCacheSize;
      // キャッシュサイズが減った場合は、古いエントリを削除
      while (this.cache.size > this.maxCacheSize) {
        this.evictOldest();
      }
    }
    if (config.ttl !== undefined) {
      this.ttl = config.ttl;
    }
  }
}

// シングルトンインスタンス
export const bm25IndexCache = new BM25IndexCache();

// 定期的にクリーンアップを実行（30分ごと）
if (typeof window !== 'undefined') {
  setInterval(() => {
    bm25IndexCache.cleanup();
  }, 30 * 60 * 1000); // 30分
}

