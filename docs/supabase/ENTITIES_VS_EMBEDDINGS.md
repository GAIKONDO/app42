# entitiesテーブルとentity_embeddingsテーブルの違い

## 概要

Supabaseには2つのテーブルがあります：

1. **`entities`テーブル** - エンティティの基本情報を保存
2. **`entity_embeddings`テーブル** - ベクトル検索用の埋め込みベクトルを保存

## テーブルの違い

### `entities`テーブル

エンティティの基本情報を保存するテーブルです。

**主なカラム：**
- `id` - エンティティID（主キー）
- `name` - エンティティ名
- `type` - エンティティタイプ（person, company, productなど）
- `aliases` - 別名（JSONB）
- `metadata` - メタデータ（JSONB）
- `organizationId` - 組織ID
- `companyId` - 会社ID
- `createdAt` - 作成日時
- `updatedAt` - 更新日時

**用途：**
- エンティティの基本情報の管理
- 通常のデータベース操作（CRUD）
- リレーションの参照元

### `entity_embeddings`テーブル

ベクトル検索用の埋め込みベクトルを保存するテーブルです。

**主なカラム：**
- `id` - 埋め込みID（通常は`entity_id`と同じ）
- `entity_id` - エンティティID（外部キー）
- `organization_id` - 組織ID
- `company_id` - 会社ID
- `embedding` - 埋め込みベクトル（vector型、1536次元）
- `embedding_dimension` - 埋め込み次元数（768または1536）
- `embedding_model` - 使用した埋め込みモデル（例: `text-embedding-3-small`）
- `embedding_version` - 埋め込みバージョン（例: `1.0`、`2.0`）
- `name` - エンティティ名（検索用に重複保存）
- `type` - エンティティタイプ（検索用に重複保存）
- `aliases` - 別名（JSONB、検索用に重複保存）
- `metadata` - メタデータ（JSONB、検索用に重複保存）
- `created_at` - 作成日時
- `updated_at` - 更新日時

**用途：**
- ベクトル類似度検索
- RAG（Retrieval-Augmented Generation）検索
- セマンティック検索

## 自動生成と保存の仕組み

### エンティティ作成時の処理フロー

1. **エンティティの作成**
   ```typescript
   await createEntity(entityData);
   ```
   - `entities`テーブルにエンティティ情報を保存

2. **埋め込みの自動生成（非同期）**
   ```typescript
   saveEntityEmbeddingAsync(entityId, organizationId);
   ```
   - エンティティ作成後、自動的に非同期で実行される
   - エラーが発生してもエンティティ作成は続行される

3. **埋め込みの生成プロセス**
   - エンティティ名、別名、メタデータからテキストを構築
   - OpenAI API（`text-embedding-3-small`）を使用して埋め込みベクトルを生成
   - `entity_embeddings`テーブルに保存

### コードの流れ

```typescript
// lib/entityApi.ts - createEntity関数
export async function createEntity(entity: CreateEntityInput): Promise<Entity> {
  // 1. entitiesテーブルに保存
  await setDocViaDataSource('entities', id, entityData);
  
  // 2. 埋め込みを非同期で生成（エラーは無視）
  if (entity.organizationId) {
    saveEntityEmbeddingAsync(id, entity.organizationId).catch(error => {
      console.error('埋め込み生成エラー（続行します）:', error);
    });
  }
}
```

```typescript
// lib/entityEmbeddings.ts - saveEntityEmbeddingAsync関数
export async function saveEntityEmbeddingAsync(
  entityId: string,
  organizationId: string
): Promise<boolean> {
  // 1. エンティティ情報を取得
  const entity = await getEntityById(entityId);
  
  // 2. 埋め込みを生成
  const combinedEmbedding = await generateEmbedding(combinedText);
  
  // 3. entity_embeddingsテーブルに保存
  await saveEntityEmbedding(entityId, organizationId, entity);
}
```

## embedding_modelカラムについて

### `text-embedding-3-small`とは

- **OpenAIの埋め込みモデル**です
- **1536次元**のベクトルを生成します
- コスト効率が良く、高速です
- 現在のコードでは`CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small'`として定義されています

### なぜ`embedding_model`カラムがあるのか

1. **モデル変更への対応**
   - 将来的に別のモデル（例: `text-embedding-3-large`、`text-embedding-ada-002`）に変更する場合
   - どのモデルで生成された埋め込みかを記録しておく必要がある

2. **検索時の互換性チェック**
   - 異なるモデルで生成された埋め込みは次元数や特性が異なる可能性がある
   - 検索時に同じモデルで生成された埋め込みのみを対象にする

3. **再生成の管理**
   - モデルを変更した場合、既存の埋め込みを再生成する必要がある
   - `embedding_model`で古い埋め込みを識別できる

## データの整合性

### 外部キー制約

```sql
CONSTRAINT fk_entity_embeddings_entity 
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
```

- `entity_embeddings.entity_id`は`entities.id`を参照
- `entities`テーブルのエンティティが削除されると、関連する`entity_embeddings`も自動的に削除される（CASCADE）

### データの重複

`entity_embeddings`テーブルには`name`、`type`、`aliases`、`metadata`が重複保存されています。

**理由：**
- 検索パフォーマンスの向上（JOINが不要）
- 埋め込み生成時のスナップショットを保持
- エンティティ情報が変更されても、検索時の整合性を保つ

## まとめ

| 項目 | entitiesテーブル | entity_embeddingsテーブル |
|------|-----------------|-------------------------|
| **目的** | エンティティの基本情報管理 | ベクトル検索用の埋め込み |
| **保存タイミング** | エンティティ作成時 | エンティティ作成後（非同期） |
| **データ形式** | 通常のテキスト/JSON | ベクトル（1536次元の配列） |
| **検索方法** | SQLクエリ | ベクトル類似度検索（pgvector） |
| **必須性** | 必須 | オプション（検索機能を使用する場合のみ） |

**重要なポイント：**
- ✅ エンティティを作成すると、自動的に埋め込みが生成される（非同期）
- ✅ `embedding_model`は`text-embedding-3-small`がデフォルト
- ✅ 埋め込み生成に失敗しても、エンティティ作成は成功する
- ✅ `entities`と`entity_embeddings`は外部キーで関連付けられている

