/**
 * ベクトル検索の抽象化レイヤー
 * ChromaDBとSupabase（pgvector）を透過的に使用できるようにする
 */

import { getVectorSearchBackend } from './vectorSearchConfig';
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { saveEntityEmbeddingToSupabase } = await import('./vectorSearchSupabase');
    await saveEntityEmbeddingToSupabase(
      entityId,
      organizationId,
      companyId,
      embedding,
      metadata
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    await callTauriCommand('chromadb_save_entity_embedding', {
      entityId,
      organizationId,
      combinedEmbedding: embedding,
      metadata: {
        ...metadata,
        entityId,
        organizationId,
        companyId: companyId || '',
        aliases: metadata.aliases ? JSON.stringify(metadata.aliases) : '',
        metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : '',
      },
    });
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { saveRelationEmbeddingToSupabase } = await import('./vectorSearchSupabase');
    await saveRelationEmbeddingToSupabase(
      relationId,
      organizationId,
      companyId,
      embedding,
      metadata
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    await callTauriCommand('chromadb_save_relation_embedding', {
      relationId,
      organizationId,
      combinedEmbedding: embedding,
      metadata: {
        ...metadata,
        relationId,
        organizationId,
        companyId: companyId || '',
        metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : '',
      },
    });
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { saveTopicEmbeddingToSupabase } = await import('./vectorSearchSupabase');
    await saveTopicEmbeddingToSupabase(
      topicId,
      organizationId,
      companyId,
      embedding,
      metadata
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    await callTauriCommand('chromadb_save_topic_embedding', {
      topicId,
      organizationId,
      combinedEmbedding: embedding,
      metadata: {
        ...metadata,
        topicId,
        organizationId,
        companyId: companyId || '',
        keywords: metadata.keywords ? JSON.stringify(metadata.keywords) : '',
        tags: metadata.tags ? JSON.stringify(metadata.tags) : '',
        metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : '',
      },
    });
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { saveDesignDocEmbeddingToSupabase } = await import('./vectorSearchSupabase');
    await saveDesignDocEmbeddingToSupabase(
      sectionId,
      embedding,
      metadata
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    await callTauriCommand('chromadb_save_design_doc_embedding', {
      sectionId,
      combinedEmbedding: embedding,
      metadata: {
        ...metadata,
        sectionId,
        tags: metadata.tags ? JSON.stringify(metadata.tags) : '',
        metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : '',
      },
    });
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarEntitiesInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarEntitiesInSupabase(
      queryEmbedding,
      limit,
      organizationId,
      companyId
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    const results = await callTauriCommand<Array<[string, number]>>('chromadb_find_similar_entities', {
      queryEmbedding,
      limit,
      organizationId: organizationId || null,
    });

    // ChromaDBの結果形式をVectorSearchResultに変換
    return results.map(([id, similarity]) => ({
      id,
      similarity,
    }));
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarRelationsInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarRelationsInSupabase(
      queryEmbedding,
      limit,
      organizationId,
      companyId
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    const results = await callTauriCommand<Array<[string, number]>>('chromadb_find_similar_relations', {
      queryEmbedding,
      limit,
      organizationId: organizationId || null,
    });

    return results.map(([id, similarity]) => ({
      id,
      similarity,
    }));
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarTopicsInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarTopicsInSupabase(
      queryEmbedding,
      limit,
      organizationId,
      companyId
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    const results = await callTauriCommand<Array<[string, number]>>('chromadb_find_similar_topics', {
      queryEmbedding,
      limit,
      organizationId: organizationId || null,
    });

    return results.map(([id, similarity]) => ({
      id,
      similarity,
    }));
  }
}

/**
 * システム設計ドキュメントの類似度検索
 */
export async function findSimilarDesignDocs(
  queryEmbedding: number[],
  limit: number
): Promise<VectorSearchResult[]> {
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarDesignDocsInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarDesignDocsInSupabase(
      queryEmbedding,
      limit
    );
  } else {
    // ChromaDBを使用
    const { callTauriCommand } = await import('./localFirebase');
    const results = await callTauriCommand<Array<[string, number]>>('chromadb_find_similar_design_docs', {
      queryEmbedding,
      limit,
    });

    return results.map(([id, similarity]) => ({
      id,
      similarity,
    }));
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarStartupsInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarStartupsInSupabase(
      queryEmbedding,
      limit,
      organizationId,
      companyId
    );
  } else {
    // ChromaDBは未実装（スタートアップ検索はSupabaseのみ）
    console.warn('[findSimilarStartups] ChromaDBは未実装です。Supabaseを使用してください。');
    return [];
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarFocusInitiativesInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarFocusInitiativesInSupabase(
      queryEmbedding,
      limit,
      organizationId,
      companyId
    );
  } else {
    // ChromaDBは未実装
    console.warn('[findSimilarFocusInitiatives] ChromaDBは未実装です。Supabaseを使用してください。');
    return [];
  }
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
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarMeetingNotesInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarMeetingNotesInSupabase(
      queryEmbedding,
      limit,
      organizationId,
      companyId
    );
  } else {
    // ChromaDBは未実装
    console.warn('[findSimilarMeetingNotes] ChromaDBは未実装です。Supabaseを使用してください。');
    return [];
  }
}

/**
 * 制度の類似度検索
 */
export async function findSimilarRegulations(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null
): Promise<VectorSearchResult[]> {
  const backend = getVectorSearchBackend();

  if (backend === 'supabase') {
    const { findSimilarRegulationsInSupabase } = await import('./vectorSearchSupabase');
    return await findSimilarRegulationsInSupabase(
      queryEmbedding,
      limit,
      organizationId
    );
  } else {
    // ChromaDBは未実装
    console.warn('[findSimilarRegulations] ChromaDBは未実装です。Supabaseを使用してください。');
    return [];
  }
}

