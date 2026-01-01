# pgvector移行ガイド

ChromaDBからSupabase（pgvector）への移行手順を説明します。

## 概要

このガイドでは、ローカルのChromaDBからSupabaseのpgvector拡張機能を使用したベクトルデータベースへの移行方法を説明します。

## 前提条件

- Supabaseプロジェクトが既にセットアップされていること
- Supabaseダッシュボードへのアクセス権限があること
- 既存のデータベーススキーマが作成されていること

## 移行手順

### ステップ1: pgvector拡張機能の有効化

1. Supabaseダッシュボードにアクセス
2. 「SQL Editor」を開く
3. `scripts/supabase/enable_pgvector.sql` の内容をコピーして実行
4. 拡張機能が有効化されたことを確認

```sql
-- 確認クエリ
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';
```

### ステップ2: ベクトルテーブルの作成

1. SQL Editorで `scripts/supabase/create_vector_tables.sql` の内容を実行
2. 以下のテーブルが作成されたことを確認：
   - `entity_embeddings`
   - `relation_embeddings`
   - `topic_embeddings`
   - `design_doc_embeddings`

### ステップ3: HNSWインデックスの作成

1. SQL Editorで `scripts/supabase/create_vector_indexes.sql` の内容を実行
2. **注意**: インデックスの作成には時間がかかります（データ量に依存）
3. 本番環境では、メンテナンスウィンドウ中に実行することを推奨

### ステップ4: ベクトル検索関数の作成

1. SQL Editorで `scripts/supabase/create_vector_search_functions.sql` の内容を実行
2. 以下の関数が作成されたことを確認：
   - `find_similar_entities`
   - `find_similar_relations`
   - `find_similar_topics`
   - `find_similar_design_docs`
   - `find_similar_entities_768` (768次元用)

### ステップ5: データ移行

既存のChromaDBデータをSupabaseに移行します。

#### 方法1: アプリケーション経由での移行（推奨）

既存のデータを再生成してSupabaseに保存する方法：

1. 環境変数を設定してSupabaseを使用するように切り替え
2. 既存のエンティティ・リレーション・トピックの埋め込みを再生成
3. 自動的にSupabaseに保存されます

#### 方法2: 直接データ移行（上級者向け）

ChromaDBから直接データをエクスポートしてSupabaseにインポートする方法：

1. ChromaDBからデータをエクスポート（Rust側のTauriコマンドを使用）
2. データを変換してSupabaseにインポート
3. 注意: ベクトルデータの形式変換が必要

### ステップ6: コードの切り替え

既存のChromaDBコードをSupabase対応に切り替えます。

1. `lib/vectorSearchSupabase.ts` の関数を使用
2. 環境変数でChromaDBとSupabaseを切り替え可能にする
3. 段階的に移行を進める

## 環境変数の設定

`.env.local` ファイルに以下を設定：

```env
# Supabaseを使用する場合
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ベクトル検索にSupabaseを使用する場合（オプション）
NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true
```

## 動作確認

### 1. テーブルの確認

```sql
-- エンティティ埋め込みの件数を確認
SELECT COUNT(*) FROM entity_embeddings;

-- リレーション埋め込みの件数を確認
SELECT COUNT(*) FROM relation_embeddings;

-- トピック埋め込みの件数を確認
SELECT COUNT(*) FROM topic_embeddings;
```

### 2. インデックスの確認

```sql
-- HNSWインデックスの作成状況を確認
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'entity_embeddings',
    'relation_embeddings',
    'topic_embeddings',
    'design_doc_embeddings'
)
AND indexname LIKE '%embedding%';
```

### 3. 検索関数のテスト

```sql
-- エンティティ類似度検索のテスト
-- 注意: 実際の埋め込みベクトルを使用してください
SELECT * FROM find_similar_entities(
    '[0.1,0.2,0.3,...]'::vector(1536),
    0.5,
    10,
    NULL,
    NULL
);
```

## トラブルシューティング

### エラー: "extension vector does not exist"

pgvector拡張機能が有効化されていません。`enable_pgvector.sql` を実行してください。

### エラー: "operator does not exist: vector <=> vector"

pgvector拡張機能が正しく有効化されていない可能性があります。拡張機能を再確認してください。

### エラー: "dimension mismatch"

埋め込みベクトルの次元数が一致していません。1536次元と768次元で異なる関数を使用してください。

### インデックスの作成に時間がかかる

大量のデータがある場合、HNSWインデックスの作成には時間がかかります。メンテナンスウィンドウ中に実行することを推奨します。

## パフォーマンスチューニング

### インデックスパラメータの調整

大量のデータがある場合、以下のパラメータを調整することで検索パフォーマンスを向上させることができます：

```sql
-- より高い精度のインデックスを作成（時間がかかります）
DROP INDEX idx_entity_embeddings_embedding_cosine;
CREATE INDEX idx_entity_embeddings_embedding_cosine
ON entity_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);
```

### 検索時の探索範囲の調整

```sql
-- 検索時の探索範囲を調整（セッション単位）
SET LOCAL hnsw.ef_search = 100;  -- デフォルト: 40
```

## 注意事項

1. **データのバックアップ**: 移行前に必ずデータのバックアップを取得してください
2. **段階的移行**: 本番環境では、段階的に移行を進めることを推奨します
3. **パフォーマンステスト**: 移行後、検索パフォーマンスをテストしてください
4. **コスト**: Supabaseの使用量に応じてコストが発生する可能性があります

## 関連ドキュメント

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [pgvector公式ドキュメント](https://github.com/pgvector/pgvector)
- [ChromaDB移行前のドキュメント](../chromadb/README.md)

