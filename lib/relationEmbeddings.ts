/**
 * リレーション埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用のリレーション埋め込み機能を提供
 */

import { callTauriCommand } from './localFirebase';
import { generateEmbedding } from './embeddings';
import type { RelationEmbedding } from '@/types/relationEmbedding';
import type { Relation } from '@/types/relation';
import { getRelationById, getAllRelations, getRelationsByIds } from './relationApi';
import { shouldUseChroma } from './vectorSearchConfig';
import { getVectorSearchBackend } from './vectorSearchConfig';
// saveRelationEmbeddingAdapterは動的インポートで使用
import { calculateRelationScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError } from './ragSearchErrors';
import pLimit from 'p-limit';

/**
 * 現在の埋め込みバージョン
 */
export const CURRENT_EMBEDDING_VERSION = '2.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

import { getEntityById } from './entityApi';

/**
 * リレーション埋め込みを保存
 */
export async function saveRelationEmbedding(
  relationId: string,
  topicId: string,
  organizationId: string,
  relation: Relation
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('リレーション埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  const orgOrCompanyId = relation.companyId || organizationId || relation.organizationId || '';
  
  try {
    // ベクトル検索バックエンドに保存（ChromaDBまたはSupabase）
    const backend = getVectorSearchBackend();
    if (backend === 'supabase' || shouldUseChroma()) {
      try {
        if (backend === 'supabase') {
          // Supabaseを使用（新しい抽象化レイヤー）
          // 埋め込みを生成
          const { generateEmbedding } = await import('./embeddings');
          const { getEntityById } = await import('./entityApi');
          
          // 関連エンティティ名を取得
          let sourceEntityName = '';
          let targetEntityName = '';
          
          if (relation.sourceEntityId) {
            try {
              const sourceEntity = await getEntityById(relation.sourceEntityId);
              sourceEntityName = sourceEntity?.name || relation.sourceEntityId;
            } catch (error) {
              sourceEntityName = relation.sourceEntityId;
            }
          }
          
          if (relation.targetEntityId) {
            try {
              const targetEntity = await getEntityById(relation.targetEntityId);
              targetEntityName = targetEntity?.name || relation.targetEntityId;
            } catch (error) {
              targetEntityName = relation.targetEntityId;
            }
          }
          
          // メタデータからテキストを構築
          const metadataParts: string[] = [];
          if (relation.metadata) {
            const metadata = relation.metadata;
            if (metadata.date) metadataParts.push(`日付: ${metadata.date}`);
            if (metadata.amount) metadataParts.push(`金額: ${metadata.amount}`);
            if (metadata.percentage) metadataParts.push(`割合: ${metadata.percentage}%`);
            if (metadata.description) metadataParts.push(`詳細: ${metadata.description}`);
            if (metadata.source) metadataParts.push(`情報源: ${metadata.source}`);
          }
          const metadataText = metadataParts.join(', ');
          
          // 統合埋め込みを生成
          const descriptionText = relation.description || '';
          const relationTypeText = relation.relationType;
          
          const combinedParts: string[] = [];
          combinedParts.push(relationTypeText);
          combinedParts.push(relationTypeText);
          combinedParts.push(relationTypeText);
          
          if (sourceEntityName && targetEntityName) {
            combinedParts.push(`${sourceEntityName} と ${targetEntityName} の関係`);
          } else if (sourceEntityName) {
            combinedParts.push(`${sourceEntityName} に関連`);
          } else if (targetEntityName) {
            combinedParts.push(`${targetEntityName} に関連`);
          }
          
          if (descriptionText) {
            combinedParts.push(descriptionText);
          }
          
          if (metadataText) {
            combinedParts.push(metadataText);
          }
          
          const combinedText = combinedParts.join('\n\n');
          const combinedEmbedding = await generateEmbedding(combinedText);
          
          // Supabaseに保存（抽象化レイヤーを使用）
          const { saveRelationEmbedding: saveRelationEmbeddingAdapter } = await import('./vectorSearchAdapter');
          await saveRelationEmbeddingAdapter(
            relationId,
            orgOrCompanyId,
            relation.companyId || null,
            combinedEmbedding,
            {
              topicId,
              sourceEntityId: relation.sourceEntityId,
              targetEntityId: relation.targetEntityId,
              relationType: relation.relationType,
              description: relation.description,
              confidence: relation.confidence,
              metadata: relation.metadata,
              embeddingModel: 'text-embedding-3-small',
              embeddingVersion: '2.0',
            }
          );
          console.log(`✅ [saveRelationEmbedding] Supabaseにリレーション埋め込みを保存しました: ${relationId}`);
        } else {
          // Supabaseに移行済みのため、ChromaDBは使用しない
          console.warn('[saveRelationEmbedding] ChromaDBは使用されていません。Supabaseを使用してください。');
        }
        
        // 同期状態を更新（ChromaDBの場合のみ）
        if (backend === 'chromadb') {
          try {
            await callTauriCommand('update_chroma_sync_status', {
              entityType: 'relation',
              entityId: relationId,
              synced: true,
              error: null,
            });
          } catch (syncError: any) {
            console.warn(`同期状態の更新に失敗しました: ${relationId}`, syncError?.message);
          }
        }
      } catch (error: any) {
        // 同期状態を失敗として更新（ChromaDBの場合のみ）
        if (backend === 'chromadb') {
          try {
            await callTauriCommand('update_chroma_sync_status', {
              entityType: 'relation',
              entityId: relationId,
              synced: false,
              error: error?.message || String(error),
            });
          } catch (syncError: any) {
            console.warn(`同期状態の更新に失敗しました: ${relationId}`, syncError?.message);
          }
        }
        throw new Error(`リレーション埋め込みの保存に失敗しました: ${error?.message || String(error)}`);
      }
    } else {
      throw new Error('リレーション埋め込みの保存にはベクトル検索バックエンド（ChromaDBまたはSupabase）が必要です');
    }
  } catch (error) {
    console.error('リレーション埋め込みの保存エラー:', error);
    throw error;
  }
}

// 埋め込み生成中のリレーションIDを追跡
const relationEmbeddingGenerationInProgress = new Set<string>();

/**
 * リレーション埋め込みを非同期で生成・保存
 */
export async function saveRelationEmbeddingAsync(
  relationId: string,
  topicId: string | null | undefined,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (relationEmbeddingGenerationInProgress.has(relationId)) {
    console.warn(`[saveRelationEmbeddingAsync] 既に埋め込み生成中のためスキップ: ${relationId}`);
    return false;
  }

  relationEmbeddingGenerationInProgress.add(relationId);
  console.log(`[saveRelationEmbeddingAsync] 埋め込み生成を開始（重複チェック通過）: ${relationId}`);
  
  try {
    console.log(`[saveRelationEmbeddingAsync] リレーション埋め込み生成開始: ${relationId}, organizationId: ${organizationId}`);
    const relation = await getRelationById(relationId);
    if (!relation) {
      console.warn(`[saveRelationEmbeddingAsync] リレーションが見つかりません: ${relationId}`);
      return false;
    }
    
    // Graphvizのリレーションの場合、topicIdはnullになるが、空文字列として扱う
    const topicIdForEmbedding = topicId || '';
    const orgOrCompanyId = relation.companyId || organizationId || relation.organizationId || '';
    
    if (!orgOrCompanyId) {
      console.warn(`[saveRelationEmbeddingAsync] organizationIdもcompanyIdも設定されていません: ${relationId}`);
      return false;
    }
    
    console.log(`[saveRelationEmbeddingAsync] 埋め込み保存開始: ${relationId}, orgOrCompanyId: ${orgOrCompanyId}`);
    await saveRelationEmbedding(relationId, topicIdForEmbedding, orgOrCompanyId, relation);
    console.log(`✅ [saveRelationEmbeddingAsync] リレーション埋め込み生成完了: ${relationId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveRelationEmbeddingAsync] リレーション ${relationId} の埋め込み生成エラー:`, {
      relationId,
      organizationId,
      topicId,
      error: error?.message || String(error),
      stack: error?.stack,
    });
    return false;
  } finally {
    relationEmbeddingGenerationInProgress.delete(relationId);
  }
}

/**
 * リレーション埋め込みを取得
 */
export async function getRelationEmbedding(
  relationId: string,
  organizationId?: string
): Promise<RelationEmbedding | null> {
  if (shouldUseChroma()) {
    try {
      let orgId = organizationId;
      if (!orgId) {
        try {
          const relation = await getRelationById(relationId);
          orgId = relation?.companyId || relation?.organizationId;
        } catch (e) {
          // リレーション取得エラーは無視
        }
      }

      // Supabaseに移行済みのため、ChromaDBからの取得は不要
      // Supabaseから直接取得
      if (orgId) {
        try {
          const { getSupabaseClient } = await import('./utils/supabaseClient');
          const supabase = getSupabaseClient();
          const { data: existing } = await supabase
            .from('relation_embeddings')
            .select('id, embedding, topic_id, source_entity_id, target_entity_id, relation_type, description, metadata')
            .eq('id', relationId)
            .single();
          
          if (existing && existing.embedding && Array.isArray(existing.embedding) && existing.embedding.length > 0) {
            return {
              combinedEmbedding: existing.embedding,
              topicId: existing.topic_id,
              sourceEntityId: existing.source_entity_id,
              targetEntityId: existing.target_entity_id,
              relationType: existing.relation_type,
              description: existing.description,
              metadata: existing.metadata ? JSON.parse(existing.metadata) : {},
            };
          }
          return null;
        } catch (error: any) {
          console.debug('Supabase埋め込み取得エラー（無視）:', error);
          return null;
        }
      }
      return null;
    } catch (chromaError: any) {
      console.error('ChromaDBからの取得に失敗しました:', chromaError?.message || chromaError);
      return null;
    }
  }

  return null;
}

/**
 * 類似リレーションを検索（ベクトル類似度検索）
 */
export async function findSimilarRelations(
  queryText: string,
  limit: number = 5,
  organizationId?: string
): Promise<Array<{ relationId: string; similarity: number }>> {
  // Supabase pgvectorを使用
  try {
    const { findSimilarRelations } = await import('./vectorSearchAdapter');
    return await findSimilarRelations(queryText, limit, organizationId || undefined, undefined);
  } catch (error: any) {
    console.error('Supabaseでの検索に失敗しました:', error?.message || error);
    return [];
  }
}

/**
 * キーワードマッチスコアを計算
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
function calculateRelationKeywordMatchScore(
  queryText: string,
  relation: Relation
): number {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[calculateRelationKeywordMatchScore] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return 0;
}

/**
 * SQLiteキーワード検索を実行
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
async function searchRelationsByKeywords(
  queryText: string,
  limit: number,
  filters?: {
    organizationId?: string;
    relationType?: string;
  }
): Promise<Array<{ relationId: string; keywordScore: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[searchRelationsByKeywords] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * ハイブリッド検索: ChromaDBベクトル検索 + SQLiteキーワード検索
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findSimilarRelationsHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    organizationId?: string;
    relationType?: string;
    topicId?: string;
  }
): Promise<Array<{ relationId: string; similarity: number; score: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[findSimilarRelationsHybrid] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * 既存のリレーション埋め込みを一括更新
 */
export async function batchUpdateRelationEmbeddings(
  relationIds: string[],
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean
): Promise<{ success: number; skipped: number; errors: number }> {
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  const limit = pLimit(5);
  
  const promises = relationIds.map((relationId) => 
    limit(async () => {
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        const relation = await getRelationById(relationId);
        if (!relation) {
          const current = ++processedCount;
          errorCount++;
          onProgress?.(current, relationIds.length, relationId, 'error');
          return { status: 'error' as const };
        }
        
        const orgOrCompanyId = relation.companyId || relation.organizationId || organizationId || '';
        
        if (!forceRegenerate) {
          try {
            // Supabase専用（環境変数チェック不要）
            const { getDocViaDataSource } = await import('./dataSourceAdapter');
            const relationData = await getDocViaDataSource('relations', relationId);
            const relationDoc = relationData ? { exists: true, data: relationData } : null;
            
            if (relationDoc?.exists && relationDoc?.data) {
              // chromaSyncedフラグは使用しない（Supabaseに移行済み）
              try {
                const existing = await getRelationEmbedding(relationId);
                if (existing) {
                  const current = ++processedCount;
                  skippedCount++;
                  onProgress?.(current, relationIds.length, relationId, 'skipped');
                  return { status: 'skipped' as const };
                }
              } catch (checkError) {
                // 埋め込み確認エラーは無視して続行
              }
            }
          } catch (error: any) {
            // データ取得に失敗した場合は続行
            console.warn(`リレーション取得エラー（続行）: ${relationId}`, error?.message);
          }
        }

        // Graphvizのリレーションの場合、topicIdはnullになるが、空文字列として扱う
        const topicIdForEmbedding = relation.topicId || '';
        const result = await saveRelationEmbeddingAsync(relationId, topicIdForEmbedding, orgOrCompanyId);
        const current = ++processedCount;
        
        if (result) {
          successCount++;
          onProgress?.(current, relationIds.length, relationId, 'success');
          return { status: 'success' as const };
        } else {
          errorCount++;
          onProgress?.(current, relationIds.length, relationId, 'error');
          return { status: 'error' as const };
        }
      } catch (error) {
        const current = ++processedCount;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`リレーション ${relationId} の埋め込み生成エラー:`, errorMessage);
        errorCount++;
        onProgress?.(current, relationIds.length, relationId, 'error');
        return { status: 'error' as const };
      }
    })
  );

  await Promise.allSettled(promises);

  return { success: successCount, skipped: skippedCount, errors: errorCount };
}

/**
 * バージョン不一致のリレーション埋め込みを検出
 */
export async function findOutdatedRelationEmbeddings(
  organizationId?: string
): Promise<Array<{ relationId: string; currentVersion: string; expectedVersion: string; model: string }>> {
  // 実装が必要な場合は後で追加
  return [];
}

/**
 * バージョン不一致のリレーション埋め込みを一括再生成
 */
export async function regenerateOutdatedRelationEmbeddings(
  organizationId?: string,
  onProgress?: (current: number, total: number, relationId: string, status: 'processing' | 'success' | 'error') => void
): Promise<{ regenerated: number; errors: number }> {
  try {
    const outdated = await findOutdatedRelationEmbeddings(organizationId);
    
    if (outdated.length === 0) {
      return { regenerated: 0, errors: 0 };
    }
    
    let regenerated = 0;
    let errors = 0;
    
    for (let i = 0; i < outdated.length; i++) {
      const { relationId } = outdated[i];
      onProgress?.(i + 1, outdated.length, relationId, 'processing');
      
      try {
        const relation = await getRelationById(relationId);
        if (!relation || !relation.organizationId) {
          errors++;
          onProgress?.(i + 1, outdated.length, relationId, 'error');
          continue;
        }
        
        // Graphvizのリレーションの場合、topicIdはnullになるが、空文字列として扱う
        const topicIdForEmbedding = relation.topicId || '';
        await saveRelationEmbedding(relationId, topicIdForEmbedding, relation.organizationId, relation);
        regenerated++;
        onProgress?.(i + 1, outdated.length, relationId, 'success');
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`リレーション ${relationId} の再生成エラー:`, error);
        errors++;
        onProgress?.(i + 1, outdated.length, relationId, 'error');
      }
    }
    
    return { regenerated, errors };
  } catch (error) {
    console.error('バージョン不一致埋め込みの再生成エラー:', error);
    throw error;
  }
}
