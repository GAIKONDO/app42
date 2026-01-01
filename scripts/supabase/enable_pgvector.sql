-- pgvector拡張機能の有効化
-- Supabaseでベクトル検索を可能にするための拡張機能を有効化します

-- pgvector拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 拡張機能の確認
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- 注意事項:
-- 1. Supabaseダッシュボードの「Database」→「Extensions」からも有効化できます
-- 2. 拡張機能の有効化には管理者権限が必要です
-- 3. 既に有効化されている場合は、エラーは発生しません（IF NOT EXISTS）

