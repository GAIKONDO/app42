/**
 * 議事録検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { findSimilarMeetingNotes } from '../vectorSearchAdapter';
import { getMeetingNoteById } from '../orgApi/meetingNotes';
import { generateEmbedding } from '../embeddings';
import { normalizeSimilarity, calculateEntityScore, type ScoringWeights, DEFAULT_WEIGHTS } from '../ragSearchScoring';

/**
 * 議事録を検索
 */
export async function searchMeetingNotes(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<KnowledgeGraphSearchResult[]> {
  try {
    console.log('[searchMeetingNotes] 検索開始:', { queryText, limit, filters });
    
    // ベクトル検索を実行
    const queryEmbedding = await generateEmbedding(queryText);
    const results = await findSimilarMeetingNotes(
      queryEmbedding,
      limit * 2,
      filters?.organizationId,
      undefined // companyId
    );
    
    // 議事録の詳細情報を取得
    const meetingNotes = await Promise.all(
      results.map(async (result) => {
        try {
          const meetingNote = await getMeetingNoteById(result.id);
          return { result, meetingNote };
        } catch (error) {
          console.warn(`[searchMeetingNotes] 議事録 ${result.id} の取得エラー:`, error);
          return null;
        }
      })
    );
    
    // 結果をKnowledgeGraphSearchResult形式に変換
    const searchResults: KnowledgeGraphSearchResult[] = meetingNotes
      .filter((item): item is NonNullable<typeof item> => item !== null && item.meetingNote !== null)
      .map(({ result, meetingNote }) => {
        if (!meetingNote) return null;
        
        const similarity = normalizeSimilarity(result.similarity);
        const score = calculateEntityScore(
          similarity,
          {
            name: meetingNote.title || '',
            description: meetingNote.description || '',
            content: meetingNote.content || '',
          },
          queryText,
          weights
        );
        
        return {
          type: 'meetingNote' as const,
          id: meetingNote.id,
          score,
          similarity,
          meetingNote: {
            id: meetingNote.id,
            title: meetingNote.title || '',
            description: meetingNote.description,
            content: meetingNote.content,
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    
    // スコアでソート
    searchResults.sort((a, b) => b.score - a.score);
    
    // 上位N件を返す
    return searchResults.slice(0, limit);
  } catch (error) {
    console.error('[searchMeetingNotes] 検索エラー:', error);
    return [];
  }
}

