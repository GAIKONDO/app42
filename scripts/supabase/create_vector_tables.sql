-- 埋め込みベクトル用テーブルの作成
-- ChromaDBからSupabase（pgvector）への移行用テーブル定義

-- ============================================
-- エンティティ埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS entity_embeddings (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    embedding vector(1536),  -- OpenAI text-embedding-3-small (1536次元) または 768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,  -- 埋め込み次元数（1536または768）
    
    -- メタデータ（ChromaDBのmetadataから移行）
    name TEXT,
    type TEXT,
    aliases JSONB,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約（既存テーブルへの参照）
    CONSTRAINT fk_entity_embeddings_entity FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    CONSTRAINT fk_entity_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_entity_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_entity_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    CONSTRAINT chk_entity_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_entity_id ON entity_embeddings(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_organization_id ON entity_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_company_id ON entity_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_embedding_model ON entity_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_created_at ON entity_embeddings(created_at);

-- ============================================
-- リレーション埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS relation_embeddings (
    id TEXT PRIMARY KEY,
    relation_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    topic_id TEXT,
    source_entity_id TEXT,
    target_entity_id TEXT,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    relation_type TEXT,
    description TEXT,
    confidence REAL,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    CONSTRAINT fk_relation_embeddings_relation FOREIGN KEY (relation_id) REFERENCES relations(id) ON DELETE CASCADE,
    CONSTRAINT fk_relation_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_relation_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    -- 注意: topic_idはtopicsテーブルのtopicIdカラムを参照しますが、外部キー制約は主キー(id)を参照する必要があるため、外部キー制約は削除
    -- アプリケーションレベルで整合性を保証してください
    -- CONSTRAINT fk_relation_embeddings_topic FOREIGN KEY (topic_id) REFERENCES topics("topicId") ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_relation_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    CONSTRAINT chk_relation_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_relation_embeddings_relation_id ON relation_embeddings(relation_id);
CREATE INDEX IF NOT EXISTS idx_relation_embeddings_organization_id ON relation_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_relation_embeddings_company_id ON relation_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_relation_embeddings_topic_id ON relation_embeddings(topic_id);
CREATE INDEX IF NOT EXISTS idx_relation_embeddings_embedding_model ON relation_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_relation_embeddings_created_at ON relation_embeddings(created_at);

-- ============================================
-- トピック埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS topic_embeddings (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL,
    organization_id TEXT,
    company_id TEXT,
    meeting_note_id TEXT,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    content TEXT,
    semantic_category TEXT,
    keywords JSONB,
    tags JSONB,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: topic_idはtopicsテーブルのtopicIdカラムを参照しますが、外部キー制約は主キー(id)を参照する必要があるため、外部キー制約は削除
    -- アプリケーションレベルで整合性を保証してください
    -- CONSTRAINT fk_topic_embeddings_topic FOREIGN KEY (topic_id) REFERENCES topics("topicId") ON DELETE CASCADE,
    CONSTRAINT fk_topic_embeddings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_topic_embeddings_company FOREIGN KEY (company_id) REFERENCES organizations(id) ON DELETE CASCADE,
    -- 注意: meetingNotesテーブルは引用符なしで作成されているため、PostgreSQLでは小文字(meetingnotes)として解釈されます
    -- 既存のスキーマに合わせて、小文字で参照します
    CONSTRAINT fk_topic_embeddings_meeting_note FOREIGN KEY (meeting_note_id) REFERENCES meetingnotes(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_topic_embeddings_org_company CHECK (
        (organization_id IS NOT NULL AND company_id IS NULL) OR 
        (organization_id IS NULL AND company_id IS NOT NULL) OR
        (organization_id IS NULL AND company_id IS NULL)
    ),
    CONSTRAINT chk_topic_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_topic_embeddings_topic_id ON topic_embeddings(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_embeddings_organization_id ON topic_embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_topic_embeddings_company_id ON topic_embeddings(company_id);
CREATE INDEX IF NOT EXISTS idx_topic_embeddings_meeting_note_id ON topic_embeddings(meeting_note_id);
CREATE INDEX IF NOT EXISTS idx_topic_embeddings_embedding_model ON topic_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_topic_embeddings_created_at ON topic_embeddings(created_at);

-- ============================================
-- システム設計ドキュメント埋め込みベクトルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS design_doc_embeddings (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    embedding vector(1536),  -- 1536次元または768次元
    embedding_dimension INTEGER NOT NULL DEFAULT 1536,
    
    -- メタデータ
    title TEXT,
    content TEXT,
    tags JSONB,
    metadata JSONB,
    
    -- 埋め込み設定
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    embedding_version TEXT NOT NULL DEFAULT '1.0',
    
    -- タイムスタンプ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    -- 注意: designDocSectionsテーブルは引用符なしで作成されているため、PostgreSQLでは小文字(designdocsections)として解釈されます
    CONSTRAINT fk_design_doc_embeddings_section FOREIGN KEY (section_id) REFERENCES designdocsections(id) ON DELETE CASCADE,
    
    -- チェック制約
    CONSTRAINT chk_design_doc_embeddings_dimension CHECK (embedding_dimension IN (768, 1536))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_design_doc_embeddings_section_id ON design_doc_embeddings(section_id);
CREATE INDEX IF NOT EXISTS idx_design_doc_embeddings_embedding_model ON design_doc_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_design_doc_embeddings_created_at ON design_doc_embeddings(created_at);

-- ============================================
-- 更新日時の自動更新トリガー
-- ============================================

-- エンティティ埋め込み
CREATE OR REPLACE FUNCTION update_entity_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_entity_embeddings_updated_at
    BEFORE UPDATE ON entity_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_entity_embeddings_updated_at();

-- リレーション埋め込み
CREATE OR REPLACE FUNCTION update_relation_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_relation_embeddings_updated_at
    BEFORE UPDATE ON relation_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_relation_embeddings_updated_at();

-- トピック埋め込み
CREATE OR REPLACE FUNCTION update_topic_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_topic_embeddings_updated_at
    BEFORE UPDATE ON topic_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_topic_embeddings_updated_at();

-- システム設計ドキュメント埋め込み
CREATE OR REPLACE FUNCTION update_design_doc_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_design_doc_embeddings_updated_at
    BEFORE UPDATE ON design_doc_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_design_doc_embeddings_updated_at();

