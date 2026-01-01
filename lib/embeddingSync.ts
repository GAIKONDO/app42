/**
 * SupabaseとChromaDBの埋め込みデータを比較・同期する機能
 */

import { getEntitiesByIds, getAllEntities } from './entityApi';
import { getRelationsByIds, getAllRelations } from './relationApi';
import { getTopicsByIds } from './topicApi';
// Supabaseに移行済みのため、ChromaDBからの取得は不要
import { saveEntityEmbeddingAsync } from './entityEmbeddings';
import { saveRelationEmbeddingAsync } from './relationEmbeddings';
import { saveTopicEmbedding } from './topicEmbeddings';
import { getCollectionViaDataSource } from './dataSourceAdapter';
import type { Entity } from '@/types/entity';
import type { Relation } from '@/types/relation';

/**
 * エンティティの埋め込み同期結果
 */
export interface EntitySyncResult {
  totalInSupabase: number;
  totalInChromaDB: number;
  missingInChromaDB: string[]; // SupabaseにはあるがChromaDBにないエンティティID
  extraInChromaDB: string[]; // ChromaDBにはあるがSupabaseにないエンティティID
  synced: number;
  errors: number;
}

/**
 * リレーションの埋め込み同期結果
 */
export interface RelationSyncResult {
  totalInSupabase: number;
  totalInChromaDB: number;
  missingInChromaDB: string[]; // SupabaseにはあるがChromaDBにないリレーションID
  extraInChromaDB: string[]; // ChromaDBにはあるがSupabaseにないリレーションID
  synced: number;
  errors: number;
}

/**
 * トピックの埋め込み同期結果
 */
export interface TopicSyncResult {
  totalInSupabase: number;
  totalInChromaDB: number;
  missingInChromaDB: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string }>; // SupabaseにはあるがChromaDBにないトピック
  extraInChromaDB: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string }>; // ChromaDBにはあるがSupabaseにないトピック
  synced: number;
  errors: number;
}

/**
 * エンティティの埋め込みをSupabaseとChromaDBで比較
 */
export async function compareEntityEmbeddings(
  organizationId: string
): Promise<EntitySyncResult> {
  // Entity型をインポート
  type Entity = {
    id: string;
    name: string;
    organizationId: string | null;
    [key: string]: any;
  };
  try {
    console.log(`[compareEntityEmbeddings] 比較開始: organizationId=${organizationId}`);

    // 1. まずSupabaseからエンティティ一覧を取得して全数を確認
    // リスト表示と同じ方法を使用（getEntitiesByOrganizationId）
    console.log(`[compareEntityEmbeddings] ステップ1: Supabaseからエンティティ一覧を取得... organizationId=${organizationId}`);
    let supabaseEntities: Entity[] = [];
    try {
      const { getEntitiesByOrganizationId } = await import('./entityApi');
      console.log(`[compareEntityEmbeddings] getEntitiesByOrganizationIdを呼び出し中...`);
      supabaseEntities = await getEntitiesByOrganizationId(organizationId);
      console.log(`[compareEntityEmbeddings] ✅ Supabaseから取得したエンティティ数: ${supabaseEntities.length}件`);
      
      if (supabaseEntities.length > 0) {
        console.log(`[compareEntityEmbeddings] サンプルエンティティ:`, {
          id: supabaseEntities[0].id,
          name: supabaseEntities[0].name,
          organizationId: supabaseEntities[0].organizationId,
        });
      } else {
        console.warn(`[compareEntityEmbeddings] ⚠️ エンティティが0件です。organizationId=${organizationId}でフィルタリングした結果が空です。`);
      }
    } catch (error) {
      console.error(`[compareEntityEmbeddings] ❌ Supabaseからのデータ取得エラー:`, error);
      console.error(`[compareEntityEmbeddings] エラーの詳細:`, error instanceof Error ? error.stack : String(error));
      throw new Error(`Supabaseからのエンティティ取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (supabaseEntities.length === 0) {
      console.warn(`[compareEntityEmbeddings] ⚠️ Supabaseにエンティティが存在しません (organizationId: ${organizationId})`);
      return {
        totalInSupabase: 0,
        totalInChromaDB: 0,
        missingInChromaDB: [],
        extraInChromaDB: [],
        synced: 0,
        errors: 0,
      };
    }

    // サンプルデータをログ出力
    console.log(`[compareEntityEmbeddings] サンプルデータ（最初の3件）:`, supabaseEntities.slice(0, 3).map(e => ({
      id: e.id,
      organizationId: e.organizationId,
      name: e.name,
    })));

    // IDを抽出
    const supabaseEntityIds = new Set(supabaseEntities.map(e => e.id));

    console.log(`[compareEntityEmbeddings] ✅ Supabaseのエンティティ全数: ${supabaseEntityIds.size}件`);

    // 2. ChromaDBから埋め込みが存在するエンティティIDを取得
    // ChromaDBのコレクションから全件取得する方法がないため、
    // SupabaseのエンティティIDを順にチェック
    const chromaEntityIds = new Set<string>();
    const missingInChromaDB: string[] = [];
    const extraInChromaDB: string[] = [];

    // 2. その後、ChromaDBと比較して未生成対象を確認
    console.log(`[compareEntityEmbeddings] ChromaDBとの比較を開始...`);
    let checkedCount = 0;
    
    // Supabaseの各エンティティについて、ChromaDBに埋め込みがあるか確認
    for (const entityId of supabaseEntityIds) {
      checkedCount++;
      if (checkedCount % 10 === 0) {
        console.log(`[compareEntityEmbeddings] 進捗: ${checkedCount}/${supabaseEntityIds.size}件を確認中...`);
      }
      
      // Supabaseに移行済みのため、ChromaDB確認は不要
      // Supabaseから直接確認
      try {
        const { getSupabaseClient } = await import('./utils/supabaseClient');
        const supabase = getSupabaseClient();
        const { data: existing } = await supabase
          .from('entity_embeddings')
          .select('id')
          .eq('id', entityId)
          .single();
        
        if (existing && existing.id) {
          chromaEntityIds.add(entityId);
        } else {
          missingInChromaDB.push(entityId);
        }
      } catch (error: any) {
        // エラーは埋め込みが存在しないとみなす
        missingInChromaDB.push(entityId);
      }
    }

    console.log(`[compareEntityEmbeddings] ✅ ChromaDBとの比較完了:`);
    console.log(`  - Supabase全数: ${supabaseEntityIds.size}件`);
    console.log(`  - ChromaDBに存在: ${chromaEntityIds.size}件`);
    console.log(`  - ChromaDBに不足: ${missingInChromaDB.length}件`);

    return {
      totalInSupabase: supabaseEntityIds.size,
      totalInChromaDB: chromaEntityIds.size,
      missingInChromaDB,
      extraInChromaDB, // ChromaDBから全件取得できないため、現時点では空
      synced: chromaEntityIds.size,
      errors: 0,
    };
  } catch (error) {
    console.error('[compareEntityEmbeddings] エラー:', error);
    throw error;
  }
}

/**
 * リレーションの埋め込みをSupabaseとChromaDBで比較
 */
export async function compareRelationEmbeddings(
  organizationId: string
): Promise<RelationSyncResult> {
  try {
    console.log(`[compareRelationEmbeddings] 比較開始: organizationId=${organizationId}`);

    // 1. まずSupabaseからリレーション一覧を取得して全数を確認
    // リスト表示と同じ方法を使用（getAllRelationsしてからフィルタリング）
    console.log(`[compareRelationEmbeddings] ステップ1: Supabaseからリレーション一覧を取得...`);
    let supabaseRelations: Relation[] = [];
    try {
      const { getAllRelations } = await import('./relationApi');
      const allRelations = await getAllRelations();
      // organizationIdでフィルタリング
      supabaseRelations = allRelations.filter(r => r.organizationId === organizationId);
      console.log(`[compareRelationEmbeddings] ✅ 全リレーション数: ${allRelations.length}件、組織${organizationId}のリレーション数: ${supabaseRelations.length}件`);
    } catch (error) {
      console.error(`[compareRelationEmbeddings] ❌ Supabaseからのデータ取得エラー:`, error);
      throw new Error(`Supabaseからのリレーション取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (supabaseRelations.length === 0) {
      console.warn(`[compareRelationEmbeddings] ⚠️ Supabaseにリレーションが存在しません (organizationId: ${organizationId})`);
      return {
        totalInSupabase: 0,
        totalInChromaDB: 0,
        missingInChromaDB: [],
        extraInChromaDB: [],
        synced: 0,
        errors: 0,
      };
    }

    // サンプルデータをログ出力
    console.log(`[compareRelationEmbeddings] サンプルデータ（最初の3件）:`, supabaseRelations.slice(0, 3).map(r => ({
      id: r.id,
      organizationId: r.organizationId,
      relationType: r.relationType,
    })));

    // IDを抽出
    const supabaseRelationIds = new Set(supabaseRelations.map(r => r.id));

    console.log(`[compareRelationEmbeddings] ✅ Supabaseのリレーション全数: ${supabaseRelationIds.size}件`);

    // 2. ChromaDBから埋め込みが存在するリレーションIDを取得
    const chromaRelationIds = new Set<string>();
    const missingInChromaDB: string[] = [];
    const extraInChromaDB: string[] = [];

    // 2. その後、ChromaDBと比較して未生成対象を確認
    console.log(`[compareRelationEmbeddings] ChromaDBとの比較を開始...`);
    let checkedCount = 0;
    
    // Supabaseの各リレーションについて、ChromaDBに埋め込みがあるか確認
    for (const relationId of supabaseRelationIds) {
      checkedCount++;
      if (checkedCount % 10 === 0) {
        console.log(`[compareRelationEmbeddings] 進捗: ${checkedCount}/${supabaseRelationIds.size}件を確認中...`);
      }
      
      // Supabaseに移行済みのため、ChromaDB確認は不要
      // Supabaseから直接確認
      try {
        const { getSupabaseClient } = await import('./utils/supabaseClient');
        const supabase = getSupabaseClient();
        const { data: existing } = await supabase
          .from('relation_embeddings')
          .select('id')
          .eq('id', relationId)
          .single();
        
        if (existing && existing.id) {
          chromaRelationIds.add(relationId);
        } else {
          missingInChromaDB.push(relationId);
        }
      } catch (error: any) {
        // エラーは埋め込みが存在しないとみなす
        missingInChromaDB.push(relationId);
      }
    }

    console.log(`[compareRelationEmbeddings] ✅ ChromaDBとの比較完了:`);
    console.log(`  - Supabase全数: ${supabaseRelationIds.size}件`);
    console.log(`  - ChromaDBに存在: ${chromaRelationIds.size}件`);
    console.log(`  - ChromaDBに不足: ${missingInChromaDB.length}件`);

    return {
      totalInSupabase: supabaseRelationIds.size,
      totalInChromaDB: chromaRelationIds.size,
      missingInChromaDB,
      extraInChromaDB, // ChromaDBから全件取得できないため、現時点では空
      synced: chromaRelationIds.size,
      errors: 0,
    };
  } catch (error) {
    console.error('[compareRelationEmbeddings] エラー:', error);
    throw error;
  }
}

/**
 * トピックの埋め込みをSupabaseとChromaDBで比較
 */
export async function compareTopicEmbeddings(
  organizationId: string
): Promise<TopicSyncResult> {
  try {
    console.log(`[compareTopicEmbeddings] 比較開始: organizationId=${organizationId}`);

    // 1. まずSupabaseからトピック一覧を取得して全数を確認
    // リスト表示と同じ方法を使用（getAllTopicsBatchしてからフィルタリング）
    console.log(`[compareTopicEmbeddings] ステップ1: Supabaseからトピック一覧を取得...`);
    let supabaseTopics: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string }> = [];
    try {
      const { getAllTopicsBatch } = await import('./orgApi/topics');
      const allTopics = await getAllTopicsBatch();
      // organizationIdでフィルタリング
      const filteredTopics = allTopics.filter(t => t.organizationId === organizationId);
      
      // TopicInfoから必要な情報を抽出
      supabaseTopics = filteredTopics.map(t => ({
        topicId: t.id,
        meetingNoteId: t.meetingNoteId,
        regulationId: t.regulationId,
      }));
      
      console.log(`[compareTopicEmbeddings] ✅ 全トピック数: ${allTopics.length}件、組織${organizationId}のトピック数: ${supabaseTopics.length}件`);
    } catch (error) {
      console.error(`[compareTopicEmbeddings] ❌ Supabaseからのデータ取得エラー:`, error);
      throw new Error(`Supabaseからのトピック取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (supabaseTopics.length === 0) {
      console.warn(`[compareTopicEmbeddings] ⚠️ Supabaseにトピックが存在しません (organizationId: ${organizationId})`);
      return {
        totalInSupabase: 0,
        totalInChromaDB: 0,
        missingInChromaDB: [],
        extraInChromaDB: [],
        synced: 0,
        errors: 0,
      };
    }

    // サンプルデータをログ出力
    console.log(`[compareTopicEmbeddings] サンプルデータ（最初の3件）:`, supabaseTopics.slice(0, 3));
    
    // トピックIDとparentIdのペアを作成
    const supabaseTopicMap = new Map<string, { topicId: string; meetingNoteId?: string; regulationId?: string }>();
    for (const topic of supabaseTopics) {
      if (!topic.topicId) {
        console.warn(`[compareTopicEmbeddings] ⚠️ topicIdが取得できないトピック:`, topic);
        continue;
      }
      
      const key = `${topic.topicId}-${topic.meetingNoteId || topic.regulationId || ''}`;
      supabaseTopicMap.set(key, topic);
    }

    console.log(`[compareTopicEmbeddings] ✅ Supabaseのトピック全数: ${supabaseTopicMap.size}件`);

    // 2. ChromaDBから埋め込みが存在するトピックを取得
    const chromaTopicMap = new Map<string, { topicId: string; meetingNoteId?: string; regulationId?: string }>();
    const missingInChromaDB: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string }> = [];
    const extraInChromaDB: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string }> = [];

    // 2. その後、ChromaDBと比較して未生成対象を確認
    console.log(`[compareTopicEmbeddings] ChromaDBとの比較を開始...`);
    let checkedCount = 0;
    
    // Supabaseの各トピックについて、ChromaDBに埋め込みがあるか確認
    for (const [key, topicInfo] of supabaseTopicMap.entries()) {
      checkedCount++;
      if (checkedCount % 10 === 0) {
        console.log(`[compareTopicEmbeddings] 進捗: ${checkedCount}/${supabaseTopicMap.size}件を確認中...`);
      }
      
      // Supabaseに移行済みのため、ChromaDB確認は不要
      // Supabaseから直接確認
      try {
        const { getSupabaseClient } = await import('./utils/supabaseClient');
        const supabase = getSupabaseClient();
        // topic_embeddingsテーブルのidは {meetingNoteId}-topic-{topicId} または {regulationId}-topic-{topicId} 形式
        const embeddingId = topicInfo.meetingNoteId 
          ? `${topicInfo.meetingNoteId}-topic-${topicInfo.topicId}`
          : topicInfo.regulationId
          ? `${topicInfo.regulationId}-topic-${topicInfo.topicId}`
          : `-topic-${topicInfo.topicId}`;
        
        const { data: existing } = await supabase
          .from('topic_embeddings')
          .select('id')
          .eq('id', embeddingId)
          .single();
        
        if (existing && existing.id) {
          chromaTopicMap.set(key, topicInfo);
        } else {
          missingInChromaDB.push(topicInfo);
        }
      } catch (error: any) {
        // エラーは埋め込みが存在しないとみなす
        missingInChromaDB.push(topicInfo);
      }
    }

    console.log(`[compareTopicEmbeddings] ✅ ChromaDBとの比較完了:`);
    console.log(`  - Supabase全数: ${supabaseTopicMap.size}件`);
    console.log(`  - ChromaDBに存在: ${chromaTopicMap.size}件`);
    console.log(`  - ChromaDBに不足: ${missingInChromaDB.length}件`);

    return {
      totalInSupabase: supabaseTopicMap.size,
      totalInChromaDB: chromaTopicMap.size,
      missingInChromaDB,
      extraInChromaDB, // ChromaDBから全件取得できないため、現時点では空
      synced: chromaTopicMap.size,
      errors: 0,
    };
  } catch (error) {
    console.error('[compareTopicEmbeddings] エラー:', error);
    throw error;
  }
}

/**
 * エンティティの埋め込みをSupabaseに基づいて同期
 */
export async function syncEntityEmbeddings(
  organizationId: string,
  onProgress?: (current: number, total: number, entityId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ synced: number; errors: number }> {
  try {
    const comparison = await compareEntityEmbeddings(organizationId);
    
    if (comparison.missingInChromaDB.length === 0) {
      console.log('[syncEntityEmbeddings] すべてのエンティティが同期済みです');
      return { synced: 0, errors: 0 };
    }

    console.log(`[syncEntityEmbeddings] ${comparison.missingInChromaDB.length}件のエンティティを同期します`);

    let synced = 0;
    let errors = 0;

    // 不足しているエンティティの埋め込みを生成
    for (let i = 0; i < comparison.missingInChromaDB.length; i++) {
      const entityId = comparison.missingInChromaDB[i];
      onProgress?.(i + 1, comparison.missingInChromaDB.length, entityId, 'processing');

      try {
        const entity = await getEntitiesByIds([entityId]);
        if (entity.length === 0 || !entity[0]) {
          errors++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, entityId, 'error');
          continue;
        }

        const result = await saveEntityEmbeddingAsync(entityId, organizationId);
        if (result) {
          synced++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, entityId, 'success');
        } else {
          errors++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, entityId, 'error');
        }
      } catch (error) {
        console.error(`[syncEntityEmbeddings] エンティティ ${entityId} の同期エラー:`, error);
        errors++;
        onProgress?.(i + 1, comparison.missingInChromaDB.length, entityId, 'error');
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('[syncEntityEmbeddings] エラー:', error);
    throw error;
  }
}

/**
 * リレーションの埋め込みをSupabaseに基づいて同期
 */
export async function syncRelationEmbeddings(
  organizationId: string,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ synced: number; errors: number }> {
  try {
    const comparison = await compareRelationEmbeddings(organizationId);
    
    if (comparison.missingInChromaDB.length === 0) {
      console.log('[syncRelationEmbeddings] すべてのリレーションが同期済みです');
      return { synced: 0, errors: 0 };
    }

    console.log(`[syncRelationEmbeddings] ${comparison.missingInChromaDB.length}件のリレーションを同期します`);

    let synced = 0;
    let errors = 0;

    // 不足しているリレーションの埋め込みを生成
    for (let i = 0; i < comparison.missingInChromaDB.length; i++) {
      const relationId = comparison.missingInChromaDB[i];
      onProgress?.(i + 1, comparison.missingInChromaDB.length, relationId, 'processing');

      try {
        const relations = await getRelationsByIds([relationId]);
        if (relations.length === 0 || !relations[0]) {
          errors++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, relationId, 'error');
          continue;
        }

        const relation = relations[0];
        const topicId = relation.topicId || '';
        const result = await saveRelationEmbeddingAsync(relationId, topicId, organizationId);
        if (result) {
          synced++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, relationId, 'success');
        } else {
          errors++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, relationId, 'error');
        }
      } catch (error) {
        console.error(`[syncRelationEmbeddings] リレーション ${relationId} の同期エラー:`, error);
        errors++;
        onProgress?.(i + 1, comparison.missingInChromaDB.length, relationId, 'error');
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('[syncRelationEmbeddings] エラー:', error);
    throw error;
  }
}

/**
 * トピックの埋め込みをSupabaseに基づいて同期
 */
export async function syncTopicEmbeddings(
  organizationId: string,
  onProgress?: (current: number, total: number, topicId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ synced: number; errors: number }> {
  try {
    const comparison = await compareTopicEmbeddings(organizationId);
    
    if (comparison.missingInChromaDB.length === 0) {
      console.log('[syncTopicEmbeddings] すべてのトピックが同期済みです');
      return { synced: 0, errors: 0 };
    }

    console.log(`[syncTopicEmbeddings] ${comparison.missingInChromaDB.length}件のトピックを同期します`);

    let synced = 0;
    let errors = 0;

    // 不足しているトピックの埋め込みを生成
    for (let i = 0; i < comparison.missingInChromaDB.length; i++) {
      const topicInfo = comparison.missingInChromaDB[i];
      onProgress?.(i + 1, comparison.missingInChromaDB.length, topicInfo.topicId, 'processing');

      try {
        // トピック情報を取得
        const topics = await getTopicsByIds([topicInfo]);
        if (topics.length === 0 || !topics[0]) {
          errors++;
          onProgress?.(i + 1, comparison.missingInChromaDB.length, topicInfo.topicId, 'error');
          continue;
        }

        const topic = topics[0];
        await saveTopicEmbedding(
          topic.topicId,
          topic.meetingNoteId,
          organizationId,
          topic.title || '',
          topic.content || '',
          {
            keywords: topic.keywords,
            semanticCategory: topic.semanticCategory,
          },
          topic.regulationId
        );
        synced++;
        onProgress?.(i + 1, comparison.missingInChromaDB.length, topicInfo.topicId, 'success');
      } catch (error) {
        console.error(`[syncTopicEmbeddings] トピック ${topicInfo.topicId} の同期エラー:`, error);
        errors++;
        onProgress?.(i + 1, comparison.missingInChromaDB.length, topicInfo.topicId, 'error');
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('[syncTopicEmbeddings] エラー:', error);
    throw error;
  }
}

/**
 * すべての埋め込みをSupabaseに基づいて同期
 */
export async function syncAllEmbeddings(
  organizationId: string,
  onProgress?: (type: 'entity' | 'relation' | 'topic', current: number, total: number, id: string, status: 'processing' | 'success' | 'error') => void
): Promise<{
  entities: { synced: number; errors: number };
  relations: { synced: number; errors: number };
  topics: { synced: number; errors: number };
}> {
  try {
    console.log(`[syncAllEmbeddings] 全埋め込み同期開始: organizationId=${organizationId}`);

    // エンティティ、リレーション、トピックを並列で同期
    const [entityResult, relationResult, topicResult] = await Promise.all([
      syncEntityEmbeddings(organizationId, (current, total, id, status) => {
        onProgress?.('entity', current, total, id, status);
      }),
      syncRelationEmbeddings(organizationId, (current, total, id, status) => {
        onProgress?.('relation', current, total, id, status);
      }),
      syncTopicEmbeddings(organizationId, (current, total, id, status) => {
        onProgress?.('topic', current, total, id, status);
      }),
    ]);

    return {
      entities: entityResult,
      relations: relationResult,
      topics: topicResult,
    };
  } catch (error) {
    console.error('[syncAllEmbeddings] エラー:', error);
    throw error;
  }
}

