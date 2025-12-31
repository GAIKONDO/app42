-- topicsテーブルにtopicDateカラムを追加
-- トピックの登録日を保存するためのカラム

-- topicDateカラムが存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'topics' 
        AND column_name = 'topicDate'
    ) THEN
        ALTER TABLE topics ADD COLUMN "topicDate" TIMESTAMPTZ;
        RAISE NOTICE 'topicDateカラムを追加しました';
    ELSE
        RAISE NOTICE 'topicDateカラムは既に存在します';
    END IF;
END $$;

-- インデックスを追加（オプション、必要に応じて）
-- CREATE INDEX IF NOT EXISTS idx_topics_topicDate ON topics("topicDate");

