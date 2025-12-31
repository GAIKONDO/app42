# データ移行手順

## 現在の状態

移行スクリプトを実行しましたが、以下の問題があります：

### 1. スキーマに存在しないテーブル

以下のテーブルはスキーマに追加しましたが、Supabaseでまだ実行されていません：

- `categories` (42件)
- `departments` (11件)
- `bizDevPhases` (13件)
- `vcs` (12件)

### 2. カラム名の問題

PostgreSQLでは引用符で囲まれていない識別子は小文字に変換されます。以下のカラムで問題が発生しています：

- `users.approvedAt` → `approvedat`
- `meetingNotes.chromaSyncError` → `chromasyncerror`
- `topics.chromaSyncError` → `chromasyncerror`
- `mcp_tools.createdAt` → `createdat`

## 解決手順

### ステップ1: Supabaseでスキーマを更新

1. Supabaseダッシュボードにアクセス
2. SQL Editorを開く
3. `scripts/supabase/add_missing_tables.sql`の内容を実行

または、以下のSQLを実行：

```sql
-- categories: カテゴリー
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    "parentCategoryId" TEXT,
    position INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("parentCategoryId") REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_id ON categories(id);
CREATE INDEX IF NOT EXISTS idx_categories_parentCategoryId ON categories("parentCategoryId");

-- departments: 部署
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_id ON departments(id);

-- bizDevPhases: Biz-Devフェーズ
CREATE TABLE IF NOT EXISTS bizDevPhases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bizDevPhases_id ON bizDevPhases(id);

-- vcs: VC（ベンチャーキャピタル）
CREATE TABLE IF NOT EXISTS vcs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vcs_id ON vcs(id);

-- RLSポリシーを設定（開発用：全ユーザーにアクセス許可）
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bizDevPhases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能" ON categories FOR SELECT TO public USING (true);
CREATE POLICY "全ユーザーは読み取り可能" ON departments FOR SELECT TO public USING (true);
CREATE POLICY "全ユーザーは読み取り可能" ON bizDevPhases FOR SELECT TO public USING (true);
CREATE POLICY "全ユーザーは読み取り可能" ON vcs FOR SELECT TO public USING (true);

CREATE POLICY "全ユーザーは書き込み可能" ON categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "全ユーザーは書き込み可能" ON departments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "全ユーザーは書き込み可能" ON bizDevPhases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "全ユーザーは書き込み可能" ON vcs FOR ALL TO public USING (true) WITH CHECK (true);

-- Realtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE departments;
ALTER PUBLICATION supabase_realtime ADD TABLE bizDevPhases;
ALTER PUBLICATION supabase_realtime ADD TABLE vcs;
```

### ステップ2: カラム名の問題を確認

Supabaseダッシュボードで以下のテーブルのカラム名を確認してください：

1. `users`テーブル: `approvedAt`または`approvedat`
2. `meetingnotes`テーブル: `chromaSyncError`または`chromasyncerror`
3. `topics`テーブル: `chromaSyncError`または`chromasyncerror`
4. `mcp_tools`テーブル: `createdAt`または`createdat`

### ステップ3: 移行スクリプトを再実行

スキーマを更新した後、移行スクリプトを再実行：

```bash
npx tsx scripts/migrate_sqlite_to_supabase.ts
```

## 現在の移行状況

- ✅ `organizations`: 12/12件（完了）
- ⚠️ `users`: 0/1件（カラム名の問題）
- ⚠️ `meetingNotes`: 0/1件（カラム名の問題）
- ⚠️ `topics`: 0/9件（カラム名の問題）
- ⚠️ `mcp_tools`: 0/9件（カラム名の問題）
- ⚠️ `categories`: 0/42件（テーブルが存在しない）
- ⚠️ `departments`: 0/11件（テーブルが存在しない）
- ⚠️ `bizDevPhases`: 0/13件（テーブルが存在しない）
- ⚠️ `vcs`: 0/12件（テーブルが存在しない）

合計: 12/90件のレコードをインポートしました

