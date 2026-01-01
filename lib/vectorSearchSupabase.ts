/**
 * Supabase（pgvector）を使用したベクトル検索関数
 * ChromaDBからSupabaseへの移行用
 */

import { getSupabaseClient } from './utils/supabaseClient';

/**
 * ベクトル類似度検索結果
 */
export interface VectorSearchResult {
  id: string;
  similarity: number; // コサイン類似度（0-1）
  meetingNoteId?: string | null; // トピック検索の場合のみ使用
}

/**
 * エンティティ埋め込みベクトルを保存
 */
export async function saveEntityEmbeddingToSupabase(
  entityId: string,
  organizationId: string | null,
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
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  // pgvectorは配列形式で直接受け取ることができます
  // SupabaseのPostgRESTが自動的にvector型に変換します

  const { error } = await supabase
    .from('entity_embeddings')
    .upsert({
      id: entityId,
      entity_id: entityId,
      organization_id: organizationId,
      company_id: companyId,
      embedding: embedding, // 配列形式で直接渡す
      embedding_dimension: embeddingDimension,
      name: metadata.name,
      type: metadata.type,
      aliases: metadata.aliases ? JSON.stringify(metadata.aliases) : null,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`エンティティ埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * リレーション埋め込みベクトルを保存
 */
export async function saveRelationEmbeddingToSupabase(
  relationId: string,
  organizationId: string | null,
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
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  // upsertを使用（onConflictでidを指定して重複を防止）
  // 注意: Supabaseのupsertは、onConflictで指定されたカラムが一致する場合に更新します
  const { error } = await supabase
    .from('relation_embeddings')
    .upsert({
      id: relationId,
      relation_id: relationId,
      organization_id: organizationId,
      company_id: companyId,
      topic_id: metadata.topicId,
      source_entity_id: metadata.sourceEntityId,
      target_entity_id: metadata.targetEntityId,
      embedding: embedding, // 配列形式で直接渡す
      embedding_dimension: embeddingDimension,
      relation_type: metadata.relationType,
      description: metadata.description,
      confidence: metadata.confidence,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id', // 主キーで重複チェック
      ignoreDuplicates: false, // 重複時は更新（false = 更新、true = 無視）
    });

  if (error) {
    throw new Error(`リレーション埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * トピック埋め込みベクトルを保存
 */
export async function saveTopicEmbeddingToSupabase(
  embeddingId: string, // idカラムに保存される値（embeddingId形式: ${meetingNoteId}-topic-${topicId}）
  organizationId: string | null,
  companyId: string | null,
  embedding: number[],
  metadata: {
    topicId?: string; // 実際のトピックID（topics.topicIdと一致する値）
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
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  // topic_idには実際のトピックIDを保存（topics.topicIdと一致させる）
  const actualTopicId = metadata.topicId || embeddingId;
  
  // embeddingIdが${meetingNoteId}-topic-${topicId}形式の場合、topicIdを抽出
  // 例: "meeting_mjsp3hq3_om2btou2x-topic-init_mjsp5876_l384y39dn" -> "init_mjsp5876_l384y39dn"
  let extractedTopicId = actualTopicId;
  if (embeddingId.includes('-topic-')) {
    const parts = embeddingId.split('-topic-');
    if (parts.length > 1) {
      extractedTopicId = parts[1];
    }
  }

  console.log('💾 [saveTopicEmbeddingToSupabase] 開始:', {
    embeddingId,
    actualTopicId: extractedTopicId,
    organizationId,
    companyId,
    embeddingDimension,
    hasMeetingNoteId: !!metadata.meetingNoteId,
    hasTitle: !!metadata.title,
    hasContent: !!metadata.content,
  });

  const { error } = await supabase
    .from('topic_embeddings')
    .upsert({
      id: embeddingId, // idカラムにはembeddingIdを保存
      topic_id: extractedTopicId, // topic_idカラムには実際のトピックIDを保存（topics.topicIdと一致）
      organization_id: organizationId,
      company_id: companyId,
      meeting_note_id: metadata.meetingNoteId,
      embedding: embedding, // 配列形式で直接渡す
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      content: metadata.content,
      semantic_category: metadata.semanticCategory,
      keywords: metadata.keywords ? JSON.stringify(metadata.keywords) : null,
      tags: metadata.tags ? JSON.stringify(metadata.tags) : null,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    console.error('❌ [saveTopicEmbeddingToSupabase] エラー:', {
      embeddingId,
      actualTopicId: extractedTopicId,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`トピック埋め込みの保存に失敗しました: ${error.message}`);
  }
  
  console.log('✅ [saveTopicEmbeddingToSupabase] 成功:', { embeddingId, actualTopicId: extractedTopicId });
}

/**
 * スタートアップ埋め込みベクトルを保存
 */
export async function saveStartupEmbeddingToSupabase(
  startupId: string,
  organizationId: string | null,
  companyId: string | null,
  embedding: number[],
  metadata: {
    title?: string;
    description?: string;
    content?: string;
    objective?: string;
    evaluation?: string;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { error } = await supabase
    .from('startup_embeddings')
    .upsert({
      id: startupId,
      startup_id: startupId,
      organization_id: organizationId,
      company_id: companyId,
      embedding: embedding,
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      description: metadata.description,
      content: metadata.content,
      objective: metadata.objective,
      evaluation: metadata.evaluation,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`スタートアップ埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 議事録埋め込みベクトルを保存
 */
export async function saveMeetingNoteEmbeddingToSupabase(
  meetingNoteId: string,
  organizationId: string | null,
  companyId: string | null,
  embedding: number[],
  metadata: {
    title?: string;
    description?: string;
    content?: string;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { error } = await supabase
    .from('meeting_note_embeddings')
    .upsert({
      id: meetingNoteId,
      meeting_note_id: meetingNoteId,
      organization_id: organizationId,
      company_id: companyId,
      embedding: embedding,
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      description: metadata.description,
      content: metadata.content,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`議事録埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 注力施策埋め込みベクトルを保存
 */
export async function saveFocusInitiativeEmbeddingToSupabase(
  focusInitiativeId: string,
  organizationId: string | null,
  companyId: string | null,
  embedding: number[],
  metadata: {
    title?: string;
    description?: string;
    content?: string;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { error } = await supabase
    .from('focus_initiative_embeddings')
    .upsert({
      id: focusInitiativeId,
      focus_initiative_id: focusInitiativeId,
      organization_id: organizationId,
      company_id: companyId,
      embedding: embedding,
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      description: metadata.description,
      content: metadata.content,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`注力施策埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 制度埋め込みベクトルを保存
 */
export async function saveRegulationEmbeddingToSupabase(
  regulationId: string,
  organizationId: string,
  embedding: number[],
  metadata: {
    title?: string;
    description?: string;
    content?: string;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { error } = await supabase
    .from('regulation_embeddings')
    .upsert({
      id: regulationId,
      regulation_id: regulationId,
      organization_id: organizationId,
      embedding: embedding,
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      description: metadata.description,
      content: metadata.content,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`制度埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 議事録アイテム埋め込みベクトルを保存
 */
export async function saveMeetingNoteItemEmbeddingToSupabase(
  meetingNoteId: string,
  itemId: string,
  organizationId: string | null,
  companyId: string | null,
  embedding: number[],
  metadata: {
    title?: string;
    content?: string;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const id = `${meetingNoteId}-item-${itemId}`;

  const { error } = await supabase
    .from('meeting_note_item_embeddings')
    .upsert({
      id: id,
      meeting_note_id: meetingNoteId,
      item_id: itemId,
      organization_id: organizationId,
      company_id: companyId,
      embedding: embedding,
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      content: metadata.content,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`議事録アイテム埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * 制度アイテム埋め込みベクトルを保存
 */
export async function saveRegulationItemEmbeddingToSupabase(
  regulationId: string,
  itemId: string,
  organizationId: string,
  embedding: number[],
  metadata: {
    title?: string;
    content?: string;
    metadata?: any;
    embeddingModel?: string;
    embeddingVersion?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const id = `${regulationId}-item-${itemId}`;

  const { error } = await supabase
    .from('regulation_item_embeddings')
    .upsert({
      id: id,
      regulation_id: regulationId,
      item_id: itemId,
      organization_id: organizationId,
      embedding: embedding,
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      content: metadata.content,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`制度アイテム埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * システム設計ドキュメント埋め込みベクトルを保存
 */
export async function saveDesignDocEmbeddingToSupabase(
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
  const supabase = getSupabaseClient();
  
  const embeddingDimension = embedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { error } = await supabase
    .from('design_doc_embeddings')
    .upsert({
      id: sectionId,
      section_id: sectionId,
      embedding: embedding, // 配列形式で直接渡す
      embedding_dimension: embeddingDimension,
      title: metadata.title,
      content: metadata.content,
      tags: metadata.tags ? JSON.stringify(metadata.tags) : null,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      embedding_model: metadata.embeddingModel || 'text-embedding-3-small',
      embedding_version: metadata.embeddingVersion || '1.0',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw new Error(`システム設計ドキュメント埋め込みの保存に失敗しました: ${error.message}`);
  }
}

/**
 * エンティティの類似度検索（pgvector使用）
 * 
 * @param queryEmbedding クエリの埋め込みベクトル
 * @param limit 返却する最大件数
 * @param organizationId 組織ID（オプション、指定時はその組織のみ検索）
 * @param companyId 会社ID（オプション、指定時はその会社のみ検索）
 * @returns 類似度の高い順にソートされたエンティティIDと類似度のリスト
 */
export async function findSimilarEntitiesInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  // RPC関数を使用してベクトル検索を実行
  // 1536次元と768次元で異なる関数を使用
  const functionName = embeddingDimension === 768 
    ? 'find_similar_entities_768' 
    : 'find_similar_entities';

  // pgvectorのRPC関数には配列形式で直接渡す
  // PostgreSQLのvector型に自動変換されます
  const { data, error } = await supabase.rpc(functionName, {
    query_embedding: queryEmbedding, // 配列形式で直接渡す
    match_threshold: 0.0, // 類似度の閾値（0-1）
    match_count: limit,
    organization_id_filter: organizationId || null,
    company_id_filter: companyId || null,
  });

  if (error) {
    // RPC関数が存在しない場合、直接SQLクエリを実行
    // 注意: これはSupabaseの制限により、クライアント側からは直接実行できない場合があります
    // その場合は、エッジ関数またはサーバーサイドで実行する必要があります
    throw new Error(`エンティティ類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // 結果をVectorSearchResult形式に変換
  return data.map((item: any) => ({
    id: item.entity_id || item.id,
    similarity: item.similarity || 0,
  }));
}

/**
 * リレーションの類似度検索
 */
export async function findSimilarRelationsInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;

  const { data, error } = await supabase.rpc('find_similar_relations', {
    query_embedding: queryEmbedding, // 配列形式で直接渡す
    match_threshold: 0.0,
    match_count: limit,
    organization_id_filter: organizationId || null,
    company_id_filter: companyId || null,
  });

  if (error) {
    throw new Error(`リレーション類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.relation_id || item.id,
    similarity: item.similarity || 0,
  }));
}

/**
 * トピックの類似度検索
 */
export async function findSimilarTopicsInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;

  const { data, error } = await supabase.rpc('find_similar_topics', {
    query_embedding: queryEmbedding, // 配列形式で直接渡す
    match_threshold: 0.0,
    match_count: limit,
    organization_id_filter: organizationId || null,
    company_id_filter: companyId || null,
  });

  if (error) {
    throw new Error(`トピック類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // topic_idとmeeting_note_idを返す（searchTopics.tsで使用するため）
  return data.map((item: any) => ({
    id: item.topic_id || item.id, // 実際のトピックID
    similarity: item.similarity || 0,
    meetingNoteId: item.meeting_note_id || null, // meeting_note_idも含める
  }));
}

/**
 * システム設計ドキュメントの類似度検索
 */
export async function findSimilarDesignDocsInSupabase(
  queryEmbedding: number[],
  limit: number
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;

  const { data, error } = await supabase.rpc('find_similar_design_docs', {
    query_embedding: queryEmbedding, // 配列形式で直接渡す
    match_threshold: 0.0,
    match_count: limit,
  });

  if (error) {
    throw new Error(`システム設計ドキュメント類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.section_id || item.id,
    similarity: item.similarity || 0,
  }));
}

/**
 * スタートアップの類似度検索
 */
export async function findSimilarStartupsInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { data, error } = await supabase.rpc('find_similar_startups', {
    query_embedding: queryEmbedding,
    match_threshold: 0.0,
    match_count: limit,
    organization_id_filter: organizationId || null,
    company_id_filter: companyId || null,
  });

  if (error) {
    throw new Error(`スタートアップ類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.startup_id || item.id,
    similarity: item.similarity || 0,
  }));
}

/**
 * 注力施策の類似度検索
 */
export async function findSimilarFocusInitiativesInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { data, error } = await supabase.rpc('find_similar_focus_initiatives', {
    query_embedding: queryEmbedding,
    match_threshold: 0.0,
    match_count: limit,
    organization_id_filter: organizationId || null,
    company_id_filter: companyId || null,
  });

  if (error) {
    throw new Error(`注力施策類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.focus_initiative_id || item.id,
    similarity: item.similarity || 0,
  }));
}

/**
 * 議事録の類似度検索
 */
export async function findSimilarMeetingNotesInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null,
  companyId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { data, error } = await supabase.rpc('find_similar_meeting_notes', {
    query_embedding: queryEmbedding,
    match_threshold: 0.0,
    match_count: limit,
    organization_id_filter: organizationId || null,
    company_id_filter: companyId || null,
  });

  if (error) {
    throw new Error(`議事録類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.meeting_note_id || item.id,
    similarity: item.similarity || 0,
  }));
}

/**
 * 制度の類似度検索
 */
export async function findSimilarRegulationsInSupabase(
  queryEmbedding: number[],
  limit: number,
  organizationId?: string | null
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  
  const embeddingDimension = queryEmbedding.length;
  if (embeddingDimension !== 768 && embeddingDimension !== 1536) {
    throw new Error(`サポートされていない埋め込み次元数: ${embeddingDimension}`);
  }

  const { data, error } = await supabase.rpc('find_similar_regulations', {
    query_embedding: queryEmbedding,
    match_threshold: 0.0,
    match_count: limit,
    organization_id_filter: organizationId || null,
  });

  if (error) {
    throw new Error(`制度類似度検索に失敗しました: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.regulation_id || item.id,
    similarity: item.similarity || 0,
  }));
}

