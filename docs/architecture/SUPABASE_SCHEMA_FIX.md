# Supabaseスキーマ修正ガイド

## 問題

`createdAt`カラムが見つからないエラーが発生しています。

```
Could not find the 'createdAt' column of 'organizations' in the schema cache
```

## 原因

PostgreSQLでは、引用符で囲まない識別子（カラム名など）は自動的に小文字に変換されます。そのため、`createdAt`は`createdat`として保存されてしまいます。

SupabaseのPostgRESTは、カラム名をそのまま使用するため、`createdAt`を探すと見つかりません。

## 解決方法

### 方法1: 既存テーブルの修正（推奨）

1. Supabaseダッシュボードの「SQL Editor」を開く
2. 「New query」をクリック
3. 以下のSQLを実行：

```sql
-- organizationsテーブルのカラム名を修正
ALTER TABLE organizations RENAME COLUMN createdat TO "createdAt";
ALTER TABLE organizations RENAME COLUMN updatedat TO "updatedAt";
ALTER TABLE organizations RENAME COLUMN parentid TO "parentId";
ALTER TABLE organizations RENAME COLUMN levelname TO "levelName";
```

4. 他のテーブルも同様に修正が必要な場合は、個別に実行してください

### 方法2: テーブルの再作成（データがない場合）

データがない場合は、テーブルを削除してから、修正されたスキーマを再実行する方が簡単です。

1. テーブルを削除：
```sql
DROP TABLE IF EXISTS organizations CASCADE;
-- 他のテーブルも同様に削除
```

2. 修正された`create_schema.sql`を再実行

### 方法3: スキーマファイルの修正（将来のため）

`scripts/supabase/create_schema.sql`を修正して、キャメルケースのカラム名を引用符で囲む：

```sql
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    "parentId" TEXT,  -- 引用符で囲む
    name TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 引用符で囲む
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 引用符で囲む
    ...
);
```

## 確認方法

修正後、以下のSQLで確認できます：

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;
```

`createdAt`と`updatedAt`が正しく表示されることを確認してください。

## 注意事項

- カラム名を変更すると、既存のデータに影響する可能性があります
- 外部キー制約がある場合は、それらも更新する必要がある場合があります
- インデックスも再作成が必要な場合があります

