-- focusInitiativesテーブルに不足しているカラムを追加
-- PostgreSQLでは引用符なしの識別子は小文字に変換されるため、テーブル名は小文字で検索します
-- 引用符付きのカラム名（"methodOther"など）は大文字小文字が保持されるため、両方をチェックします
-- 既にカラムが存在する場合はエラーを無視します

DO $$ 
BEGIN
    -- assignee: 担当者
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN assignee TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム assignee は既に存在します';
    END;
    
    -- method: 手法（JSON配列形式）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN method TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム method は既に存在します';
    END;
    
    -- methodOther: 手法（その他）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "methodOther" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム methodOther は既に存在します';
    END;
    
    -- methodDetails: 手法の詳細情報（JSON形式）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "methodDetails" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム methodDetails は既に存在します';
    END;
    
    -- means: 手段（JSON配列形式）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN means TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム means は既に存在します';
    END;
    
    -- meansOther: 手段（その他）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "meansOther" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム meansOther は既に存在します';
    END;
    
    -- objective: 目標
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN objective TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム objective は既に存在します';
    END;
    
    -- considerationPeriod: 検討期間
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "considerationPeriod" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム considerationPeriod は既に存在します';
    END;
    
    -- executionPeriod: 実行期間
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "executionPeriod" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム executionPeriod は既に存在します';
    END;
    
    -- monetizationPeriod: 収益化期間
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "monetizationPeriod" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム monetizationPeriod は既に存在します';
    END;
    
    -- relatedOrganizations: 関連組織（JSON配列形式）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "relatedOrganizations" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム relatedOrganizations は既に存在します';
    END;
    
    -- relatedGroupCompanies: 関連グループ会社（JSON配列形式）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "relatedGroupCompanies" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム relatedGroupCompanies は既に存在します';
    END;
    
    -- monetizationDiagram: マネタイズ図（Mermaid図）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "monetizationDiagram" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム monetizationDiagram は既に存在します';
    END;
    
    -- relationDiagram: 相関図（Mermaid図）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "relationDiagram" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム relationDiagram は既に存在します';
    END;
    
    -- causeEffectDiagramId: 特性要因図のユニークID
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "causeEffectDiagramId" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム causeEffectDiagramId は既に存在します';
    END;
    
    -- themeId: 関連するテーマID（後方互換性のため）
    BEGIN
        ALTER TABLE focusinitiatives ADD COLUMN "themeId" TEXT;
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'カラム themeId は既に存在します';
    END;
END $$;

-- インデックスの追加（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_focusinitiatives_themeid ON focusinitiatives("themeId");
CREATE INDEX IF NOT EXISTS idx_focusinitiatives_causeeffectdiagramid ON focusinitiatives("causeEffectDiagramId");
