# クエリルーターの使用方法

> **📋 ステータス**: 実装済み  
> **📅 作成日**: 2025-12-11  
> **👤 用途**: クエリルーターの使用方法ガイド

## 概要

クエリルーターは、クエリの種類を自動的に分析し、最適な検索戦略を選択する機能です。これにより、クエリタイプに応じた最適化された検索結果を提供します。

## クエリタイプ

クエリルーターは以下の5つのタイプを判定します:

1. **factual（事実確認型）**: "〜とは？", "〜の定義"
2. **relational（関係性検索型）**: "〜と〜の関係", "〜に関連する"
3. **keyword（キーワード検索型）**: 固有名詞が多い
4. **conceptual（概念検索型）**: 抽象的な概念
5. **mixed（混合型）**: 複数のタイプが混在

## 基本的な使用方法

### 方法1: 専用関数を使用（推奨）

```typescript
import { searchKnowledgeGraphWithRouter } from '@/lib/knowledgeGraphRAG';

// クエリルーターが自動的に最適な検索戦略を選択
const results = await searchKnowledgeGraphWithRouter(
  'トヨタ自動車とは？',
  10,
  { organizationId: 'org-123' }
);
```

### 方法2: searchKnowledgeGraphでルーターを有効化

```typescript
import { searchKnowledgeGraph } from '@/lib/knowledgeGraphRAG';

// useRouterパラメータをtrueに設定
const results = await searchKnowledgeGraph(
  'トヨタ自動車とは？',
  10,
  { organizationId: 'org-123' },
  true,  // useCache
  10000, // timeoutMs
  undefined, // hybridConfig（ルーターが自動決定）
  true   // useRouter
);
```

### 方法3: クエリ分析のみを使用

```typescript
import { analyzeQuery, getSearchStrategy } from '@/lib/knowledgeGraphRAG';

// クエリを分析
const analysis = analyzeQuery('トヨタ自動車とは？');
console.log('クエリタイプ:', analysis.type);
console.log('信頼度:', analysis.confidence);
console.log('キーワード:', analysis.keywords);

// 検索戦略を取得
const strategy = getSearchStrategy(analysis.type);
console.log('検索戦略:', strategy);
```

## 検索戦略

各クエリタイプに応じて、以下の検索戦略が自動的に選択されます:

### 事実確認型（factual）

- **BM25を重視**: 固有名詞マッチングに最適化
- **重み**: BM25 70%, ベクトル 30%

### 関係性検索型（relational）

- **ベクトル検索を重視**: 意味的類似性に最適化
- **重み**: BM25 20-30%, ベクトル 70-80%

### キーワード検索型（keyword）

- **BM25のみ**: 固有名詞の完全一致に最適化
- **重み**: BM25 100%, ベクトル 0%

### 概念検索型（conceptual）

- **ベクトル検索のみ**: 抽象的概念の検索に最適化
- **重み**: BM25 0%, ベクトル 100%

### 混合型（mixed）

- **バランス型**: 両方の検索方式を均等に使用
- **重み**: BM25 50%, ベクトル 50%

## 使用例

### 例1: 事実確認型のクエリ

```typescript
const results = await searchKnowledgeGraphWithRouter(
  'トヨタ自動車とは？',
  10
);
// → BM25を重視した検索戦略が自動選択される
```

### 例2: 関係性検索型のクエリ

```typescript
const results = await searchKnowledgeGraphWithRouter(
  'トヨタとホンダの関係',
  10
);
// → ベクトル検索を重視した検索戦略が自動選択される
```

### 例3: キーワード検索型のクエリ

```typescript
const results = await searchKnowledgeGraphWithRouter(
  'Toyota Motor Corporation',
  10
);
// → BM25のみの検索戦略が自動選択される
```

### 例4: 概念検索型のクエリ

```typescript
const results = await searchKnowledgeGraphWithRouter(
  '持続可能な開発の方法',
  10
);
// → ベクトル検索のみの検索戦略が自動選択される
```

## クエリ分析の詳細

### 分析結果の取得

```typescript
import { analyzeQuery } from '@/lib/knowledgeGraphRAG';

const analysis = analyzeQuery('トヨタ自動車とは？');

console.log(analysis);
// {
//   type: 'factual',
//   confidence: 0.8,
//   keywords: ['トヨタ自動車', 'とは'],
//   entities: ['トヨタ自動車'],
//   reasons: [
//     '事実確認型パターンに一致: /とは[？?]?$/',
//     '疑問符が含まれている（事実確認型の可能性）'
//   ]
// }
```

### 判定理由の確認

`reasons`配列には、クエリタイプが判定された理由が含まれます。デバッグや改善に役立ちます。

## パフォーマンス

- **クエリ分析**: 数ミリ秒（非常に高速）
- **検索戦略の選択**: 即座（メモリ内の処理）
- **検索実行**: 通常の検索と同様（戦略に応じて異なる）

## 注意事項

1. **後方互換性**: 既存のコードは変更不要です。ルーターはオプション機能です。
2. **デフォルト動作**: `useRouter`パラメータを指定しない場合、従来通りベクトル検索のみが使用されます。
3. **判定精度**: クエリタイプの判定はパターンマッチングに基づくため、100%正確ではない場合があります。

## トラブルシューティング

### クエリタイプが正しく判定されない

- クエリの表現を変更してみてください
- `analyzeQuery`の結果を確認して、判定理由を確認してください
- 必要に応じて、手動で`hybridConfig`を指定してください

### 検索結果が期待と異なる

- クエリ分析結果を確認してください
- 検索戦略が適切か確認してください
- 必要に応じて、手動で検索戦略を調整してください

## 関連ドキュメント

- [BM25とルーター実装計画](./BM25_ROUTER_IMPLEMENTATION_PLAN.md) - 実装計画の詳細
- [BM25使用方法](./BM25_USAGE.md) - BM25検索の使用方法
- [BM25動作確認ガイド](./BM25_TESTING_GUIDE.md) - 動作確認手順

