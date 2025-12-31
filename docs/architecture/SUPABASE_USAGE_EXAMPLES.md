# Supabase移行と共同編集機能の使用例

このドキュメントでは、Supabase移行と共同編集機能の実装例を説明します。

## 基本的な使用方法

### 1. 環境変数の設定

`.env.local`ファイルを作成：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 既存のコード（変更不要）

既存のコードはそのまま動作します。`localFirebase.ts`が自動的にDataSourceインターフェースを使用します。

```typescript
import { doc, collection, getDoc, setDoc } from '@/lib/firestore';

// 既存のコードがそのまま動作
const docRef = doc(null, 'organizations', 'org-id');
const snapshot = await getDoc(docRef);
const data = snapshot.data();

await setDoc(docRef, { name: '新しい組織名' });
```

### 3. リアルタイム同期の使用

#### 基本的な使用例

```typescript
import { useRealtimeSync } from '@/lib/hooks';

function OrganizationList() {
  const [organizations, setOrganizations] = useState([]);

  // リアルタイム同期を有効化
  useRealtimeSync({
    table: 'organizations',
    onInsert: (payload) => {
      // 新しい組織が追加されたとき
      setOrganizations(prev => [...prev, payload.new]);
    },
    onUpdate: (payload) => {
      // 組織が更新されたとき
      setOrganizations(prev =>
        prev.map(org => org.id === payload.new.id ? payload.new : org)
      );
    },
    onDelete: (payload) => {
      // 組織が削除されたとき
      setOrganizations(prev =>
        prev.filter(org => org.id !== payload.old.id)
      );
    },
  });

  return (
    <div>
      {organizations.map(org => (
        <div key={org.id}>{org.name}</div>
      ))}
    </div>
  );
}
```

### 4. 共同編集フックの使用

#### 組織編集コンポーネントの例

```typescript
import { useCollaborativeEditing } from '@/lib/hooks';

function OrganizationEdit({ orgId }: { orgId: string }) {
  const { data, update, isLoading, error } = useCollaborativeEditing({
    table: 'organizations',
    docId: orgId,
    onConflict: (error) => {
      // 競合が発生した場合の処理
      alert('他のユーザーが更新しました。最新のデータを取得します。');
    },
  });

  const handleSave = async () => {
    try {
      await update({
        name: '新しい組織名',
        description: '新しい説明',
      });
      alert('保存しました');
    } catch (err) {
      console.error('保存エラー:', err);
    }
  };

  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error.message}</div>;
  if (!data) return <div>データが見つかりません</div>;

  return (
    <div>
      <input
        value={data.name}
        onChange={(e) => update({ name: e.target.value })}
      />
      <button onClick={handleSave}>保存</button>
    </div>
  );
}
```

### 5. 競合解決の使用

#### 手動で競合解決を使用する場合

```typescript
import { updateWithConflictResolution, ConflictError } from '@/lib/conflictResolution';

async function updateOrganization(orgId: string, updates: any, currentVersion: number) {
  try {
    const updated = await updateWithConflictResolution('organizations', orgId, {
      ...updates,
      version: currentVersion,
    });
    return updated;
  } catch (error) {
    if (error instanceof ConflictError) {
      // 競合が発生した場合
      console.error('競合が発生しました:', error);
      console.log('現在のバージョン:', error.currentVersion);
      console.log('サーバーのバージョン:', error.serverVersion);
      
      // 最新のデータを取得して再試行
      const latest = await getDataSourceInstance().doc_get('organizations', orgId);
      // ユーザーに確認を求める
      const shouldRetry = confirm('他のユーザーが更新しました。再試行しますか？');
      if (shouldRetry) {
        return updateOrganization(orgId, updates, latest.version);
      }
    }
    throw error;
  }
}
```

### 6. オフライン対応の使用

#### オフラインキャッシュを使用する場合

```typescript
import { getOfflineCache, OfflineError } from '@/lib/offlineCache';

const offlineCache = getOfflineCache();

// オフライン時もキャッシュから取得可能
async function getOrganization(orgId: string) {
  try {
    const org = await offlineCache.get('organizations', orgId);
    return org;
  } catch (error) {
    if (error instanceof OfflineError) {
      console.warn('オフライン中です。キャッシュされたデータを使用します。');
      // キャッシュから取得を再試行
      return offlineCache.get('organizations', orgId);
    }
    throw error;
  }
}

// オフライン時は自動的にキューに追加
async function saveOrganization(orgId: string, data: any) {
  try {
    await offlineCache.set('organizations', orgId, data);
  } catch (error) {
    if (error instanceof OfflineError) {
      console.log('オフライン中です。接続回復後に同期されます。');
      // 保留中の書き込みを確認
      const pending = offlineCache.getPendingWrites();
      console.log('保留中の書き込み:', pending.length);
    } else {
      throw error;
    }
  }
}
```

## 高度な使用例

### 複数のテーブルでリアルタイム同期

```typescript
function MultiTableSync() {
  // 複数のテーブルでリアルタイム同期を有効化
  useRealtimeSync({
    table: 'organizations',
    onUpdate: (payload) => {
      console.log('組織が更新されました:', payload.new);
    },
  });

  useRealtimeSync({
    table: 'entities',
    onUpdate: (payload) => {
      console.log('エンティティが更新されました:', payload.new);
    },
  });

  useRealtimeSync({
    table: 'topics',
    onUpdate: (payload) => {
      console.log('トピックが更新されました:', payload.new);
    },
  });

  return <div>複数テーブルのリアルタイム同期</div>;
}
```

### 条件付きでリアルタイム同期を有効化

```typescript
function ConditionalSync({ enabled }: { enabled: boolean }) {
  useRealtimeSync({
    table: 'organizations',
    enabled, // 条件付きで有効化/無効化
    onUpdate: (payload) => {
      console.log('組織が更新されました:', payload.new);
    },
  });

  return <div>条件付きリアルタイム同期</div>;
}
```

### カスタム競合解決戦略

```typescript
import { resolveConflict, ConflictResolutionStrategy } from '@/lib/conflictResolution';

async function updateWithCustomStrategy(
  table: string,
  id: string,
  updates: any
) {
  // Last Write Wins戦略を使用
  const result = await resolveConflict(
    table,
    id,
    updates,
    ConflictResolutionStrategy.LastWriteWins
  );
  return result;
}
```

## パフォーマンス最適化

### バッチ更新

```typescript
async function batchUpdate(updates: Array<{ id: string; data: any }>) {
  const dataSource = getDataSourceInstance();
  
  // 並列で更新（Supabaseは複数のリクエストを並列処理可能）
  await Promise.all(
    updates.map(({ id, data }) =>
      dataSource.doc_set('organizations', id, data)
    )
  );
}
```

### キャッシュの活用

```typescript
import { getOfflineCache } from '@/lib/offlineCache';

const offlineCache = getOfflineCache();

// キャッシュをクリア（必要に応じて）
function clearCache() {
  offlineCache.clearCache();
}

// 保留中の書き込みを手動で同期
async function syncPendingWrites() {
  await offlineCache.syncPendingWrites();
}
```

## エラーハンドリング

### 包括的なエラーハンドリング

```typescript
import { ConflictError } from '@/lib/conflictResolution';
import { OfflineError } from '@/lib/offlineCache';

async function safeUpdate(table: string, id: string, data: any) {
  try {
    const dataSource = getDataSourceInstance();
    await dataSource.doc_set(table, id, data);
  } catch (error) {
    if (error instanceof ConflictError) {
      // 競合エラーの処理
      console.error('競合が発生しました:', error);
      // 最新のデータを取得して再試行
    } else if (error instanceof OfflineError) {
      // オフラインエラーの処理
      console.warn('オフライン中です:', error);
      // キャッシュから取得
    } else {
      // その他のエラー
      console.error('予期しないエラー:', error);
      throw error;
    }
  }
}
```

## トラブルシューティング

### リアルタイム同期が動作しない場合

1. SupabaseプロジェクトでRealtimeが有効になっているか確認
2. テーブルでRealtimeが有効化されているか確認
3. ネットワーク接続を確認
4. ブラウザのコンソールでエラーを確認

### 競合解決が動作しない場合

1. データに`version`フィールドが含まれているか確認
2. データベーススキーマに`version`カラムが存在するか確認
3. 環境変数`NEXT_PUBLIC_USE_CONFLICT_RESOLUTION`が設定されているか確認

### オフライン対応が動作しない場合

1. 環境変数`NEXT_PUBLIC_USE_OFFLINE_CACHE`が`true`に設定されているか確認
2. ブラウザのオフライン/オンラインイベントが正しく動作しているか確認
3. キャッシュの状態を確認

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [設計書: COLLABORATIVE_EDITING_DESIGN.md](./COLLABORATIVE_EDITING_DESIGN.md)
- [セットアップガイド: ../../README_SUPABASE_SETUP.md](../../README_SUPABASE_SETUP.md)

