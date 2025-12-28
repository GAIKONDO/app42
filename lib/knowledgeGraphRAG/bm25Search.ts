/**
 * ナレッジグラフのBM25検索実装
 */

import { BM25Index, BM25SearchResult } from '@/lib/bm25Search';
import { callTauriCommand } from '@/lib/localFirebase';
import { bm25IndexCache } from './bm25IndexCache';

/**
 * エンティティのBM25検索結果
 */
export interface EntityBM25Result {
  entityId: string;
  bm25Score: number;
  matchedTerms: string[];
}

/**
 * リレーションのBM25検索結果
 */
export interface RelationBM25Result {
  relationId: string;
  bm25Score: number;
  matchedTerms: string[];
}

/**
 * トピックのBM25検索結果
 */
export interface TopicBM25Result {
  topicId: string;
  bm25Score: number;
  matchedTerms: string[];
}

/**
 * エンティティのBM25検索
 */
export async function searchEntitiesBM25(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    entityType?: string;
  }
): Promise<EntityBM25Result[]> {
  try {
    console.log('[searchEntitiesBM25] 検索開始:', { queryText, limit, filters });

    // SQLiteからエンティティデータを取得
    const conditions: any = {};
    if (filters?.organizationId) {
      conditions.organizationId = filters.organizationId;
    }
    if (filters?.entityType) {
      conditions.type = filters.entityType;
    }

    const entitiesResult = await callTauriCommand('query_get', {
      collectionName: 'entities',
      conditions,
    }) as Array<{ id: string; data: any }>;

    if (!entitiesResult || entitiesResult.length === 0) {
      console.log('[searchEntitiesBM25] エンティティが見つかりませんでした');
      return [];
    }

    console.log('[searchEntitiesBM25] 取得したエンティティ数:', entitiesResult.length);

    // キャッシュからインデックスを取得を試行
    let index = bm25IndexCache.get('entities', filters);
    
    if (!index) {
      // キャッシュにない場合は新規構築
      console.log('[searchEntitiesBM25] インデックスを新規構築中...');
      index = new BM25Index();
      const documents: Array<{ id: string; text: string }> = [];

    for (const entity of entitiesResult) {
      const entityData = entity.data;
      const entityId = entity.id || entityData.id;

      // 検索可能なテキストを構築
      const searchableText = buildEntitySearchableText(entityData);
      if (searchableText) {
        documents.push({ id: entityId, text: searchableText });
      }
    }

      if (documents.length === 0) {
        console.log('[searchEntitiesBM25] 検索可能なテキストがありません');
        return [];
      }

      index.addDocuments(documents);

      // キャッシュに保存
      bm25IndexCache.set('entities', index, documents.length, filters);
      console.log('[searchEntitiesBM25] インデックスをキャッシュに保存');
    } else {
      console.log('[searchEntitiesBM25] キャッシュからインデックスを取得');
    }

    // 検索実行
    const results = index.search(queryText, limit * 2); // フィルタリングで減る可能性があるため多めに取得

    console.log('[searchEntitiesBM25] BM25検索結果:', results.length, '件');

    // 結果を変換
    return results.map(r => ({
      entityId: r.id,
      bm25Score: r.score,
      matchedTerms: r.matchedTerms,
    }));
  } catch (error) {
    console.error('[searchEntitiesBM25] エラー:', error);
    return [];
  }
}

/**
 * リレーションのBM25検索
 */
export async function searchRelationsBM25(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    relationType?: string;
  }
): Promise<RelationBM25Result[]> {
  try {
    console.log('[searchRelationsBM25] 検索開始:', { queryText, limit, filters });

    // SQLiteからリレーションデータを取得
    const conditions: any = {};
    if (filters?.organizationId) {
      conditions.organizationId = filters.organizationId;
    }
    if (filters?.relationType) {
      conditions.relationType = filters.relationType;
    }

    const relationsResult = await callTauriCommand('query_get', {
      collectionName: 'relations',
      conditions,
    }) as Array<{ id: string; data: any }>;

    if (!relationsResult || relationsResult.length === 0) {
      console.log('[searchRelationsBM25] リレーションが見つかりませんでした');
      return [];
    }

    console.log('[searchRelationsBM25] 取得したリレーション数:', relationsResult.length);

    // キャッシュからインデックスを取得を試行
    let index = bm25IndexCache.get('relations', filters);
    
    if (!index) {
      // キャッシュにない場合は新規構築
      console.log('[searchRelationsBM25] インデックスを新規構築中...');
      index = new BM25Index();
      const documents: Array<{ id: string; text: string }> = [];

    for (const relation of relationsResult) {
      const relationData = relation.data;
      const relationId = relation.id || relationData.id;

      // 検索可能なテキストを構築
      const searchableText = buildRelationSearchableText(relationData);
      if (searchableText) {
        documents.push({ id: relationId, text: searchableText });
      }
    }

      if (documents.length === 0) {
        console.log('[searchRelationsBM25] 検索可能なテキストがありません');
        return [];
      }

      index.addDocuments(documents);

      // キャッシュに保存
      bm25IndexCache.set('relations', index, documents.length, filters);
      console.log('[searchRelationsBM25] インデックスをキャッシュに保存');
    } else {
      console.log('[searchRelationsBM25] キャッシュからインデックスを取得');
    }

    // 検索実行
    const results = index.search(queryText, limit * 2);

    console.log('[searchRelationsBM25] BM25検索結果:', results.length, '件');

    // 結果を変換
    return results.map(r => ({
      relationId: r.id,
      bm25Score: r.score,
      matchedTerms: r.matchedTerms,
    }));
  } catch (error) {
    console.error('[searchRelationsBM25] エラー:', error);
    return [];
  }
}

/**
 * トピックのBM25検索
 */
export async function searchTopicsBM25(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    topicSemanticCategory?: string;
  }
): Promise<TopicBM25Result[]> {
  try {
    console.log('[searchTopicsBM25] 検索開始:', { queryText, limit, filters });

    // SQLiteからトピックデータを取得
    const conditions: any = {};
    if (filters?.organizationId) {
      conditions.organizationId = filters.organizationId;
    }
    if (filters?.topicSemanticCategory) {
      conditions.semanticCategory = filters.topicSemanticCategory;
    }

    const topicsResult = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions,
    }) as Array<{ id: string; data: any }>;

    if (!topicsResult || topicsResult.length === 0) {
      console.log('[searchTopicsBM25] トピックが見つかりませんでした');
      return [];
    }

    console.log('[searchTopicsBM25] 取得したトピック数:', topicsResult.length);

    // キャッシュからインデックスを取得を試行
    let index = bm25IndexCache.get('topics', filters);
    
    if (!index) {
      // キャッシュにない場合は新規構築
      // トピック検索用にパラメータを調整（k1を大きくして、長文に適応）
      console.log('[searchTopicsBM25] インデックスを新規構築中...');
      index = new BM25Index({ k1: 2.0, b: 0.75 }); // k1を大きくして、長文でのマッチングを改善
      const documents: Array<{ id: string; text: string }> = [];

    for (const topic of topicsResult) {
      const topicData = topic.data;
      const topicId = topic.id || topicData.topicId || topicData.id;

      // 検索可能なテキストを構築
      const searchableText = buildTopicSearchableText(topicData);
      if (searchableText) {
        documents.push({ id: topicId, text: searchableText });
      }
    }

      if (documents.length === 0) {
        console.log('[searchTopicsBM25] 検索可能なテキストがありません');
        return [];
      }

      index.addDocuments(documents);

      // キャッシュに保存
      bm25IndexCache.set('topics', index, documents.length, filters);
      console.log('[searchTopicsBM25] インデックスをキャッシュに保存');
    } else {
      console.log('[searchTopicsBM25] キャッシュからインデックスを取得');
    }

    // 検索実行
    const results = index.search(queryText, limit * 2);

    console.log('[searchTopicsBM25] BM25検索結果:', results.length, '件');

    // 結果を変換
    return results.map(r => ({
      topicId: r.id,
      bm25Score: r.score,
      matchedTerms: r.matchedTerms,
    }));
  } catch (error) {
    console.error('[searchTopicsBM25] エラー:', error);
    return [];
  }
}

/**
 * エンティティの検索可能なテキストを構築
 */
function buildEntitySearchableText(entity: any): string {
  const parts: string[] = [];

  // エンティティ名
  if (entity.name) {
    parts.push(entity.name);
  }

  // エイリアス
  if (entity.aliases && Array.isArray(entity.aliases)) {
    parts.push(...entity.aliases);
  } else if (typeof entity.aliases === 'string') {
    try {
      const aliases = JSON.parse(entity.aliases);
      if (Array.isArray(aliases)) {
        parts.push(...aliases);
      }
    } catch {
      // パースエラーは無視
    }
  }

  // searchableTextが既に存在する場合は使用
  if (entity.searchableText) {
    parts.push(entity.searchableText);
  }

  // メタデータからキーワードを抽出
  if (entity.metadata && typeof entity.metadata === 'object') {
    const metadataStr = JSON.stringify(entity.metadata);
    parts.push(metadataStr);
  }

  return parts.join(' ').trim();
}

/**
 * リレーションの検索可能なテキストを構築
 */
function buildRelationSearchableText(relation: any): string {
  const parts: string[] = [];

  // リレーションタイプ
  if (relation.relationType) {
    parts.push(relation.relationType);
  } else if (relation.type) {
    parts.push(relation.type);
  }

  // 説明
  if (relation.description) {
    parts.push(relation.description);
  }

  // searchableTextが既に存在する場合は使用
  if (relation.searchableText) {
    parts.push(relation.searchableText);
  }

  // メタデータからキーワードを抽出
  if (relation.metadata && typeof relation.metadata === 'object') {
    const metadataStr = JSON.stringify(relation.metadata);
    parts.push(metadataStr);
  }

  return parts.join(' ').trim();
}

/**
 * トピックの検索可能なテキストを構築
 * トピック検索を改善するため、より多くのコンテンツを含める
 */
function buildTopicSearchableText(topic: any): string {
  const parts: string[] = [];

  // タイトル（重要度: 高）
  if (topic.title) {
    // タイトルを3回繰り返して重みを上げる
    parts.push(topic.title, topic.title, topic.title);
  }

  // 説明
  if (topic.description) {
    parts.push(topic.description);
  }

  // コンテンツ（最初の500文字に拡張、トピックは長文が多いため）
  if (topic.content) {
    const contentPreview = typeof topic.content === 'string' 
      ? topic.content.substring(0, 500)
      : String(topic.content).substring(0, 500);
    parts.push(contentPreview);
  }

  // contentSummaryも使用
  if (topic.contentSummary) {
    parts.push(topic.contentSummary);
  }

  // キーワード（重要度: 高）
  if (topic.keywords) {
    if (Array.isArray(topic.keywords)) {
      // キーワードを2回繰り返して重みを上げる
      parts.push(...topic.keywords, ...topic.keywords);
    } else if (typeof topic.keywords === 'string') {
      try {
        const keywords = JSON.parse(topic.keywords);
        if (Array.isArray(keywords)) {
          parts.push(...keywords, ...keywords);
        } else {
          parts.push(topic.keywords, topic.keywords);
        }
      } catch {
        parts.push(topic.keywords, topic.keywords);
      }
    }
  }

  // タグ
  if (topic.tags) {
    if (Array.isArray(topic.tags)) {
      parts.push(...topic.tags);
    } else if (typeof topic.tags === 'string') {
      try {
        const tags = JSON.parse(topic.tags);
        if (Array.isArray(tags)) {
          parts.push(...tags);
        } else {
          parts.push(topic.tags);
        }
      } catch {
        parts.push(topic.tags);
      }
    }
  }

  // searchableTextが既に存在する場合は使用（重複を避けるため最後に追加）
  if (topic.searchableText) {
    // searchableTextに含まれていない部分のみ追加
    const existingText = parts.join(' ').toLowerCase();
    const searchableTextLower = topic.searchableText.toLowerCase();
    if (!existingText.includes(searchableTextLower) && !searchableTextLower.includes(existingText)) {
      parts.push(topic.searchableText);
    }
  }

  return parts.join(' ').trim();
}

