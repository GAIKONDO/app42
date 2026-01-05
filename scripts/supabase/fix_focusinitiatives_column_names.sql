-- focusInitiativesテーブルのカラム名を修正
-- PostgreSQLでは引用符なしの識別子は小文字に変換されるため、
-- キャメルケースのカラム名は引用符付きで定義する必要があります

-- 既存のカラムを削除して再作成（データは保持）
DO $$ 
BEGIN
    -- organizationIdとcompanyIdを引用符付きで再作成
    -- 既存のカラムが小文字（organizationid, companyid）の場合は削除して再作成
    
    -- organizationIdの確認と修正
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='focusinitiatives' AND column_name='organizationid') THEN
        -- 小文字のカラムが存在する場合は削除して再作成
        ALTER TABLE focusinitiatives DROP COLUMN IF EXISTS organizationid;
        ALTER TABLE focusinitiatives ADD COLUMN "organizationId" TEXT;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='focusinitiatives' AND column_name='organizationId') THEN
        -- どちらも存在しない場合は作成
        ALTER TABLE focusinitiatives ADD COLUMN "organizationId" TEXT;
    END IF;
    
    -- companyIdの確認と修正
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='focusinitiatives' AND column_name='companyid') THEN
        -- 小文字のカラムが存在する場合は削除して再作成
        ALTER TABLE focusinitiatives DROP COLUMN IF EXISTS companyid;
        ALTER TABLE focusinitiatives ADD COLUMN "companyId" TEXT;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='focusinitiatives' AND column_name='companyId') THEN
        -- どちらも存在しない場合は作成
        ALTER TABLE focusinitiatives ADD COLUMN "companyId" TEXT;
    END IF;
END $$;

-- 外部キー制約の再作成（必要に応じて）
-- 既存の制約を削除
ALTER TABLE focusinitiatives DROP CONSTRAINT IF EXISTS focusinitiatives_organizationid_fkey;
ALTER TABLE focusinitiatives DROP CONSTRAINT IF EXISTS focusinitiatives_companyid_fkey;
ALTER TABLE focusinitiatives DROP CONSTRAINT IF EXISTS focusinitiatives_organizationId_fkey;
ALTER TABLE focusinitiatives DROP CONSTRAINT IF EXISTS focusinitiatives_companyId_fkey;

-- 新しい外部キー制約を追加
ALTER TABLE focusinitiatives 
    ADD CONSTRAINT focusinitiatives_organizationId_fkey 
    FOREIGN KEY ("organizationId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE focusinitiatives 
    ADD CONSTRAINT focusinitiatives_companyId_fkey 
    FOREIGN KEY ("companyId") REFERENCES organizations(id) ON DELETE CASCADE;

-- CHECK制約の再作成
ALTER TABLE focusinitiatives DROP CONSTRAINT IF EXISTS focusinitiatives_check;
ALTER TABLE focusinitiatives 
    ADD CONSTRAINT focusinitiatives_check 
    CHECK (("organizationId" IS NOT NULL AND "companyId" IS NULL) OR ("organizationId" IS NULL AND "companyId" IS NOT NULL));









