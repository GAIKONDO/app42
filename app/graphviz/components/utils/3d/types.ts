/**
 * 3D表示用の型定義
 */

/**
 * U位置（ユニット位置）
 */
export interface UPosition {
  uStart: number;    // 開始U（1始まり）
  uHeight: number;   // 高さ（U数）
}

/**
 * ラックの3D座標位置
 */
export interface Rack3DPosition {
  x: number;  // row（列）→ X軸（メートル）
  y: number;  // floor（階層）→ Y軸（メートル、高さ）
  z: number;  // position（位置）→ Z軸（メートル）
}

/**
 * 機器の3D位置（ラック内）
 */
export interface Device3DPosition {
  y: number;      // U位置（下から上、メートル）
  height: number; // 高さ（U数、メートル）
}

/**
 * 使用中のU範囲
 */
export interface UsedU {
  start: number;  // 開始U（1始まり）
  end: number;    // 終了U（1始まり）
}

/**
 * 空きU範囲
 */
export interface FreeU {
  start: number;  // 開始U（1始まり）
  end: number;    // 終了U（1始まり）
}

/**
 * ラックの位置情報
 */
export interface RackLocation {
  floor?: number;
  row?: string;
  position?: number;
}

/**
 * ラックの容量情報
 */
export interface RackCapacity {
  units?: number;  // U数（デフォルト: 42）
  power?: number;  // 電力（kW）
}

