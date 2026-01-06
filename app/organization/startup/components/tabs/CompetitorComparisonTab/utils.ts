import type { ComparisonMatrix } from './types';

// マトリクスのbooleanを数値に変換（後方互換性）
export const convertMatrixToScores = (matrix: any): ComparisonMatrix => {
  const converted: ComparisonMatrix = {};
  Object.keys(matrix).forEach(startupId => {
    converted[startupId] = {};
    Object.keys(matrix[startupId]).forEach(axisId => {
      const value = matrix[startupId][axisId];
      // booleanの場合は1点に変換、数値の場合はそのまま
      converted[startupId][axisId] = typeof value === 'boolean' ? (value ? 1 : 0) : (typeof value === 'number' ? value : 0);
    });
  });
  return converted;
};

// 点数ごとの色を取得
export const getScoreColor = (score: number | undefined): { bg: string; text: string; border: string } => {
  if (score === undefined || score === 0) {
    return { bg: '#F3F4F6', text: '#9CA3AF', border: '#E5E7EB' }; // グレーアウト
  } else if (score === 1) {
    return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' }; // 赤系
  } else if (score === 2) {
    return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' }; // オレンジ系
  } else if (score === 3) {
    return { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' }; // 黄色系
  } else if (score === 4) {
    return { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' }; // 緑系
  } else if (score === 5) {
    return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' }; // 濃い緑系
  }
  return { bg: '#F3F4F6', text: '#9CA3AF', border: '#E5E7EB' };
};

