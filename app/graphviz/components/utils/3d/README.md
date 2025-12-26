# 3D表示ユーティリティ

Graphvizタブの3D表示で使用する共通ユーティリティ関数とコンポーネントです。

## ファイル構成

- `types.ts` - 3D表示用の型定義
- `unitParser.ts` - U位置パーサー（"1-4" → { uStart: 1, uHeight: 4 }）
- `coordinateConverter.ts` - 座標変換ユーティリティ（ラック位置、U位置を3D座標に変換）
- `ThreeScene.tsx` - Three.jsシーンの共通ラッパーコンポーネント
- `index.ts` - エクスポート

## 使用方法

### U位置のパース

```typescript
import { parseUnitPosition } from '@/app/graphviz/components/utils/3d';

const position = parseUnitPosition("1-4");
// { uStart: 1, uHeight: 4 }

const position2 = parseUnitPosition("5");
// { uStart: 5, uHeight: 1 }
```

### 座標変換

```typescript
import { rackLocationTo3D, unitTo3DHeight } from '@/app/graphviz/components/utils/3d';

// ラック位置を3D座標に変換
const rackPos = rackLocationTo3D({ floor: 1, row: 'A', position: 1 });
// { x: 0, y: 3.0, z: 0 }

// U位置を3D高さに変換
const devicePos = unitTo3DHeight(1, 4, 42);
// { y: 0, height: 0.1778 }
```

### 空きUの計算

```typescript
import { calculateFreeUs, calculateFreeUCount } from '@/app/graphviz/components/utils/3d';

const freeUs = calculateFreeUs(equipment, 42);
// [{ start: 1, end: 5 }, { start: 10, end: 42 }]

const freeCount = calculateFreeUCount(equipment, 42);
// 38
```

### ThreeSceneコンポーネント

```typescript
import { ThreeScene } from '@/app/graphviz/components/utils/3d';

<ThreeScene
  width={800}
  height={600}
  backgroundColor="#f0f0f0"
  enableOrbitControls={true}
  onSceneReady={(scene, camera, renderer) => {
    // シーン準備完了時の処理
  }}
  onRender={(scene, camera, renderer) => {
    // レンダーループでの処理
  }}
/>
```

## 定数

- `U_HEIGHT_M`: 1Uの高さ（0.04445m = 44.45mm）
- `RACK_DIMENSIONS`: ラックの標準サイズ（幅: 0.6m, 奥行: 1.0m, 高さ: 1.87m）
- `RACK_SPACING`: ラック間の標準間隔（X: 1.0m, Y: 3.0m, Z: 1.0m）

## 型定義

- `UPosition`: U位置（uStart, uHeight）
- `Rack3DPosition`: ラックの3D座標位置（x, y, z）
- `Device3DPosition`: 機器の3D位置（y, height）
- `FreeU`: 空きU範囲（start, end）
- `UsedU`: 使用中U範囲（start, end）

