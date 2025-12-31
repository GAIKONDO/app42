-- startupsテーブルに不足しているカラムを追加
DO $$ 
BEGIN
    -- method: 手法（JSON配列形式）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='method') THEN
        ALTER TABLE startups ADD COLUMN method TEXT;
    END IF;
    
    -- methodOther: 手法（その他）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='methodOther') THEN
        ALTER TABLE startups ADD COLUMN "methodOther" TEXT;
    END IF;
    
    -- methodDetails: 手法の詳細情報（JSON形式）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='methodDetails') THEN
        ALTER TABLE startups ADD COLUMN "methodDetails" TEXT;
    END IF;
    
    -- means: 手段（JSON配列形式）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='means') THEN
        ALTER TABLE startups ADD COLUMN means TEXT;
    END IF;
    
    -- meansOther: 手段（その他）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='startups' AND column_name='meansOther') THEN
        ALTER TABLE startups ADD COLUMN "meansOther" TEXT;
    END IF;
END $$;

