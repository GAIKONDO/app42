/**
 * BM25パラメータの自動調整
 * 検索結果の品質に基づいてパラメータを最適化
 */

import type { BM25Config } from '@/lib/bm25Search';
import type { KnowledgeGraphSearchResult } from './types';

/**
 * パラメータ調整の結果
 */
export interface ParameterTuningResult {
  k1: number;
  b: number;
  score: number; // 調整後のスコア（0.0-1.0）
  improvements: string[]; // 改善点
}

/**
 * 検索結果の品質を評価
 */
function evaluateSearchQuality(
  results: KnowledgeGraphSearchResult[],
  expectedTopResults?: string[] // 期待される上位結果のID（オプション）
): number {
  if (results.length === 0) {
    return 0;
  }

  let score = 0;

  // 1. 結果数の評価（適切な数があるか）
  if (results.length >= 5 && results.length <= 20) {
    score += 0.3;
  } else if (results.length > 0) {
    score += 0.1;
  }

  // 2. スコアの分散評価（適切な差があるか）
  if (results.length > 1) {
    const scores = results.map(r => r.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const scoreRange = maxScore - minScore;
    
    // スコアに適切な差がある場合
    if (scoreRange > 0.1 && scoreRange < 0.9) {
      score += 0.3;
    } else if (scoreRange > 0) {
      score += 0.1;
    }
  }

  // 3. 期待される結果が含まれているか（オプション）
  if (expectedTopResults && expectedTopResults.length > 0) {
    const top3Ids = results.slice(0, 3).map(r => r.id);
    const matches = expectedTopResults.filter(id => top3Ids.includes(id));
    score += (matches.length / expectedTopResults.length) * 0.4;
  } else {
    // 期待される結果がない場合は、スコアの高さで評価
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (avgScore > 0.3 && avgScore < 0.9) {
      score += 0.4;
    } else if (avgScore > 0) {
      score += 0.2;
    }
  }

  return Math.min(1.0, score);
}

/**
 * BM25パラメータを自動調整
 * 
 * @param testQueries テストクエリと期待される結果のペア
 * @param initialConfig 初期パラメータ
 * @returns 最適化されたパラメータ
 */
export async function tuneBM25Parameters(
  testQueries: Array<{
    query: string;
    expectedResults?: string[]; // 期待される結果のID
    searchFunction: (query: string, config: BM25Config) => Promise<KnowledgeGraphSearchResult[]>;
  }>,
  initialConfig: BM25Config = { k1: 1.5, b: 0.75 }
): Promise<ParameterTuningResult> {
  console.log('[tuneBM25Parameters] パラメータ調整開始:', { testQueriesCount: testQueries.length });

  // パラメータの候補値
  const k1Candidates = [1.2, 1.5, 1.8, 2.0];
  const bCandidates = [0.5, 0.75, 1.0];

  let bestConfig = initialConfig;
  let bestScore = 0;
  const improvements: string[] = [];

  // 各パラメータの組み合わせをテスト
  for (const k1 of k1Candidates) {
    for (const b of bCandidates) {
      const config: BM25Config = { k1, b };
      let totalScore = 0;

      // 各テストクエリで評価
      for (const testQuery of testQueries) {
        try {
          const results = await testQuery.searchFunction(testQuery.query, config);
          const quality = evaluateSearchQuality(results, testQuery.expectedResults);
          totalScore += quality;
        } catch (error) {
          console.warn('[tuneBM25Parameters] 検索エラー:', error);
        }
      }

      const avgScore = totalScore / testQueries.length;

      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestConfig = config;
        improvements.push(
          `k1=${k1}, b=${b}: スコア ${avgScore.toFixed(3)} (改善: ${((avgScore - bestScore) * 100).toFixed(1)}%)`
        );
      }
    }
  }

  console.log('[tuneBM25Parameters] 最適パラメータ:', {
    k1: bestConfig.k1,
    b: bestConfig.b,
    score: bestScore,
  });

  return {
    k1: bestConfig.k1,
    b: bestConfig.b,
    score: bestScore,
    improvements: improvements.slice(-5), // 最後の5件の改善点
  };
}

/**
 * デフォルトパラメータの推奨値
 * 一般的なドキュメントコーパスに適した値
 */
export const RECOMMENDED_BM25_CONFIG: BM25Config = {
  k1: 1.5,
  b: 0.75,
};

/**
 * 短いドキュメント向けのパラメータ
 */
export const SHORT_DOCUMENT_CONFIG: BM25Config = {
  k1: 1.2,
  b: 0.5,
};

/**
 * 長いドキュメント向けのパラメータ
 */
export const LONG_DOCUMENT_CONFIG: BM25Config = {
  k1: 2.0,
  b: 1.0,
};

