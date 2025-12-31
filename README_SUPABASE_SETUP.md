# Supabase移行と共同編集機能のセットアップガイド

このドキュメントでは、SQLiteからSupabaseへの移行と共同編集機能のセットアップ方法を説明します。

## 概要

この実装では、以下の機能を提供します：

1. **データアクセス層の抽象化**: SQLiteとSupabaseを切り替え可能
2. **Supabaseクライアント**: TypeScript側とRust側の両方で実装
3. **リアルタイム同期**: Supabase Realtimeを使用した共同編集
4. **競合解決**: 楽観的ロックとバージョン管理
5. **オフライン対応**: ローカルキャッシュと保留中の書き込みキュー

## クイックスタート

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Supabaseを使用する場合はtrueに設定（デフォルト: false）
NEXT_PUBLIC_USE_SUPABASE=false

# SupabaseプロジェクトのURL（Supabase使用時のみ）
NEXT_PUBLIC_SUPABASE_URL=

# Supabase匿名キー（anon key）（Supabase使用時のみ）
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. 設定の検証

```bash
npm run dev
```

ブラウザで`http://localhost:3020/supabase-config-check`にアクセスして、設定を確認します。

## Supabaseプロジェクトのセットアップ

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキーを取得
   - Settings → API → Project URL
   - Settings → API → anon/public key

### 2. データベーススキーマの作成

1. Supabaseダッシュボードの「SQL Editor」を開く
2. `scripts/supabase/create_schema.sql`の内容をコピーして実行
3. スキーマが正常に作成されたことを確認

### 3. Realtimeの有効化

1. `scripts/supabase/enable_realtime.sql`の内容を実行
2. または、Supabaseダッシュボードの「Database」→「Replication」から手動で有効化

### 4. Row Level Security (RLS) の設定

1. `scripts/supabase/setup_rls.sql`の内容を実行
2. 本番環境では、より厳密なアクセス制御を実装してください

### 5. 環境変数の更新

`.env.local`ファイルを更新：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. 動作確認

1. `http://localhost:3020/supabase-config-check`で設定を確認
2. `http://localhost:3020/supabase-test`でリアルタイム同期を確認

## セットアップスクリプト

以下のSQLスクリプトが用意されています：

- `scripts/supabase/create_schema.sql`: データベーススキーマの作成
- `scripts/supabase/enable_realtime.sql`: Realtimeの有効化
- `scripts/supabase/setup_rls.sql`: Row Level Security (RLS) の設定

これらのスクリプトをSupabaseダッシュボードの「SQL Editor」で実行してください。

## 使用方法

### データソースの切り替え

環境変数`NEXT_PUBLIC_USE_SUPABASE`でデータソースを切り替えます：

- `false`または未設定: ローカルSQLiteを使用
- `true`: Supabaseを使用

### データアクセス

```typescript
import { getDataSourceInstance } from './lib/dataSource';

const dataSource = getDataSourceInstance();

// ドキュメントを取得
const doc = await dataSource.doc_get('organizations', 'org-id');

// ドキュメントを設定
await dataSource.doc_set('organizations', 'org-id', {
  name: '組織名',
  // ...
});

// コレクションを取得
const orgs = await dataSource.collection_get('organizations');
```

### リアルタイム同期

```typescript
import { getRealtimeSync } from './lib/realtimeSync';

const realtimeSync = getRealtimeSync();

// テーブルの変更を購読
const unsubscribe = realtimeSync.subscribe('organizations', (payload) => {
  console.log('変更が検出されました:', payload);
  // UIを更新
});

// 購読を解除
unsubscribe();
```

### 競合解決

```typescript
import { updateWithConflictResolution, ConflictResolutionStrategy } from './lib/conflictResolution';

try {
  // 楽観的ロックを使用
  const updated = await updateWithConflictResolution('organizations', 'org-id', {
    name: '新しい組織名',
    version: currentVersion, // 現在のバージョンを指定
  });
} catch (error) {
  if (error instanceof ConflictError) {
    // 競合が発生した場合の処理
    console.error('競合が発生しました:', error);
  }
}
```

### オフライン対応

```typescript
import { getOfflineCache } from './lib/offlineCache';

const offlineCache = getOfflineCache();

// オフライン時もキャッシュから取得可能
const doc = await offlineCache.get('organizations', 'org-id');

// オフライン時は自動的にキューに追加
try {
  await offlineCache.set('organizations', 'org-id', data);
} catch (error) {
  if (error instanceof OfflineError) {
    // オフライン時の処理
    console.log('オフライン中です。接続回復後に同期されます。');
  }
}

// 保留中の書き込みを確認
const pendingWrites = offlineCache.getPendingWrites();
```

## アーキテクチャ

### データフロー

```
フロントエンド（React/Next.js）
    ↓
DataSource抽象化レイヤー
    ↓
[SQLite] または [Supabase]
    ↓
ChromaDB同期（バックグラウンド、ローカル）
    ↓
ChromaDB（ローカルサーバー）
```

### ファイル構成

- `lib/dataSource.ts`: データソース抽象化インターフェース
- `lib/localSQLiteDataSource.ts`: ローカルSQLiteデータソース実装
- `lib/supabaseDataSource.ts`: Supabaseデータソース実装
- `lib/realtimeSync.ts`: リアルタイム同期機能
- `lib/conflictResolution.ts`: 競合解決機能
- `lib/offlineCache.ts`: オフライン対応機能
- `src-tauri/src/database/supabase.rs`: Rust側のSupabaseクライアント

## 注意事項

1. **ChromaDBはローカルに保持**: ChromaDBの埋め込みベクトルは各ユーザーのローカルに保存されます。共同編集の対象外です。

2. **データ移行**: 既存のSQLiteデータをSupabaseに移行する場合は、データ移行スクリプトを作成する必要があります。

3. **パフォーマンス**: クラウドへのアクセスはローカルSQLiteより遅い可能性があります。キャッシュを活用してください。

4. **コスト**: Supabaseの無料プランには制限があります。大量のデータ操作を行う場合は、プランを確認してください。

## トラブルシューティング

### エラー: "Supabase環境変数が設定されていません"

`.env.local`ファイルに環境変数が正しく設定されているか確認してください。

### エラー: "Row Level Security policy violation"

RLSポリシーが正しく設定されているか確認してください。開発中は、一時的にRLSを無効化することもできます（本番環境では推奨しません）。

### リアルタイム同期が動作しない

1. テーブルでRealtimeが有効化されているか確認
2. SupabaseプロジェクトでRealtimeが有効になっているか確認
3. ネットワーク接続を確認

## 動作確認ページ

以下のページで動作確認ができます：

- **設定検証**: `http://localhost:3020/supabase-config-check`
  - 環境変数とSupabase接続を確認
- **動作確認**: `http://localhost:3020/supabase-test`
  - リアルタイム同期と共同編集機能を確認

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [PostgREST API](https://postgrest.org/)
- [設計書: docs/architecture/COLLABORATIVE_EDITING_DESIGN.md](docs/architecture/COLLABORATIVE_EDITING_DESIGN.md)
- [開発環境セットアップ: docs/architecture/DEVELOPMENT_SETUP.md](docs/architecture/DEVELOPMENT_SETUP.md)
- [統合ガイド: docs/architecture/INTEGRATION_GUIDE.md](docs/architecture/INTEGRATION_GUIDE.md)
- [使用例: docs/architecture/SUPABASE_USAGE_EXAMPLES.md](docs/architecture/SUPABASE_USAGE_EXAMPLES.md)

