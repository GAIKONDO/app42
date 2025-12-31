# Supabase パフォーマンス最適化ガイド

## 概要

Supabaseに切り替えた際のパフォーマンス問題を解決するための最適化ガイドです。

## 主な問題点

### 1. 全件取得後のクライアント側フィルタリング

**問題**: すべてのレコードを取得してから、JavaScript側でフィルタリングしていたため、不要なデータ転送が発生していました。

**例**:
```typescript
// ❌ 非効率な方法
const allStartups = await getCollectionViaDataSource('startups');
const filtered = allStartups.filter(item => item.organizationId === organizationId);
```

**解決策**: SupabaseのWHERE句を使用して、サーバー側でフィルタリングします。

```typescript
// ✅ 効率的な方法
const result = await dataSource.collection_get('startups', {
  filters: [
    { field: 'organizationId', operator: 'eq', value: organizationId }
  ]
});
```

### 2. 不要なカラムの取得

**問題**: `select('*')`で全カラムを取得していたため、不要なデータ転送が発生していました。

**解決策**: 必要なカラムのみを指定します（将来的な最適化として実装済み）。

```typescript
const result = await dataSource.collection_get('startups', {
  columns: 'id,title,organizationId,createdAt', // 必要なカラムのみ
  filters: [...]
});
```

### 3. ネットワークレイテンシ

**問題**: クラウド経由でデータを取得するため、ローカルのSQLiteと比べてレイテンシが増加します。

**解決策**: 
- クエリの最適化（WHERE句、インデックスの活用）
- バッチクエリの使用
- キャッシュの活用（将来的な最適化）

## 実装済みの最適化

### 1. `getStartups`関数の最適化

**変更前**:
- すべてのスタートアップを取得
- クライアント側で`organizationId`でフィルタリング

**変更後**:
- SupabaseのWHERE句で`organizationId`をフィルタリング
- サーバー側でソート（`createdAt`降順）

**効果**: データ転送量の削減、レスポンス時間の短縮

### 2. `getFocusInitiatives`関数の最適化

**変更前**:
- すべての注力施策を取得
- クライアント側で`organizationId`でフィルタリング

**変更後**:
- SupabaseのWHERE句で`organizationid`（小文字）をフィルタリング
- サーバー側でソート（`createdAt`降順）

**効果**: データ転送量の削減、レスポンス時間の短縮

### 3. `getOrgMembers`関数の最適化

**変更前**:
- Rust API経由で取得（Supabase使用時も）

**変更後**:
- Supabase使用時は直接Supabaseから取得
- `organizationId`でフィルタリング
- サーバー側でソート（`position`昇順）

**効果**: APIサーバー経由のオーバーヘッドを削減

### 4. `SupabaseDataSource.collection_get`の拡張

**追加機能**:
- 複数のWHERE条件をサポート（`filters`配列）
- 必要なカラムのみを選択するオプション（`columns`）

**使用例**:
```typescript
const result = await dataSource.collection_get('startups', {
  filters: [
    { field: 'organizationId', operator: 'eq', value: orgId },
    { field: 'status', operator: 'eq', value: 'active' }
  ],
  columns: 'id,title,organizationId',
  orderBy: 'createdAt',
  orderDirection: 'desc',
  limit: 100
});
```

## インデックスの確認

Supabaseのスキーマには以下のインデックスが定義されています：

- `idx_startups_organizationId`: スタートアップの組織ID検索
- `idx_focusInitiatives_organizationId`: 注力施策の組織ID検索
- `idx_organizationMembers_organizationId`: 組織メンバーの組織ID検索

これらのインデックスにより、WHERE句でのフィルタリングが高速化されます。

## 今後の最適化案

### 1. バッチクエリの実装

複数の`organizationId`で一度にデータを取得する機能を追加します。

```typescript
// 将来的な実装
const result = await dataSource.collection_get('startups', {
  filters: [
    { field: 'organizationId', operator: 'in', value: [orgId1, orgId2, orgId3] }
  ]
});
```

### 2. キャッシュの実装

頻繁にアクセスされるデータをキャッシュして、ネットワークリクエストを削減します。

### 3. ページネーションの実装

大量のデータを取得する際は、ページネーションを使用して一度に取得するデータ量を制限します。

### 4. リアルタイム更新の最適化

Supabaseのリアルタイム機能を使用して、データの変更を効率的に同期します。

## パフォーマンス測定

最適化の効果を測定するには、ブラウザの開発者ツールのNetworkタブを使用します：

1. **リクエスト数**: 最適化により、リクエスト数が削減される
2. **転送データ量**: WHERE句でのフィルタリングにより、転送データ量が削減される
3. **レスポンス時間**: インデックスの活用により、レスポンス時間が短縮される

## 注意事項

1. **PostgreSQLの識別子の大文字小文字**: PostgreSQLでは引用符なしの識別子は小文字に変換されます。`organizationId`は`organizationid`として保存される場合があります。

2. **RLS（Row Level Security）**: SupabaseのRLSが有効な場合、適切なポリシーが設定されていることを確認してください。

3. **ネットワークレイテンシ**: クラウド経由のため、ローカルのSQLiteと比べてレイテンシが増加します。これは避けられない制約ですが、クエリの最適化により影響を最小限に抑えられます。

## まとめ

Supabaseへの切り替えにより、ネットワークレイテンシが増加しますが、以下の最適化によりパフォーマンスを改善できます：

1. ✅ WHERE句でのフィルタリング（サーバー側）
2. ✅ インデックスの活用
3. ✅ 不要なデータ転送の削減
4. ✅ バッチクエリの使用（将来的）

これらの最適化により、ローカルのSQLiteと比べて遅延はあるものの、実用的なパフォーマンスを実現できます。

