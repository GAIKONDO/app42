-- キャメルケースのカラム名を引用符で囲む修正スクリプト
-- PostgreSQLでは引用符で囲まない識別子は小文字に変換されるため、
-- キャメルケースのカラム名を使用する場合は引用符で囲む必要があります

-- このスクリプトは、既存のテーブルを修正するためのものです
-- 新規にテーブルを作成する場合は、create_schema.sqlを修正してから実行してください

-- organizationsテーブル
DO $$ 
BEGIN
    -- カラム名が小文字に変換されている場合、引用符付きの名前に変更
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='createdat') THEN
        ALTER TABLE organizations RENAME COLUMN createdat TO "createdAt";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='updatedat') THEN
        ALTER TABLE organizations RENAME COLUMN updatedat TO "updatedAt";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='parentid') THEN
        ALTER TABLE organizations RENAME COLUMN parentid TO "parentId";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='levelname') THEN
        ALTER TABLE organizations RENAME COLUMN levelname TO "levelName";
    END IF;
END $$;

-- 注意: 他のテーブルも同様に修正が必要な場合は、個別に実行してください
-- または、テーブルを削除してから、修正されたcreate_schema.sqlを再実行してください

