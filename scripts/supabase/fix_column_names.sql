-- カラム名の大文字小文字の問題を修正
-- PostgreSQLでは引用符なしの識別子は小文字に変換されるため、
-- 引用符付きで定義し直す必要がある

-- usersテーブル: approvedAt, approvedBy, createdAt, updatedAtカラムを引用符付きに変更
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approvedat') THEN
        ALTER TABLE users RENAME COLUMN approvedat TO "approvedAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='approvedby') THEN
        ALTER TABLE users RENAME COLUMN approvedby TO "approvedBy";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='createdat') THEN
        ALTER TABLE users RENAME COLUMN createdat TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updatedat') THEN
        ALTER TABLE users RENAME COLUMN updatedat TO "updatedAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='passwordhash') THEN
        ALTER TABLE users RENAME COLUMN passwordhash TO "passwordHash";
    END IF;
END $$;

-- meetingNotesテーブル: chromaSyncError, chromaSynced, lastChromaSyncAttempt, organizationId, companyId, createdAt, updatedAtカラムを引用符付きに変更
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='chromasyncerror') THEN
        ALTER TABLE meetingnotes RENAME COLUMN chromasyncerror TO "chromaSyncError";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='chromasynced') THEN
        ALTER TABLE meetingnotes RENAME COLUMN chromasynced TO "chromaSynced";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='lastchromasyncattempt') THEN
        ALTER TABLE meetingnotes RENAME COLUMN lastchromasyncattempt TO "lastChromaSyncAttempt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='organizationid') THEN
        ALTER TABLE meetingnotes RENAME COLUMN organizationid TO "organizationId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='companyid') THEN
        ALTER TABLE meetingnotes RENAME COLUMN companyid TO "companyId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='createdat') THEN
        ALTER TABLE meetingnotes RENAME COLUMN createdat TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meetingnotes' AND column_name='updatedat') THEN
        ALTER TABLE meetingnotes RENAME COLUMN updatedat TO "updatedAt";
    END IF;
END $$;

-- topicsテーブル: chromaSyncError, chromaSynced, lastChromaSyncAttemptカラムを引用符付きに変更
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='chromasyncerror') THEN
        ALTER TABLE topics RENAME COLUMN chromasyncerror TO "chromaSyncError";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='chromasynced') THEN
        ALTER TABLE topics RENAME COLUMN chromasynced TO "chromaSynced";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='lastchromasyncattempt') THEN
        ALTER TABLE topics RENAME COLUMN lastchromasyncattempt TO "lastChromaSyncAttempt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='lastsearchdate') THEN
        ALTER TABLE topics RENAME COLUMN lastsearchdate TO "lastSearchDate";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='searchcount') THEN
        ALTER TABLE topics RENAME COLUMN searchcount TO "searchCount";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='imagepaths') THEN
        ALTER TABLE topics RENAME COLUMN imagepaths TO "imagePaths";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='parenttopicid') THEN
        ALTER TABLE topics RENAME COLUMN parenttopicid TO "parentTopicId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='contentsummary') THEN
        ALTER TABLE topics RENAME COLUMN contentsummary TO "contentSummary";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='searchabletext') THEN
        ALTER TABLE topics RENAME COLUMN searchabletext TO "searchableText";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='semanticcategory') THEN
        ALTER TABLE topics RENAME COLUMN semanticcategory TO "semanticCategory";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='topicid') THEN
        ALTER TABLE topics RENAME COLUMN topicid TO "topicId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='meetingnoteid') THEN
        ALTER TABLE topics RENAME COLUMN meetingnoteid TO "meetingNoteId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='organizationid') THEN
        ALTER TABLE topics RENAME COLUMN organizationid TO "organizationId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='companyid') THEN
        ALTER TABLE topics RENAME COLUMN companyid TO "companyId";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='createdat') THEN
        ALTER TABLE topics RENAME COLUMN createdat TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='topics' AND column_name='updatedat') THEN
        ALTER TABLE topics RENAME COLUMN updatedat TO "updatedAt";
    END IF;
END $$;

-- mcp_toolsテーブル: createdAt, updatedAt, implementationTypeカラムを引用符付きに変更
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mcp_tools' AND column_name='createdat') THEN
        ALTER TABLE mcp_tools RENAME COLUMN createdat TO "createdAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mcp_tools' AND column_name='updatedat') THEN
        ALTER TABLE mcp_tools RENAME COLUMN updatedat TO "updatedAt";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mcp_tools' AND column_name='implementationtype') THEN
        ALTER TABLE mcp_tools RENAME COLUMN implementationtype TO "implementationType";
    END IF;
END $$;
