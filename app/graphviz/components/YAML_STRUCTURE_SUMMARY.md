# YAML構造設計まとめ

## 設計完了事項

### ✅ ディレクトリ構成の定義
```
network/
  topology/     # トポロジ（構造）
  devices/      # デバイス（実体）
  links/        # 接続（ケーブル/論理リンク）
  intents/      # 意味・ルール（Intent/Policy）
```

### ✅ 各単位のYAML構造定義

1. **Topology** (`topology/*.yaml`)
   - ネットワークの論理構造
   - レイヤー定義
   - 変更頻度：低

2. **Device** (`devices/**/*.yaml`)
   - 機器固有情報
   - ポート定義
   - 変更頻度：中
   - 1台 = 1ファイル

3. **Links** (`links/*.yaml`)
   - ケーブリング・論理接続
   - 変更頻度：高
   - 差分が見やすい

4. **Intent** (`intents/*.yaml`)
   - 設計意図・ルール
   - バリデーション定義
   - AIが読む

### ✅ JSON Schema定義
- `utils/yamlSchemas.ts`: 各単位のバリデーション用スキーマ
- タイプ自動判定機能

### ✅ View切替設計
- Topology View: トポロジ構造のみ
- Device View: デバイスとポート
- Connection View: 接続関係のみ
- Full View: すべてを統合
- Intent View: ルール違反をハイライト

### ✅ 変換ロジック
- `utils/yamlToDotAdvanced.ts`: 新設計対応の変換ロジック
- 複数ファイル統合機能
- Viewタイプ別の生成

### ✅ サンプルファイル
- `samples/topology_service.yaml`
- `samples/device_dell_r7625_01.yaml`
- `samples/links_rack1.yaml`
- `samples/intent_redundancy.yaml`

## 実装済み機能

### Phase 1（完了）
- ✅ YAML入力エディタ
- ✅ YAML→DOT変換（基本版）
- ✅ Graphviz表示
- ✅ リアルタイム変換

### 新設計対応（完了）
- ✅ YAML構造設計
- ✅ JSON Schema定義
- ✅ View切替ロジック
- ✅ サンプルファイル

## 次のステップ（Phase 2準備）

### 1. Tab1コンポーネントの更新
- View切替UIの追加
- 新設計対応の変換ロジックに切り替え
- サンプルファイルの読み込み機能

### 2. ファイル管理機能（Phase 2）
- ディレクトリ構造に基づいたファイル管理
- 複数ファイルの統合表示
- ファイル選択UI

### 3. データベース統合（Phase 2）
- 各単位のYAMLファイルをデータベースに保存
- ID管理
- バージョン管理

## 判断基準（再掲）

迷ったらこの質問を自分にする：

> 「この情報、
>
> 1. 機器を変えても残る？
> 2. 配線を変えたら消える？
> 3. 理由・ルールか？」

- **1. → topology / intent**
- **2. → links**
- **3. → intents**

## 重要な原則

> **「描画」ではなく「モデル」を作っている**

この設計により：
- Graphviz
- draw.io
- AI
- Knowledge Graph

**全部に流用可能**

