/**
 * クエリルーター
 * クエリの種類を分析し、最適な検索戦略を決定
 */

/**
 * クエリタイプ
 */
export type QueryType = 
  | 'factual'      // 事実確認型: "〜とは？", "〜の定義"
  | 'relational'   // 関係性検索型: "〜と〜の関係", "〜に関連する"
  | 'keyword'      // キーワード検索型: 固有名詞が多い
  | 'conceptual'   // 概念検索型: 抽象的な概念
  | 'mixed';       // 混合型: 複数のタイプが混在

/**
 * クエリ分析結果
 */
export interface QueryAnalysis {
  type: QueryType;
  confidence: number;  // 判定の信頼度（0.0-1.0）
  keywords: string[];  // 抽出されたキーワード
  entities: string[];  // 抽出された固有名詞（将来実装）
  reasons: string[];   // 判定理由（デバッグ用）
}

/**
 * クエリを分析してタイプを判定
 */
export function analyzeQuery(query: string): QueryAnalysis {
  if (!query || query.trim().length === 0) {
    return {
      type: 'conceptual',
      confidence: 0.0,
      keywords: [],
      entities: [],
      reasons: ['クエリが空です'],
    };
  }

  const queryLower = query.toLowerCase().trim();
  const keywords: string[] = [];
  const entities: string[] = [];
  const reasons: string[] = [];
  
  // キーワード抽出（簡易版）
  const words = queryLower.split(/\s+/).filter(w => w.length > 1);
  keywords.push(...words);
  
  // 事実確認型のパターン
  const factualPatterns = [
    /とは[？?]?$/,           // 「〜とは？」
    /の定義/,                // 「〜の定義」
    /what is/i,             // "what is"
    /define/i,              // "define"
    /誰[？?]?$/,            // 「誰？」
    /who is/i,              // "who is"
    /where is/i,            // "where is"
    /when is/i,             // "when is"
    /何[？?]?$/,            // 「何？」
    /what does/i,           // "what does"
    /意味[は]?/,            // 「意味は」
    /meaning/i,             // "meaning"
  ];
  
  // 関係性検索型のパターン
  const relationalPatterns = [
    /の関係/,                // 「〜の関係」
    /に関連/,                // 「〜に関連」
    /related to/i,          // "related to"
    /connection/i,          // "connection"
    /と.*の/,               // 「〜と〜の」
    /between.*and/i,        // "between ... and"
    /関連[する]?/,          // 「関連する」
    /つながり/,             // 「つながり」
    /link/i,                // "link"
    /relationship/i,        // "relationship"
  ];
  
  // キーワード検索型のパターン（固有名詞が多い）
  const keywordPatterns = [
    /[A-Z][a-z]+ [A-Z][a-z]+/,  // 固有名詞（英語）: "Toyota Motor"
    /[一-龠]{2,}/,               // 漢字2文字以上（固有名詞の可能性）
    /[A-Z][a-z]+(?: [A-Z][a-z]+)+/, // 複数の固有名詞
  ];
  
  // 概念検索型のパターン（抽象的な概念）
  const conceptualPatterns = [
    /どう[する]?/,          // 「どうする」
    /how to/i,              // "how to"
    /方法/,                  // 「方法」
    /way/i,                  // "way"
    /戦略/,                  // 「戦略」
    /strategy/i,            // "strategy"
    /考え[方]?/,            // 「考え方」
    /concept/i,             // "concept"
  ];
  
  let factualScore = 0;
  let relationalScore = 0;
  let keywordScore = 0;
  let conceptualScore = 0;
  
  // パターンマッチング
  for (const pattern of factualPatterns) {
    if (pattern.test(query)) {
      factualScore += 1;
      reasons.push(`事実確認型パターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of relationalPatterns) {
    if (pattern.test(query)) {
      relationalScore += 1;
      reasons.push(`関係性検索型パターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of keywordPatterns) {
    if (pattern.test(query)) {
      keywordScore += 1;
      reasons.push(`キーワード検索型パターンに一致: ${pattern}`);
    }
  }
  
  for (const pattern of conceptualPatterns) {
    if (pattern.test(query)) {
      conceptualScore += 1;
      reasons.push(`概念検索型パターンに一致: ${pattern}`);
    }
  }
  
  // 追加のヒューリスティック
  
  // 疑問詞が含まれている場合
  if (/[？?]/.test(query)) {
    if (factualScore > 0) {
      factualScore += 0.5;
      reasons.push('疑問符が含まれている（事実確認型の可能性）');
    } else {
      conceptualScore += 0.3;
      reasons.push('疑問符が含まれている（概念検索型の可能性）');
    }
  }
  
  // 固有名詞の検出（簡易版）
  const properNounPattern = /[A-Z][a-z]+|[一-龠]{2,}/g;
  const properNouns = query.match(properNounPattern) || [];
  if (properNouns.length >= 2) {
    keywordScore += 1;
    entities.push(...properNouns);
    reasons.push(`複数の固有名詞が検出されました: ${properNouns.join(', ')}`);
  } else if (properNouns.length === 1) {
    keywordScore += 0.5;
    entities.push(...properNouns);
    reasons.push(`固有名詞が検出されました: ${properNouns[0]}`);
  }
  
  // タイプ判定
  let type: QueryType = 'conceptual'; // デフォルト
  let confidence = 0.5;
  
  const scores = [
    { type: 'factual' as QueryType, score: factualScore },
    { type: 'relational' as QueryType, score: relationalScore },
    { type: 'keyword' as QueryType, score: keywordScore },
    { type: 'conceptual' as QueryType, score: conceptualScore },
  ];
  
  // 最もスコアが高いタイプを選択
  scores.sort((a, b) => b.score - a.score);
  const topScore = scores[0].score;
  const secondScore = scores[1]?.score || 0;
  
  if (topScore > 0) {
    type = scores[0].type;
    // 信頼度の計算: トップスコアと2位のスコアの差が大きいほど信頼度が高い
    if (topScore > secondScore) {
      confidence = Math.min(0.9, 0.5 + (topScore - secondScore) * 0.2);
    } else if (topScore === secondScore && topScore > 0) {
      // 同点の場合は混合型
      type = 'mixed';
      confidence = 0.6;
      reasons.push('複数のタイプが同点のため、混合型と判定');
    } else {
      confidence = 0.5 + topScore * 0.1;
    }
  } else {
    // どのパターンにも一致しない場合は概念検索型
    type = 'conceptual';
    confidence = 0.5;
    reasons.push('どのパターンにも一致しないため、概念検索型と判定');
  }
  
  return {
    type,
    confidence,
    keywords,
    entities,
    reasons,
  };
}

import type { HybridSearchConfig } from './hybridSearch';

/**
 * クエリタイプに基づいて検索戦略を取得
 */
export interface SearchStrategy {
  entity: HybridSearchConfig;
  relation: HybridSearchConfig;
  topic: HybridSearchConfig;
}

/**
 * クエリタイプに応じた検索戦略を取得
 */
export function getSearchStrategy(queryType: QueryType): SearchStrategy {
  switch (queryType) {
    case 'factual':
      // 事実確認型: BM25を重視（固有名詞マッチング）
      // トピックはベクトル検索も重視（長文が多いため）
      return {
        entity: { useBM25: true, useVector: true, weights: { bm25: 0.7, vector: 0.3 } },
        relation: { useBM25: true, useVector: true, weights: { bm25: 0.6, vector: 0.4 } },
        topic: { useBM25: true, useVector: true, weights: { bm25: 0.5, vector: 0.5 } }, // トピックはバランス型
      };
    
    case 'relational':
      // 関係性検索型: ベクトル検索を重視（意味的類似性）
      return {
        entity: { useBM25: true, useVector: true, weights: { bm25: 0.3, vector: 0.7 } },
        relation: { useBM25: true, useVector: true, weights: { bm25: 0.2, vector: 0.8 } },
        topic: { useBM25: true, useVector: true, weights: { bm25: 0.3, vector: 0.7 } },
      };
    
    case 'keyword':
      // キーワード検索型: BM25を重視（ただしトピックはベクトル検索も使用）
      return {
        entity: { useBM25: true, useVector: false, weights: { bm25: 1.0, vector: 0.0 } },
        relation: { useBM25: true, useVector: false, weights: { bm25: 1.0, vector: 0.0 } },
        topic: { useBM25: true, useVector: true, weights: { bm25: 0.7, vector: 0.3 } }, // トピックはハイブリッド
      };
    
    case 'conceptual':
      // 概念検索型: ベクトル検索のみ
      return {
        entity: { useBM25: false, useVector: true, weights: { bm25: 0.0, vector: 1.0 } },
        relation: { useBM25: false, useVector: true, weights: { bm25: 0.0, vector: 1.0 } },
        topic: { useBM25: false, useVector: true, weights: { bm25: 0.0, vector: 1.0 } },
      };
    
    default: // 'mixed'
      // 混合型: バランス型
      return {
        entity: { useBM25: true, useVector: true, weights: { bm25: 0.5, vector: 0.5 } },
        relation: { useBM25: true, useVector: true, weights: { bm25: 0.5, vector: 0.5 } },
        topic: { useBM25: true, useVector: true, weights: { bm25: 0.5, vector: 0.5 } },
      };
  }
}

/**
 * クエリ分析結果をログに出力（デバッグ用）
 */
export function logQueryAnalysis(analysis: QueryAnalysis, query: string): void {
  console.log('[QueryRouter] クエリ分析結果:', {
    query,
    type: analysis.type,
    confidence: analysis.confidence.toFixed(2),
    keywords: analysis.keywords,
    entities: analysis.entities,
    reasons: analysis.reasons,
  });
}

