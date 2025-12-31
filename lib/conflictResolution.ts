/**
 * 競合解決機能
 * 楽観的ロックとバージョン管理を使用して競合を解決
 */

import { getDataSourceInstance } from './dataSource';

export interface Document {
  id: string;
  version?: number;
  updatedAt?: string;
  [key: string]: any;
}

export class ConflictError extends Error {
  constructor(message: string, public currentVersion?: number, public serverVersion?: number) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * バージョン管理付きでドキュメントを更新
 * 楽観的ロックを使用して競合を検出
 */
export async function updateWithConflictResolution(
  table: string,
  id: string,
  updates: Partial<Document>
): Promise<Document> {
  const dataSource = getDataSourceInstance();

  // 1. 現在のドキュメントを取得
  const current = await dataSource.doc_get(table, id);

  if (!current) {
    throw new Error(`ドキュメントが見つかりません: ${table}/${id}`);
  }

  // 2. バージョンチェック
  const currentVersion = current.version || 0;
  const updateVersion = updates.version;

  if (updateVersion !== undefined && updateVersion !== currentVersion) {
    throw new ConflictError(
      'ドキュメントが他のユーザーによって更新されました。最新のデータを取得してから再度お試しください。',
      currentVersion,
      updateVersion
    );
  }

  // 3. 更新（バージョンをインクリメント）
  const updated = {
    ...updates,
    version: currentVersion + 1,
    updatedAt: new Date().toISOString(),
  };

  await dataSource.doc_update(table, id, updated);

  // 4. 更新後のドキュメントを取得して返す
  const result = await dataSource.doc_get(table, id);
  return result as Document;
}

/**
 * 最後の書き込みが優先（Last Write Wins）
 * タイムスタンプベースの競合解決
 */
export async function updateWithLWW(
  table: string,
  id: string,
  updates: Partial<Document>
): Promise<Document> {
  const dataSource = getDataSourceInstance();

  // 1. 現在のドキュメントを取得
  const current = await dataSource.doc_get(table, id);

  if (!current) {
    // ドキュメントが存在しない場合は新規作成
    const now = new Date().toISOString();
    const newDoc = {
      ...updates,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await dataSource.doc_set(table, id, newDoc);
    return newDoc as Document;
  }

  // 2. タイムスタンプを比較
  const currentUpdatedAt = current.updatedAt ? new Date(current.updatedAt).getTime() : 0;
  const updateUpdatedAt = updates.updatedAt ? new Date(updates.updatedAt).getTime() : Date.now();

  // サーバーの方が新しい場合は、サーバーのデータを優先
  if (currentUpdatedAt > updateUpdatedAt) {
    console.warn(
      `競合が検出されましたが、サーバーのデータが新しいため、サーバーのデータを優先します。`,
      { table, id, currentUpdatedAt, updateUpdatedAt }
    );
    return current as Document;
  }

  // 3. 更新
  const now = new Date().toISOString();
  const updated = {
    ...updates,
    updatedAt: now,
  };

  await dataSource.doc_update(table, id, updated);

  // 4. 更新後のドキュメントを取得して返す
  const result = await dataSource.doc_get(table, id);
  return result as Document;
}

/**
 * 競合解決戦略
 */
export enum ConflictResolutionStrategy {
  OptimisticLocking = 'optimistic_locking',
  LastWriteWins = 'last_write_wins',
}

/**
 * 設定に基づいて競合解決を実行
 */
export async function resolveConflict(
  table: string,
  id: string,
  updates: Partial<Document>,
  strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.OptimisticLocking
): Promise<Document> {
  switch (strategy) {
    case ConflictResolutionStrategy.OptimisticLocking:
      return updateWithConflictResolution(table, id, updates);
    case ConflictResolutionStrategy.LastWriteWins:
      return updateWithLWW(table, id, updates);
    default:
      throw new Error(`未知の競合解決戦略: ${strategy}`);
  }
}

