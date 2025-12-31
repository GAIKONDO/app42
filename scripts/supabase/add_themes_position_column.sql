-- themesテーブルにpositionカラムを追加

-- positionカラムが存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'themes' AND column_name = 'position'
    ) THEN
        ALTER TABLE themes ADD COLUMN position INTEGER;
        CREATE INDEX IF NOT EXISTS idx_themes_position ON themes(position);
        
        -- 既存データにpositionを設定（createdAt順に連番を割り当て）
        -- PostgreSQLでは引用符なしの識別子は小文字に変換されるため、createdat（小文字）を使用
        UPDATE themes 
        SET position = (
            SELECT COUNT(*) + 1 
            FROM themes t2 
            WHERE (t2.createdat < themes.createdat) 
            OR (t2.createdat = themes.createdat AND t2.title < themes.title)
            OR (t2.createdat = themes.createdat AND t2.title = themes.title AND t2.id < themes.id)
        )
        WHERE position IS NULL;
        
        RAISE NOTICE '✅ themesテーブルにpositionカラムを追加しました';
    ELSE
        RAISE NOTICE 'ℹ️ themesテーブルには既にpositionカラムが存在します';
    END IF;
END $$;

