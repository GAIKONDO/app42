# APP42: Supabase移行プロジェクト

## 概要

このプロジェクトは、APP41（ローカルSQLite版）からSupabaseへの移行を進めるための作業フォルダです。

## 目的

- SQLiteをSupabase（PostgreSQL）に移行
- 共同編集機能の実現
- ChromaDBはローカルに保持（各ユーザーごと）

## 現在の状態

- APP41から必要なファイルをコピー済み
- Supabase移行の準備段階

## 次のステップ

1. Supabaseプロジェクトの作成
2. データアクセス層の抽象化
3. Supabaseクライアントの実装
4. リアルタイム同期の実装
5. 競合解決の実装

詳細は `docs/architecture/COLLABORATIVE_EDITING_DESIGN.md` を参照してください。

## 注意事項

- このフォルダでの変更はAPP41に影響しません
- 開発中はAPP41と並行して作業可能です


