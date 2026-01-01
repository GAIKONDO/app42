-- pgvector用HNSWインデックスの作成
-- 高速なベクトル類似度検索のためのインデックスを作成します

-- 注意: HNSWインデックスの作成には時間がかかる場合があります（データ量に依存）
-- 本番環境では、メンテナンスウィンドウ中に作成することを推奨します

-- ============================================
-- エンティティ埋め込みベクトルインデックス
-- ============================================

-- コサイン類似度検索用HNSWインデックス
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_embedding_cosine
ON entity_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 注意: 組織IDでフィルタリングする場合の複合インデックス（オプション）
-- 組織ごとの検索を高速化するために、組織IDとベクトルの複合インデックスも作成可能
-- ただし、HNSWインデックスはベクトル検索に特化しているため、通常は上記のインデックスで十分

-- ============================================
-- リレーション埋め込みベクトルインデックス
-- ============================================

CREATE INDEX IF NOT EXISTS idx_relation_embeddings_embedding_cosine
ON relation_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================
-- トピック埋め込みベクトルインデックス
-- ============================================

CREATE INDEX IF NOT EXISTS idx_topic_embeddings_embedding_cosine
ON topic_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================
-- システム設計ドキュメント埋め込みベクトルインデックス
-- ============================================

CREATE INDEX IF NOT EXISTS idx_design_doc_embeddings_embedding_cosine
ON design_doc_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================
-- インデックスパラメータの説明
-- ============================================

-- m: 各ノードが接続する最大のリンク数（デフォルト: 16）
--    値が大きいほど検索精度が上がりますが、インデックスサイズと構築時間が増加します
--    推奨値: 16-32

-- ef_construction: インデックス構築時の探索範囲（デフォルト: 64）
--                  値が大きいほどインデックス構築時間がかかりますが、検索精度が上がります
--                  推奨値: 64-128

-- vector_cosine_ops: コサイン類似度検索用の演算子クラス
--                   コサイン類似度は、ベクトルの方向性を比較するため、正規化されたベクトルに適しています

-- ============================================
-- インデックスの確認
-- ============================================

-- インデックスの作成状況を確認
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'entity_embeddings',
    'relation_embeddings',
    'topic_embeddings',
    'design_doc_embeddings'
)
AND indexname LIKE '%embedding%'
ORDER BY tablename, indexname;

-- ============================================
-- パフォーマンスチューニング（オプション）
-- ============================================

-- 大量のデータがある場合、以下のパラメータを調整することで
-- 検索パフォーマンスを向上させることができます

-- 1. 検索時の探索範囲を調整（クエリ実行時）
--    SET LOCAL hnsw.ef_search = 100;  -- デフォルト: 40
--    値が大きいほど検索精度が上がりますが、検索時間が増加します

-- 2. インデックス再構築（より高い精度が必要な場合）
--    DROP INDEX idx_entity_embeddings_embedding_cosine;
--    CREATE INDEX idx_entity_embeddings_embedding_cosine
--    ON entity_embeddings
--    USING hnsw (embedding vector_cosine_ops)
--    WITH (m = 32, ef_construction = 128);

-- ============================================
-- 注意事項
-- ============================================

-- 1. HNSWインデックスの作成には時間がかかります（データ量に依存）
-- 2. インデックス作成中は、テーブルへの書き込みがブロックされる場合があります
-- 3. 本番環境では、メンテナンスウィンドウ中に作成することを推奨します
-- 4. インデックスサイズは、データ量の約20-30%になることがあります
-- 5. ベクトルの次元数が異なる場合（768次元と1536次元）、別々のインデックスが必要です
--    現在の実装では、embedding_dimensionカラムで管理していますが、
--    将来的には次元数ごとにテーブルを分けることも検討できます

