-- スキーマに存在しないテーブルを追加
-- categories, departments, bizDevPhases, vcs, statuses, engagementLevels

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

-- statuses: ステータス
CREATE TABLE IF NOT EXISTS statuses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statuses_id ON statuses(id);

-- engagementLevels: ねじ込み注力度
CREATE TABLE IF NOT EXISTS "engagementLevels" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagementLevels_id ON "engagementLevels"(id);

-- RLSポリシーを設定（開発用：全ユーザーにアクセス許可）
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bizDevPhases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE "engagementLevels" ENABLE ROW LEVEL SECURITY;

-- 全ユーザーは読み取り可能（ポリシーが存在しない場合のみ作成）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'categories'::regclass AND polname = '全ユーザーは読み取り可能') THEN
        CREATE POLICY "全ユーザーは読み取り可能" ON categories FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'departments'::regclass AND polname = '全ユーザーは読み取り可能') THEN
        CREATE POLICY "全ユーザーは読み取り可能" ON departments FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'bizDevPhases'::regclass AND polname = '全ユーザーは読み取り可能') THEN
        CREATE POLICY "全ユーザーは読み取り可能" ON bizDevPhases FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'vcs'::regclass AND polname = '全ユーザーは読み取り可能') THEN
        CREATE POLICY "全ユーザーは読み取り可能" ON vcs FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'statuses'::regclass AND polname = '全ユーザーは読み取り可能') THEN
        CREATE POLICY "全ユーザーは読み取り可能" ON statuses FOR SELECT TO public USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = '"engagementLevels"'::regclass AND polname = '全ユーザーは読み取り可能') THEN
        CREATE POLICY "全ユーザーは読み取り可能" ON "engagementLevels" FOR SELECT TO public USING (true);
    END IF;
END $$;

-- 全ユーザーは書き込み可能（ポリシーが存在しない場合のみ作成）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'categories'::regclass AND polname = '全ユーザーは書き込み可能') THEN
        CREATE POLICY "全ユーザーは書き込み可能" ON categories FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'departments'::regclass AND polname = '全ユーザーは書き込み可能') THEN
        CREATE POLICY "全ユーザーは書き込み可能" ON departments FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'bizDevPhases'::regclass AND polname = '全ユーザーは書き込み可能') THEN
        CREATE POLICY "全ユーザーは書き込み可能" ON bizDevPhases FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'vcs'::regclass AND polname = '全ユーザーは書き込み可能') THEN
        CREATE POLICY "全ユーザーは書き込み可能" ON vcs FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'statuses'::regclass AND polname = '全ユーザーは書き込み可能') THEN
        CREATE POLICY "全ユーザーは書き込み可能" ON statuses FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = '"engagementLevels"'::regclass AND polname = '全ユーザーは書き込み可能') THEN
        CREATE POLICY "全ユーザーは書き込み可能" ON "engagementLevels" FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Realtimeを有効化（既に追加されている場合はスキップ）
DO $$
BEGIN
    -- categories
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'categories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE categories;
    END IF;
    -- departments
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'departments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE departments;
    END IF;
    -- bizDevPhases (引用符なしテーブル名のため、小文字で検索)
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bizdevphases') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE bizDevPhases;
    END IF;
    -- vcs
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vcs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE vcs;
    END IF;
    -- statuses
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'statuses') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE statuses;
    END IF;
    -- engagementLevels (引用符付きテーブル名のため、大文字小文字を区別して検索)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND (tablename = 'engagementLevels' OR tablename = 'engagementlevels')
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE "engagementLevels";
    END IF;
END $$;

