/**
 * ハイブリッド検索のヘルパー関数
 * ベクトル検索とBM25検索を統合
 */

/**
 * ハイブリッド検索の重み設定
 */
export interface HybridWeights {
  vector: number;  // ベクトル検索の重み（デフォルト: 0.6）
  bm25: number;    // BM25検索の重み（デフォルト: 0.4）
}

export const DEFAULT_HYBRID_WEIGHTS: HybridWeights = {
  vector: 0.6,
  bm25: 0.4,
};

/**
 * 検索結果の統合（Reciprocal Rank Fusion）
 * 
 * RRFスコア計算式:
 * score(D) = Σ (weight / (k + rank))
 * 
 * パラメータ:
 * - k: 60（デフォルト）- RRFパラメータ
 */
export function combineSearchResults<T extends { id: string; similarity?: number }>(
  vectorResults: Array<{ id: string; similarity: number }>,
  bm25Results: Array<{ id: string; bm25Score: number }>,
  weights: HybridWeights = DEFAULT_HYBRID_WEIGHTS,
  k: number = 60
): Array<{ id: string; score: number; similarity: number; bm25Score: number }> {
  const combined = new Map<string, { 
    score: number; 
    similarity: number; 
    bm25Score: number;
  }>();

  // ベクトル検索結果を追加
  vectorResults.forEach((result, index) => {
    const rrfScore = weights.vector / (k + index + 1);
    const existing = combined.get(result.id);
    if (existing) {
      existing.score += rrfScore;
      existing.similarity = Math.max(existing.similarity, result.similarity);
    } else {
      combined.set(result.id, {
        score: rrfScore,
        similarity: result.similarity,
        bm25Score: 0,
      });
    }
  });

  // BM25検索結果を追加
  bm25Results.forEach((result, index) => {
    const rrfScore = weights.bm25 / (k + index + 1);
    const existing = combined.get(result.id);
    if (existing) {
      existing.score += rrfScore;
      existing.bm25Score = result.bm25Score;
    } else {
      combined.set(result.id, {
        score: rrfScore,
        similarity: 0, // BM25には類似度の概念がない
        bm25Score: result.bm25Score,
      });
    }
  });

  // 配列に変換してソート
  return Array.from(combined.entries())
    .map(([id, data]) => ({
      id,
      score: data.score,
      similarity: data.similarity,
      bm25Score: data.bm25Score,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * ハイブリッド検索の設定
 */
export interface HybridSearchConfig {
  useBM25: boolean;
  useVector: boolean;
  weights: HybridWeights;
}

/**
 * デフォルトのハイブリッド検索設定（バランス型）
 */
export const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  useBM25: true,
  useVector: true,
  weights: DEFAULT_HYBRID_WEIGHTS,
};

