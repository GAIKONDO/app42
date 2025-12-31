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

