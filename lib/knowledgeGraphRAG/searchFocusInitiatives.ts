/**
 * 注力施策検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarFocusInitiatives } from '../vectorSearchAdapter';
import { generateEmbedding } from '../embeddings';
import { normalizeSimilarity, calculateEntityScore, type ScoringWeights, DEFAULT_WEIGHTS } from '../ragSearchScoring';
import { getDataSourceInstance } from '../dataSource';

/**
 * 注力施策を検索
 */
export async function searchFocusInitiatives(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  try {
    console.log('[searchFocusInitiatives] 検索開始:', { queryText, limit, filters });
    
    // ベクトル検索を実行
    const queryEmbedding = await generateEmbedding(queryText);
    const results = await findSimilarFocusInitiatives(
      queryEmbedding,
      limit * 2,
      filters?.organizationId,
      undefined // companyId
    );
    
    // 注力施策の詳細情報を取得
    const dataSource = getDataSourceInstance();
    const focusInitiatives = await Promise.all(
      results.map(async (result) => {
        try {
          const data = await dataSource.doc_get('focusinitiatives', result.id);
          return { result, data };
        } catch (error) {
          console.warn(`[searchFocusInitiatives] 注力施策 ${result.id} の取得エラー:`, error);
          return null;
        }
      })
    );
    
    // 結果をKnowledgeGraphSearchResult形式に変換
    const searchResults: KnowledgeGraphSearchResult[] = focusInitiatives
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
          type: 'focusInitiative' as const,
          id: data.id || result.id,
          focusInitiativeId: data.id || result.id,
          score,
          similarity,
          focusInitiative: {
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
    console.error('[searchFocusInitiatives] 検索エラー:', error);
    return [];
  }
}

