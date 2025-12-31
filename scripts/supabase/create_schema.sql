-- Supabase用PostgreSQLスキーマ作成スクリプト
-- SQLiteスキーマをPostgreSQL形式に変換

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ユーザー管理テーブル
-- ============================================

-- users: ユーザー情報
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    approved INTEGER DEFAULT 0,
    approvedBy TEXT,
    approvedAt TIMESTAMPTZ,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- approvalRequests: 承認リクエスト
CREATE TABLE IF NOT EXISTS approvalRequests (
    id TEXT PRIMARY KEY,
    userId TEXT,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requestedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approvalRequests_userId ON approvalRequests(userId);
CREATE INDEX IF NOT EXISTS idx_approvalRequests_status ON approvalRequests(status);

-- ============================================
-- 組織管理テーブル
-- ============================================

-- organizations: 組織情報
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    "parentId" TEXT,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    "levelName" TEXT NOT NULL DEFAULT '組織',
    position INTEGER DEFAULT 0,
    type TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("parentId") REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_parentId ON organizations(parentId);
CREATE INDEX IF NOT EXISTS idx_organizations_level ON organizations(level);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- organizationMembers: 組織メンバー情報
CREATE TABLE IF NOT EXISTS organizationMembers (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    nameRomaji TEXT,
    department TEXT,
    extension TEXT,
    companyPhone TEXT,
    mobilePhone TEXT,
    email TEXT,
    itochuEmail TEXT,
    teams TEXT,
    employeeType TEXT,
    roleName TEXT,
    indicator TEXT,
    location TEXT,
    floorDoorNo TEXT,
    previousName TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organizationMembers_organizationId ON organizationMembers(organizationId);
CREATE INDEX IF NOT EXISTS idx_organizationMembers_email ON organizationMembers(email);

-- organizationContents: 組織コンテンツ
CREATE TABLE IF NOT EXISTS organizationContents (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    introduction TEXT,
    focusAreas TEXT,
    meetingNotes TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_organizationContents_organizationId ON organizationContents(organizationId);

-- ============================================
-- 事業会社テーブル
-- ============================================

-- companyContents: 事業会社コンテンツ
CREATE TABLE IF NOT EXISTS companyContents (
    id TEXT PRIMARY KEY,
    companyId TEXT NOT NULL,
    introduction TEXT,
    focusBusinesses TEXT,
    capitalStructure TEXT,
    capitalStructureDiagram TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_companyContents_companyId ON companyContents(companyId);

-- ============================================
-- 議事録・施策テーブル
-- ============================================

-- startups: スタートアップ情報
CREATE TABLE IF NOT EXISTS startups (
    id TEXT PRIMARY KEY,
    "organizationId" TEXT,
    "companyId" TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    assignee TEXT, -- JSON配列形式（文字列として保存）
    method TEXT, -- JSON配列形式
    "methodOther" TEXT,
    "methodDetails" TEXT, -- JSON形式
    means TEXT, -- JSON配列形式
    "meansOther" TEXT,
    "categoryIds" TEXT, -- JSON配列形式
    status TEXT,
    "agencyContractMonth" TEXT,
    "engagementLevel" TEXT,
    "bizDevPhase" TEXT,
    "relatedVCS" TEXT, -- JSON配列形式
    "responsibleDepartments" TEXT, -- JSON配列形式
    "hpUrl" TEXT,
    "asanaUrl" TEXT,
    "boxUrl" TEXT,
    objective TEXT,
    evaluation TEXT,
    "evaluationChart" TEXT, -- JSON形式
    "evaluationChartSnapshots" TEXT, -- JSON形式
    "considerationPeriod" TEXT,
    "executionPeriod" TEXT,
    "monetizationPeriod" TEXT,
    "monetizationRenewalNotRequired" INTEGER DEFAULT 0,
    "relatedOrganizations" TEXT, -- JSON配列形式
    "relatedGroupCompanies" TEXT, -- JSON配列形式
    "monetizationDiagram" TEXT,
    "monetizationDiagramId" TEXT,
    "relationDiagram" TEXT,
    "relationDiagramId" TEXT,
    "causeEffectDiagramId" TEXT,
    "themeId" TEXT,
    "themeIds" TEXT, -- JSON配列形式
    "topicIds" TEXT, -- JSON配列形式
    "competitorComparison" TEXT, -- JSON形式
    "deepSearch" TEXT, -- JSON形式
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY ("companyId") REFERENCES organizations(id) ON DELETE CASCADE,
    CHECK (("organizationId" IS NOT NULL AND "companyId" IS NULL) OR ("organizationId" IS NULL AND "companyId" IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_startups_organizationId ON startups("organizationId");
CREATE INDEX IF NOT EXISTS idx_startups_companyId ON startups("companyId");
CREATE INDEX IF NOT EXISTS idx_startups_status ON startups(status);
CREATE INDEX IF NOT EXISTS idx_startups_bizDevPhase ON startups("bizDevPhase");

-- meetingNotes: 議事録
CREATE TABLE IF NOT EXISTS meetingNotes (
    id TEXT PRIMARY KEY,
    organizationId TEXT,
    companyId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE,
    CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR (organizationId IS NULL AND companyId IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_meetingNotes_organizationId ON meetingNotes(organizationId);
CREATE INDEX IF NOT EXISTS idx_meetingNotes_companyId ON meetingNotes(companyId);
CREATE INDEX IF NOT EXISTS idx_meetingNotes_chromaSynced ON meetingNotes(chromaSynced);

-- focusInitiatives: 注力施策
CREATE TABLE IF NOT EXISTS focusInitiatives (
    id TEXT PRIMARY KEY,
    organizationId TEXT,
    companyId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    themeIds TEXT, -- JSON配列形式
    topicIds TEXT, -- JSON配列形式
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE,
    CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR (organizationId IS NULL AND companyId IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_focusInitiatives_organizationId ON focusInitiatives(organizationId);
CREATE INDEX IF NOT EXISTS idx_focusInitiatives_companyId ON focusInitiatives(companyId);

-- themes: テーマ
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    initiativeIds TEXT, -- JSON配列形式
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_themes_title ON themes(title);

-- themeHierarchyConfigs: テーマ階層設定
CREATE TABLE IF NOT EXISTS themeHierarchyConfigs (
    id TEXT PRIMARY KEY,
    maxLevels INTEGER NOT NULL,
    levels TEXT NOT NULL, -- JSON形式
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ナレッジグラフテーブル
-- ============================================

-- entities: エンティティ
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    aliases TEXT, -- JSON配列形式
    metadata TEXT, -- JSON形式
    organizationId TEXT,
    companyId TEXT,
    searchableText TEXT,
    displayName TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TIMESTAMPTZ,
    lastSearchDate TIMESTAMPTZ,
    searchCount INTEGER DEFAULT 0,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE,
    CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR (organizationId IS NULL AND companyId IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_entities_organizationId ON entities(organizationId);
CREATE INDEX IF NOT EXISTS idx_entities_companyId ON entities(companyId);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_chromaSynced ON entities(chromaSynced);
CREATE INDEX IF NOT EXISTS idx_entities_searchable_text ON entities USING gin(to_tsvector('english', searchableText));

-- relations: エンティティ間の関係
CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY,
    topicId TEXT NOT NULL,
    sourceEntityId TEXT,
    targetEntityId TEXT,
    relationType TEXT NOT NULL,
    description TEXT,
    confidence REAL,
    metadata TEXT, -- JSON形式
    organizationId TEXT,
    companyId TEXT,
    searchableText TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TIMESTAMPTZ,
    lastSearchDate TIMESTAMPTZ,
    searchCount INTEGER DEFAULT 0,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (sourceEntityId) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (targetEntityId) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE,
    CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR (organizationId IS NULL AND companyId IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_relations_topicId ON relations(topicId);
CREATE INDEX IF NOT EXISTS idx_relations_sourceEntityId ON relations(sourceEntityId);
CREATE INDEX IF NOT EXISTS idx_relations_targetEntityId ON relations(targetEntityId);
CREATE INDEX IF NOT EXISTS idx_relations_organizationId ON relations(organizationId);
CREATE INDEX IF NOT EXISTS idx_relations_relationType ON relations(relationType);
CREATE INDEX IF NOT EXISTS idx_relations_chromaSynced ON relations(chromaSynced);
CREATE INDEX IF NOT EXISTS idx_relations_searchable_text ON relations USING gin(to_tsvector('english', searchableText));

-- topics: トピックのメタデータ
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    topicId TEXT NOT NULL,
    meetingNoteId TEXT,
    organizationId TEXT,
    companyId TEXT,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    semanticCategory TEXT,
    keywords TEXT, -- JSON配列形式
    tags TEXT, -- JSON配列形式
    searchableText TEXT,
    contentSummary TEXT,
    chromaSynced INTEGER DEFAULT 0,
    chromaSyncError TEXT,
    lastChromaSyncAttempt TIMESTAMPTZ,
    lastSearchDate TIMESTAMPTZ,
    searchCount INTEGER DEFAULT 0,
    imagePaths TEXT, -- JSON配列形式
    parentTopicId TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (meetingNoteId) REFERENCES meetingNotes(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (parentTopicId) REFERENCES topics(id) ON DELETE SET NULL,
    CHECK ((organizationId IS NOT NULL AND companyId IS NULL) OR (organizationId IS NULL AND companyId IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_topics_topicId ON topics(topicId);
CREATE INDEX IF NOT EXISTS idx_topics_meetingNoteId ON topics(meetingNoteId);
CREATE INDEX IF NOT EXISTS idx_topics_organizationId ON topics(organizationId);
CREATE INDEX IF NOT EXISTS idx_topics_companyId ON topics(companyId);
CREATE INDEX IF NOT EXISTS idx_topics_parentTopicId ON topics(parentTopicId);
CREATE INDEX IF NOT EXISTS idx_topics_chromaSynced ON topics(chromaSynced);
CREATE INDEX IF NOT EXISTS idx_topics_searchable_text ON topics USING gin(to_tsvector('english', searchableText));

-- topicFiles: トピックファイル
CREATE TABLE IF NOT EXISTS topicFiles (
    id TEXT PRIMARY KEY,
    topicId TEXT NOT NULL,
    parentTopicId TEXT,
    filePath TEXT NOT NULL,
    fileName TEXT NOT NULL,
    mimeType TEXT,
    description TEXT,
    detailedDescription TEXT,
    fileSize INTEGER,
    organizationId TEXT,
    companyId TEXT,
    meetingNoteId TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (parentTopicId) REFERENCES topics(id) ON DELETE SET NULL,
    FOREIGN KEY (meetingNoteId) REFERENCES meetingNotes(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_topicFiles_topicId ON topicFiles(topicId);
CREATE INDEX IF NOT EXISTS idx_topicFiles_meetingNoteId ON topicFiles(meetingNoteId);

-- ============================================
-- システム設計ドキュメントテーブル
-- ============================================

-- designDocSections: システム設計ドキュメントセクション
CREATE TABLE IF NOT EXISTS designDocSections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    tags TEXT, -- JSON配列形式
    order_index INTEGER DEFAULT 0,
    pageUrl TEXT,
    hierarchy TEXT, -- JSON形式
    relatedSections TEXT, -- JSON配列形式
    semanticCategory TEXT,
    keywords TEXT, -- JSON配列形式
    summary TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_designDocSections_order_index ON designDocSections(order_index);

-- designDocSectionRelations: セクション間の関係
CREATE TABLE IF NOT EXISTS designDocSectionRelations (
    id TEXT PRIMARY KEY,
    fromSectionId TEXT NOT NULL,
    toSectionId TEXT NOT NULL,
    relationType TEXT NOT NULL,
    description TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (fromSectionId) REFERENCES designDocSections(id) ON DELETE CASCADE,
    FOREIGN KEY (toSectionId) REFERENCES designDocSections(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_designDocSectionRelations_fromSectionId ON designDocSectionRelations(fromSectionId);
CREATE INDEX IF NOT EXISTS idx_designDocSectionRelations_toSectionId ON designDocSectionRelations(toSectionId);

-- ============================================
-- Agentシステムテーブル
-- ============================================

-- agents: Agent定義
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    role TEXT,
    capabilities TEXT, -- JSON配列形式
    tools TEXT, -- JSON配列形式
    modelType TEXT,
    selectedModel TEXT,
    systemPrompt TEXT,
    config TEXT, -- JSON形式
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tasks: タスク
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    agentId TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    config TEXT, -- JSON形式
    result TEXT, -- JSON形式
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_agentId ON tasks(agentId);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- taskExecutions: タスク実行履歴
CREATE TABLE IF NOT EXISTS taskExecutions (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL,
    agentId TEXT,
    status TEXT NOT NULL,
    result TEXT, -- JSON形式
    error TEXT,
    startedAt TIMESTAMPTZ,
    completedAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_taskExecutions_taskId ON taskExecutions(taskId);
CREATE INDEX IF NOT EXISTS idx_taskExecutions_agentId ON taskExecutions(agentId);

-- taskChains: タスクチェーン
CREATE TABLE IF NOT EXISTS taskChains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    startNodeId TEXT,
    nodes TEXT, -- JSON形式
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- a2aMessages: A2Aメッセージ履歴
CREATE TABLE IF NOT EXISTS a2aMessages (
    id TEXT PRIMARY KEY,
    fromAgent TEXT NOT NULL,
    toAgent TEXT NOT NULL,
    type TEXT NOT NULL,
    taskId TEXT,
    payload TEXT, -- JSON形式
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responseTo TEXT,
    requiresResponse INTEGER DEFAULT 0,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_a2aMessages_fromAgent ON a2aMessages(fromAgent);
CREATE INDEX IF NOT EXISTS idx_a2aMessages_toAgent ON a2aMessages(toAgent);
CREATE INDEX IF NOT EXISTS idx_a2aMessages_taskId ON a2aMessages(taskId);

-- agent_prompt_versions: Agentプロンプトバージョン履歴
CREATE TABLE IF NOT EXISTS agent_prompt_versions (
    id TEXT PRIMARY KEY,
    agentId TEXT NOT NULL,
    version INTEGER NOT NULL,
    systemPrompt TEXT NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
    UNIQUE(agentId, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_versions_agentId ON agent_prompt_versions(agentId);

-- mcp_tools: MCPツール
CREATE TABLE IF NOT EXISTS mcp_tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    arguments TEXT, -- JSON形式
    returns TEXT, -- JSON形式
    implementationType TEXT,
    enabled INTEGER DEFAULT 1,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_enabled ON mcp_tools(enabled);

-- ============================================
-- その他のテーブル
-- ============================================

-- aiSettings: AI設定
CREATE TABLE IF NOT EXISTS aiSettings (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    apiKey TEXT,
    baseUrl TEXT,
    defaultModel TEXT,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- backupHistory: バックアップ履歴
CREATE TABLE IF NOT EXISTS backupHistory (
    id TEXT PRIMARY KEY,
    backupPath TEXT NOT NULL,
    backupSize INTEGER,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backupHistory_createdAt ON backupHistory(createdAt);

-- ============================================
-- マスターデータテーブル
-- ============================================

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

-- ============================================
-- 競合解決用のバージョンカラム追加
-- ============================================

-- 主要テーブルにversionカラムを追加（既存のテーブルがある場合はスキップ）
DO $$ 
BEGIN
    -- organizations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='version') THEN
        ALTER TABLE organizations ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
    
    -- entities
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='version') THEN
        ALTER TABLE entities ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
    
    -- relations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='relations' AND column_name='version') THEN
        ALTER TABLE relations ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
    
    -- topics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='version') THEN
        ALTER TABLE topics ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
    
    -- meetingNotes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingNotes' AND column_name='version') THEN
        ALTER TABLE meetingNotes ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
    
    -- focusInitiatives
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='focusInitiatives' AND column_name='version') THEN
        ALTER TABLE focusInitiatives ADD COLUMN version INTEGER DEFAULT 0;
    END IF;
END $$;

