# pgvector移行 - 概要

ChromaDBからSupabase（pgvector）への移行に関するファイルとドキュメントの概要です。

## ファイル構成

### SQLスクリプト

1. **`enable_pgvector.sql`**
   - pgvector拡張機能の有効化
   - 最初に実行する必要があります

2. **`create_vector_tables.sql`**
   - 埋め込みベクトル用テーブルの作成
   - `entity_embeddings`, `relation_embeddings`, `topic_embeddings`, `design_doc_embeddings`
   - 外部キー制約とインデックスも含まれます

3. **`create_vector_indexes.sql`**
   - HNSWインデックスの作成
   - 高速なベクトル類似度検索のためのインデックス
   - **注意**: 作成には時間がかかります

4. **`create_vector_search_functions.sql`**
   - ベクトル検索用のPostgreSQL関数
   - `find_similar_entities`, `find_similar_relations`, `find_similar_topics`, `find_similar_design_docs`
   - SupabaseのRPC関数として使用可能

### TypeScriptコード

- **`lib/vectorSearchSupabase.ts`**
  - Supabase（pgvector）を使用したベクトル検索関数
  - ChromaDBの代替実装

### ドキュメント

- **`docs/supabase/PGVECTOR_MIGRATION_GUIDE.md`**
  - 移行手順の詳細ガイド
  - トラブルシューティング情報

- **`scripts/supabase/migrate_chromadb_to_supabase.md`**
  - データ移行方法の説明
  - 移行スクリプトの例

## 実行順序

1. `enable_pgvector.sql` - pgvector拡張機能の有効化
2. `create_vector_tables.sql` - テーブルの作成
3. `create_vector_indexes.sql` - インデックスの作成（時間がかかります）
4. `create_vector_search_functions.sql` - 検索関数の作成
5. データ移行（アプリケーション経由または直接移行）

## 使用方法

### 1. SupabaseダッシュボードでSQLスクリプトを実行

1. Supabaseダッシュボードにアクセス
2. 「SQL Editor」を開く
3. 各SQLスクリプトを順番に実行

### 2. TypeScriptコードの使用

```typescript
import { 
  saveEntityEmbeddingToSupabase,
  findSimilarEntitiesInSupabase 
} from '@/lib/vectorSearchSupabase';

// 埋め込みベクトルを保存
await saveEntityEmbeddingToSupabase(
  entityId,
  organizationId,
  companyId,
  embedding,
  metadata
);

// 類似度検索
const results = await findSimilarEntitiesInSupabase(
  queryEmbedding,
  limit,
  organizationId,
  companyId
);
```

## 注意事項

1. **インデックスの作成時間**: HNSWインデックスの作成には時間がかかります（データ量に依存）
2. **ベクトル次元数**: 1536次元と768次元で異なる関数を使用します
3. **データ移行**: 既存のChromaDBデータを移行する必要があります
4. **パフォーマンス**: クラウドアクセスのレイテンシを考慮してください

## 関連ドキュメント

- [移行ガイド](./docs/supabase/PGVECTOR_MIGRATION_GUIDE.md)
- [データ移行ガイド](./migrate_chromadb_to_supabase.md)
- [Supabase公式ドキュメント](https://supabase.com/docs)
- [pgvector公式ドキュメント](https://github.com/pgvector/pgvector)

