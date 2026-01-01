/**
 * ベクトル検索の抽象化レイヤー
 * Supabase（pgvector）専用
 */

import type { VectorSearchResult } from './vectorSearchSupabase';

/**
 * エンティティ埋め込みを保存
 */
export async function saveEntityEmbedding(
  entityId: string,
  organizationId: string,
  companyId: string | null,
  embedding: number[],
  metadata: {
    name?: string;
    type?: string;
    aliases?: any;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  // Supabase専用
  const { saveEntityEmbeddingToSupabase } = await import('./vectorSearchSupabase');
  await saveEntityEmbeddingToSupabase(
    entityId,
    organizationId,
    companyId,
    embedding,
    metadata
  );
}

/**
 * リレーション埋め込みを保存
 */
export async function saveRelationEmbedding(
  relationId: string,
  organizationId: string,
  companyId: string | null,
  embedding: number[],
  metadata: {
    topicId?: string;
    sourceEntityId?: string;
    targetEntityId?: string;
    relationType?: string;
    description?: string;
    confidence?: number;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  // Supabase専用
  const { saveRelationEmbeddingToSupabase } = await import('./vectorSearchSupabase');
  await saveRelationEmbeddingToSupabase(
    relationId,
    organizationId,
    companyId,
    embedding,
    metadata
  );
}

/**
 * トピック埋め込みを保存
 */
export async function saveTopicEmbedding(
  topicId: string,
  organizationId: string,
  companyId: string | null,
  embedding: number[],
  metadata: {
    meetingNoteId?: string;
    title?: string;
    content?: string;
    semanticCategory?: string;
    keywords?: string[];
    tags?: string[];
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  // Supabase専用
  const { saveTopicEmbeddingToSupabase } = await import('./vectorSearchSupabase');
  await saveTopicEmbeddingToSupabase(
    topicId,
    organizationId,
    companyId,
    embedding,
    metadata
  );
}

/**
 * システム設計ドキュメント埋め込みを保存
 */
export async function saveDesignDocEmbedding(
  sectionId: string,
  embedding: number[],
  metadata: {
    title?: string;
    content?: string;
    tags?: string[];
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  // Supabase専用
  const { saveDesignDocEmbeddingToSupabase } = await import('./vectorSearchSupabase');
  await saveDesignDocEmbeddingToSupabase(
    sectionId,
    embedding,
    metadata
  );
}

/**
 * エンティティの類似度検索
 */
export async function findSimilarEntities(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarEntitiesInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarEntitiesInSupabase(
    queryEmbedding,
    limit,
    organizationId,
    companyId
  );
}

/**
 * リレーションの類似度検索
 */
export async function findSimilarRelations(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarRelationsInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarRelationsInSupabase(
    queryEmbedding,
    limit,
    organizationId,
    companyId
  );
}

/**
 * トピックの類似度検索
 */
export async function findSimilarTopics(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarTopicsInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarTopicsInSupabase(
    queryEmbedding,
    limit,
    organizationId,
    companyId
  );
}

/**
 * システム設計ドキュメントの類似度検索
 */
export async function findSimilarDesignDocs(
  queryEmbedding: number[],
  limit: number
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarDesignDocsInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarDesignDocsInSupabase(
    queryEmbedding,
    limit
  );
}

/**
 * スタートアップの類似度検索
 */
export async function findSimilarStartups(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarStartupsInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarStartupsInSupabase(
    queryEmbedding,
    limit,
    organizationId,
    companyId
  );
}

/**
 * 注力施策の類似度検索
 */
export async function findSimilarFocusInitiatives(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarFocusInitiativesInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarFocusInitiativesInSupabase(
    queryEmbedding,
    limit,
    organizationId,
    companyId
  );
}

/**
 * 議事録の類似度検索
 */
export async function findSimilarMeetingNotes(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarMeetingNotesInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarMeetingNotesInSupabase(
    queryEmbedding,
    limit,
    organizationId,
    companyId
  );
}

/**
 * 制度の類似度検索
 */
export async function findSimilarRegulations(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null
): Promise<VectorSearchResult[]> {
  // Supabase専用
  const { findSimilarRegulationsInSupabase } = await import('./vectorSearchSupabase');
  return await findSimilarRegulationsInSupabase(
    queryEmbedding,
    limit,
    organizationId
  );
}

