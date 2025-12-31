-- Row Level Security (RLS) の修正
-- 匿名ユーザー（anon key）にもアクセスを許可する開発環境用のポリシー

-- ============================================
-- 匿名ユーザーにもアクセスを許可（開発環境用）
-- ============================================

-- organizationsテーブル
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON organizations;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON organizations;

-- 匿名ユーザーも含めて全ユーザーが読み取り可能
CREATE POLICY "全ユーザーは読み取り可能"
  ON organizations FOR SELECT
  TO public
  USING (true);

-- 匿名ユーザーも含めて全ユーザーが書き込み可能（開発環境用）
CREATE POLICY "全ユーザーは書き込み可能"
  ON organizations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- organizationMembersテーブル
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON organizationMembers;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON organizationMembers;

CREATE POLICY "全ユーザーは読み取り可能"
  ON organizationMembers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON organizationMembers FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- organizationContentsテーブル
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON organizationContents;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON organizationContents;

CREATE POLICY "全ユーザーは読み取り可能"
  ON organizationContents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON organizationContents FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- entitiesテーブル
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON entities;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON entities;

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
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON relations;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON relations;

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
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON topics;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON topics;

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
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON meetingNotes;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON meetingNotes;

CREATE POLICY "全ユーザーは読み取り可能"
  ON meetingNotes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON meetingNotes FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- focusInitiativesテーブル
DROP POLICY IF EXISTS "認証済みユーザーは読み取り可能" ON focusInitiatives;
DROP POLICY IF EXISTS "認証済みユーザーは書き込み可能" ON focusInitiatives;

CREATE POLICY "全ユーザーは読み取り可能"
  ON focusInitiatives FOR SELECT
  TO public
  USING (true);

CREATE POLICY "全ユーザーは書き込み可能"
  ON focusInitiatives FOR ALL
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
-- - 認証済みユーザーのみにアクセスを許可
-- - 組織ごとのデータ分離
-- - ユーザー役割に基づくアクセス制御
-- 
-- 詳細はSupabaseのRLSドキュメントを参照してください:
-- https://supabase.com/docs/guides/auth/row-level-security

