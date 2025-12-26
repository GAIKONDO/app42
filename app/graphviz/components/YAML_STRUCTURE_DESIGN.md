# YAML構造設計書

## 設計原則

> **YAMLは「変更頻度 × 意味のまとまり」で分割する**

ネットワーク管理用途では、以下の4単位が最も安定します：

1. **トポロジ（構造）** - 変更頻度：低、意味：論理構造
2. **デバイス（実体）** - 変更頻度：中、意味：機器固有情報
3. **接続（ケーブル/論理リンク）** - 変更頻度：高、意味：ケーブリング・論理接続
4. **意味・ルール（Intent/Policy）** - 変更頻度：低、意味：設計意図

## ディレクトリ構成

```
network/
  topology/
    service.yaml
    storage.yaml
    oob.yaml

  devices/
    servers/
      dell_r7625_01.yaml
      dell_r7625_02.yaml
    switches/
      svc_leaf_rack1_n0.yaml
      svc_leaf_rack1_n1.yaml

  links/
    rack1.yaml
    rack2.yaml

  intents/
    redundancy.yaml
    naming.yaml
```

## 各単位のYAML構造

### ① トポロジ単位（topology/）

**役割**: ネットワークの論理構造、View切替の単位

```yaml
# topology/service.yaml
id: service
label: Service Network
description: サービスネットワークのトポロジ定義
type: topology
layers:
  - id: super_spine
    label: Super Spine
    level: 0
  - id: spine
    label: Spine
    level: 1
  - id: leaf
    label: Leaf
    level: 2
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
```

**特徴**:
- ほぼ変更されない
- 全体図生成の起点
- 複数のViewを定義可能

### ② デバイス単位（devices/）

**役割**: 機器固有情報、構成の実体

```yaml
# devices/servers/dell_r7625_01.yaml
id: dell_r7625_01
type: server
label: Dell R7625 #01
model: Dell R7625
location:
  rack: rack1
  unit: U10
ports:
  - id: eth1
    label: eth1
    speed: 100G
    role: service
    mac: "00:11:22:33:44:55"
  - id: eth2
    label: eth2
    speed: 100G
    role: service
    mac: "00:11:22:33:44:56"
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
```

**特徴**:
- 1台 = 1ファイル
- 再利用・複製が簡単
- ポート情報を含む

### ③ 接続単位（links/）

**役割**: ケーブリング・論理接続、変更履歴が一番多い

```yaml
# links/rack1.yaml
id: rack1_links
label: Rack 1 Connections
type: links
network: service
connections:
  - id: conn_001
    from:
      device: dell_r7625_01
      port: eth1
    to:
      device: svc_leaf_rack1_n0
      port: eth49
    network: service
    status: active
  - id: conn_002
    from:
      device: dell_r7625_01
      port: eth2
    to:
      device: svc_leaf_rack1_n1
      port: eth49
    network: service
    status: active
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
```

**特徴**:
- 差分が見やすい
- レビューしやすい
- Gitとの相性が最高
- 変更頻度が最も高い

### ④ 意味・ルール単位（intents/）

**役割**: なぜそうなっているか、設計意図

```yaml
# intents/redundancy.yaml
id: redundancy
label: Redundancy Rules
type: intent
rules:
  - name: server_dual_homing
    description: Serverは必ず別Leafに接続する
    applies_to: server
    validation:
      type: connection_count
      min: 2
      max: 2
      target_devices: leaf
  - name: leaf_pair_redundancy
    description: Leafは必ずペアで配置する
    applies_to: leaf
    validation:
      type: device_pair
metadata:
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-01T00:00:00Z"
```

**特徴**:
- 図には出にくいが超重要
- 後でAIが読む
- バリデーションルールとして使用可能

## Graphviz生成時のView切替設計

### Viewの種類

1. **Topology View**: トポロジ構造のみ（レイヤー表示）
2. **Device View**: デバイスとそのポート
3. **Connection View**: 接続関係のみ
4. **Full View**: すべてを統合表示
5. **Intent View**: ルール違反をハイライト

### View生成ロジック

```typescript
// View生成の基本フロー
1. Topologyファイルを読み込み（構造の定義）
2. Deviceファイルを読み込み（実体の定義）
3. Linksファイルを読み込み（接続の定義）
4. Intentファイルを読み込み（ルールの定義）
5. 選択されたViewに応じてDOTコードを生成
```

## よくあるNGパターン（避けるべき）

### ❌ すべて1ファイル

```yaml
everything.yaml  # ← 後で必ず死ぬ
```

**問題点**:
- 変更が頻繁でコンフリクトが発生
- 再利用不能
- レビューが困難

### ❌ PPT1枚＝YAML1枚

**問題点**:
- Viewと正本が混ざる
- 再利用不能
- 更新が困難

### ❌ 物理 / 論理 / 意図が混在

**問題点**:
- 変換ロジックが地獄
- 責任範囲が不明確

## 実務での作成順（推奨）

### Step 1（初期実装）
- `devices/`（サーバ・スイッチ）
- `topology/service.yaml`

### Step 2
- `links/`（rack単位 or フロア単位）

### Step 3
- `intents/`（最低限でOK）

👉 **図は Step 1 + 2 だけで出る**

## 判断基準

迷ったらこの質問を自分にする：

> 「この情報、
>
> 1. 機器を変えても残る？
> 2. 配線を変えたら消える？
> 3. 理由・ルールか？」

- **1. → topology / intent**
- **2. → links**
- **3. → intents**

## データベース保存時の構造

### ファイル単位での保存

各YAMLファイルは以下の構造でデータベースに保存：

```typescript
{
  id: string;  // ファイルID（例: "topology_service"）
  type: 'topology' | 'device' | 'links' | 'intent';
  category: string;  // カテゴリ（例: "servers", "rack1"）
  name: string;  // ファイル名
  content: string;  // YAMLコンテンツ
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
  }
}
```

### 関連付け

- `topology` → 複数の`device`を参照
- `links` → `device`と`port`を参照
- `intent` → `device`や`links`に適用

## 次のステップ

1. **JSON Schema定義**: 各単位のYAML構造をバリデーション
2. **View切替設計**: Graphviz生成時のView選択機能
3. **Intentチェック**: ルール違反の検出機能
4. **ファイル管理UI**: ディレクトリ構造に基づいたファイル管理

