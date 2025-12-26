/**
 * 座標変換ユーティリティ
 * ラック位置やU位置を3D座標に変換
 */

import type { Rack3DPosition, Device3DPosition, RackLocation, FreeU, UsedU } from './types';
import type { Equipment } from '@/lib/graphvizHierarchyApi';
import { parseUnitPosition } from './unitParser';

/**
 * 1Uの高さ（メートル）
 * 標準: 1U = 44.45mm = 0.04445m
 */
export const U_HEIGHT_M = 0.04445;

/**
 * ラックの標準サイズ（メートル）
 */
export const RACK_DIMENSIONS = {
  width: 0.6,    // 幅: 600mm
  depth: 1.0,   // 奥行: 1000mm
  height: 1.87, // 高さ: 42U = 1866.9mm ≈ 1.87m
};

/**
 * ラック間の標準間隔（メートル）
 */
export const RACK_SPACING = {
  x: 1.0,  // 列間隔（X軸）
  y: 3.0,  // 階層間隔（Y軸、高さ）
  z: 1.0,  // 位置間隔（Z軸、奥行）
};

/**
 * ラックの位置情報を3D座標に変換
 * 
 * @param location - ラックの位置情報
 * @returns 3D座標位置
 * 
 * @example
 * rackLocationTo3D({ floor: 1, row: 'A', position: 1 })
 * // { x: 0, y: 3.0, z: 0 }
 */
export function rackLocationTo3D(location: RackLocation): Rack3DPosition {
  // row: "A" → 0, "B" → 1, ...
  const rowIndex = location.row 
    ? location.row.charCodeAt(0) - 'A'.charCodeAt(0)
    : 0;

  return {
    x: rowIndex * RACK_SPACING.x,
    y: (location.floor || 1) * RACK_SPACING.y,
    z: (location.position || 0) * RACK_SPACING.z,
  };
}

/**
 * U位置を3D高さに変換（ラック内）
 * 
 * @param uStart - 開始U（1始まり）
 * @param uHeight - U数（高さ）
 * @param rackCapacity - ラック容量（U数、デフォルト: 42）
 * @returns 3D位置（Y座標と高さ）
 * 
 * @example
 * unitTo3DHeight(1, 4, 42)
 * // { y: 0, height: 0.1778 }
 */
export function unitTo3DHeight(
  uStart: number,
  uHeight: number,
  rackCapacity: number = 42
): Device3DPosition {
  // 下から上への配置（Y軸）
  // Uは1始まりなので、uStart=1の場合はy=0
  const y = (uStart - 1) * U_HEIGHT_M;
  const height = uHeight * U_HEIGHT_M;

  return { y, height };
}

/**
 * 機器のU位置を3D座標に変換
 * 
 * @param equipment - 機器情報
 * @param rackCapacity - ラック容量（U数、デフォルト: 42）
 * @returns 3D位置、または null（U位置が無効な場合）
 */
export function equipmentTo3DPosition(
  equipment: Equipment,
  rackCapacity: number = 42
): Device3DPosition | null {
  if (!equipment.position?.unit) {
    return null;
  }

  const uPosition = parseUnitPosition(equipment.position.unit);
  if (!uPosition) {
    return null;
  }

  return unitTo3DHeight(uPosition.uStart, uPosition.uHeight, rackCapacity);
}

/**
 * 使用中のU範囲を計算
 * 
 * @param equipment - 機器の配列
 * @returns 使用中のU範囲の配列
 */
export function calculateUsedUs(equipment: Equipment[]): UsedU[] {
  const usedUs: UsedU[] = [];

  for (const eq of equipment) {
    if (eq.position?.unit) {
      const pos = parseUnitPosition(eq.position.unit);
      if (pos) {
        usedUs.push({
          start: pos.uStart,
          end: pos.uStart + pos.uHeight - 1,
        });
      }
    }
  }

  // 開始位置でソート
  usedUs.sort((a, b) => a.start - b.start);

  return usedUs;
}

/**
 * 空きU範囲を計算
 * 
 * @param equipment - 機器の配列
 * @param rackCapacity - ラック容量（U数、デフォルト: 42）
 * @returns 空きU範囲の配列
 * 
 * @example
 * calculateFreeUs([equipment1, equipment2], 42)
 * // [{ start: 1, end: 5 }, { start: 10, end: 42 }]
 */
export function calculateFreeUs(
  equipment: Equipment[],
  rackCapacity: number = 42
): FreeU[] {
  const usedUs = calculateUsedUs(equipment);
  const freeUs: FreeU[] = [];
  
  let current = 1;

  for (const used of usedUs) {
    if (current < used.start) {
      freeUs.push({ start: current, end: used.start - 1 });
    }
    current = Math.max(current, used.end + 1);
  }

  if (current <= rackCapacity) {
    freeUs.push({ start: current, end: rackCapacity });
  }

  return freeUs;
}

/**
 * 空きU数を計算
 * 
 * @param equipment - 機器の配列
 * @param rackCapacity - ラック容量（U数、デフォルト: 42）
 * @returns 空きU数
 */
export function calculateFreeUCount(
  equipment: Equipment[],
  rackCapacity: number = 42
): number {
  const freeUs = calculateFreeUs(equipment, rackCapacity);
  return freeUs.reduce((sum, free) => sum + (free.end - free.start + 1), 0);
}

/**
 * 使用中U数を計算
 * 
 * @param equipment - 機器の配列
 * @returns 使用中U数
 */
export function calculateUsedUCount(equipment: Equipment[]): number {
  const usedUs = calculateUsedUs(equipment);
  return usedUs.reduce((sum, used) => sum + (used.end - used.start + 1), 0);
}

