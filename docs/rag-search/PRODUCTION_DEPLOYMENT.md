# 本番環境への適用ガイド

> **📋 ステータス**: 実装済み  
> **📅 作成日**: 2025-12-11  
> **👤 用途**: 本番環境への適用手順

## 概要

BM25とクエリルーターの実装が完了し、本番環境で使用可能な状態です。このガイドでは、本番環境への適用方法を説明します。

## 適用状況

### ✅ 実装完了

1. **BM25検索**: 実装完了、動作確認済み
2. **クエリルーター**: 実装完了、動作確認済み
3. **最適化機能**: キャッシュ、無効化、パラメータ調整機能を実装

### ✅ 本番環境への統合

1. **useRAGSearchフック**: クエリルーターを自動的に使用
2. **MCPツール**: クエリルーターを自動的に使用
3. **設定管理**: localStorageで設定を管理

## デフォルト設定

本番環境では、以下の設定がデフォルトで有効になっています:

```typescript
{
  enableBM25: true,              // BM25検索を有効化
  enableRouter: true,             // クエリルーターを有効化
  useHybridSearchByDefault: true // デフォルトでハイブリッド検索を使用
}
```

## 設定の変更方法

### 方法1: 設定ページから変更

1. ブラウザで `/settings/search-config` にアクセス
2. 各設定のチェックボックスを変更
3. 「保存」ボタンをクリック

### 方法2: プログラムから変更

```typescript
import { setSearchConfig } from '@/lib/knowledgeGraphRAG';

// BM25検索のみ無効化
setSearchConfig({
  enableBM25: false,
  enableRouter: true,
  useHybridSearchByDefault: false,
});

// すべて有効化（デフォルト）
setSearchConfig({
  enableBM25: true,
  enableRouter: true,
  useHybridSearchByDefault: true,
});
```

### 方法3: ブラウザコンソールから変更

```javascript
// 設定を確認
const { getSearchConfig } = await import('/lib/knowledgeGraphRAG/searchConfig.ts');
console.log(getSearchConfig());

// 設定を変更
const { setSearchConfig } = await import('/lib/knowledgeGraphRAG/searchConfig.ts');
setSearchConfig({ enableBM25: false });

// 設定をリセット
const { resetSearchConfig } = await import('/lib/knowledgeGraphRAG/searchConfig.ts');
resetSearchConfig();
```

## 段階的なロールアウト

### ステップ1: BM25検索のみ有効化

```typescript
setSearchConfig({
  enableBM25: true,
  enableRouter: false,  // ルーターは無効
  useHybridSearchByDefault: true,
});
```

### ステップ2: クエリルーターも有効化

```typescript
setSearchConfig({
  enableBM25: true,
  enableRouter: true,   // ルーターを有効化
  useHybridSearchByDefault: true,
});
```

## 動作確認

### 1. 検索結果の確認

- 検索結果のスコアが向上しているか確認
- 固有名詞を含むクエリで、BM25検索が効果的に機能しているか確認
- クエリタイプに応じて、適切な検索戦略が選択されているか確認

### 2. パフォーマンスの確認

- 初回検索時のインデックス構築時間を確認
- 2回目以降の検索速度を確認
- メモリ使用量を確認

### 3. エラーの確認

- コンソールログでエラーがないか確認
- 検索結果が空になっていないか確認

## トラブルシューティング

### 問題1: 検索結果が空になる

**原因**: BM25検索が有効だが、データが存在しない

**対処法**:
1. ベクトル検索のみに戻す（`enableBM25: false`）
2. データが正しく保存されているか確認
3. `searchableText`カラムが正しく設定されているか確認

### 問題2: 検索速度が遅い

**原因**: 初回検索時のインデックス構築

**対処法**:
1. 2回目以降の検索速度を確認（キャッシュが効いているか）
2. 検索範囲を限定（`organizationId`を指定）
3. 必要に応じてBM25検索を無効化

### 問題3: メモリ使用量が増加

**原因**: BM25インデックスのキャッシュ

**対処法**:
1. キャッシュサイズを調整
2. 定期的にキャッシュをクリア
3. 検索範囲を限定

## ロールバック方法

問題が発生した場合、以下の方法でロールバックできます:

### 方法1: 設定をリセット

```typescript
import { resetSearchConfig } from '@/lib/knowledgeGraphRAG';
resetSearchConfig();
```

### 方法2: すべて無効化

```typescript
import { setSearchConfig } from '@/lib/knowledgeGraphRAG';
setSearchConfig({
  enableBM25: false,
  enableRouter: false,
  useHybridSearchByDefault: false,
});
```

これにより、従来のベクトル検索のみの動作に戻ります。

## モニタリング

### 推奨メトリクス

1. **検索速度**: 平均検索時間
2. **検索精度**: ユーザーフィードバック、クリック率
3. **エラー率**: 検索エラーの発生率
4. **メモリ使用量**: BM25インデックスのメモリ使用量

### ログの確認

コンソールログで以下の情報を確認:

- `[searchKnowledgeGraph]`: 検索の開始と完了
- `[QueryRouter]`: クエリ分析結果
- `[BM25IndexCache]`: キャッシュの取得と保存
- `[searchEntitiesBM25]`: BM25検索の実行

## まとめ

本番環境への適用は完了しています。デフォルトで以下の機能が有効になっています:

- ✅ BM25検索
- ✅ クエリルーター
- ✅ ハイブリッド検索

問題が発生した場合は、設定ページ（`/settings/search-config`）から無効化できます。

## 関連ドキュメント

- [実装サマリー](./IMPLEMENTATION_SUMMARY.md) - 実装内容の総括
- [BM25使用方法](./BM25_USAGE.md) - BM25検索の使用方法
- [クエリルーター使用方法](./QUERY_ROUTER_USAGE.md) - ルーターの使用方法

