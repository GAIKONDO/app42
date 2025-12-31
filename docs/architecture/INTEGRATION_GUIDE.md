# Supabase移行と共同編集機能の統合ガイド

このドキュメントでは、既存のコンポーネントにリアルタイム同期と共同編集機能を統合する方法を説明します。

## 統合の概要

既存のコードは変更不要で動作しますが、リアルタイム同期や共同編集機能を追加する場合は、以下の方法で統合できます。

## 統合方法

### 方法1: 既存のフックを置き換える（推奨）

既存の`useOrganizationData`を`useOrganizationDataWithRealtime`に置き換えるだけで、リアルタイム同期が有効になります。

#### 変更前

```typescript
// app/organization/page.tsx
import { useOrganizationData } from './hooks/useOrganizationData';

export default function OrganizationPage() {
  const {
    selectedNode,
    setSelectedNode,
    orgData,
    setOrgData,
    // ...
  } = useOrganizationData();
  
  // ...
}
```

#### 変更後

```typescript
// app/organization/page.tsx
import { useOrganizationDataWithRealtime } from './hooks/useOrganizationDataWithRealtime';

export default function OrganizationPage() {
  const {
    selectedNode,
    setSelectedNode,
    orgData,
    setOrgData,
    // ...
  } = useOrganizationDataWithRealtime(); // これだけ変更
  
  // ...
}
```

### 方法2: 個別にリアルタイム同期を追加

既存のフックを変更せずに、リアルタイム同期を個別に追加する場合：

```typescript
import { useOrganizationData } from './hooks/useOrganizationData';
import { useOrganizationRealtimeSync } from './hooks/useOrganizationRealtimeSync';

export default function OrganizationPage() {
  const {
    orgData,
    setOrgData,
    // ...
  } = useOrganizationData();

  // リアルタイム同期を追加
  useOrganizationRealtimeSync({
    orgData,
    setOrgData,
    enabled: process.env.NEXT_PUBLIC_USE_SUPABASE === 'true',
  });
  
  // ...
}
```

### 方法3: カスタムリアルタイム同期

特定のテーブルでリアルタイム同期をカスタマイズする場合：

```typescript
import { useRealtimeSync } from '@/lib/hooks';

function MyComponent() {
  const [data, setData] = useState([]);

  useRealtimeSync({
    table: 'organizations',
    onInsert: (payload) => {
      // カスタム処理
      setData(prev => [...prev, payload.new]);
    },
    onUpdate: (payload) => {
      // カスタム処理
      setData(prev =>
        prev.map(item => item.id === payload.new.id ? payload.new : item)
      );
    },
    onDelete: (payload) => {
      // カスタム処理
      setData(prev => prev.filter(item => item.id !== payload.old.id));
    },
  });
}
```

## 統合例

### 例1: 組織管理ページへの統合

```typescript
// app/organization/page.tsx
'use client';

import { useOrganizationDataWithRealtime } from './hooks/useOrganizationDataWithRealtime';

export default function OrganizationPage() {
  // リアルタイム同期対応のフックを使用
  const {
    selectedNode,
    setSelectedNode,
    orgData,
    setOrgData,
    loading,
    error,
    selectedNodeMembers,
    setSelectedNodeMembers,
    refreshOrgData,
  } = useOrganizationDataWithRealtime();

  // 既存のコードはそのまま動作
  // ...
}
```

### 例2: 組織詳細ページへの統合

```typescript
// app/organization/detail/page.tsx
'use client';

import { useCollaborativeEditing } from '@/lib/hooks';

function OrganizationDetailPageContent() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('id');

  // 共同編集機能を使用
  const { data, update, isLoading, error } = useCollaborativeEditing({
    table: 'organizations',
    docId: organizationId || '',
    onConflict: (error) => {
      alert('他のユーザーが更新しました。最新のデータを取得します。');
    },
  });

  const handleSave = async () => {
    try {
      await update({
        name: '新しい組織名',
        description: '新しい説明',
      });
    } catch (err) {
      console.error('保存エラー:', err);
    }
  };

  // ...
}
```

### 例3: エンティティ管理への統合

```typescript
// app/knowledge-graph/components/EntityList.tsx
'use client';

import { useRealtimeSync } from '@/lib/hooks';
import { useState, useEffect } from 'react';

export function EntityList() {
  const [entities, setEntities] = useState([]);

  // リアルタイム同期を有効化
  useRealtimeSync({
    table: 'entities',
    onInsert: (payload) => {
      setEntities(prev => [...prev, payload.new]);
    },
    onUpdate: (payload) => {
      setEntities(prev =>
        prev.map(entity => entity.id === payload.new.id ? payload.new : entity)
      );
    },
    onDelete: (payload) => {
      setEntities(prev => prev.filter(entity => entity.id !== payload.old.id));
    },
  });

  // 初回データ取得
  useEffect(() => {
    // 既存のデータ取得ロジック
  }, []);

  // ...
}
```

## 動作確認

### テストページを使用

`/supabase-test`ページで動作確認ができます：

1. ブラウザで`http://localhost:3020/supabase-test`にアクセス
2. 複数のブラウザタブまたはウィンドウで同じページを開く
3. 一方で組織を追加・更新・削除すると、他方にリアルタイムで反映されることを確認

### 既存ページでの確認

1. 環境変数`NEXT_PUBLIC_USE_SUPABASE=true`を設定
2. Supabaseプロジェクトをセットアップ
3. 既存の組織管理ページ（`/organization`）にアクセス
4. 複数のブラウザで同じページを開き、リアルタイム同期を確認

## パフォーマンス考慮事項

### リアルタイム同期の最適化

- 必要なテーブルのみでリアルタイム同期を有効化
- 大量のデータがある場合は、条件付きで有効化

```typescript
useRealtimeSync({
  table: 'organizations',
  enabled: process.env.NEXT_PUBLIC_USE_SUPABASE === 'true' && !isLoading,
  // ...
});
```

### バッチ更新の最適化

複数の更新を一度に行う場合：

```typescript
// 非効率
for (const item of items) {
  await dataSource.doc_set('organizations', item.id, item);
}

// 効率的
await Promise.all(
  items.map(item => dataSource.doc_set('organizations', item.id, item))
);
```

## エラーハンドリング

### エラーハンドリングのベストプラクティス

```typescript
import { ConflictError } from '@/lib/conflictResolution';
import { OfflineError } from '@/lib/offlineCache';
import { getUserFriendlyErrorMessage } from '@/lib/utils/supabaseErrorHandler';

async function safeUpdate(table: string, id: string, data: any) {
  try {
    const dataSource = getDataSourceInstance();
    await dataSource.doc_set(table, id, data);
  } catch (error) {
    if (error instanceof ConflictError) {
      // 競合エラーの処理
      alert('他のユーザーが更新しました。最新のデータを取得します。');
      // 最新のデータを取得して再試行
    } else if (error instanceof OfflineError) {
      // オフラインエラーの処理
      alert('オフライン中です。接続回復後に同期されます。');
    } else {
      // その他のエラー
      const message = getUserFriendlyErrorMessage(error, '更新');
      alert(message);
      console.error('更新エラー:', error);
    }
  }
}
```

## トラブルシューティング

### リアルタイム同期が動作しない

1. 環境変数`NEXT_PUBLIC_USE_SUPABASE`が`true`に設定されているか確認
2. SupabaseプロジェクトでRealtimeが有効になっているか確認
3. テーブルでRealtimeが有効化されているか確認
4. ブラウザのコンソールでエラーを確認

### 競合解決が動作しない

1. データに`version`フィールドが含まれているか確認
2. データベーススキーマに`version`カラムが存在するか確認
3. `useCollaborativeEditing`フックを使用しているか確認

### パフォーマンスの問題

1. リアルタイム同期を有効化しているテーブル数を確認
2. 不要なリアルタイム同期を無効化
3. バッチ更新を使用

## 参考資料

- [使用例: SUPABASE_USAGE_EXAMPLES.md](./SUPABASE_USAGE_EXAMPLES.md)
- [セットアップガイド: ../../README_SUPABASE_SETUP.md](../../README_SUPABASE_SETUP.md)
- [設計書: COLLABORATIVE_EDITING_DESIGN.md](./COLLABORATIVE_EDITING_DESIGN.md)

