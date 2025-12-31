# SQLiteからSupabaseへのデータ移行ガイド

## 概要

このガイドでは、ローカルのSQLiteデータベース（`data/app.db`）からSupabaseへのデータ移行方法を説明します。

## 前提条件

1. Supabaseプロジェクトが作成済みであること
2. Supabaseのスキーマが作成済みであること（`scripts/supabase/create_schema.sql`を実行済み）
3. `.env.local`にSupabase設定が含まれていること
4. Node.jsとnpmがインストールされていること

## 必要な依存関係のインストール

移行スクリプトを実行するために、以下の依存関係をインストールします：

```bash
npm install --save-dev better-sqlite3 tsx @types/better-sqlite3
```

## 移行手順

### 1. データベースのバックアップ（推奨）

移行前に、SQLiteデータベースのバックアップを取ることを推奨します：

```bash
cp data/app.db data/app.db.backup
```

### 2. 移行スクリプトの実行

以下のコマンドで移行スクリプトを実行します：

```bash
npx tsx scripts/migrate_sqlite_to_supabase.ts
```

### 3. 移行結果の確認

スクリプト実行後、以下の情報が表示されます：

- 各テーブルのインポート件数
- エラーが発生したテーブル（あれば）
- 移行結果のサマリー

### 4. Supabaseでデータを確認

移行後、Supabaseダッシュボードでデータが正しくインポートされているか確認してください：

1. Supabaseダッシュボードにアクセス
2. 「Table Editor」を開く
3. 各テーブルのデータを確認

## 移行されるテーブル

以下の順序でテーブルがインポートされます（外部キー制約を考慮）：

1. **ユーザー管理**
   - `users`
   - `approvalRequests`

2. **組織管理**
   - `organizations`
   - `organizationMembers`
   - `organizationContents`
   - `companyContents`

3. **議事録・施策**
   - `meetingNotes`
   - `focusInitiatives`
   - `themes`
   - `themeHierarchyConfigs`

4. **ナレッジグラフ**
   - `entities`
   - `topics`
   - `relations`
   - `topicFiles`

5. **システム設計ドキュメント**
   - `designDocSections`
   - `designDocSectionRelations`

6. **Agentシステム**
   - `agents`
   - `tasks`
   - `taskExecutions`
   - `taskChains`
   - `a2aMessages`
   - `agent_prompt_versions`
   - `mcp_tools`

7. **その他**
   - `aiSettings`
   - `backupHistory`
   - その他のテーブル

## 注意事項

### データ型の変換

- SQLiteの`INTEGER`型はPostgreSQLの`INTEGER`型に変換されます
- SQLiteの`TEXT`型はPostgreSQLの`TEXT`型に変換されます
- SQLiteの`REAL`型はPostgreSQLの`REAL`型に変換されます
- 日時データは`TIMESTAMPTZ`型として保存されます

### 外部キー制約

移行スクリプトは外部キー制約を考慮した順序でテーブルをインポートします。ただし、以下の点に注意してください：

- 既存のデータがある場合、`upsert`（更新または挿入）を使用します
- 外部キー参照が存在しないデータはエラーになる可能性があります

### バッチ処理

大量のデータがある場合、バッチサイズ（1000件）で分割してインポートします。

### エラーハンドリング

エラーが発生した場合：

1. エラーメッセージを確認
2. 該当するテーブルのデータを確認
3. 必要に応じて手動でデータを修正
4. 再度スクリプトを実行（`upsert`を使用するため、既存データは更新されます）

## トラブルシューティング

### エラー: "column not found"

PostgreSQLのカラム名は大文字小文字を区別します。スキーマでカラム名が引用符で囲まれている場合（例：`"createdAt"`）、移行スクリプトも引用符付きで処理します。

### エラー: "foreign key constraint"

外部キー制約エラーが発生した場合：

1. 参照先のテーブルが正しくインポートされているか確認
2. 参照先のIDが存在するか確認
3. 必要に応じて、外部キー制約を一時的に無効化してインポート

### エラー: "duplicate key"

既存のデータがある場合、`upsert`を使用するため、通常は問題ありません。エラーが発生した場合は、Supabaseのテーブルを確認してください。

## 移行後の確認事項

1. **データ件数の確認**
   - SQLiteとSupabaseで各テーブルの件数が一致するか確認

2. **データ整合性の確認**
   - 外部キー参照が正しく機能しているか確認
   - 重要なデータが正しく移行されているか確認

3. **アプリケーションの動作確認**
   - 移行後、アプリケーションが正常に動作するか確認
   - リアルタイム同期が正常に動作するか確認

## 次のステップ

移行が完了したら：

1. アプリケーションでSupabaseデータが正しく表示されるか確認
2. リアルタイム同期が正常に動作するか確認
3. 必要に応じて、SQLiteデータベースをバックアップとして保持

