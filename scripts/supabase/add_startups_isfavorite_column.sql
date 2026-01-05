-- startupsテーブルにisFavoriteカラムを追加

-- isFavoriteカラムが存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'startups' AND column_name = 'isFavorite'
    ) THEN
        ALTER TABLE startups ADD COLUMN "isFavorite" INTEGER DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_startups_isfavorite ON startups("isFavorite");
        
        RAISE NOTICE '✅ startupsテーブルにisFavoriteカラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ️ startupsテーブルには既にisFavoriteカラムが存在します';
    END IF;
END $$;

