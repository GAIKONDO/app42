# Graphvizタブの3D表示拡張 設計検討書

## 1. 現状分析

### 1.1 現在のデータ構造

Graphvizタブでは以下の階層構造でデータが管理されています：

#### site-equipment (タブ2)
```yaml
racks:
  - id: rack_001
    label: ラック1
    location:
      floor: 1        # 階層
      row: A          # 列
      position: 1     # 位置
    capacity:
      units: 42       # U数
      power: 10       # 電力(kW)
    equipment:
      - id: server_001
        type: server
        position:
          unit: "1-4"  # U位置（開始-終了）
```

#### rack-servers (タブ3)
```yaml
servers:
  - id: server_001
    position:
      unit: "1-4"  # U位置
```

### 1.2 既存の3Dライブラリ

- ✅ `three` (v0.182.0) - インストール済み
- ✅ `react-force-graph-3d` (v1.25.0) - インストール済み
- ✅ `@types/three` - インストール済み

**結論**: 追加のパッケージインストールは不要

---

## 2. 3D表示の実装方針（全階層対応）

### 2.1 全階層での3D表示対象

以下の**全ての階層**で3D表示を実装：

#### Tab0: 全体俯瞰の3D表示
- **表示内容**: 階層全体を統合した3D表示
- **対象データ**: 複数棟、ラック、機器を階層的に配置
- **特徴**: 
  - 棟を大きな箱として表示
  - 棟内のラックを配置
  - クリックで各階層にドリルダウン

#### Tab1: 棟間ネットワークの3D表示
- **表示内容**: 複数棟間のネットワーク接続を3Dで表示
- **対象データ**: site-topology（棟と接続）
- **特徴**:
  - 棟を地理的位置（lat/lon）または論理的位置で配置
  - 棟間の接続を3D線で表示
  - 帯域幅や遅延を視覚化（線の太さ、色）

#### Tab2: 棟内機器構成の3D表示
- **表示内容**: 1つの棟内の複数ラックと機器を3Dで表示
- **対象データ**: site-equipment（ラックと機器）
- **特徴**:
  - 複数ラックを3D空間に配置（floor, row, position）
  - ラック内の機器をU位置に配置
  - 空きUを視覚化

#### Tab3: ラック内サーバーの3D表示
- **表示内容**: 1つのラック内のサーバーを3Dで表示
- **対象データ**: rack-servers（サーバーとポート）
- **特徴**:
  - 単一ラックを3Dで表示
  - サーバーをU位置に配置
  - ポート接続を表示（オプション）

#### Tab4: サーバー詳細の3D表示
- **表示内容**: サーバー内部構造を3Dで表示
- **対象データ**: server-details（OS、ミドルウェア、アプリケーション）
- **特徴**:
  - サーバーを3Dモデルとして表示
  - 内部構造（CPU、メモリ、ストレージ）を可視化
  - アプリケーション層を階層的に表示

### 2.2 表示モードの切り替え

各タブで2D（Graphviz）と3D（Three.js）を切り替え可能にする：

```
┌─────────────────────────────────────┐
│ [2D表示] [3D表示] ← 各タブに配置      │
└─────────────────────────────────────┘
```

**実装方法**:
- 各タブコンポーネントに`ViewMode`状態を追加
- `'2d' | '3d'`で切り替え
- 既存のViewSelectorを拡張するか、独立した切り替えボタンを追加

---

## 3. データ変換ロジック

### 3.1 U位置のパース

現在の`position.unit: "1-4"`形式を、3D表示用の数値に変換：

```typescript
interface UPosition {
  uStart: number;    // 開始U（1始まり）
  uHeight: number;   // 高さ（U数）
}

function parseUnitPosition(unit: string): UPosition | null {
  // "1-4" → { uStart: 1, uHeight: 4 }
  // "5" → { uStart: 5, uHeight: 1 }
  const match = unit.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  
  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : start;
  
  return {
    uStart: start,
    uHeight: end - start + 1,
  };
}
```

### 3.2 3D座標への変換

#### ラックの配置（site-equipment）

```typescript
interface Rack3DPosition {
  x: number;  // row（列）→ X軸
  y: number;  // floor（階層）→ Y軸（高さ）
  z: number;  // position（位置）→ Z軸
}

function rackLocationTo3D(location: {
  floor?: number;
  row?: string;
  position?: number;
}): Rack3DPosition {
  // row: "A" → 0, "B" → 1, ...
  const rowIndex = location.row 
    ? location.row.charCodeAt(0) - 'A'.charCodeAt(0)
    : 0;
  
  return {
    x: rowIndex * 1.0,           // ラック幅: 0.6m → 1.0m間隔
    y: (location.floor || 1) * 3.0, // 階層高さ: 3.0m
    z: (location.position || 0) * 1.0, // ラック奥行: 1.0m間隔
  };
}
```

#### 機器のU位置（ラック内）

```typescript
interface Device3DPosition {
  y: number;  // U位置（下から上）
  height: number; // 高さ（U数）
}

function unitTo3DHeight(
  uStart: number,
  uHeight: number,
  rackCapacity: number = 42
): Device3DPosition {
  // 1U = 44.45mm = 0.04445m
  const U_HEIGHT_M = 0.04445;
  const rackHeight = rackCapacity * U_HEIGHT_M;
  
  // 下から上への配置（Y軸）
  const y = (uStart - 1) * U_HEIGHT_M;
  const height = uHeight * U_HEIGHT_M;
  
  return { y, height };
}
```

### 3.3 空きUの計算

```typescript
interface UsedU {
  start: number;
  end: number;
}

function calculateFreeUs(
  equipment: Equipment[],
  rackCapacity: number = 42
): Array<{ start: number; end: number }> {
  // 使用中のUを取得
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
  
  // ソート
  usedUs.sort((a, b) => a.start - b.start);
  
  // 空きUを計算
  const freeUs: Array<{ start: number; end: number }> = [];
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
```

---

## 4. コンポーネント設計（全階層対応）

### 4.1 3D表示コンポーネントの階層

```
Tab0 (全体俯瞰)
  └─ HierarchyViewer
       ├─ GraphvizViewer (2D表示) ← 既存
       └─ Hierarchy3DViewer (3D表示) ← 新規

Tab1 (棟間ネットワーク)
  └─ SiteTopology3DViewer ← 新規

Tab2 (棟内機器)
  └─ SiteEquipment3DViewer ← 新規

Tab3 (ラック内サーバー)
  └─ Rack3DViewer ← 新規

Tab4 (サーバー詳細)
  └─ ServerDetails3DViewer ← 新規
```

### 4.2 主要コンポーネント

#### Hierarchy3DViewer (Tab0用)

```typescript
interface Hierarchy3DViewerProps {
  sites: SiteTopology[];
  siteEquipment: SiteEquipment | null;
  rackServers: RackServers | null;
  rackServersMap: Map<string, RackServers>;
  serverDetails: ServerDetails | null;
  onSiteClick?: (siteId: string) => void;
  onRackClick?: (rackId: string) => void;
  onEquipmentClick?: (equipmentId: string) => void;
  onServerClick?: (serverId: string) => void;
}
```

**機能**:
- 階層全体を3Dで統合表示
- 棟、ラック、機器を階層的に配置
- クリックで各階層にドリルダウン
- カメラ操作（OrbitControls）

#### SiteTopology3DViewer (Tab1用)

```typescript
interface SiteTopology3DViewerProps {
  siteTopology: SiteTopology;
  onSiteClick?: (siteId: string) => void;
}
```

**機能**:
- 複数棟を3D空間に配置
- 地理的位置（lat/lon）または論理的位置で配置
- 棟間の接続を3D線で表示
- 帯域幅や遅延を視覚化（線の太さ、色）
- クリックで棟詳細表示

#### SiteEquipment3DViewer (Tab2用)

```typescript
interface SiteEquipment3DViewerProps {
  siteEquipment: SiteEquipment;
  rackServersMap?: Map<string, RackServers>;
  onRackClick?: (rackId: string) => void;
  onEquipmentClick?: (equipmentId: string) => void;
}
```

**機能**:
- 複数ラックを3D空間に配置
- ラックの位置情報（floor, row, position）を3D座標に変換
- ラック内の機器をU位置に配置
- 空きUを視覚化
- クリックで詳細表示

#### Rack3DViewer (Tab3用)

```typescript
interface Rack3DViewerProps {
  rack: Rack;
  rackServers?: RackServers | null;
  onServerClick?: (serverId: string) => void;
}
```

**機能**:
- 単一ラックを3D表示
- サーバーをU位置に配置
- 空きUをハイライト表示
- ラックの前面/背面表示切り替え
- ポート接続を表示（オプション）

#### ServerDetails3DViewer (Tab4用)

```typescript
interface ServerDetails3DViewerProps {
  serverDetails: ServerDetails;
  server?: Server;
  onApplicationClick?: (appName: string) => void;
}
```

**機能**:
- サーバーを3Dモデルとして表示
- 内部構造（CPU、メモリ、ストレージ）を可視化
- アプリケーション層を階層的に表示
- OS、ミドルウェア、アプリケーションの関係を3Dで表現

---

## 5. 実装フェーズ（全階層対応）

### フェーズ1: 共通基盤とユーティリティ

**目標**: 全階層で共通利用する基盤を構築

1. **U位置パーサーの実装**
   - `parseUnitPosition()` 関数
   - テストケース作成

2. **座標変換ユーティリティ**
   - `rackLocationTo3D()` 関数
   - `unitTo3DHeight()` 関数
   - `calculateFreeUs()` 関数

3. **共通3Dコンポーネント**
   - `ViewModeSelector` (2D/3D切り替え)
   - `ThreeScene` (Three.jsシーンの基本ラッパー)
   - `OrbitControls` の統合

**期間**: 2-3日

---

### フェーズ2: Tab3（ラック内サーバー）の3D表示

**目標**: 単一ラックの3D表示が動作する（MVP）

1. **Rack3DViewerコンポーネント**
   - Three.jsシーン構築
   - ラックの3Dモデル（箱）
   - サーバーの3Dモデル（薄い箱）
   - U位置に配置
   - クリック選択
   - 空きUの表示

2. **Tab3への統合**
   - 2D/3D切り替えボタン
   - Rack3DViewerの表示

**期間**: 2-3日

---

### フェーズ3: Tab2（棟内機器）の3D表示

**目標**: 複数ラックを3D空間に配置

1. **SiteEquipment3DViewerコンポーネント**
   - 複数ラックの配置
   - ラック内機器の表示
   - カメラ操作（OrbitControls）
   - ズーム/パン
   - 空きUの可視化

2. **Tab2への統合**
   - 2D/3D切り替え
   - SiteEquipment3DViewerの表示

**期間**: 3-4日

---

### フェーズ4: Tab1（棟間ネットワーク）の3D表示

**目標**: 棟間のネットワーク接続を3Dで表示

1. **SiteTopology3DViewerコンポーネント**
   - 複数棟を3D空間に配置
   - 地理的位置（lat/lon）または論理的位置で配置
   - 棟間の接続を3D線で表示
   - 帯域幅や遅延を視覚化（線の太さ、色）

2. **Tab1への統合**
   - 2D/3D切り替え
   - SiteTopology3DViewerの表示

**期間**: 2-3日

---

### フェーズ5: Tab0（全体俯瞰）の3D表示

**目標**: 階層全体を3Dで統合表示

1. **Hierarchy3DViewerコンポーネント**
   - 階層全体を3Dで統合表示
   - 棟、ラック、機器を階層的に配置
   - クリックで各階層にドリルダウン
   - カメラ操作の拡張

2. **Tab0への統合**
   - 2D/3D切り替え
   - Hierarchy3DViewerの表示

**期間**: 3-4日

---

### フェーズ6: Tab4（サーバー詳細）の3D表示

**目標**: サーバー内部構造を3Dで表示

1. **ServerDetails3DViewerコンポーネント**
   - サーバーを3Dモデルとして表示
   - 内部構造（CPU、メモリ、ストレージ）を可視化
   - アプリケーション層を階層的に表示
   - OS、ミドルウェア、アプリケーションの関係を3Dで表現

2. **Tab4への統合**
   - 2D/3D切り替え
   - ServerDetails3DViewerの表示

**期間**: 2-3日

---

### フェーズ7: フル3D化と最適化

**目標**: 自由視点とパフォーマンス最適化

1. **カメラ操作の拡張**
   - 自由回転
   - クリッピング（壁/天井の透過）
   - ラック列のグルーピング

2. **パフォーマンス最適化**
   - InstancedMesh（同じ形状の大量描画）
   - LOD（遠距離は簡略化）
   - 大規模データ対応（1000ラック以上）

**期間**: 2-3日

---

## 6. データ構造の拡張（必要に応じて）

### 6.1 現在のデータで対応可能な範囲

✅ **対応可能**:
- ラックの位置（floor, row, position）
- ラックの容量（units）
- 機器のU位置（unit: "1-4"）

⚠️ **不足している可能性がある情報**:
- ラックの物理サイズ（幅、奥行）
- 機器の物理サイズ（幅、奥行）
- ラックの向き（前面/背面）

### 6.2 拡張案（必要に応じて）

```yaml
racks:
  - id: rack_001
    location:
      floor: 1
      row: A
      position: 1
      orientation: "front"  # "front" | "back" | "both"
    dimensions:
      width: 0.6    # メートル
      depth: 1.0   # メートル
      height: 1.87 # メートル（42U）
    capacity:
      units: 42
      power: 10
```

**結論**: MVPではデフォルト値を使用し、必要に応じて後で拡張

---

## 7. UI/UX設計

### 7.1 表示モード切り替え

```
┌─────────────────────────────────────┐
│ [2D表示] [3D表示] ← タブ内に配置    │
└─────────────────────────────────────┘
```

または、既存のViewSelectorを拡張：

```typescript
// app/graphviz/components/utils/viewTypes.ts
export const VIEW_CONFIGS = {
  // ... 既存の設定
  '3d': {
    label: '3D表示',
    description: '3D空間でラックと機器を表示',
  },
};
```

### 7.2 3D表示の操作

- **マウス操作**:
  - 左ドラッグ: 回転
  - 右ドラッグ: パン
  - ホイール: ズーム
  - クリック: 選択

- **UI要素**:
  - 右上にカメラリセットボタン
  - 左下に操作説明
  - 右側に詳細パネル（既存のNodeDetailPanelを再利用）

### 7.3 空きUの表示

- **色分け**:
  - 使用中: グレー
  - 空き: 薄い緑（ハイライト）
  - 選択中: オレンジ

- **ラベル**:
  - ラック上部に「空きU: 15U」と表示
  - ホバーで詳細表示

---

## 8. 技術的な考慮事項

### 8.1 Three.jsの統合

- **React Three Fiber vs 直接Three.js**:
  - 現状: `three`を直接使用
  - 推奨: `@react-three/fiber`を追加（Reactとの統合が容易）
  - または: 直接Three.jsを使用（既存の`react-force-graph-3d`と同じ方針）

**結論**: まず直接Three.jsで実装し、必要に応じて`@react-three/fiber`を検討

### 8.2 パフォーマンス

- **描画最適化**:
  - 同じ形状の機器は`InstancedMesh`を使用
  - 遠距離のラックは簡略化表示
  - 表示範囲外のラックは非表示

- **メモリ管理**:
  - コンポーネントのアンマウント時にThree.jsリソースを解放
  - テクスチャの再利用

### 8.3 アクセシビリティ

- **キーボード操作**:
  - Tabキーで要素を選択
  - Enterキーで詳細表示
  - 矢印キーでカメラ移動

- **スクリーンリーダー対応**:
  - 3D要素にaria-labelを設定
  - 選択状態をaria-selectedで通知

---

## 9. 実装の優先順位（全階層対応）

### 最優先（基盤構築）

1. ✅ 共通ユーティリティ（U位置パーサー、座標変換）
2. ✅ ViewModeSelector（2D/3D切り替え）
3. ✅ ThreeScene（共通3Dシーンラッパー）

### 次優先（各タブの3D表示）

4. ✅ Tab3: Rack3DViewer（単一ラック） - MVP
5. ✅ Tab2: SiteEquipment3DViewer（複数ラック）
6. ✅ Tab1: SiteTopology3DViewer（棟間ネットワーク）
7. ✅ Tab0: Hierarchy3DViewer（階層全体）
8. ✅ Tab4: ServerDetails3DViewer（サーバー詳細）

### 機能拡張

9. ✅ 空きU計算・表示
10. ✅ クリック選択・詳細表示
11. ✅ カメラ操作（OrbitControls）

### 将来の拡張

12. ⏳ フル3D化（自由視点）
13. ⏳ パフォーマンス最適化
14. ⏳ ヒートマップ（電力/熱）
15. ⏳ ケーブル表示
16. ⏳ アニメーション（状態変化）

---

## 10. リスクと対策

### リスク1: パフォーマンス問題

**対策**:
- 最初は小規模データ（10ラック以下）で検証
- 必要に応じてLODやInstancedMeshを実装

### リスク2: データ構造の不整合

**対策**:
- U位置のパースエラーを適切にハンドリング
- デフォルト値を使用（例: 位置不明の場合は中央配置）

### リスク3: ユーザビリティ

**対策**:
- 2D/3Dの切り替えを簡単に
- 操作説明を表示
- 既存の2D表示をデフォルトに

---

## 11. 次のステップ（全階層対応）

### 実装開始前の確認事項

1. ✅ データ構造の確認（U位置の形式）
2. ✅ 既存の3Dライブラリの確認
3. ✅ ユーザー要件の確認（全階層で3D表示）
4. ⏳ デザインの確認（色、サイズ、操作感）

### 実装開始時の最初の一歩

#### ステップ1: 共通基盤の構築

1. **U位置パーサーの実装とテスト**
   ```typescript
   // app/graphviz/components/utils/3d/unitParser.ts
   export function parseUnitPosition(unit: string): UPosition | null
   ```

2. **座標変換ユーティリティ**
   ```typescript
   // app/graphviz/components/utils/3d/coordinateConverter.ts
   export function rackLocationTo3D(location: RackLocation): Rack3DPosition
   export function unitTo3DHeight(uStart: number, uHeight: number): Device3DPosition
   export function calculateFreeUs(equipment: Equipment[], capacity: number): FreeU[]
   ```

3. **ViewModeSelectorコンポーネント**
   ```typescript
   // app/graphviz/components/utils/ViewModeSelector.tsx
   export function ViewModeSelector({ mode, onModeChange }: ViewModeSelectorProps)
   ```

#### ステップ2: Tab3（ラック内サーバー）の3D表示（MVP）

4. **Rack3DViewerコンポーネント**
   ```typescript
   // app/graphviz/components/Tab3/Rack3DViewer.tsx
   export function Rack3DViewer({ rack, rackServers }: Rack3DViewerProps)
   ```

5. **Tab3への統合**
   - 2D/3D切り替えボタン追加
   - Rack3DViewerの表示

#### ステップ3: 他のタブへの拡張

6. **Tab2: SiteEquipment3DViewer**
7. **Tab1: SiteTopology3DViewer**
8. **Tab0: Hierarchy3DViewer**
9. **Tab4: ServerDetails3DViewer**

---

## 12. 参考資料

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls)

---

## まとめ（全階層対応）

### 実装可能な範囲

✅ **現在のデータ構造で実装可能**:
- Tab0: 階層全体の3D表示（棟、ラック、機器）
- Tab1: 棟間ネットワークの3D表示（地理的位置、接続）
- Tab2: 棟内機器構成の3D表示（複数ラック、機器配置）
- Tab3: ラック内サーバーの3D表示（U位置、空きU）
- Tab4: サーバー詳細の3D表示（内部構造、アプリケーション層）

⚠️ **追加情報が必要な場合**:
- ラック/機器の物理サイズ（デフォルト値で対応可能）
- ラックの向き（デフォルト: 前面）
- サーバー内部の詳細構造（デフォルト値で対応可能）

### 推奨実装順序（全階層対応）

1. **フェーズ1**: 共通基盤とユーティリティ
2. **フェーズ2**: Tab3（ラック内サーバー）の3D表示（MVP）
3. **フェーズ3**: Tab2（棟内機器）の3D表示
4. **フェーズ4**: Tab1（棟間ネットワーク）の3D表示
5. **フェーズ5**: Tab0（全体俯瞰）の3D表示
6. **フェーズ6**: Tab4（サーバー詳細）の3D表示
7. **フェーズ7**: フル3D化と最適化

### 技術スタック

- ✅ Three.js（既にインストール済み）
- ✅ React（既存）
- ✅ react-force-graph-3d（既にインストール済み）
- ⏳ @react-three/fiber（必要に応じて追加）

### 各タブの3D表示の特徴

| タブ | 3D表示の特徴 | 優先度 |
|------|-------------|--------|
| Tab0 | 階層全体を統合表示、ドリルダウン | 高 |
| Tab1 | 棟間接続を3D線で表示 | 中 |
| Tab2 | 複数ラックを3D空間に配置 | 高 |
| Tab3 | 単一ラック、U位置表示 | 最高（MVP） |
| Tab4 | サーバー内部構造を可視化 | 中 |

---

**次のアクション**: 全階層対応の3D表示実装を開始。フェーズ1（共通基盤）から順次実装

