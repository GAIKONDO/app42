-- organizationMembersテーブルに不足しているカラムを追加
-- すべてのカラムを引用符付きで追加（キャメルケースを保持）

DO $$ 
BEGIN
    -- nameRomaji: ローマ字名
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='nameRomaji' OR column_name='nameromaji')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "nameRomaji" TEXT;
        RAISE NOTICE 'nameRomajiカラムを追加しました';
    ELSE
        RAISE NOTICE 'nameRomajiカラムは既に存在します';
    END IF;
    
    -- department: 部署
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='department'
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN department TEXT;
        RAISE NOTICE 'departmentカラムを追加しました';
    ELSE
        RAISE NOTICE 'departmentカラムは既に存在します';
    END IF;
    
    -- extension: 内線番号
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='extension'
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN extension TEXT;
        RAISE NOTICE 'extensionカラムを追加しました';
    ELSE
        RAISE NOTICE 'extensionカラムは既に存在します';
    END IF;
    
    -- companyPhone: 会社電話番号
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='companyPhone' OR column_name='companyphone')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "companyPhone" TEXT;
        RAISE NOTICE 'companyPhoneカラムを追加しました';
    ELSE
        RAISE NOTICE 'companyPhoneカラムは既に存在します';
    END IF;
    
    -- mobilePhone: 携帯電話番号
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='mobilePhone' OR column_name='mobilephone')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "mobilePhone" TEXT;
        RAISE NOTICE 'mobilePhoneカラムを追加しました';
    ELSE
        RAISE NOTICE 'mobilePhoneカラムは既に存在します';
    END IF;
    
    -- email: メールアドレス
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='email'
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN email TEXT;
        RAISE NOTICE 'emailカラムを追加しました';
    ELSE
        RAISE NOTICE 'emailカラムは既に存在します';
    END IF;
    
    -- itochuEmail: 伊藤忠メールアドレス
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='itochuEmail' OR column_name='itochuemail')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "itochuEmail" TEXT;
        RAISE NOTICE 'itochuEmailカラムを追加しました';
    ELSE
        RAISE NOTICE 'itochuEmailカラムは既に存在します';
    END IF;
    
    -- teams: Teams情報
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='teams'
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN teams TEXT;
        RAISE NOTICE 'teamsカラムを追加しました';
    ELSE
        RAISE NOTICE 'teamsカラムは既に存在します';
    END IF;
    
    -- employeeType: 雇用形態
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='employeeType' OR column_name='employeetype')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "employeeType" TEXT;
        RAISE NOTICE 'employeeTypeカラムを追加しました';
    ELSE
        RAISE NOTICE 'employeeTypeカラムは既に存在します';
    END IF;
    
    -- roleName: ロール名
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='roleName' OR column_name='rolename')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "roleName" TEXT;
        RAISE NOTICE 'roleNameカラムを追加しました';
    ELSE
        RAISE NOTICE 'roleNameカラムは既に存在します';
    END IF;
    
    -- indicator: インジケーター
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='indicator'
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN indicator TEXT;
        RAISE NOTICE 'indicatorカラムを追加しました';
    ELSE
        RAISE NOTICE 'indicatorカラムは既に存在します';
    END IF;
    
    -- location: 所在地
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='location'
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN location TEXT;
        RAISE NOTICE 'locationカラムを追加しました';
    ELSE
        RAISE NOTICE 'locationカラムは既に存在します';
    END IF;
    
    -- floorDoorNo: フロア・ドア番号
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='floorDoorNo' OR column_name='floordoorno')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "floorDoorNo" TEXT;
        RAISE NOTICE 'floorDoorNoカラムを追加しました';
    ELSE
        RAISE NOTICE 'floorDoorNoカラムは既に存在します';
    END IF;
    
    -- previousName: 旧名
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND (column_name='previousName' OR column_name='previousname')
    ) THEN
        ALTER TABLE organizationmembers ADD COLUMN "previousName" TEXT;
        RAISE NOTICE 'previousNameカラムを追加しました';
    ELSE
        RAISE NOTICE 'previousNameカラムは既に存在します';
    END IF;
END $$;

-- organizationIdカラムが小文字（organizationid）になっている場合は、引用符付き（organizationId）にリネーム
DO $$ 
BEGIN
    -- organizationIdカラムが小文字で存在する場合、引用符付きにリネーム
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='organizationid'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='organizationId'
    ) THEN
        ALTER TABLE organizationmembers RENAME COLUMN organizationid TO "organizationId";
        RAISE NOTICE 'organizationidカラムをorganizationIdにリネームしました';
    ELSE
        RAISE NOTICE 'organizationIdカラムは既に正しい形式です';
    END IF;
    
    -- createdAtカラムが小文字で存在する場合、引用符付きにリネーム
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='createdat'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='createdAt'
    ) THEN
        ALTER TABLE organizationmembers RENAME COLUMN createdat TO "createdAt";
        RAISE NOTICE 'createdatカラムをcreatedAtにリネームしました';
    END IF;
    
    -- updatedAtカラムが小文字で存在する場合、引用符付きにリネーム
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='updatedat'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='organizationmembers' 
        AND column_name='updatedAt'
    ) THEN
        ALTER TABLE organizationmembers RENAME COLUMN updatedat TO "updatedAt";
        RAISE NOTICE 'updatedatカラムをupdatedAtにリネームしました';
    END IF;
END $$;

