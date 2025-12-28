/**
 * トピック検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters, TopicSummary } from './types';
import { findSimilarTopicsChroma } from '../topicEmbeddingsChroma';
import { getTopicsByIds, getTopicFilesByTopicIds } from '../topicApi';
import { normalizeSimilarity, calculateTopicScore, adjustWeightsForQuery, DEFAULT_WEIGHTS, type ScoringWeights } from '../ragSearchScoring';
import { searchTopicsBM25 } from './bm25Search';
import { combineSearchResults, type HybridSearchConfig, DEFAULT_HYBRID_CONFIG } from './hybridSearch';

/**
 * トピックを検索（ハイブリッド検索対応）
 */
export async function searchTopics(
  queryText: string,
  limit: number,
  filters?: SearchFilters,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  hybridConfig?: HybridSearchConfig
): Promise<KnowledgeGraphSearchResult[]> {
  const config = hybridConfig || DEFAULT_HYBRID_CONFIG;
  
  // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
  try {
    console.log('[searchTopics] 検索開始:', { queryText, limit, filters, weights, hybridConfig: config });
    
    // 並列でベクトル検索とBM25検索を実行
    const [vectorResults, bm25Results] = await Promise.all([
      config.useVector
        ? findSimilarTopicsChroma(
            queryText,
            limit * 2,
            filters?.organizationId,
            filters?.topicSemanticCategory
          ).catch(error => {
            console.warn('[searchTopics] ベクトル検索エラー:', error);
            return [];
          })
        : Promise.resolve([]),
      config.useBM25
        ? searchTopicsBM25(
            queryText,
            limit * 2,
            filters
          ).catch(error => {
            console.warn('[searchTopics] BM25検索エラー:', error);
            return [];
          })
        : Promise.resolve([]),
    ]);

    console.log('[searchTopics] 検索結果:', {
      vectorCount: vectorResults.length,
      bm25Count: bm25Results.length,
    });

    if (vectorResults.length > 0) {
      console.log('[searchTopics] ベクトル検索結果のサンプル:', vectorResults.slice(0, 2).map(r => ({
        topicId: r.topicId,
        meetingNoteId: r.meetingNoteId,
        regulationId: r.regulationId,
        title: r.title,
        similarity: r.similarity,
      })));
    }

    if (bm25Results.length > 0) {
      console.log('[searchTopics] BM25検索結果のサンプル:', bm25Results.slice(0, 2).map(r => ({
        topicId: r.topicId,
        bm25Score: r.bm25Score,
        matchedTerms: r.matchedTerms,
      })));
    }

    // BM25検索結果が少ない場合の警告
    if (config.useBM25 && bm25Results.length === 0 && vectorResults.length > 0) {
      console.warn('[searchTopics] BM25検索結果が0件です。ベクトル検索結果のみを使用します。');
    }

    // 検索結果を統合
    let combinedResults: Array<{ 
      id: string; 
      score: number; 
      similarity: number; 
      bm25Score: number;
      meetingNoteId?: string;
      regulationId?: string;
      title?: string;
      contentSummary?: string;
      organizationId?: string;
    }> = [];
    
    if (config.useVector && config.useBM25) {
      // ハイブリッド検索: ベクトル検索とBM25検索を統合
      const vectorResultsForHybrid = vectorResults.map(r => ({
        id: r.topicId,
        similarity: r.similarity,
      }));
      const bm25ResultsForHybrid = bm25Results.map(r => ({
        id: r.topicId,
        bm25Score: r.bm25Score,
      }));
      
      // BM25検索結果が少ない場合は、ベクトル検索の重みを上げる
      const adjustedWeights = bm25Results.length < vectorResults.length / 2
        ? { bm25: config.weights.bm25 * 0.5, vector: config.weights.vector + config.weights.bm25 * 0.5 }
        : config.weights;
      
      console.log('[searchTopics] ハイブリッド検索の重み調整:', {
        original: config.weights,
        adjusted: adjustedWeights,
        bm25Count: bm25Results.length,
        vectorCount: vectorResults.length,
      });
      
      const combined = combineSearchResults(
        vectorResultsForHybrid,
        bm25ResultsForHybrid,
        adjustedWeights
      );

      // ベクトル検索結果から追加情報を取得
      const vectorMap = new Map(vectorResults.map(r => [r.topicId, r]));
      combinedResults = combined.map(r => {
        const vectorInfo = vectorMap.get(r.id);
        return {
          ...r,
          meetingNoteId: vectorInfo?.meetingNoteId,
          regulationId: vectorInfo?.regulationId,
          title: vectorInfo?.title,
          contentSummary: vectorInfo?.contentSummary,
          organizationId: vectorInfo?.organizationId,
        };
      });
    } else if (config.useVector) {
      // ベクトル検索のみ
      combinedResults = vectorResults.map(r => ({
        id: r.topicId,
        score: r.similarity,
        similarity: r.similarity,
        bm25Score: 0,
        meetingNoteId: r.meetingNoteId,
        regulationId: r.regulationId,
        title: r.title,
        contentSummary: r.contentSummary,
        organizationId: r.organizationId,
      }));
    } else if (config.useBM25) {
      // BM25検索のみ（ベクトル検索結果から情報を取得）
      // BM25検索結果が0件の場合は、ベクトル検索結果をフォールバックとして使用
      if (bm25Results.length === 0 && vectorResults.length > 0) {
        console.log('[searchTopics] BM25検索結果が0件のため、ベクトル検索結果をフォールバックとして使用');
        combinedResults = vectorResults.map(r => ({
          id: r.topicId,
          score: r.similarity,
          similarity: r.similarity,
          bm25Score: 0,
          meetingNoteId: r.meetingNoteId,
          regulationId: r.regulationId,
          title: r.title,
          contentSummary: r.contentSummary,
          organizationId: r.organizationId,
        }));
      } else {
        const vectorMap = new Map(vectorResults.map(r => [r.topicId, r]));
        combinedResults = bm25Results.map(r => {
          const vectorInfo = vectorMap.get(r.topicId);
          return {
            id: r.topicId,
            score: r.bm25Score,
            similarity: 0,
            bm25Score: r.bm25Score,
            meetingNoteId: vectorInfo?.meetingNoteId,
            regulationId: vectorInfo?.regulationId,
            title: vectorInfo?.title,
            contentSummary: vectorInfo?.contentSummary,
            organizationId: vectorInfo?.organizationId,
          };
        });
      }
    }

    if (combinedResults.length === 0) {
      console.log('[searchTopics] 検索結果が空のため、空の配列を返します');
      return [];
    }

    // トピックIDとmeetingNoteId/regulationIdのペアを抽出
    const topicIdsWithParentIds = combinedResults.map(r => ({
      topicId: r.id,
      meetingNoteId: r.meetingNoteId,
      regulationId: r.regulationId,
    }));

    // バッチでトピックの詳細情報を取得（N+1問題を回避）
    const topics = await getTopicsByIds(topicIdsWithParentIds);

    // トピックIDとparentIdの複合キーでマップを作成
    const topicMap = new Map(topics.map(t => {
      const parentId = t.meetingNoteId || t.regulationId || '';
      return [`${t.topicId}-${parentId}`, t];
    }));

    // トピックファイル情報を一括取得
    // topicFilesテーブルのtopicIdは{meetingNoteId}-topic-{topicId}または{regulationId}-topic-{topicId}形式
    const topicIdsForFiles = topicIdsWithParentIds.map(({ topicId, meetingNoteId, regulationId }) => {
      const parentId = meetingNoteId || regulationId || '';
      return `${parentId}-topic-${topicId}`;
    });
    const topicFiles = await getTopicFilesByTopicIds(topicIdsForFiles);
    
    // トピックIDをキーにしたファイルマップを作成
    const filesMap = new Map<string, Array<{
      id: string;
      filePath: string;
      fileName: string;
      mimeType?: string;
      description?: string;
      detailedDescription?: string;
      fileSize?: number;
    }>>();
    for (const file of topicFiles) {
      if (!filesMap.has(file.topicId)) {
        filesMap.set(file.topicId, []);
      }
      filesMap.get(file.topicId)!.push({
        id: file.id,
        filePath: file.filePath,
        fileName: file.fileName,
        mimeType: file.mimeType,
        description: file.description,
        detailedDescription: file.detailedDescription,
        fileSize: file.fileSize,
      });
    }
    
    console.log(`[searchTopics] 取得したファイル数: ${topicFiles.length}件 (トピック数: ${topicIdsForFiles.length})`);
    console.log(`[searchTopics] filesMapの内容:`, {
      filesMapSize: filesMap.size,
      filesMapKeys: Array.from(filesMap.keys()),
      filesMapEntries: Array.from(filesMap.entries()).map(([key, files]) => ({
        key,
        fileCount: files.length,
        fileNames: files.map(f => f.fileName),
      })),
    });

    // 結果を構築
    const results: KnowledgeGraphSearchResult[] = [];

    for (const { id: topicId, similarity, bm25Score, meetingNoteId, regulationId, title, contentSummary, organizationId: chromaOrgId } of combinedResults) {
      const parentId = meetingNoteId || regulationId || '';
      let topic = topicMap.get(`${topicId}-${parentId}`);
      
      // トピックが見つからない場合、ChromaDBから取得した情報を直接使用
      if (!topic) {
        const parentType = meetingNoteId ? '会議メモ' : '制度';
        const parentIdStr = meetingNoteId || regulationId || '不明';
        console.warn(`[searchTopics] トピックID ${topicId} (${parentType}ID: ${parentIdStr}) の詳細情報が見つかりませんでした。ChromaDBの情報を使用します。`);
        
        // ChromaDBから取得した情報から最小限のTopicSearchInfoを作成
        topic = {
          topicId: topicId,
          meetingNoteId: meetingNoteId,
          regulationId: regulationId,
          title: title || 'タイトル不明',
          content: contentSummary || '',
          summary: contentSummary,
          semanticCategory: undefined,
          importance: undefined,
          organizationId: chromaOrgId || '', // ChromaDBのメタデータから取得
          keywords: [],
          createdAt: undefined,
          updatedAt: undefined,
          searchCount: 0,
        };
      } else if (!topic.organizationId && chromaOrgId) {
        // トピックが見つかったがorganizationIdが空の場合、ChromaDBから取得した値を設定
        topic.organizationId = chromaOrgId;
      }

      // フィルタリング
      if (filters?.topicSemanticCategory && topic.semanticCategory !== filters.topicSemanticCategory) {
        continue;
      }
      
      // 日付フィルタリング（Firestoreタイムスタンプ形式も処理）
      let createdAtForFilter: string | undefined = topic.createdAt;
      let updatedAtForFilter: string | undefined = topic.updatedAt;
      
      if (createdAtForFilter && typeof createdAtForFilter === 'object' && createdAtForFilter !== null && 'seconds' in createdAtForFilter) {
        const timestamp = createdAtForFilter as { seconds: number; nanoseconds?: number };
        createdAtForFilter = new Date(timestamp.seconds * 1000).toISOString();
      }
      if (updatedAtForFilter && typeof updatedAtForFilter === 'object' && updatedAtForFilter !== null && 'seconds' in updatedAtForFilter) {
        const timestamp = updatedAtForFilter as { seconds: number; nanoseconds?: number };
        updatedAtForFilter = new Date(timestamp.seconds * 1000).toISOString();
      }
      
      if (filters?.createdAfter && createdAtForFilter && createdAtForFilter < filters.createdAfter) {
        continue;
      }
      if (filters?.createdBefore && createdAtForFilter && createdAtForFilter > filters.createdBefore) {
        continue;
      }
      if (filters?.updatedAfter && updatedAtForFilter && updatedAtForFilter < filters.updatedAfter) {
        continue;
      }
      if (filters?.updatedBefore && updatedAtForFilter && updatedAtForFilter > filters.updatedBefore) {
        continue;
      }

      // 類似度を正規化（ベクトル検索の結果がある場合）
      const normalizedSimilarity = similarity > 0 ? normalizeSimilarity(similarity) : 0;
      
      console.log('[searchTopics] 類似度処理:', {
        topicId,
        meetingNoteId,
        rawSimilarity: similarity,
        normalizedSimilarity,
        bm25Score,
        similarityType: typeof similarity,
      });

      // スコア計算（updatedAtがFirestoreタイムスタンプ形式の場合も処理）
      let updatedAtForScore: string | undefined = updatedAtForFilter || topic.updatedAt;
      if (updatedAtForScore && typeof updatedAtForScore === 'object' && updatedAtForScore !== null && 'seconds' in updatedAtForScore) {
        // FirestoreタイムスタンプをISO文字列に変換
        const timestamp = updatedAtForScore as { seconds: number; nanoseconds?: number };
        const milliseconds = timestamp.seconds * 1000;
        updatedAtForScore = new Date(milliseconds).toISOString();
      }
      
      let baseScore = calculateTopicScore(
        normalizedSimilarity,
        {
          importance: topic.importance,
          updatedAt: updatedAtForScore,
          keywords: topic.keywords,
          semanticCategory: topic.semanticCategory,
          title: topic.title,
        },
        weights,
        filters,
        topic.searchCount || 0,
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

      console.log('[searchTopics] スコア計算結果:', {
        topicId,
        meetingNoteId,
        normalizedSimilarity,
        score,
        scoreType: typeof score,
        isNaN: isNaN(score),
        isFinite: isFinite(score),
      });

      // このトピックに紐づくファイル情報を取得
      const topicIdForFiles = `${parentId}-topic-${topicId}`;
      const files = filesMap.get(topicIdForFiles) || [];
      
      const parentType = meetingNoteId ? 'meetingNoteId' : 'regulationId';
      const parentIdStr = meetingNoteId || regulationId || '不明';
      console.log(`[searchTopics] トピック ${topicId} (${parentType}: ${parentIdStr}) のファイル情報:`, {
        topicIdForFiles,
        filesCount: files.length,
        filesMapHasKey: filesMap.has(topicIdForFiles),
        files: files.map(f => ({ fileName: f.fileName, filePath: f.filePath })),
      });

      results.push({
        type: 'topic',
        id: topicId, // トピックのIDとしてtopicIdを使用
        score: typeof score === 'number' && !isNaN(score) ? score : 0,
        similarity: normalizedSimilarity,
        topicId: topicId,
        meetingNoteId: meetingNoteId,
        topic: {
          topicId: topic.topicId,
          title: topic.title || title || '',
          contentSummary: topic.summary || contentSummary || topic.content?.substring(0, 200) || '',
          semanticCategory: topic.semanticCategory,
          keywords: topic.keywords,
          meetingNoteId: topic.meetingNoteId,
          regulationId: topic.regulationId,
          organizationId: topic.organizationId,
          files: files.length > 0 ? files.map(f => ({
            id: f.id,
            filePath: f.filePath,
            fileName: f.fileName,
            mimeType: f.mimeType,
            description: f.description,
            detailedDescription: f.detailedDescription,
            fileSize: f.fileSize,
          })) : undefined,
        },
      });
    }

    // スコアでソート
    results.sort((a, b) => b.score - a.score);

    console.log(`[searchTopics] トピック検索結果 (${results.length}件):`, results);
    return results.slice(0, limit);
  } catch (error) {
    console.error('[searchTopics] トピック検索エラー:', error);
    return [];
  }
}

