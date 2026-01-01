/**
 * リレーション検索
 */

import type { Relation } from '@/types/relation';
import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
// Supabaseに移行済みのため、ChromaDB専用実装は不要
import { findSimilarRelations as findSimilarRelationsAdapter } from '../vectorSearchAdapter';
import { getVectorSearchBackend } from '../vectorSearchConfig';
import { getRelationsByIds } from '../relationApi';
import { normalizeSimilarity, calculateRelationScore, adjustWeightsForQuery, DEFAULT_WEIGHTS, type ScoringWeights } from '../ragSearchScoring';
import { searchRelationsBM25 } from './bm25Search';
import { combineSearchResults, type HybridSearchConfig, DEFAULT_HYBRID_CONFIG } from './hybridSearch';

/**
 * リレーションを検索（ハイブリッド検索対応）
 */
export async function searchRelations(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  hybridConfig?: HybridSearchConfig
): Promise<KnowledgeGraphSearchResult[]> {
  const config = hybridConfig || DEFAULT_HYBRID_CONFIG;
  
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchRelations] 検索開始:', { queryText, limit, filters, weights, hybridConfig: config });
    
    // 並列でベクトル検索とBM25検索を実行
    const [vectorResults, bm25Results] = await Promise.all([
      config.useVector
        ? (async () => {
            const backend = getVectorSearchBackend();
            if (backend === 'supabase') {
              // Supabaseを使用（新しい抽象化レイヤー）
              try {
                const { generateEmbedding } = await import('../embeddings');
                const queryEmbedding = await generateEmbedding(queryText);
                const results = await findSimilarRelationsAdapter(
                  queryEmbedding,
                  limit * 2,
                  filters?.organizationId,
                  undefined // companyId
                );
                
                // VectorSearchResult形式をfindSimilarRelationsChromaの戻り値形式に変換
                const relations = await getRelationsByIds(results.map(r => r.id)).catch(error => {
                  console.error('[searchRelations] リレーション取得エラー:', error);
                  return [];
                });
                
                const relationMap = new Map(relations.map(r => [r.id, r]));
                return results
                  .map(result => {
                    const relation = relationMap.get(result.id);
                    if (!relation) return null;
                    return {
                      relationId: result.id,
                      similarity: result.similarity,
                      relation,
                    };
                  })
                  .filter((r): r is NonNullable<typeof r> => r !== null);
              } catch (error: any) {
                console.warn('[searchRelations] Supabaseベクトル検索エラー:', error);
                return [];
              }
            } else {
              // Supabaseに移行済みのため、ChromaDBは使用しない
              console.warn('[searchRelations] ChromaDBは使用されていません。Supabaseを使用してください。');
              return [];
            }
          })()
        : Promise.resolve([]),
      config.useBM25
        ? searchRelationsBM25(
            queryText,
            limit * 2,
            filters
          ).catch(error => {
            console.warn('[searchRelations] BM25検索エラー:', error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    console.log('[searchRelations] 検索結果:', {
      vectorCount: vectorResults.length,
      bm25Count: bm25Results.length,
    });

    // ベクトル検索結果が空で、BM25検索が有効な場合はBM25検索を実行
    if (vectorResults.length === 0 && config.useVector && !config.useBM25) {
      console.log('[searchRelations] ベクトル検索結果が空のため、BM25検索をフォールバックとして実行');
      try {
        const fallbackBM25Results = await searchRelationsBM25(
          queryText,
          limit * 2,
          filters
        );
        console.log('[searchRelations] BM25フォールバック検索結果:', fallbackBM25Results.length, '件');
        if (fallbackBM25Results.length > 0) {
          // BM25検索結果を使用
          const combinedResults = fallbackBM25Results.map(r => ({
            id: r.relationId,
            score: r.bm25Score,
            similarity: 0,
            bm25Score: r.bm25Score,
          }));
          
          // リレーションIDを抽出（重複を除去）
          const relationIds = Array.from(new Set(combinedResults.map(r => r.id)));
          const relations = await getRelationsByIds(relationIds).catch(error => {
            console.error('[searchRelations] リレーション取得エラー:', error);
            return [];
          });
          
          const relationMap = new Map(relations.map(r => [r.id, r]));
          const results: KnowledgeGraphSearchResult[] = [];
          
          for (const { id: relationId, bm25Score } of combinedResults) {
            const relation = relationMap.get(relationId);
            if (!relation) continue;
            
            // フィルタリング
            if (filters?.relationType && relation.relationType !== filters.relationType) {
              continue;
            }
            
            const normalizedBM25 = Math.min(1, bm25Score / 10);
            results.push({
              type: 'relation',
              id: relationId,
              score: normalizedBM25,
              similarity: 0,
              relation,
            });
          }
          
          results.sort((a, b) => b.score - a.score);
          return results.slice(0, limit);
        }
      } catch (error) {
        console.warn('[searchRelations] BM25フォールバック検索エラー:', error);
      }
    }

    // 検索結果を統合
    let combinedResults: Array<{ id: string; score: number; similarity: number; bm25Score: number }> = [];
    
    if (config.useVector && config.useBM25) {
      // ハイブリッド検索: ベクトル検索とBM25検索を統合
      const vectorResultsForHybrid = vectorResults.map(r => ({
        id: r.relationId,
        similarity: r.similarity,
      }));
      const bm25ResultsForHybrid = bm25Results.map(r => ({
        id: r.relationId,
        bm25Score: r.bm25Score,
      }));
      
      combinedResults = combineSearchResults(
        vectorResultsForHybrid,
        bm25ResultsForHybrid,
        config.weights
      );
    } else if (config.useVector) {
      // ベクトル検索のみ
      combinedResults = vectorResults.map(r => ({
        id: r.relationId,
        score: r.similarity,
        similarity: r.similarity,
        bm25Score: 0,
      }));
    } else if (config.useBM25) {
      // BM25検索のみ
      combinedResults = bm25Results.map(r => ({
        id: r.relationId,
        score: r.bm25Score,
        similarity: 0,
        bm25Score: r.bm25Score,
      }));
    }

    if (combinedResults.length === 0) {
      console.log('[searchRelations] 検索結果が空のため、空の配列を返します');
      return [];
    }

    // リレーションIDを抽出（重複を除去）
    const relationIds = Array.from(new Set(combinedResults.map(r => r.id)));

    console.log('[searchRelations] 取得するリレーションID:', {
      count: relationIds.length,
      ids: relationIds.slice(0, 10), // 最初の10件のみ表示
    });

    // バッチでリレーションを取得（N+1問題を回避）
    const relations = await getRelationsByIds(relationIds).catch(error => {
      console.error('[searchRelations] リレーション取得エラー:', error);
      return [];
    });
    
    console.log('[searchRelations] 取得したリレーション数:', {
      requested: relationIds.length,
      retrieved: relations.length,
      missing: relationIds.length - relations.length,
    });

    // リレーションIDでマップを作成
    const relationMap = new Map(relations.map(r => [r.id, r]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { id: relationId, similarity, bm25Score } of combinedResults) {
      const relation = relationMap.get(relationId);
      if (!relation) continue;

      // フィルタリング
      if (filters?.relationType && relation.relationType !== filters.relationType) {
        continue;
      }

      // 日付フィルタリング
      if (filters?.createdAfter && relation.createdAt && relation.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && relation.createdAt && relation.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && relation.updatedAt && relation.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && relation.updatedAt && relation.updatedAt > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化（ベクトル検索の結果がある場合）
      const normalizedSimilarity = similarity > 0 ? normalizeSimilarity(similarity) : 0;
      
      console.log('[searchRelations] 類似度処理:', {
        relationId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        bm25Score,
        similarityType: typeof similarity,
      });

      // スコア計算（ハイブリッド検索の場合はBM25スコアも考慮）
      let baseScore = calculateRelationScore(
        normalizedSimilarity,
        relation,
        weights,
        filters,
        undefined, // searchCount（将来実装）
        queryText
      );

      // BM25スコアがある場合は、ハイブリッドスコアを計算
      if (bm25Score > 0 && config.useBM25 && config.useVector) {
        // BM25スコアを0-1の範囲に正規化（簡易版）
        const normalizedBM25 = Math.min(1, bm25Score / 10);
        // ハイブリッドスコア: ベクトルスコアとBM25スコアの重み付き平均
        baseScore = baseScore * config.weights.vector + normalizedBM25 * config.weights.bm25;
      } else if (bm25Score > 0 && config.useBM25 && !config.useVector) {
        // BM25のみの場合
        const normalizedBM25 = Math.min(1, bm25Score / 10);
        baseScore = normalizedBM25;
      }

      const score = baseScore;

      console.log('[searchRelations] スコア計算結果:', {
        relationId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'relation',
        id: relationId,
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        relation,
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchRelations] リレーション検索エラー:', error);
    return [];
  }
}

