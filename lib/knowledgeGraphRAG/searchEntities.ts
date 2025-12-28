/**
 * エンティティ検索
 */

import type { Entity } from '@/types/entity';
import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarEntitiesChroma } from '../entityEmbeddingsChroma';
import { getEntitiesByIds } from '../entityApi';
import { normalizeSimilarity, calculateEntityScore, adjustWeightsForQuery, DEFAULT_WEIGHTS, type ScoringWeights } from '../ragSearchScoring';
import { searchEntitiesBM25 } from './bm25Search';
import { combineSearchResults, type HybridSearchConfig, DEFAULT_HYBRID_CONFIG } from './hybridSearch';

/**
 * エンティティを検索（ハイブリッド検索対応）
 */
export async function searchEntities(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  hybridConfig?: HybridSearchConfig
): Promise<KnowledgeGraphSearchResult[]> {
  const config = hybridConfig || DEFAULT_HYBRID_CONFIG;
  
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchEntities] 検索開始:', { queryText, limit, filters, weights, hybridConfig: config });
    
    // 並列でベクトル検索とBM25検索を実行
    const [vectorResults, bm25Results] = await Promise.all([
      config.useVector
        ? findSimilarEntitiesChroma(
            queryText,
            limit * 2,
            filters?.organizationId
          ).catch(error => {
            console.warn('[searchEntities] ベクトル検索エラー:', error);
            return [];
          })
        : Promise.resolve([]),
      config.useBM25
        ? searchEntitiesBM25(
            queryText,
            limit * 2,
            filters
          ).catch(error => {
            console.warn('[searchEntities] BM25検索エラー:', error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    console.log('[searchEntities] 検索結果:', {
      vectorCount: vectorResults.length,
      bm25Count: bm25Results.length,
    });

    // 検索結果を統合
    let combinedResults: Array<{ id: string; score: number; similarity: number; bm25Score: number }> = [];
    
    if (config.useVector && config.useBM25) {
      // ハイブリッド検索: ベクトル検索とBM25検索を統合
      const vectorResultsForHybrid = vectorResults.map(r => ({
        id: r.entityId,
        similarity: r.similarity,
      }));
      const bm25ResultsForHybrid = bm25Results.map(r => ({
        id: r.entityId,
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
        id: r.entityId,
        score: r.similarity,
        similarity: r.similarity,
        bm25Score: 0,
      }));
    } else if (config.useBM25) {
      // BM25検索のみ
      combinedResults = bm25Results.map(r => ({
        id: r.entityId,
        score: r.bm25Score,
        similarity: 0,
        bm25Score: r.bm25Score,
      }));
    }

    if (combinedResults.length === 0) {
      console.log('[searchEntities] 検索結果が空のため、空の配列を返します');
      return [];
    }

    // エンティティIDを抽出
    const entityIds = combinedResults.map(r => r.id);

    // バッチでエンティティを取得（N+1問題を回避）
    const entities = await getEntitiesByIds(entityIds);

    // エンティティIDでマップを作成
    const entityMap = new Map(entities.map(e => [e.id, e]));

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { id: entityId, similarity, bm25Score } of combinedResults) {
      const entity = entityMap.get(entityId);
      if (!entity) continue;

      // フィルタリング
      if (filters?.entityType && entity.type !== filters.entityType) {
        continue;
      }

      // 日付フィルタリング
      if (filters?.createdAfter && entity.createdAt && entity.createdAt < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && entity.createdAt && entity.createdAt > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && entity.updatedAt && entity.updatedAt < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && entity.updatedAt && entity.updatedAt > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化（ベクトル検索の結果がある場合）
      const normalizedSimilarity = similarity > 0 ? normalizeSimilarity(similarity) : 0;
      
      console.log('[searchEntities] 類似度処理:', {
        entityId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        bm25Score,
        similarityType: typeof similarity,
      });

      // スコア計算（ハイブリッド検索の場合はBM25スコアも考慮）
      let baseScore = calculateEntityScore(
        normalizedSimilarity,
        entity,
        weights,
        filters,
        undefined, // searchCount（将来実装）
        queryText
      );

      // BM25スコアがある場合は、ハイブリッドスコアを計算
      if (bm25Score > 0 && config.useBM25 && config.useVector) {
        // BM25スコアを0-1の範囲に正規化（簡易版）
        const normalizedBM25 = Math.min(1, bm25Score / 10); // BM25スコアは通常0-10程度
        // ハイブリッドスコア: ベクトルスコアとBM25スコアの重み付き平均
        baseScore = baseScore * config.weights.vector + normalizedBM25 * config.weights.bm25;
      } else if (bm25Score > 0 && config.useBM25 && !config.useVector) {
        // BM25のみの場合
        const normalizedBM25 = Math.min(1, bm25Score / 10);
        baseScore = normalizedBM25;
      }

      const score = baseScore;

      console.log('[searchEntities] スコア計算結果:', {
        entityId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      results.push({
        type: 'entity',
        id: entityId,
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        entity,
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchEntities] エンティティ検索エラー:', error);
    return [];
  }
}

