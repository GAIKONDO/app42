# コード移行ガイド - ChromaDB → Supabase（pgvector）

既存のChromaDBコードをSupabase（pgvector）対応に段階的に移行する手順です。

## 概要

環境変数でChromaDBとSupabaseを切り替え可能にする抽象化レイヤーを実装しました。既存のコードを段階的に移行できます。

## 環境変数の設定

`.env.local`ファイルに以下を設定：

```env
# Supabaseを使用する場合（既存の設定）
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ベクトル検索にSupabaseを使用する場合（明示的に指定）
NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true
```

### 優先順位

1. `NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true` → Supabaseを使用
2. `NEXT_PUBLIC_USE_SUPABASE=true` かつ Supabase設定が完了 → Supabaseを使用
3. それ以外 → ChromaDBを使用（デフォルト）

## 抽象化レイヤー

### 1. `lib/vectorSearchConfig.ts`

ベクトル検索バックエンドの設定を管理：

```typescript
import { getVectorSearchBackend, shouldUseChroma, shouldUseSupabase } from './vectorSearchConfig';

const backend = getVectorSearchBackend(); // 'chromadb' | 'supabase'
const isChromaDB = shouldUseChroma(); // true | false
const isSupabase = shouldUseSupabase(); // true | false
```

### 2. `lib/vectorSearchAdapter.ts`

ChromaDBとSupabaseを透過的に使用できる抽象化レイヤー：

```typescript
import {
  saveEntityEmbedding,
  saveRelationEmbedding,
  saveTopicEmbedding,
  saveDesignDocEmbedding,
  findSimilarEntities,
  findSimilarRelations,
  findSimilarTopics,
  findSimilarDesignDocs,
} from './vectorSearchAdapter';

// 保存
await saveEntityEmbedding(
  entityId,
  organizationId,
  companyId,
  embedding,
  metadata
);

// 検索
const results = await findSimilarEntities(
  queryEmbedding,
  limit,
  organizationId,
  companyId
);
```

## 移行手順

### ステップ1: 既存の保存処理を移行

#### エンティティ埋め込み

**移行前（ChromaDBのみ）:**
```typescript
import { saveEntityEmbeddingToChroma } from './entityEmbeddingsChroma';

await saveEntityEmbeddingToChroma(entityId, organizationId, entity);
```

**移行後（抽象化レイヤー使用）:**
```typescript
import { saveEntityEmbedding } from './vectorSearchAdapter';

await saveEntityEmbedding(
  entityId,
  organizationId,
  companyId,
  embedding,
  metadata
);
```

#### リレーション埋め込み

**移行前:**
```typescript
import { saveRelationEmbeddingToChroma } from './relationEmbeddingsChroma';

await saveRelationEmbeddingToChroma(relationId, organizationId, relation);
```

**移行後:**
```typescript
import { saveRelationEmbedding } from './vectorSearchAdapter';

await saveRelationEmbedding(
  relationId,
  organizationId,
  companyId,
  embedding,
  metadata
);
```

#### トピック埋め込み

**移行前:**
```typescript
import { saveTopicEmbeddingToChroma } from './topicEmbeddingsChroma';

await saveTopicEmbeddingToChroma(topicId, meetingNoteId, organizationId, title, content, metadata);
```

**移行後:**
```typescript
import { saveTopicEmbedding } from './vectorSearchAdapter';

await saveTopicEmbedding(
  topicId,
  organizationId,
  companyId,
  embedding,
  metadata
);
```

### ステップ2: 既存の検索処理を移行

#### エンティティ検索

**移行前（ChromaDBのみ）:**
```typescript
import { callTauriCommand } from './localFirebase';

const results = await callTauriCommand('chromadb_find_similar_entities', {
  queryEmbedding,
  limit,
  organizationId,
});
```

**移行後（抽象化レイヤー使用）:**
```typescript
import { findSimilarEntities } from './vectorSearchAdapter';

const results = await findSimilarEntities(
  queryEmbedding,
  limit,
  organizationId,
  companyId
);
// results: Array<{ id: string, similarity: number }>
```

#### リレーション検索

**移行前:**
```typescript
const results = await callTauriCommand('chromadb_find_similar_relations', {
  queryEmbedding,
  limit,
  organizationId,
});
```

**移行後:**
```typescript
import { findSimilarRelations } from './vectorSearchAdapter';

const results = await findSimilarRelations(
  queryEmbedding,
  limit,
  organizationId,
  companyId
);
```

#### トピック検索

**移行前:**
```typescript
const results = await callTauriCommand('chromadb_find_similar_topics', {
  queryEmbedding,
  limit,
  organizationId,
});
```

**移行後:**
```typescript
import { findSimilarTopics } from './vectorSearchAdapter';

const results = await findSimilarTopics(
  queryEmbedding,
  limit,
  organizationId,
  companyId
);
```

### ステップ3: 段階的な移行

既存のコードを一度にすべて移行する必要はありません。以下の順序で段階的に移行できます：

1. **新規機能**: 新しい抽象化レイヤーを使用
2. **既存機能**: 必要に応じて段階的に移行
3. **テスト**: 各移行後に動作確認

## 移行済みファイル

以下のファイルは既に移行済みです：

- ✅ `lib/entityEmbeddings.ts` - エンティティ埋め込みの保存処理
- ✅ `lib/entityEmbeddingsChroma.ts` - 後方互換性のため残されていますが、内部で抽象化レイヤーを使用

## 移行対象ファイル

以下のファイルを段階的に移行する必要があります：

- ⏳ `lib/relationEmbeddings.ts` - リレーション埋め込み
- ⏳ `lib/topicEmbeddings.ts` - トピック埋め込み
- ⏳ `lib/designDocRAG.ts` - システム設計ドキュメント埋め込み
- ⏳ `lib/knowledgeGraphRAG/searchEntities.ts` - エンティティ検索
- ⏳ `lib/knowledgeGraphRAG/searchRelations.ts` - リレーション検索
- ⏳ `lib/knowledgeGraphRAG/searchTopics.ts` - トピック検索

## 注意事項

### 1. 後方互換性

既存のChromaDBコードは引き続き動作します。環境変数を設定しない限り、ChromaDBが使用されます。

### 2. データ形式の違い

- **ChromaDB**: メタデータをJSON文字列として保存
- **Supabase**: メタデータをJSONBとして保存

抽象化レイヤーが自動的に変換しますが、カスタムコードがある場合は注意が必要です。

### 3. エラーハンドリング

SupabaseとChromaDBでエラーメッセージが異なる場合があります。エラーハンドリングを確認してください。

### 4. パフォーマンス

Supabaseはクラウドアクセスのため、レイテンシが発生する可能性があります。必要に応じてキャッシュを検討してください。

## テスト方法

### 1. 環境変数の確認

```typescript
import { getVectorSearchConfig } from './vectorSearchConfig';

const config = getVectorSearchConfig();
console.log('ベクトル検索バックエンド:', config.backend);
console.log('設定:', config.config);
```

### 2. 保存のテスト

```typescript
import { saveEntityEmbedding } from './vectorSearchAdapter';

await saveEntityEmbedding(
  'test-entity-1',
  'test-org-1',
  null,
  [0.1, 0.2, ...], // 1536次元のベクトル
  {
    name: 'テストエンティティ',
    type: 'concept',
  }
);
```

### 3. 検索のテスト

```typescript
import { findSimilarEntities } from './vectorSearchAdapter';

const results = await findSimilarEntities(
  [0.1, 0.2, ...], // クエリの埋め込みベクトル
  10,
  'test-org-1',
  null
);

console.log('検索結果:', results);
```

## トラブルシューティング

### エラー: "Supabase環境変数が設定されていません"

`.env.local`ファイルにSupabaseの設定を追加してください。

### エラー: "relation does not exist"

SupabaseのSQLスクリプトが実行されていない可能性があります。`scripts/supabase/`のSQLスクリプトを実行してください。

### エラー: "function does not exist"

ベクトル検索関数が作成されていない可能性があります。`create_vector_search_functions.sql`を実行してください。

## 関連ドキュメント

- [pgvector移行ガイド](./PGVECTOR_MIGRATION_GUIDE.md)
- [データ移行ガイド](../supabase/migrate_chromadb_to_supabase.md)

