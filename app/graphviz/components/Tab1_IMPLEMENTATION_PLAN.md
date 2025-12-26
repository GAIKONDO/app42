# Graphviz 機能1 実装計画

## 概要
YAMLコードを入力すると、右側にGraphviz用のDOTコードに変換され、グラフとして表示される機能を実装します。

**重要**: この機能は、将来的に以下の拡張を想定しています：
- YAMLファイルをSQLiteに保存してデータベース化
- 変換したGraphviz DOTファイルも同様に保存
- それぞれのファイルに固有のIDを持たせる
- YAMLをナレッジグラフ化してEmbedding
- AIアシスタントが理解して、状況報告や影響分析を回答

詳細は `Tab1_ARCHITECTURE_DESIGN.md` を参照してください。

## 実装手順

### 1. 必要なライブラリのインストール

#### 1.1 YAMLパース用ライブラリ
```bash
npm install js-yaml
npm install --save-dev @types/js-yaml
```

#### 1.2 Graphvizレンダリング用ライブラリ
以下のいずれかを選択：

**オプションA: graphviz-react（推奨）**
```bash
npm install graphviz-react
```

**オプションB: viz.js（代替案）**
```bash
npm install viz.js
npm install --save-dev @types/viz.js
```

**オプションC: @hpke/viz.js（軽量版）**
```bash
npm install @hpke/viz.js
```

### 2. コンポーネント構造

```
app/graphviz/components/Tab1/
├── Tab1.tsx                    # メインコンポーネント
├── YAMLToGraphvizConverter.tsx # 変換ロジックを含むコンポーネント
├── GraphvizViewer.tsx          # Graphviz表示コンポーネント
└── utils/
    ├── yamlToDot.ts            # YAML→DOT変換ロジック
    └── types.ts                # 型定義
```

### 3. UIレイアウト設計

```
┌─────────────────────────────────────────────────────────┐
│  Graphviz - 機能1                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │                  │  │  Graphviz DOTコード        │  │
│  │  YAML入力        │  │  (Monaco Editor)           │  │
│  │  (Monaco Editor) │  │                            │  │
│  │                  │  ├────────────────────────────┤  │
│  │                  │  │                            │  │
│  │                  │  │  Graphvizグラフ表示       │  │
│  │                  │  │  (graphviz-react)         │  │
│  │                  │  │                            │  │
│  └──────────────────┘  └────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4. 実装の詳細

#### 4.1 YAML→DOT変換ロジック (`utils/yamlToDot.ts`)

**想定するYAML構造例：**
```yaml
graph:
  name: "サンプルグラフ"
  type: "digraph"  # digraph または graph
  nodes:
    - id: "A"
      label: "ノードA"
      shape: "box"
      color: "blue"
    - id: "B"
      label: "ノードB"
      shape: "circle"
  edges:
    - from: "A"
      to: "B"
      label: "接続"
      style: "solid"
```

**変換ロジックの実装方針：**
1. YAMLをパースしてオブジェクトに変換
2. DOT形式の文字列を生成
   - グラフタイプ（digraph/graph）を決定
   - ノード定義を生成
   - エッジ定義を生成
   - スタイル属性を適用

#### 4.2 メインコンポーネント (`Tab1.tsx`)

**機能：**
- 左右2カラムレイアウト
- 左側：Monaco Editor（YAML入力、言語モード: yaml）
- 右側：上段にDOTコード表示（Monaco Editor、読み取り専用）、下段にグラフ表示
- リアルタイム変換（debounce付き、500ms程度）
- エラーハンドリング（YAMLパースエラー、DOT生成エラー）

#### 4.3 Graphviz表示コンポーネント (`GraphvizViewer.tsx`)

**機能：**
- DOTコードを受け取ってグラフをレンダリング
- エラー時のフォールバック表示
- ローディング状態の表示

### 5. 技術的な考慮事項

#### 5.1 Monaco Editorの設定
- 左側エディタ：言語モード `yaml`、編集可能
- 右側エディタ：言語モード `dot`、読み取り専用

#### 5.2 リアルタイム変換
- `useEffect` + `debounce`で実装
- YAML入力後500ms待機してから変換実行
- 変換中はローディング表示

#### 5.3 エラーハンドリング
- YAMLパースエラー：エラーメッセージを表示
- DOT生成エラー：エラーメッセージを表示
- Graphvizレンダリングエラー：エラーメッセージを表示

#### 5.4 パフォーマンス
- 大きなYAMLファイルの場合、変換処理をWeb Workerで実行することを検討
- グラフが大きい場合、ズーム機能を追加

### 6. 実装の優先順位

#### Phase 1: 基本機能（初期実装）
1. **UI実装**
   - YAML入力エディタ（Monaco Editor）
   - DOTコード表示エディタ（読み取り専用）
   - Graphviz表示エリア
   - 2カラムレイアウト

2. **変換機能**
   - 基本的なYAML→DOT変換ロジック
   - リアルタイム変換（debounce）
   - エラーハンドリング

3. **表示機能**
   - Graphviz DOTコードのレンダリング
   - エラー表示

#### Phase 2: データベース統合
1. **データベーステーブル作成**
   - `graphvizYamlFiles`テーブル
   - `graphvizDotFiles`テーブル
   - インデックス・トリガーの作成

2. **保存機能**
   - YAMLファイルの保存
   - DOTファイルの保存
   - ID管理
   - バージョン管理

3. **読み込み機能**
   - 保存されたYAMLファイルの一覧表示
   - ファイル選択・読み込み
   - 履歴管理

#### Phase 3: ChromaDB統合
1. **埋め込み保存**
   - YAMLファイルの埋め込み生成・保存
   - DOTファイルの埋め込み生成・保存
   - ChromaDB同期状態の管理

2. **検索機能**
   - RAG検索の実装
   - 関連ファイルの検索

#### Phase 4: 高度な機能（将来）
1. **ナレッジグラフ化**
   - YAMLからエンティティ・リレーション抽出
   - 既存のentities, relationsテーブルへの統合

2. **AIアシスタント統合**
   - 状況報告機能
   - 影響分析機能

3. **その他**
   - 複雑なYAML構造への対応
   - スタイルカスタマイズ
   - エクスポート機能（SVG/PNG）

### 7. 参考リソース

- [js-yaml Documentation](https://github.com/nodeca/js-yaml)
- [graphviz-react Documentation](https://www.npmjs.com/package/graphviz-react)
- [Graphviz DOT Language](https://graphviz.org/doc/info/lang.html)
- [Monaco Editor React](https://github.com/suren-atoyan/monaco-react)

### 8. 注意事項

- Graphvizのレンダリングはブラウザ上で実行されるため、大きなグラフはパフォーマンスに影響する可能性がある
- YAMLの構造が複雑な場合、変換ロジックも複雑になる
- 既存のMonaco Editorの使用例を参考に実装する

