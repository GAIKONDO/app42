/**
 * スタートアップ検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarStartups } from '../vectorSearchAdapter';
import { getStartupById } from '../orgApi/startups';
import { generateEmbedding } from '../embeddings';
import { normalizeSimilarity, calculateEntityScore, type ScoringWeights, DEFAULT_WEIGHTS } from '../ragSearchScoring';

/**
 * スタートアップを検索
 */
export async function searchStartups(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  try {
    console.log('[searchStartups] 検索開始:', { queryText, limit, filters });
    
    // ベクトル検索を実行
    const queryEmbedding = await generateEmbedding(queryText);
    const results = await findSimilarStartups(
      queryEmbedding,
      limit * 2,
      filters?.organizationId,
      undefined // companyId
    );
    
    // スタートアップの詳細情報を取得
    const startups = await Promise.all(
      results.map(async (result) => {
        try {
          const startup = await getStartupById(result.id);
          return { result, startup };
        } catch (error) {
          console.warn(`[searchStartups] スタートアップ ${result.id} の取得エラー:`, error);
          return null;
        }
      })
    );
    
    // 結果をKnowledgeGraphSearchResult形式に変換
    const searchResults: KnowledgeGraphSearchResult[] = startups
      .filter((item): item is NonNullable<typeof item> => item !== null && item.startup !== null)
      .map(({ result, startup }) => {
        if (!startup) return null;
        
        const similarity = normalizeSimilarity(result.similarity);
        const score = calculateEntityScore(
          similarity,
          {
            name: startup.title || '',
            description: startup.description || '',
            content: startup.content || '',
          },
          queryText,
          weights
        );
        
        return {
          type: 'startup' as const,
          id: startup.id,
          startupId: startup.id,
          score,
          similarity,
          startup: {
            id: startup.id,
            title: startup.title || '',
            description: startup.description,
            content: startup.content,
            objective: startup.objective,
            evaluation: startup.evaluation,
            evaluationChart: startup.evaluationChart,
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    
    // スコアでソート
    searchResults.sort((a, b) => b.score - a.score);
    
    // 上位N件を返す
    return searchResults.slice(0, limit);
  } catch (error) {
    console.error('[searchStartups] 検索エラー:', error);
    return [];
  }
}

