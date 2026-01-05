-- organizationMembersテーブルにdisplayOrderカラムを追加
-- メンバーの表示順序を管理するための数値フィールド

DO $$ 
DECLARE
    org_record RECORD;
    member_record RECORD;
    order_num INTEGER;
BEGIN
    -- displayOrder: 表示順序（数値）
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='displayOrder' OR column_name='displayorder')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "displayOrder" INTEGER DEFAULT 0;
        RAISE NOTICE 'displayOrderカラムを追加しました';
        
        -- 既存のメンバーにdisplayOrderを設定（position順または名前順）
        -- 組織ごとに0から順番に番号を振る
        FOR org_record IN SELECT DISTINCT "organizationId" FROM organizationmembers LOOP
            order_num := 0;
            FOR member_record IN 
                SELECT id 
                FROM organizationmembers 
                WHERE "organizationId" = org_record."organizationId"
                ORDER BY position ASC NULLS LAST, name ASC
            LOOP
                UPDATE organizationmembers 
                SET "displayOrder" = order_num 
                WHERE id = member_record.id;
                order_num := order_num + 1;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '既存メンバーのdisplayOrderを設定しました';
    ELSE
        RAISE NOTICE 'displayOrderカラムは既に存在します';
    END IF;
END $$;

-- displayOrderカラムが小文字（displayorder）になっている場合は、引用符付き（displayOrder）にリネーム
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='displayorder'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='displayOrder'
    ) THEN
        ALTER TABLE organizationmembers RENAME COLUMN displayorder TO "displayOrder";
        RAISE NOTICE 'displayorderカラムをdisplayOrderにリネームしました';
    ELSE
        RAISE NOTICE 'displayOrderカラムは既に正しい形式です';
    END IF;
END $$;

