# データ移行状況

最終更新: 2025-12-30

## 移行済みテーブル

### ✅ 正常に移行完了

- **organizations**: 12件 ✅

## エラーが発生したテーブル

### ⚠️ カラム名の問題

1. **users** (1件)
   - エラー: `approvedAt`カラムが見つからない
   - 原因: PostgreSQLのカラム名の大文字小文字の問題
   - 状態: 未移行

2. **topics** (9件)
   - エラー: `chromaSyncError`カラムが見つからない
   - 原因: PostgreSQLのカラム名の大文字小文字の問題
   - 状態: 未移行

3. **mcp_tools** (9件)
   - エラー: `createdAt`カラムが見つからない
   - 原因: PostgreSQLのカラム名の大文字小文字の問題
   - 状態: 未移行

### ⚠️ テーブル名の問題

4. **meetingNotes** (1件)
   - エラー: テーブルが見つからない
   - 原因: PostgreSQLでは引用符なしの識別子は小文字になる（`meetingnotes`）
   - 状態: 未移行

## スキーマに存在しないテーブル

以下のテーブルはSupabaseスキーマに存在しないため、スキップされました：

- `categories` (42件)
- `departments` (11件)
- `bizDevPhases` (13件)
- `vcs` (12件)

これらのテーブルが必要な場合は、スキーマに追加する必要があります。

## データなしでスキップされたテーブル

以下のテーブルはSQLiteにデータがなかったため、スキップされました（正常）：

- `approvalRequests`
- `organizationMembers`
- `organizationContents`
- `companyContents`
- `focusInitiatives`
- `themes`
- `themeHierarchyConfigs`
- `entities`
- `relations`
- `topicFiles`
- `designDocSections`
- `designDocSectionRelations`
- `agents`
- `tasks`
- `taskExecutions`
- `taskChains`
- `a2aMessages`
- `agent_prompt_versions`
- `aiSettings`
- `backupHistory`
- `statuses`
- `engagementLevels`
- `categoryBizDevPhaseSnapshots`
- `graphvizDotFiles`
- `graphvizYamlFiles`
- `graphvizYamlFileAttachments`

## 次のステップ

### 1. カラム名の問題の解決

PostgreSQLでは、引用符で囲まれていない識別子は小文字に変換されます。スキーマでは`"createdAt"`のように引用符で囲まれているため、大文字小文字が保持されますが、Supabaseクライアントが正しく処理していない可能性があります。

**解決方法**:
1. Supabaseダッシュボードでテーブルのカラム名を確認
2. 移行スクリプトでカラム名を動的に取得して使用
3. または、スキーマのカラム名を小文字に統一

### 2. テーブル名の問題の解決

`meetingNotes`テーブルが見つからない場合、PostgreSQLのテーブル名の大文字小文字の問題の可能性があります。

**解決方法**:
1. Supabaseダッシュボードでテーブル名を確認（`meetingnotes`または`meetingNotes`）
2. 移行スクリプトでテーブル名を小文字に変換して使用

### 3. スキーマに存在しないテーブルの対応

`categories`, `departments`, `bizDevPhases`, `vcs`テーブルはSupabaseスキーマに存在しません。

**解決方法**:
1. これらのテーブルが必要な場合、スキーマに追加
2. 不要な場合は、移行スクリプトから除外

## 現在の状態

- ✅ `organizations`テーブル: 正常に移行完了（12件）
- ⚠️ その他のテーブル: カラム名やテーブル名の問題で一部エラー
- 📊 合計: 12/91件のレコードをインポート

## 推奨される対応

1. **重要データの確認**: `organizations`テーブルは正常に移行されているため、組織データは使用可能です
2. **エラーテーブルの対応**: 必要に応じて、カラム名やテーブル名を修正して再実行
3. **スキーマの確認**: Supabaseダッシュボードで実際のテーブル構造を確認
