/**
 * オフライン対応機能
 * ローカルキャッシュと保留中の書き込みキューを管理
 */

import { getDataSourceInstance } from './dataSource';

export class OfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfflineError';
  }
}

interface PendingWrite {
  table: string;
  id: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export class OfflineCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private pendingWrites: PendingWrite[] = [];
  private isOnline: boolean = true;
  private maxRetries: number = 3;

  constructor() {
    // オンライン/オフライン状態を監視
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncPendingWrites();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });

      // 初期状態を確認
      this.isOnline = navigator.onLine;
    }
  }

  /**
   * キャッシュキーを生成
   */
  private getCacheKey(table: string, id: string): string {
    return `${table}:${id}`;
  }

  /**
   * ドキュメントを取得（キャッシュ優先）
   */
  async get(table: string, id: string): Promise<any> {
    const cacheKey = this.getCacheKey(table, id);

    // 1. キャッシュから取得を試みる
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // キャッシュが5分以内の場合は使用
      const cacheAge = Date.now() - cached.timestamp;
      if (cacheAge < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    // 2. ネットワークから取得（オフライン時はエラー）
    if (!this.isOnline) {
      if (cached) {
        // キャッシュがある場合はそれを使用（古いデータでも）
        return cached.data;
      }
      throw new OfflineError('オフライン中です。キャッシュされたデータのみ利用可能です。');
    }

    try {
      const dataSource = getDataSourceInstance();
      const data = await dataSource.doc_get(table, id);

      // キャッシュを更新
      if (data) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return data;
    } catch (error: any) {
      // ネットワークエラーの場合、キャッシュがあれば使用
      if (cached) {
        console.warn('ネットワークエラーが発生しましたが、キャッシュされたデータを使用します。', error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * ドキュメントを設定（オフライン時はキューに追加）
   */
  async set(table: string, id: string, data: any): Promise<void> {
    const cacheKey = this.getCacheKey(table, id);

    // 1. キャッシュを更新
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // 2. ネットワークに書き込み（オフライン時はキューに追加）
    if (!this.isOnline) {
      this.pendingWrites.push({
        table,
        id,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      });
      throw new OfflineError('オフライン中です。接続回復後に同期されます。');
    }

    try {
      const dataSource = getDataSourceInstance();
      await dataSource.doc_set(table, id, data);
    } catch (error: any) {
      // ネットワークエラーの場合、キューに追加
      if (error.message?.includes('ネットワーク') || error.message?.includes('fetch')) {
        this.pendingWrites.push({
          table,
          id,
          data,
          timestamp: Date.now(),
          retryCount: 0,
        });
        throw new OfflineError('ネットワークエラーが発生しました。接続回復後に同期されます。');
      }
      throw error;
    }
  }

  /**
   * 保留中の書き込みを同期
   */
  async syncPendingWrites(): Promise<void> {
    if (!this.isOnline || this.pendingWrites.length === 0) {
      return;
    }

    const dataSource = getDataSourceInstance();
    const failedWrites: PendingWrite[] = [];

    for (const write of this.pendingWrites) {
      try {
        await dataSource.doc_set(write.table, write.id, write.data);
        console.log(`保留中の書き込みを同期しました: ${write.table}/${write.id}`);
      } catch (error: any) {
        write.retryCount++;
        if (write.retryCount < this.maxRetries) {
          failedWrites.push(write);
          console.warn(`書き込みの同期に失敗しました（リトライ ${write.retryCount}/${this.maxRetries}）:`, error);
        } else {
          console.error(`書き込みの同期に失敗しました（最大リトライ回数に達しました）:`, error);
        }
      }
    }

    this.pendingWrites = failedWrites;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 保留中の書き込みを取得
   */
  getPendingWrites(): PendingWrite[] {
    return [...this.pendingWrites];
  }

  /**
   * オンライン状態を取得
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }
}

// シングルトンインスタンス
let offlineCacheInstance: OfflineCache | null = null;

export function getOfflineCache(): OfflineCache {
  if (!offlineCacheInstance) {
    offlineCacheInstance = new OfflineCache();
  }
  return offlineCacheInstance;
}

