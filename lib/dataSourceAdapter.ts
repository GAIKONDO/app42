/**
 * DataSourceアダプター
 * 既存のlocalFirebase.tsのAPIをDataSourceインターフェースに統合
 */

import { getDataSourceInstance } from './dataSource';
import { getOfflineCache } from './offlineCache';
import { updateWithConflictResolution, ConflictResolutionStrategy } from './conflictResolution';

// オフラインキャッシュを使用するかどうか
const USE_OFFLINE_CACHE = process.env.NEXT_PUBLIC_USE_OFFLINE_CACHE === 'true';

// 競合解決を使用するかどうか
const USE_CONFLICT_RESOLUTION = process.env.NEXT_PUBLIC_USE_CONFLICT_RESOLUTION === 'true';

/**
 * DataSourceを使用してドキュメントを取得
 */
export async function getDocViaDataSource(collectionName: string, docId: string): Promise<any> {
  const dataSource = getDataSourceInstance();

  if (USE_OFFLINE_CACHE) {
    const offlineCache = getOfflineCache();
    return await offlineCache.get(collectionName, docId);
  }

  return await dataSource.doc_get(collectionName, docId);
}

/**
 * DataSourceを使用してドキュメントを設定
 */
export async function setDocViaDataSource(
  collectionName: string,
  docId: string,
  data: any
): Promise<void> {
  const dataSource = getDataSourceInstance();

  if (USE_OFFLINE_CACHE) {
    const offlineCache = getOfflineCache();
    return await offlineCache.set(collectionName, docId, data);
  }

  if (USE_CONFLICT_RESOLUTION && data.version !== undefined) {
    // 競合解決を使用
    await updateWithConflictResolution(collectionName, docId, data);
  } else {
    await dataSource.doc_set(collectionName, docId, data);
  }
}

/**
 * DataSourceを使用してドキュメントを更新
 */
export async function updateDocViaDataSource(
  collectionName: string,
  docId: string,
  data: any
): Promise<void> {
  const dataSource = getDataSourceInstance();

  if (USE_CONFLICT_RESOLUTION && data.version !== undefined) {
    // 競合解決を使用
    await updateWithConflictResolution(collectionName, docId, data);
  } else {
    await dataSource.doc_update(collectionName, docId, data);
  }
}

/**
 * DataSourceを使用してドキュメントを削除
 */
export async function deleteDocViaDataSource(collectionName: string, docId: string): Promise<void> {
  const dataSource = getDataSourceInstance();
  await dataSource.doc_delete(collectionName, docId);
}

/**
 * DataSourceを使用してコレクションを取得
 */
export async function getCollectionViaDataSource(
  collectionName: string,
  conditions?: any
): Promise<any[]> {
  const dataSource = getDataSourceInstance();
  return await dataSource.collection_get(collectionName, conditions);
}

/**
 * DataSourceを使用してコレクションに追加
 */
export async function addDocViaDataSource(
  collectionName: string,
  data: any
): Promise<string> {
  const dataSource = getDataSourceInstance();
  return await dataSource.collection_add(collectionName, data);
}

/**
 * DataSourceを使用してクエリを実行
 */
export async function queryGetViaDataSource(
  collectionName: string,
  conditions?: any
): Promise<any[]> {
  const dataSource = getDataSourceInstance();
  return await dataSource.query_get(collectionName, conditions);
}

