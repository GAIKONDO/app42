-- Row Level Security (RLS) の設定
-- 開発環境用の基本的なRLSポリシー

-- ============================================
-- 基本的なRLSポリシー（開発用）
-- ============================================

-- organizationsテーブル
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 全ユーザー（匿名ユーザー含む）は全レコードを読み取り可能（開発環境用）
CREATE POLICY "全ユーザーは読み取り可能"
  ON organizations FOR SELECT
  TO public
  USING (true);

-- 全ユーザー（匿名ユーザー含む）は書き込み可能（開発環境用）
CREATE POLICY "全ユーザーは書き込み可能"
  ON organizations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- organizationMembersテーブル
ALTER TABLE organizationMembers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON organizationMembers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON organizationMembers FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- entitiesテーブル
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON entities FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON entities FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- relationsテーブル
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON relations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON relations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- topicsテーブル
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON topics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON topics FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- meetingNotesテーブル
ALTER TABLE meetingNotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON meetingNotes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON meetingNotes FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- startupsテーブル
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON startups FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON startups FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- focusInitiativesテーブル
ALTER TABLE focusInitiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON focusInitiatives FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON focusInitiatives FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- organizationContentsテーブル
ALTER TABLE organizationContents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "全ユーザーは読み取り可能"
  ON organizationContents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON organizationContents FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 注意事項
-- ============================================
-- 
-- このRLSポリシーは開発環境用の設定です。
-- 匿名ユーザー（anon key）にもアクセスを許可しています。
-- 
-- 本番環境では、より厳密なアクセス制御を実装してください：
-- - 認証済みユーザーのみにアクセスを許可（TO authenticated）
-- - 組織ごとのデータ分離
-- - ユーザー役割に基づくアクセス制御
-- - 作成者のみが編集可能
-- 
-- 詳細はSupabaseのRLSドキュメントを参照してください:
-- https://supabase.com/docs/guides/auth/row-level-security

