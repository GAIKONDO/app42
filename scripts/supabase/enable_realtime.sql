-- Supabase Realtimeを有効化するスクリプト
-- 主要なテーブルでリアルタイム同期を有効化

-- Realtime拡張機能を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE organizationMembers;
ALTER PUBLICATION supabase_realtime ADD TABLE organizationContents;
ALTER PUBLICATION supabase_realtime ADD TABLE entities;
ALTER PUBLICATION supabase_realtime ADD TABLE relations;
ALTER PUBLICATION supabase_realtime ADD TABLE topics;
ALTER PUBLICATION supabase_realtime ADD TABLE meetingNotes;
ALTER PUBLICATION supabase_realtime ADD TABLE startups;
ALTER PUBLICATION supabase_realtime ADD TABLE focusInitiatives;
ALTER PUBLICATION supabase_realtime ADD TABLE themes;
ALTER PUBLICATION supabase_realtime ADD TABLE designDocSections;
ALTER PUBLICATION supabase_realtime ADD TABLE designDocSectionRelations;

-- 注意: すべてのテーブルでRealtimeを有効化する必要はありません
-- 必要に応じて、特定のテーブルのみを有効化してください

