# Graphviz 機能1 アーキテクチャ設計書

## 概要

YAMLファイルをGraphviz DOT形式に変換し、データベースに保存する機能。将来的にはナレッジグラフ化してEmbeddingし、AIアシスタントが理解・分析できるようにする。

## 設計方針

### 1. データベース設計

既存のデータベース構造（SQLite + ChromaDB）に統合し、以下のテーブルを追加：

#### 1.1 graphvizYamlFiles テーブル

YAMLファイルのメタデータを保存

```sql
CREATE TABLE graphvizYamlFiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    yamlContent TEXT NOT NULL,
    yamlSchema TEXT,  -- YAML構造のスキーマ定義（JSON形式）
    organizationId TEXT,
    tags TEXT,  -- JSON配列形式
    version INTEGER DEFAULT 1,
    parentYamlFileId TEXT,  -- バージョン管理用（親ファイルID）
    searchableText TEXT,  -- RAG検索用（自動生成）
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    lastSearchDate TEXT,
    searchCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    FOREIGN KEY (parentYamlFileId) REFERENCES graphvizYamlFiles(id)
)
```

**カラム詳細**:
- `id`: 固有ID（UUID形式、例: `yaml_20250101_abc123`）
- `name`: YAMLファイル名
- `description`: 説明
- `yamlContent`: YAMLコンテンツ（TEXT形式）
- `yamlSchema`: YAML構造のスキーマ定義（JSON形式、検証用）
- `organizationId`: 組織ID（既存のorganizationsテーブルと連携）
- `tags`: タグ（JSON配列形式）
- `version`: バージョン番号
- `parentYamlFileId`: 親ファイルID（バージョン管理用）
- `searchableText`: 検索用テキスト（自動生成: name + description + yamlContentの要約）
- `chromaSynced`: ChromaDB同期状態（0: 未同期、1: 同期済み）
- `chromaSyncError`: ChromaDB同期エラーメッセージ
- `lastChromaSyncAttempt`: 最後のChromaDB同期試行日時
- `lastSearchDate`: 最後に検索された日時（RAG検索最適化用）
- `searchCount`: 検索回数（RAG検索最適化用）

#### 1.2 graphvizDotFiles テーブル

Graphviz DOTファイルのメタデータを保存

```sql
CREATE TABLE graphvizDotFiles (
    id TEXT PRIMARY KEY,
    yamlFileId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    dotContent TEXT NOT NULL,
    graphType TEXT NOT NULL,  -- 'digraph' or 'graph'
    nodeCount INTEGER,
    edgeCount INTEGER,
    organizationId TEXT,
    tags TEXT,  -- JSON配列形式
    version INTEGER DEFAULT 1,
    parentDotFileId TEXT,  -- バージョン管理用（親ファイルID）
    searchableText TEXT,  -- RAG検索用（自動生成）
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    lastSearchDate TEXT,
    searchCount INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (yamlFileId) REFERENCES graphvizYamlFiles(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id),
    FOREIGN KEY (parentDotFileId) REFERENCES graphvizDotFiles(id)
)
```

**カラム詳細**:
- `id`: 固有ID（UUID形式、例: `dot_20250101_abc123`）
- `yamlFileId`: 元のYAMLファイルID（外部キー）
- `name`: DOTファイル名
- `description`: 説明
- `dotContent`: DOTコンテンツ（TEXT形式）
- `graphType`: グラフタイプ（'digraph' or 'graph'）
- `nodeCount`: ノード数（自動計算）
- `edgeCount`: エッジ数（自動計算）
- `organizationId`: 組織ID
- `tags`: タグ（JSON配列形式）
- `version`: バージョン番号
- `parentDotFileId`: 親ファイルID（バージョン管理用）
- `searchableText`: 検索用テキスト（自動生成）
- `chromaSynced`: ChromaDB同期状態
- `chromaSyncError`: ChromaDB同期エラーメッセージ
- `lastChromaSyncAttempt`: 最後のChromaDB同期試行日時
- `lastSearchDate`: 最後に検索された日時
- `searchCount`: 検索回数

#### 1.3 graphvizYamlRelations テーブル（将来用）

YAMLファイル間の関係を管理（将来のナレッジグラフ化用）

```sql
CREATE TABLE graphvizYamlRelations (
    id TEXT PRIMARY KEY,
    sourceYamlFileId TEXT NOT NULL,
    targetYamlFileId TEXT NOT NULL,
    relationType TEXT NOT NULL,  -- 'depends_on', 'references', 'extends', etc.
    description TEXT,
    confidence REAL,
    metadata TEXT,  -- JSON形式
    organizationId TEXT,
    searchableText TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (sourceYamlFileId) REFERENCES graphvizYamlFiles(id) ON DELETE CASCADE,
    FOREIGN KEY (targetYamlFileId) REFERENCES graphvizYamlFiles(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
)
```

### 2. ChromaDBコレクション設計

既存のコレクション構造に合わせて、以下のコレクションを追加：

#### 2.1 graphviz_yamls_{organizationId} コレクション

YAMLファイルの埋め込みベクトルを保存

**構造**:
- `id`: YAMLファイルID（SQLiteのgraphvizYamlFiles.idと同じ）
- `embedding`: 埋め込みベクトル（1536次元）
- `metadata`: 
  - `yamlFileId`: YAMLファイルID
  - `organizationId`: 組織ID
  - `name`: ファイル名
  - `description`: 説明
  - `yamlContent`: YAMLコンテンツ（要約版）
  - `tags`: タグ（JSON配列）
  - `embeddingModel`: 埋め込みモデル
  - `embeddingVersion`: 埋め込みバージョン
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

#### 2.2 graphviz_dots_{organizationId} コレクション

Graphviz DOTファイルの埋め込みベクトルを保存

**構造**:
- `id`: DOTファイルID（SQLiteのgraphvizDotFiles.idと同じ）
- `embedding`: 埋め込みベクトル（1536次元）
- `metadata`:
  - `dotFileId`: DOTファイルID
  - `yamlFileId`: 元のYAMLファイルID
  - `organizationId`: 組織ID
  - `name`: ファイル名
  - `description`: 説明
  - `dotContent`: DOTコンテンツ（要約版）
  - `graphType`: グラフタイプ
  - `nodeCount`: ノード数
  - `edgeCount`: エッジ数
  - `tags`: タグ（JSON配列）
  - `embeddingModel`: 埋め込みモデル
  - `embeddingVersion`: 埋め込みバージョン
  - `createdAt`: 作成日時
  - `updatedAt`: 更新日時

### 3. データフロー設計

#### 3.1 YAMLファイル保存フロー

```
1. ユーザーがYAMLを入力
   ↓
2. YAMLバリデーション（スキーマチェック）
   ↓
3. SQLiteに保存（graphvizYamlFilesテーブル）
   - id生成（UUID形式）
   - searchableText自動生成
   - chromaSynced = 0
   ↓
4. バックグラウンドでChromaDBに埋め込み保存
   - YAMLコンテンツから埋め込み生成
   - graphviz_yamls_{organizationId}コレクションに保存
   ↓
5. 同期成功時にchromaSynced = 1に更新
```

#### 3.2 YAML→DOT変換フロー

```
1. YAMLファイルを読み込み（graphvizYamlFilesテーブル）
   ↓
2. YAML→DOT変換ロジック実行
   ↓
3. DOTコンテンツ生成
   ↓
4. SQLiteに保存（graphvizDotFilesテーブル）
   - id生成（UUID形式）
   - yamlFileIdを外部キーとして設定
   - nodeCount, edgeCountを自動計算
   - searchableText自動生成
   - chromaSynced = 0
   ↓
5. バックグラウンドでChromaDBに埋め込み保存
   - DOTコンテンツから埋め込み生成
   - graphviz_dots_{organizationId}コレクションに保存
   ↓
6. 同期成功時にchromaSynced = 1に更新
```

#### 3.3 将来のナレッジグラフ化フロー

```
1. YAMLファイルからエンティティ・リレーションを抽出
   ↓
2. 既存のentities, relationsテーブルに保存
   - エンティティ: YAMLファイルのノード情報
   - リレーション: YAMLファイルのエッジ情報
   ↓
3. ChromaDBに埋め込み保存
   - entities_{organizationId}コレクション
   - relations_{organizationId}コレクション
   ↓
4. graphvizYamlRelationsテーブルにYAMLファイル間の関係を保存
```

### 4. ID管理設計

#### 4.1 ID生成規則

**YAMLファイルID**:
- 形式: `yaml_{timestamp}_{random}`
- 例: `yaml_20250101_abc123def456`

**DOTファイルID**:
- 形式: `dot_{timestamp}_{random}`
- 例: `dot_20250101_xyz789ghi012`

**実装**:
- 既存のID生成ロジック（UUID）を活用
- または、タイムスタンプベースのID生成

#### 4.2 バージョン管理

- `version`カラムでバージョン番号を管理
- `parentYamlFileId` / `parentDotFileId`で親ファイルを参照
- 更新時は新しいレコードを作成（履歴保持）

### 5. 既存システムとの統合

#### 5.1 組織管理との統合

- `organizationId`で既存のorganizationsテーブルと連携
- 組織ごとにYAML/DOTファイルを分離
- 組織の削除時はCASCADEで削除（オプション）

#### 5.2 ナレッジグラフとの統合

- 将来的にYAMLファイルをナレッジグラフ化
- 既存のentities, relationsテーブルに統合
- ChromaDBの既存コレクション構造を活用

#### 5.3 AIアシスタントとの統合

- YAML/DOTファイルの埋め込みベクトルを活用
- RAG検索で関連するYAML/DOTファイルを検索
- AIアシスタントが状況報告や影響分析を実行

### 6. 実装の優先順位

#### Phase 1: 基本機能（初期実装）
1. graphvizYamlFilesテーブルの作成
2. graphvizDotFilesテーブルの作成
3. YAML入力・保存機能
4. YAML→DOT変換機能
5. DOT表示機能

#### Phase 2: データベース統合
1. ChromaDB埋め込み保存機能
2. 検索機能（RAG検索）
3. バージョン管理機能

#### Phase 3: ナレッジグラフ化（将来）
1. YAMLからエンティティ・リレーション抽出
2. 既存のentities, relationsテーブルへの統合
3. graphvizYamlRelationsテーブルの実装
4. AIアシスタントとの統合

### 7. 技術的な考慮事項

#### 7.1 パフォーマンス

- 大きなYAMLファイル（数MB以上）の処理
- バッチ処理での埋め込み生成
- インデックスの最適化

#### 7.2 データ整合性

- YAMLファイル削除時のDOTファイル削除（CASCADE）
- ChromaDB同期状態の管理
- トランザクション処理

#### 7.3 セキュリティ

- YAMLコンテンツのサニタイズ
- 組織間のデータ分離
- アクセス制御

### 8. 既存コードとの統合ポイント

#### 8.1 データベース操作

- 既存の`src-tauri/src/database/mod.rs`にテーブル定義を追加
- 既存の書き込みキューシステムを活用
- 既存の接続プールを活用

#### 8.2 Embedding処理

- 既存の`lib/embeddings.ts`を活用
- 既存の`lib/entityEmbeddingsChroma.ts`のパターンを参考
- 既存のChromaDBクライアントを活用

#### 8.3 RAG検索

- 既存のRAG検索ロジックを拡張
- 既存のナレッジグラフ検索と統合

### 9. マイグレーション計画

#### 9.1 テーブル作成

1. `graphvizYamlFiles`テーブルの作成
2. `graphvizDotFiles`テーブルの作成
3. インデックスの作成
4. トリガーの作成（searchableText自動生成）

#### 9.2 既存データとの互換性

- 既存のデータベース構造に影響を与えない
- 既存のテーブルとの外部キー関係を適切に設定

### 10. 将来の拡張性

#### 10.1 ナレッジグラフ化

- YAMLファイルから自動的にエンティティ・リレーションを抽出
- 既存のナレッジグラフシステムと統合

#### 10.2 AIアシスタント機能

- ケーブル接続変更時の影響分析
- システム状況の報告
- 関連YAML/DOTファイルの検索

#### 10.3 バージョン管理

- 詳細なバージョン履歴の管理
- 差分表示機能
- ロールバック機能

