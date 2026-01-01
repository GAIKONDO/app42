/**
 * 制度検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarRegulations } from '../vectorSearchAdapter';
import { generateEmbedding } from '../embeddings';
import { normalizeSimilarity, calculateEntityScore, type ScoringWeights, DEFAULT_WEIGHTS } from '../ragSearchScoring';
import { getDataSourceInstance } from '../dataSource';

/**
 * 制度を検索
 */
export async function searchRegulations(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  try {
    console.log('[searchRegulations] 検索開始:', { queryText, limit, filters });
    
    // ベクトル検索を実行
    const queryEmbedding = await generateEmbedding(queryText);
    const results = await findSimilarRegulations(
      queryEmbedding,
      limit * 2,
      filters?.organizationId
    );
    
    // 制度の詳細情報を取得
    const dataSource = getDataSourceInstance();
    const regulations = await Promise.all(
      results.map(async (result) => {
        try {
          const data = await dataSource.doc_get('regulations', result.id);
          return { result, data };
        } catch (error) {
          console.warn(`[searchRegulations] 制度 ${result.id} の取得エラー:`, error);
          return null;
        }
      })
    );
    
    // 結果をKnowledgeGraphSearchResult形式に変換
    const searchResults: KnowledgeGraphSearchResult[] = regulations
      .filter((item): item is NonNullable<typeof item> => item !== null && item.data !== null)
      .map(({ result, data }) => {
        if (!data) return null;
        
        const similarity = normalizeSimilarity(result.similarity);
        const score = calculateEntityScore(
          similarity,
          {
            name: data.title || '',
            description: data.description || '',
            content: data.content || '',
          },
          queryText,
          weights
        );
        
        return {
          type: 'regulation' as const,
          id: data.id || result.id,
          regulationId: data.id || result.id,
          score,
          similarity,
          regulation: {
            id: data.id || result.id,
            title: data.title || '',
            description: data.description,
            content: data.content,
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    
    // スコアでソート
    searchResults.sort((a, b) => b.score - a.score);
    
    // 上位N件を返す
    return searchResults.slice(0, limit);
  } catch (error) {
    console.error('[searchRegulations] 検索エラー:', error);
    return [];
  }
}

