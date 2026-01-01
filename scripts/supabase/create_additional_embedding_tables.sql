-- 追加の埋め込みベクトル用テーブルの作成
-- スタートアップ、議事録、注力施策の埋め込み用

-- ============================================
-- スタートアップ埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS startup_embeddings (
    id TEXT PRIMARY KEY,
    startup_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    description TEXT,
    content TEXT,
    objective TEXT,
    evaluation TEXT,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    CONSTRAINT fk_startup_embeddings_startup FOREIGN KEY (startup_id) REFERENCES startups(id) ON DELETE CASCADE,
    CONSTRAINT fk_startup_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_startup_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_startup_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    CONSTRAINT chk_startup_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_startup_embeddings_startup_id ON startup_embeddings(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_embeddings_organization_id ON startup_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_startup_embeddings_company_id ON startup_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_startup_embeddings_embedding_model ON startup_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_startup_embeddings_created_at ON startup_embeddings(created_at);

-- ============================================
-- 議事録埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_note_embeddings (
    id TEXT PRIMARY KEY,
    meeting_note_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    description TEXT,
    content TEXT,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: meetingNotesテーブルは引用符なしで作成されているため、PostgreSQLでは小文字(meetingnotes)として解釈されます
    CONSTRAINT fk_meeting_note_embeddings_meeting_note FOREIGN KEY (meeting_note_id) REFERENCES meetingnotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_meeting_note_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_meeting_note_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_meeting_note_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    CONSTRAINT chk_meeting_note_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_meeting_note_embeddings_meeting_note_id ON meeting_note_embeddings(meeting_note_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_embeddings_organization_id ON meeting_note_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_embeddings_company_id ON meeting_note_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_embeddings_embedding_model ON meeting_note_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_meeting_note_embeddings_created_at ON meeting_note_embeddings(created_at);

-- ============================================
-- 注力施策埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS focus_initiative_embeddings (
    id TEXT PRIMARY KEY,
    focus_initiative_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    description TEXT,
    content TEXT,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: focusInitiativesテーブルは引用符なしで作成されているため、PostgreSQLでは小文字(focusinitiatives)として解釈されます
    CONSTRAINT fk_focus_initiative_embeddings_focus_initiative FOREIGN KEY (focus_initiative_id) REFERENCES focusinitiatives(id) ON DELETE CASCADE,
    CONSTRAINT fk_focus_initiative_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_focus_initiative_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_focus_initiative_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    CONSTRAINT chk_focus_initiative_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_focus_initiative_embeddings_focus_initiative_id ON focus_initiative_embeddings(focus_initiative_id);
CREATE INDEX IF NOT EXISTS idx_focus_initiative_embeddings_organization_id ON focus_initiative_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_focus_initiative_embeddings_company_id ON focus_initiative_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_focus_initiative_embeddings_embedding_model ON focus_initiative_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_focus_initiative_embeddings_created_at ON focus_initiative_embeddings(created_at);

-- ============================================
-- 更新日時の自動更新トリガー
-- ============================================

-- スタートアップ埋め込み
CREATE OR REPLACE FUNCTION update_startup_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_startup_embeddings_updated_at
    BEFORE UPDATE ON startup_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_startup_embeddings_updated_at();

-- 議事録埋め込み
CREATE OR REPLACE FUNCTION update_meeting_note_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_note_embeddings_updated_at
    BEFORE UPDATE ON meeting_note_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_note_embeddings_updated_at();

-- 注力施策埋め込み
CREATE OR REPLACE FUNCTION update_focus_initiative_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_focus_initiative_embeddings_updated_at
    BEFORE UPDATE ON focus_initiative_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_focus_initiative_embeddings_updated_at();

-- ============================================
-- 制度埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS regulation_embeddings (
    id TEXT PRIMARY KEY,
    regulation_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    description TEXT,
    content TEXT,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: regulationsテーブルが存在する場合のみ外部キー制約を追加
    -- CONSTRAINT fk_regulation_embeddings_regulation FOREIGN KEY (regulation_id) REFERENCES regulations(id) ON DELETE CASCADE,
    CONSTRAINT fk_regulation_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_regulation_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_regulation_embeddings_regulation_id ON regulation_embeddings(regulation_id);
CREATE INDEX IF NOT EXISTS idx_regulation_embeddings_organization_id ON regulation_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulation_embeddings_embedding_model ON regulation_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_regulation_embeddings_created_at ON regulation_embeddings(created_at);

-- ============================================
-- 更新日時の自動更新トリガー
-- ============================================

-- 制度埋め込み
CREATE OR REPLACE FUNCTION update_regulation_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_regulation_embeddings_updated_at
    BEFORE UPDATE ON regulation_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_embeddings_updated_at();

-- ============================================
-- 議事録アイテム埋め込みテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_note_item_embeddings (
    id TEXT PRIMARY KEY,
    meeting_note_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    content TEXT,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: meetingnotesテーブルが存在する場合のみ外部キー制約を追加
    -- CONSTRAINT fk_meeting_note_item_embeddings_meeting_note FOREIGN KEY (meeting_note_id) REFERENCES meetingnotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_meeting_note_item_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_meeting_note_item_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_meeting_note_item_embeddings_dimension CHECK (embedding_dimension IN (768, 1536)),
    CONSTRAINT chk_meeting_note_item_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    
    -- ユニーク制約（同じmeeting_note_idとitem_idの組み合わせは1つだけ）
    CONSTRAINT uq_meeting_note_item_embeddings_meeting_item UNIQUE (meeting_note_id, item_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_meeting_note_item_embeddings_meeting_note_id ON meeting_note_item_embeddings(meeting_note_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_item_embeddings_item_id ON meeting_note_item_embeddings(item_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_item_embeddings_organization_id ON meeting_note_item_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_item_embeddings_company_id ON meeting_note_item_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_meeting_note_item_embeddings_embedding_model ON meeting_note_item_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_meeting_note_item_embeddings_created_at ON meeting_note_item_embeddings(created_at);

-- ============================================
-- 制度アイテム埋め込みテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS regulation_item_embeddings (
    id TEXT PRIMARY KEY,
    regulation_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    content TEXT,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: regulationsテーブルが存在する場合のみ外部キー制約を追加
    -- CONSTRAINT fk_regulation_item_embeddings_regulation FOREIGN KEY (regulation_id) REFERENCES regulations(id) ON DELETE CASCADE,
    CONSTRAINT fk_regulation_item_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_regulation_item_embeddings_dimension CHECK (embedding_dimension IN (768, 1536)),
    
    -- ユニーク制約（同じregulation_idとitem_idの組み合わせは1つだけ）
    CONSTRAINT uq_regulation_item_embeddings_regulation_item UNIQUE (regulation_id, item_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_regulation_item_embeddings_regulation_id ON regulation_item_embeddings(regulation_id);
CREATE INDEX IF NOT EXISTS idx_regulation_item_embeddings_item_id ON regulation_item_embeddings(item_id);
CREATE INDEX IF NOT EXISTS idx_regulation_item_embeddings_organization_id ON regulation_item_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulation_item_embeddings_embedding_model ON regulation_item_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_regulation_item_embeddings_created_at ON regulation_item_embeddings(created_at);

-- ============================================
-- 更新日時の自動更新トリガー
-- ============================================

-- 議事録アイテム埋め込み
CREATE OR REPLACE FUNCTION update_meeting_note_item_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_meeting_note_item_embeddings_updated_at
    BEFORE UPDATE ON meeting_note_item_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_note_item_embeddings_updated_at();

-- 制度アイテム埋め込み
CREATE OR REPLACE FUNCTION update_regulation_item_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_regulation_item_embeddings_updated_at
    BEFORE UPDATE ON regulation_item_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_item_embeddings_updated_at();

