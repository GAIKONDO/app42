-- topicsテーブルにimportanceカラムを追加
-- 既存のテーブルにimportanceカラムが存在しない場合に実行

DO $$
BEGIN
    -- importanceカラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'topics' 
        AND column_name = 'importance'
    ) THEN
        -- importanceカラムを追加
        ALTER TABLE topics ADD COLUMN "importance" TEXT;
        
        RAISE NOTICE 'topicsテーブルにimportanceカラムを追加しました';
    ELSE
        RAISE NOTICE 'topicsテーブルにimportanceカラムは既に存在します';
    END IF;
END $$;

