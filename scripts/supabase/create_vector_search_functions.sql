-- pgvectorを使用したベクトル検索用PostgreSQL関数
-- SupabaseのRPC関数として使用可能

-- ============================================
-- エンティティ類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_entities(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
-- 注意: SupabaseのRPC関数から呼び出す場合、配列形式で渡されたベクトルは自動的にvector型に変換されます
RETURNS TABLE (
    id TEXT,
    entity_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ee.id,
        ee.entity_id,
        1 - (ee.embedding <=> query_embedding) AS similarity
    FROM entity_embeddings ee
    WHERE
        -- 埋め込み次元数の一致を確認（768次元と1536次元の混在に対応）
        -- vector(1536)型なので、1536次元のみを検索
        ee.embedding_dimension = 1536
        -- 組織IDまたは会社IDでフィルタリング
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND ee.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND ee.company_id = company_id_filter)
        )
        -- 類似度の閾値チェック
        AND (1 - (ee.embedding <=> query_embedding)) >= match_threshold
    ORDER BY ee.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- リレーション類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_relations(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    relation_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        re.id,
        re.relation_id,
        1 - (re.embedding <=> query_embedding) AS similarity
    FROM relation_embeddings re
    WHERE
        -- vector(1536)型なので、1536次元のみを検索
        re.embedding_dimension = 1536
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND re.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND re.company_id = company_id_filter)
        )
        AND (1 - (re.embedding <=> query_embedding)) >= match_threshold
    ORDER BY re.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- トピック類似度検索関数
-- ============================================

-- 既存の関数を削除（戻り値の型が変更されるため）
DROP FUNCTION IF EXISTS find_similar_topics(vector, double precision, integer, text, text);

CREATE OR REPLACE FUNCTION find_similar_topics(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    topic_id TEXT,
    meeting_note_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        te.id,
        te.topic_id,
        te.meeting_note_id,
        1 - (te.embedding <=> query_embedding) AS similarity
    FROM topic_embeddings te
    WHERE
        -- vector(1536)型なので、1536次元のみを検索
        te.embedding_dimension = 1536
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND te.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND te.company_id = company_id_filter)
        )
        AND (1 - (te.embedding <=> query_embedding)) >= match_threshold
    ORDER BY te.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- システム設計ドキュメント類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_design_docs(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    section_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dde.id,
        dde.section_id,
        1 - (dde.embedding <=> query_embedding) AS similarity
    FROM design_doc_embeddings dde
    WHERE
        -- vector(1536)型なので、1536次元のみを検索
        dde.embedding_dimension = 1536
        AND (1 - (dde.embedding <=> query_embedding)) >= match_threshold
    ORDER BY dde.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- 768次元用の関数（オプション）
-- ============================================

-- 768次元の埋め込みを使用する場合、別の関数を作成するか、
-- または上記の関数を修正して両方の次元に対応させる必要があります
-- ここでは、768次元用の関数も作成します

CREATE OR REPLACE FUNCTION find_similar_entities_768(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    entity_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ee.id,
        ee.entity_id,
        1 - (ee.embedding <=> query_embedding) AS similarity
    FROM entity_embeddings ee
    WHERE
        ee.embedding_dimension = 768
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND ee.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND ee.company_id = company_id_filter)
        )
        AND (1 - (ee.embedding <=> query_embedding)) >= match_threshold
    ORDER BY ee.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- スタートアップ類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_startups(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    startup_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.id,
        se.startup_id,
        1 - (se.embedding <=> query_embedding) AS similarity
    FROM startup_embeddings se
    WHERE
        se.embedding_dimension = 1536
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND se.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND se.company_id = company_id_filter)
        )
        AND (1 - (se.embedding <=> query_embedding)) >= match_threshold
    ORDER BY se.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- 注力施策類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_focus_initiatives(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    focus_initiative_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fie.id,
        fie.focus_initiative_id,
        1 - (fie.embedding <=> query_embedding) AS similarity
    FROM focus_initiative_embeddings fie
    WHERE
        fie.embedding_dimension = 1536
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND fie.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND fie.company_id = company_id_filter)
        )
        AND (1 - (fie.embedding <=> query_embedding)) >= match_threshold
    ORDER BY fie.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- 議事録類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_meeting_notes(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL,
    company_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    meeting_note_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mne.id,
        mne.meeting_note_id,
        1 - (mne.embedding <=> query_embedding) AS similarity
    FROM meeting_note_embeddings mne
    WHERE
        mne.embedding_dimension = 1536
        AND (
            (organization_id_filter IS NULL AND company_id_filter IS NULL) OR
            (organization_id_filter IS NOT NULL AND mne.organization_id = organization_id_filter) OR
            (company_id_filter IS NOT NULL AND mne.company_id = company_id_filter)
        )
        AND (1 - (mne.embedding <=> query_embedding)) >= match_threshold
    ORDER BY mne.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- 制度類似度検索関数
-- ============================================

CREATE OR REPLACE FUNCTION find_similar_regulations(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.0,
    match_count int DEFAULT 10,
    organization_id_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    regulation_id TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        re.id,
        re.regulation_id,
        1 - (re.embedding <=> query_embedding) AS similarity
    FROM regulation_embeddings re
    WHERE
        re.embedding_dimension = 1536
        AND (
            organization_id_filter IS NULL OR
            re.organization_id = organization_id_filter
        )
        AND (1 - (re.embedding <=> query_embedding)) >= match_threshold
    ORDER BY re.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- 関数の説明
-- ============================================

-- 使用方法:
-- SELECT * FROM find_similar_entities(
--     '[0.1,0.2,0.3,...]'::vector(1536),  -- クエリの埋め込みベクトル
--     0.5,                                 -- 類似度の閾値（0-1）
--     10,                                  -- 返却する最大件数
--     'org-123',                           -- 組織IDフィルタ（オプション）
--     NULL                                 -- 会社IDフィルタ（オプション）
-- );

-- 注意事項:
-- 1. <=> 演算子はコサイン距離を計算します（距離が小さいほど類似度が高い）
-- 2. 類似度 = 1 - 距離 で計算しています（0-1の範囲）
-- 3. HNSWインデックスが作成されている場合、高速に検索できます
-- 4. 埋め込み次元数が一致しない場合、エラーが発生します
-- 5. SupabaseのRPC関数として呼び出す場合は、引数をJSON形式で渡します

-- ============================================
-- 関数の権限設定（オプション）
-- ============================================

-- 匿名ユーザーがRPC関数を呼び出せるようにする
-- 注意: セキュリティを考慮して、適切なRLSポリシーを設定してください

-- GRANT EXECUTE ON FUNCTION find_similar_entities TO anon;
-- GRANT EXECUTE ON FUNCTION find_similar_relations TO anon;
-- GRANT EXECUTE ON FUNCTION find_similar_topics TO anon;
-- GRANT EXECUTE ON FUNCTION find_similar_design_docs TO anon;

