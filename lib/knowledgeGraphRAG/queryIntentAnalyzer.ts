/**
 * クエリ意図分析
 * ユーザーのクエリの意図を分析し、適切なアクションを決定
 */

/**
 * クエリ意図の種類
 */
export type QueryIntent = 
  | 'count'           // 件数クエリ: "件数を教えて", "何件ある？", "how many"
  | 'list'            // 一覧クエリ: "一覧を教えて", "すべて表示", "list all"
  | 'search'          // 検索クエリ: "〜を検索", "〜について", "〜に関して"
  | 'factual'         // 事実確認: "〜とは？", "〜の定義", "what is"
  | 'relational'      // 関係性: "〜と〜の関係", "related to"
  | 'statistical'     // 統計: "平均", "合計", "最大", "average", "sum", "max"
  | 'comparison'      // 比較: "〜と〜の違い", "difference between"
  | 'action'          // アクション: "作成して", "削除して", "create", "delete"
  | 'mixed';          // 混合型: 複数の意図が混在

/**
 * ターゲットタイプ
 * クエリが対象とするデータタイプ
 */
export type TargetType = 
  | 'entity' 
  | 'relation' 
  | 'topic' 
  | 'startup' 
  | 'focusInitiative' 
  | 'meetingNote' 
  | 'regulation' 
  | 'all';  // すべてのタイプ

/**
 * アクションタイプ
 * 実行すべきアクションの種類
 */
export type ActionType = 
  | 'count'      // 件数を取得
  | 'list'       // 一覧を取得
  | 'search'     // 検索を実行
  | 'get'        // 特定のIDで取得
  | 'create'     // 作成
  | 'update'     // 更新
  | 'delete';    // 削除

/**
 * クエリ意図分析結果
 */
export interface QueryIntentAnalysis {
  intent: QueryIntent;
  confidence: number;  // 判定の信頼度（0.0-1.0）
  targetType?: TargetType;  // 対象となるデータタイプ
  actionType?: ActionType;  // 実行すべきアクションタイプ
  parameters?: {
    organizationId?: string;
    filters?: Record<string, any>;
  };
  keywords: string[];  // 抽出されたキーワード
  reasons: string[];   // 判定理由（デバッグ用）
}

/**
 * ターゲットタイプを検出
 */
export function detectTargetType(query: string): TargetType {
  const queryLower = query.toLowerCase().trim();
  
  // スタートアップ
  if (queryLower.includes('スタートアップ') || queryLower.includes('startup')) {
    return 'startup';
  }
  
  // エンティティ
  if (queryLower.includes('エンティティ') || queryLower.includes('entity') || 
      queryLower.includes('人物') || queryLower.includes('組織') || 
      queryLower.includes('概念')) {
    return 'entity';
  }
  
  // リレーション
  if (queryLower.includes('リレーション') || queryLower.includes('relation') ||
      queryLower.includes('関係')) {
    return 'relation';
  }
  
  // トピック
  if (queryLower.includes('トピック') || queryLower.includes('topic')) {
    return 'topic';
  }
  
  // 注力施策
  if (queryLower.includes('注力施策') || queryLower.includes('focus initiative') ||
      queryLower.includes('施策')) {
    return 'focusInitiative';
  }
  
  // 議事録
  if (queryLower.includes('議事録') || queryLower.includes('meeting note') ||
      queryLower.includes('会議') || queryLower.includes('meeting')) {
    return 'meetingNote';
  }
  
  // 制度
  if (queryLower.includes('制度') || queryLower.includes('regulation')) {
    return 'regulation';
  }
  
  // デフォルトはすべて
  return 'all';
}

/**
 * クエリ意図を分析
 */
export function analyzeQueryIntent(query: string): QueryIntentAnalysis {
  if (!query || query.trim().length === 0) {
    return {
      intent: 'search',
      confidence: 0.0,
      actionType: 'search',
      keywords: [],
      reasons: ['クエリが空です'],
    };
  }

  const queryLower = query.toLowerCase().trim();
  const keywords: string[] = [];
  const reasons: string[] = [];
  
  // キーワード抽出
  const words = queryLower.split(/\s+/).filter(w => w.length > 1);
  keywords.push(...words);
  
  // 件数クエリのパターン
  const countPatterns = [
    /件数[をは]?[教えて]?/,
    /何件/,
    /いくつ/,
    /how many/i,
    /count/i,
    /合計[は]?/,
    /総数[は]?/,
    /全部で[は]?/,
    /全部[は]?/,
  ];
  
  // 一覧クエリのパターン
  const listPatterns = [
    /一覧[を]?[教えて]?/,
    /すべて[を]?[表示]?/,
    /全部[を]?[表示]?/,
    /list/i,
    /all/i,
    /全て[を]?/,
    /すべて[を]?/,
  ];
  
  // 統計クエリのパターン
  const statisticalPatterns = [
    /平均/,
    /合計/,
    /最大/,
    /最小/,
    /average/i,
    /sum/i,
    /max/i,
    /min/i,
    /mean/i,
  ];
  
  // 比較クエリのパターン
  const comparisonPatterns = [
    /違い/,
    /比較/,
    /difference/i,
    /compare/i,
    /comparison/i,
  ];
  
  // アクションクエリのパターン
  const actionPatterns = [
    /作成[して]?/,
    /追加[して]?/,
    /削除[して]?/,
    /更新[して]?/,
    /create/i,
    /add/i,
    /delete/i,
    /update/i,
    /remove/i,
  ];
  
  // パターンマッチング
  let countScore = 0;
  let listScore = 0;
  let statisticalScore = 0;
  let comparisonScore = 0;
  let actionScore = 0;
  
  for (const pattern of countPatterns) {
    if (pattern.test(queryLower)) {
      countScore += 1;
      reasons.push(`件数クエリのパターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of listPatterns) {
    if (pattern.test(queryLower)) {
      listScore += 1;
      reasons.push(`一覧クエリのパターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of statisticalPatterns) {
    if (pattern.test(queryLower)) {
      statisticalScore += 1;
      reasons.push(`統計クエリのパターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of comparisonPatterns) {
    if (pattern.test(queryLower)) {
      comparisonScore += 1;
      reasons.push(`比較クエリのパターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of actionPatterns) {
    if (pattern.test(queryLower)) {
      actionScore += 1;
      reasons.push(`アクションクエリのパターンに一致: ${pattern}`);
    }
  }
  
  // 意図の判定
  let intent: QueryIntent = 'search'; // デフォルトは検索
  let confidence = 0.5;
  let actionType: ActionType = 'search';
  
  const scores = [
    { intent: 'count' as QueryIntent, score: countScore, actionType: 'count' as ActionType },
    { intent: 'list' as QueryIntent, score: listScore, actionType: 'list' as ActionType },
    { intent: 'statistical' as QueryIntent, score: statisticalScore, actionType: 'search' as ActionType },
    { intent: 'comparison' as QueryIntent, score: comparisonScore, actionType: 'search' as ActionType },
    { intent: 'action' as QueryIntent, score: actionScore, actionType: 'create' as ActionType },
  ];
  
  // 最もスコアが高い意図を選択
  scores.sort((a, b) => b.score - a.score);
  const topScore = scores[0].score;
  const secondScore = scores[1]?.score || 0;
  
  if (topScore > 0) {
    intent = scores[0].intent;
    actionType = scores[0].actionType;
    
    // 信頼度の計算
    if (topScore > secondScore) {
      confidence = Math.min(0.95, 0.7 + (topScore - secondScore) * 0.1);
    } else if (topScore === secondScore && topScore > 0) {
      // 同点の場合は混合型
      intent = 'mixed';
      confidence = 0.6;
      reasons.push('複数の意図が同点のため、混合型と判定');
    } else {
      confidence = 0.6 + topScore * 0.1;
    }
  } else {
    // どのパターンにも一致しない場合は検索型
    intent = 'search';
    actionType = 'search';
    confidence = 0.5;
    reasons.push('どのパターンにも一致しないため、検索型と判定');
  }
  
  // ターゲットタイプを検出
  const targetType = detectTargetType(query);
  if (targetType !== 'all') {
    reasons.push(`ターゲットタイプを検出: ${targetType}`);
  }
  
  return {
    intent,
    confidence,
    targetType,
    actionType,
    keywords,
    reasons,
  };
}

/**
 * クエリ意図分析結果をログに出力（デバッグ用）
 */
export function logQueryIntentAnalysis(analysis: QueryIntentAnalysis, query: string): void {
  console.log('[QueryIntentAnalyzer] クエリ意図分析結果:', {
    query,
    intent: analysis.intent,
    confidence: analysis.confidence.toFixed(2),
    targetType: analysis.targetType,
    actionType: analysis.actionType,
    keywords: analysis.keywords,
    reasons: analysis.reasons,
  });
}

