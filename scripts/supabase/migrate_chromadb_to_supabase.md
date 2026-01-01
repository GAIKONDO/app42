# ChromaDBからSupabaseへのデータ移行ガイド

## 概要

このドキュメントでは、ChromaDBからSupabase（pgvector）へのデータ移行方法を説明します。

## 移行方法

### 方法1: アプリケーション経由での再生成（推奨）

既存のデータを再生成してSupabaseに保存する方法です。最も安全で確実な方法です。

#### 手順

1. Supabaseのベクトルテーブルと関数をセットアップ（`create_vector_tables.sql`、`create_vector_indexes.sql`、`create_vector_search_functions.sql`を実行）

2. 環境変数を設定してSupabaseを使用するように切り替え

3. 既存のエンティティ・リレーション・トピックの埋め込みを再生成
   - アプリケーションの機能を使用して、既存データの埋め込みを再生成
   - 自動的にSupabaseに保存されます

4. データの確認
   ```sql
   SELECT COUNT(*) FROM entity_embeddings;
   SELECT COUNT(*) FROM relation_embeddings;
   SELECT COUNT(*) FROM topic_embeddings;
   ```

#### メリット

- データの整合性が保証される
- 最新の埋め込みモデルで再生成できる
- エラーハンドリングが容易

#### デメリット

- 時間がかかる（データ量に依存）
- 埋め込みAPIのコストが発生する可能性

### 方法2: 直接データ移行（上級者向け）

ChromaDBから直接データをエクスポートしてSupabaseにインポートする方法です。

#### 前提条件

- ChromaDBサーバーが起動していること
- Rust側のTauriコマンドを使用してデータを取得できること

#### 手順

1. ChromaDBからデータをエクスポート

   Rust側でTauriコマンドを使用してデータを取得：

   ```rust
   // エンティティ埋め込みを取得
   let embedding = chromadb::get_entity_embedding(entity_id, organization_id).await?;
   ```

2. データを変換

   ChromaDBのデータ形式をSupabaseの形式に変換：

   ```typescript
   // ChromaDBのデータ形式
   {
     id: "entity-123",
     embedding: [0.1, 0.2, ...],
     metadata: { ... }
   }

   // Supabaseのデータ形式
   {
     id: "entity-123",
     entity_id: "entity-123",
     organization_id: "org-123",
     embedding: "[0.1,0.2,...]",  // 文字列形式
     embedding_dimension: 1536,
     ...
   }
   ```

3. Supabaseにインポート

   TypeScript側でSupabaseに保存：

   ```typescript
   import { saveEntityEmbeddingToSupabase } from '@/lib/vectorSearchSupabase';

   await saveEntityEmbeddingToSupabase(
     entityId,
     organizationId,
     companyId,
     embedding,
     metadata
   );
   ```

#### 注意事項

- ベクトルデータの形式変換が必要（配列 → 文字列）
- メタデータの形式変換が必要（JSON → JSONB）
- 大量のデータがある場合、バッチ処理を推奨

## 移行スクリプトの作成（オプション）

TypeScriptで移行スクリプトを作成する場合：

```typescript
// scripts/migrate-chromadb-to-supabase.ts

import { callTauriCommand } from '@/lib/tauri';
import { saveEntityEmbeddingToSupabase } from '@/lib/vectorSearchSupabase';

async function migrateEntityEmbeddings() {
  // 1. すべてのエンティティIDを取得（SQLiteから）
  const entities = await getAllEntities();
  
  // 2. 各エンティティの埋め込みをChromaDBから取得
  for (const entity of entities) {
    try {
      const embeddingData = await callTauriCommand('chromadb_get_entity_embedding', {
        entityId: entity.id,
        organizationId: entity.organizationId,
      });
      
      if (embeddingData && embeddingData.combinedEmbedding) {
        // 3. Supabaseに保存
        await saveEntityEmbeddingToSupabase(
          entity.id,
          entity.organizationId,
          entity.companyId,
          embeddingData.combinedEmbedding,
          {
            name: embeddingData.name,
            type: embeddingData.type,
            aliases: embeddingData.aliases,
            metadata: embeddingData.metadata,
            embeddingModel: embeddingData.embeddingModel,
            embeddingVersion: embeddingData.embeddingVersion,
          }
        );
        
        console.log(`✅ 移行完了: ${entity.id}`);
      }
    } catch (error) {
      console.error(`❌ 移行エラー: ${entity.id}`, error);
    }
  }
}
```

## データ検証

移行後、データの整合性を確認：

```sql
-- エンティティ埋め込みの件数を確認
SELECT 
    organization_id,
    COUNT(*) as count,
    COUNT(DISTINCT embedding_dimension) as dimensions
FROM entity_embeddings
GROUP BY organization_id;

-- 埋め込み次元数の分布を確認
SELECT 
    embedding_dimension,
    COUNT(*) as count
FROM entity_embeddings
GROUP BY embedding_dimension;

-- 類似度検索のテスト
SELECT * FROM find_similar_entities(
    (SELECT embedding FROM entity_embeddings LIMIT 1),
    0.5,
    10,
    NULL,
    NULL
);
```

## トラブルシューティング

### エラー: "duplicate key value violates unique constraint"

既にデータが存在している場合に発生します。`UPSERT`を使用するか、既存データを削除してから再実行してください。

### エラー: "invalid input syntax for type vector"

ベクトルデータの形式が正しくありません。文字列形式 `[0.1,0.2,...]` であることを確認してください。

### エラー: "dimension mismatch"

埋め込みベクトルの次元数が一致していません。1536次元と768次元で異なる関数を使用してください。

## 推奨事項

1. **段階的移行**: 一度にすべてのデータを移行せず、組織ごとやデータタイプごとに段階的に移行
2. **バックアップ**: 移行前に必ずデータのバックアップを取得
3. **検証**: 移行後、検索結果が正しいことを確認
4. **パフォーマンステスト**: 移行後、検索パフォーマンスをテスト

