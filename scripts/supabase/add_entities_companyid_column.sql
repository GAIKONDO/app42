-- entitiesテーブルにcompanyIdカラムを追加
-- 既存のテーブルにcompanyIdカラムが存在しない場合に実行

DO $$
BEGIN
    -- companyIdカラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'entities' 
        AND column_name = 'companyId'
    ) THEN
        -- companyIdカラムを追加
        ALTER TABLE entities ADD COLUMN "companyId" TEXT;
        
        -- 外部キー制約を追加
        ALTER TABLE entities 
            ADD CONSTRAINT entities_companyId_fkey 
            FOREIGN KEY ("companyId") REFERENCES organizations(id) ON DELETE CASCADE;
        
        -- インデックスを追加
        CREATE INDEX IF NOT EXISTS idx_entities_companyId ON entities("companyId");
        
        -- CHECK制約を更新（organizationIdとcompanyIdの排他制約）
        -- 既存のCHECK制約を削除
        ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_check;
        ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_organizationid_companyid_check;
        
        -- 新しいCHECK制約を追加
        ALTER TABLE entities 
            ADD CONSTRAINT entities_check 
            CHECK (("organizationId" IS NOT NULL AND "companyId" IS NULL) OR 
                   ("organizationId" IS NULL AND "companyId" IS NOT NULL));
        
        RAISE NOTICE 'entitiesテーブルにcompanyIdカラムを追加しました';
    ELSE
        RAISE NOTICE 'entitiesテーブルにcompanyIdカラムは既に存在します';
    END IF;
END $$;

