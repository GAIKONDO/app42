/**
 * U位置パーサー
 * position.unit: "1-4" 形式を UPosition に変換
 */

import type { UPosition } from './types';

/**
 * U位置文字列をパース
 * 
 * @param unit - U位置文字列（例: "1-4", "5", "10-12"）
 * @returns UPosition または null（パース失敗時）
 * 
 * @example
 * parseUnitPosition("1-4")  // { uStart: 1, uHeight: 4 }
 * parseUnitPosition("5")    // { uStart: 5, uHeight: 1 }
 * parseUnitPosition("10-12") // { uStart: 10, uHeight: 3 }
 */
export function parseUnitPosition(unit: string | null | undefined): UPosition | null {
  if (!unit || typeof unit !== 'string') {
    return null;
  }

  // 空白を除去
  const trimmed = unit.trim();
  if (!trimmed) {
    return null;
  }

  // "1-4" または "5" 形式をパース
  const match = trimmed.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) {
    console.warn(`[parseUnitPosition] 無効なU位置形式: "${unit}"`);
    return null;
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : start;

  // バリデーション
  if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
    console.warn(`[parseUnitPosition] 無効なU位置値: "${unit}"`);
    return null;
  }

  if (start > end) {
    console.warn(`[parseUnitPosition] 開始Uが終了Uより大きい: "${unit}"`);
    return null;
  }

  return {
    uStart: start,
    uHeight: end - start + 1,
  };
}

/**
 * 複数のU位置文字列をパース
 * 
 * @param units - U位置文字列の配列
 * @returns UPosition の配列（パース失敗したものは除外）
 */
export function parseUnitPositions(units: (string | null | undefined)[]): UPosition[] {
  return units
    .map(unit => parseUnitPosition(unit))
    .filter((pos): pos is UPosition => pos !== null);
}

/**
 * U位置が有効かチェック
 * 
 * @param position - UPosition
 * @param maxUnits - 最大U数（デフォルト: 42）
 * @returns 有効な場合 true
 */
export function isValidUPosition(position: UPosition, maxUnits: number = 42): boolean {
  if (position.uStart < 1 || position.uHeight < 1) {
    return false;
  }
  
  const end = position.uStart + position.uHeight - 1;
  return end <= maxUnits;
}

