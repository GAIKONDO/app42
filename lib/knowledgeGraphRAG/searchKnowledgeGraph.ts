/**
 * ナレッジグラフ全体を検索
 * エンティティ、リレーション、トピックを統合して検索
 */

import type { KnowledgeGraphSearchResult, SearchFilters } from './types';
import { searchEntities } from './searchEntities';
import { searchRelations } from './searchRelations';
import { searchTopics } from './searchTopics';
import { searchStartups } from './searchStartups';
import { searchFocusInitiatives } from './searchFocusInitiatives';
import { searchMeetingNotes } from './searchMeetingNotes';
import { searchRegulations } from './searchRegulations';
import { adjustWeightsForQuery, DEFAULT_WEIGHTS } from '../ragSearchScoring';
import { type HybridSearchConfig, DEFAULT_HYBRID_CONFIG } from './hybridSearch';
import { analyzeQuery, getSearchStrategy, logQueryAnalysis, type QueryAnalysis } from './queryRouter';
import { getSearchConfig } from './searchConfig';

/**
 * ナレッジグラフ全体を検索
 * エンティティ、リレーション、トピックを統合して検索
 * 
 * @param queryText 検索クエリテキスト
 * @param limit 各タイプごとの最大結果数（デフォルト: 10）
 * @param filters フィルタリング条件（オプション）
 * @param useCache キャッシュを使用するか（デフォルト: true）
 * @param timeoutMs タイムアウト時間（ミリ秒、デフォルト: 10000）
 * @param hybridConfig ハイブリッド検索の設定（オプション、デフォルト: 設定ファイルから取得）
 * @param useRouter クエリルーターを使用するか（オプション、デフォルト: 設定ファイルから取得）
 * @returns 統合検索結果の配列
 */
export async function searchKnowledgeGraph(
  queryText: string,
  limit: number = 10,
  filters?: SearchFilters,
  useCache: boolean = true,
  timeoutMs: number = 10000,
  hybridConfig?: HybridSearchConfig,
  useRouter?: boolean // 未指定の場合は設定から取得
): Promise<KnowledgeGraphSearchResult[]> {
  console.log('[searchKnowledgeGraph] 関数呼び出し:', { 
    queryText: queryText?.substring(0, 50), 
    limit, 
    hasFilters: !!filters,
    useCache,
    timeoutMs,
    hasHybridConfig: !!hybridConfig,
    useRouter,
  });
  
  try {
    // 設定を取得（useRouterが未指定の場合）
    const searchConfig = typeof window !== 'undefined' ? getSearchConfig() : {
      enableBM25: false,
      enableRouter: false,
      useHybridSearchByDefault: false,
    };
    
    console.log('[searchKnowledgeGraph] 検索設定:', searchConfig);
    
    // useRouterが未指定の場合は設定から取得
    const finalUseRouter = useRouter !== undefined ? useRouter : searchConfig.enableRouter;
    
    // hybridConfigが未指定で、ハイブリッド検索がデフォルトで有効な場合は使用
    const finalHybridConfig = hybridConfig || (searchConfig.useHybridSearchByDefault && searchConfig.enableBM25
      ? DEFAULT_HYBRID_CONFIG
      : undefined);

    console.log('[searchKnowledgeGraph] 検索開始:', { 
      queryText, 
      limit, 
      filters,
      useRouter: finalUseRouter,
      useHybridSearch: !!finalHybridConfig,
      hybridConfig: finalHybridConfig,
    });
    
    if (!queryText || !queryText.trim()) {
      console.warn('[searchKnowledgeGraph] クエリテキストが空です');
      return [];
    }
    
    // クエリテキストを正規化（前後の空白を削除）
    const normalizedQuery = queryText.trim();
    console.log('[searchKnowledgeGraph] 正規化されたクエリ:', normalizedQuery);

    // organizationIdが未指定の場合、Rust側で全組織横断検索が実行される
    // そのため、organizationIdが未指定でも検索を続行する

    // クエリに基づいて重みを調整
    const weights = adjustWeightsForQuery(normalizedQuery, DEFAULT_WEIGHTS);

    // 各タイプごとの検索数を計算（limitを7等分：entities, relations, topics, startups, focusInitiatives, meetingNotes, regulations）
    const perTypeLimit = Math.max(1, Math.ceil(limit / 7));
    // トピック検索の上限を60件に設定
    const topicLimit = 60;

    // クエリルーターを使用する場合、クエリを分析して検索戦略を決定
    let entityHybridConfig: HybridSearchConfig | undefined;
    let relationHybridConfig: HybridSearchConfig | undefined;
    let topicHybridConfig: HybridSearchConfig | undefined;
    let queryAnalysis: QueryAnalysis | undefined;

    if (finalUseRouter) {
      // クエリを分析
      queryAnalysis = analyzeQuery(normalizedQuery);
      logQueryAnalysis(queryAnalysis, normalizedQuery);

      // クエリタイプに応じた検索戦略を取得
      const strategy = getSearchStrategy(queryAnalysis.type);
      entityHybridConfig = strategy.entity;
      relationHybridConfig = strategy.relation;
      topicHybridConfig = strategy.topic;

      console.log('[searchKnowledgeGraph] クエリルーター適用:', {
        queryType: queryAnalysis.type,
        confidence: queryAnalysis.confidence,
        strategy: {
          entity: entityHybridConfig,
          relation: relationHybridConfig,
          topic: topicHybridConfig,
        },
      });
    }

    // ハイブリッド検索の設定（ルーターが使用されていない場合は指定された設定またはデフォルト）
    const defaultConfig = {
      useBM25: searchConfig.enableBM25 && searchConfig.useHybridSearchByDefault,
      useVector: true,
      weights: DEFAULT_HYBRID_CONFIG.weights,
    };
    
    const finalEntityHybridConfig = entityHybridConfig || finalHybridConfig || defaultConfig;
    const finalRelationHybridConfig = relationHybridConfig || finalHybridConfig || defaultConfig;
    const finalTopicHybridConfig = topicHybridConfig || finalHybridConfig || defaultConfig;

    // 並列で各タイプを検索
    console.log('[searchKnowledgeGraph] 並列検索を開始:', { 
      perTypeLimit, 
      topicLimit,
      filters, 
      useRouter: finalUseRouter,
      entityHybridConfig: finalEntityHybridConfig,
      relationHybridConfig: finalRelationHybridConfig,
      topicHybridConfig: finalTopicHybridConfig,
    });
    
    const [entityResults, relationResults, topicResults, startupResults, focusInitiativeResults, meetingNoteResults, regulationResults] = await Promise.all([
      // エンティティ検索
      searchEntities(normalizedQuery, perTypeLimit, filters, weights, finalEntityHybridConfig).catch(error => {
        console.error('[searchKnowledgeGraph] エンティティ検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // リレーション検索
      searchRelations(normalizedQuery, perTypeLimit, filters, weights, finalRelationHybridConfig).catch(error => {
        console.error('[searchKnowledgeGraph] リレーション検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // トピック検索（上限60件）
      searchTopics(normalizedQuery, topicLimit, filters, weights, finalTopicHybridConfig).catch(error => {
        console.error('[searchKnowledgeGraph] トピック検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // スタートアップ検索
      searchStartups(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] スタートアップ検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // 注力施策検索
      searchFocusInitiatives(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] 注力施策検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // 議事録検索
      searchMeetingNotes(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] 議事録検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      }),
      
      // 制度検索
      searchRegulations(normalizedQuery, perTypeLimit, filters, weights).catch(error => {
        console.error('[searchKnowledgeGraph] 制度検索エラー:', error);
        return [] as KnowledgeGraphSearchResult[];
      })
    ]);
    
    console.log('[searchKnowledgeGraph] 並列検索完了:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
      topicCount: topicResults.length,
      startupCount: startupResults.length,
      focusInitiativeCount: focusInitiativeResults.length,
      meetingNoteCount: meetingNoteResults.length,
      regulationCount: regulationResults.length,
    });

    // 結果を統合
    const allResults = [
      ...entityResults,
      ...relationResults,
      ...topicResults,
      ...startupResults,
      ...focusInitiativeResults,
      ...meetingNoteResults,
      ...regulationResults,
    ];

    console.log('[searchKnowledgeGraph] 検索結果:', {
      entityCount: entityResults.length,
      relationCount: relationResults.length,
      topicCount: topicResults.length,
      startupCount: startupResults.length,
      focusInitiativeCount: focusInitiativeResults.length,
      meetingNoteCount: meetingNoteResults.length,
      regulationCount: regulationResults.length,
      totalCount: allResults.length,
    });

    // スコアでソート
    allResults.sort((a, b) => b.score - a.score);

    // トピックの重複排除（同じtopicIdは最高スコアのもののみ残す）
    const seenTopicIds = new Set<string>();
    const deduplicatedResults = allResults.filter(result => {
      if (result.type === 'topic' && result.topicId) {
        if (seenTopicIds.has(result.topicId)) {
          // 既に同じtopicIdが存在する場合はスキップ（最高スコアのもののみ残す）
          return false;
        }
        seenTopicIds.add(result.topicId);
      }
      return true;
    });

    console.log('[searchKnowledgeGraph] 重複排除:', {
      before: allResults.length,
      after: deduplicatedResults.length,
      removed: allResults.length - deduplicatedResults.length,
    });

    // トピックを優先的に含める（最大40件）
    const topicResultsInAll = deduplicatedResults.filter(r => r.type === 'topic');
    const otherResults = deduplicatedResults.filter(r => r.type !== 'topic');
    
    // トピックを最初に含め、その後他のタイプの結果を追加
    // トピックは最大40件、他のタイプは元のlimitを超えない範囲で追加
    const displayedTopicCount = Math.min(40, topicResultsInAll.length);
    const maxOtherResults = Math.max(0, limit - displayedTopicCount);
    const finalResults = [
      ...topicResultsInAll.slice(0, 40), // トピックは最大40件
      ...otherResults.slice(0, maxOtherResults), // 他のタイプは残りの枠
    ];
    
    console.log('[searchKnowledgeGraph] 最終結果数:', finalResults.length, {
      topicCount: topicResultsInAll.slice(0, 40).length,
      otherCount: otherResults.slice(0, maxOtherResults).length,
    });
    return finalResults;
  } catch (error: any) {
    console.error('[searchKnowledgeGraph] 検索エラー:', error);
    console.error('[searchKnowledgeGraph] エラーメッセージ:', error?.message);
    console.error('[searchKnowledgeGraph] エラースタック:', error?.stack);
    return [];
  }
}

