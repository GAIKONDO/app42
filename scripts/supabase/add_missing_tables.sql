-- スキーマに存在しないテーブルを追加
-- categories, departments, bizDevPhases, vcs

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

-- 全ユーザーは読み取り可能
CREATE POLICY "全ユーザーは読み取り可能" ON categories FOR SELECT TO public USING (true);
CREATE POLICY "全ユーザーは読み取り可能" ON departments FOR SELECT TO public USING (true);
CREATE POLICY "全ユーザーは読み取り可能" ON bizDevPhases FOR SELECT TO public USING (true);
CREATE POLICY "全ユーザーは読み取り可能" ON vcs FOR SELECT TO public USING (true);

-- 全ユーザーは書き込み可能
CREATE POLICY "全ユーザーは書き込み可能" ON categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "全ユーザーは書き込み可能" ON departments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "全ユーザーは書き込み可能" ON bizDevPhases FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "全ユーザーは書き込み可能" ON vcs FOR ALL TO public USING (true) WITH CHECK (true);

-- Realtimeを有効化
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE departments;
ALTER PUBLICATION supabase_realtime ADD TABLE bizDevPhases;
ALTER PUBLICATION supabase_realtime ADD TABLE vcs;

