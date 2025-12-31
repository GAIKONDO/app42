# 共同編集機能の設計検討書

> **📋 ステータス**: 検討中  
> **📅 作成日**: 2025-01-XX  
> **👤 用途**: SQLiteをFirebase/Supabaseに移行し、共同編集機能を実現するための設計検討

## 概要

現在のアプリケーションは、SQLiteをローカルファイルとして使用し、ChromaDBをローカルで起動しています。共同編集を可能にするため、SQLiteをFirebaseまたはSupabaseに移行し、データをクラウド側から取得する設計を検討します。

**重要な前提**:
- ChromaDBは各ユーザーのローカル側で保持（共同編集の対象外）
- SQLiteのみをクラウド化して共同編集を可能にする
- デスクトップアプリ（Tauri）のまま維持

## 現在のアーキテクチャ

### データベース構成

1. **SQLite（ローカル）**
   - 場所: `{app_data_dir}/network-mock-local/app.db`
   - 用途: 構造化データの永続化
   - テーブル: users, organizations, entities, relations, topics, meetingNotes, focusInitiatives など
   - アクセス方法: Tauriコマンド経由（`doc_get`, `doc_set`, `collection_get`など）

2. **ChromaDB（ローカル）**
   - 場所: `{app_data_dir}/network-mock-local/chromadb/`
   - 用途: ベクトル検索とセマンティック検索
   - コレクション: `entities_{organizationId}`, `relations_{organizationId}`, `topics_{organizationId}`
   - アクセス方法: HTTP API（localhost:8000/8001）

### データフロー

```
フロントエンド（React/Next.js）
    ↓
Tauriコマンド（invoke）
    ↓
Rust API（src-tauri/src/database/）
    ↓
SQLite（ローカルファイル）
    ↓
ChromaDB同期（バックグラウンド）
    ↓
ChromaDB（ローカルサーバー）
```

## 移行後のアーキテクチャ（検討案）

### オプション1: Firebase移行

#### 構成

```
フロントエンド（React/Next.js）
    ↓
Tauriコマンド（invoke）
    ↓
Rust API（src-tauri/src/database/）
    ↓
Firebase SDK（Rust）または REST API
    ↓
Firestore（クラウド）
    ↓
ChromaDB同期（バックグラウンド、ローカル）
    ↓
ChromaDB（ローカルサーバー）
```

#### 利点

1. **リアルタイム同期**
   - Firestoreのリアルタイムリスナー機能
   - 複数ユーザー間での即座の更新反映

2. **認証機能**
   - Firebase Authenticationとの統合が容易
   - 既存のユーザー管理と統合可能

3. **オフライン対応**
   - Firestoreのオフラインキャッシュ機能
   - ネットワーク切断時も動作可能

4. **スケーラビリティ**
   - 自動スケーリング
   - サーバー管理不要

#### 課題

1. **Rust SDKの制約**
   - Firebase公式のRust SDKが限定的
   - REST API経由での実装が必要になる可能性

2. **コスト**
   - 読み取り/書き込み回数に応じた課金
   - 大量のデータ操作でコストが増加

3. **クエリの制約**
   - Firestoreのクエリ制限（複合インデックスが必要）
   - SQLiteの柔軟なJOINクエリが使えない

4. **データ移行**
   - 既存のSQLiteデータをFirestore形式に変換
   - 外部キー制約の再設計が必要

### オプション2: Supabase移行

#### 構成

```
フロントエンド（React/Next.js）
    ↓
Tauriコマンド（invoke）
    ↓
Rust API（src-tauri/src/database/）
    ↓
Supabase REST API または PostgREST
    ↓
PostgreSQL（クラウド）
    ↓
ChromaDB同期（バックグラウンド、ローカル）
    ↓
ChromaDB（ローカルサーバー）
```

#### 利点

1. **SQL互換性**
   - PostgreSQLベースのため、SQLiteと類似のクエリが可能
   - JOIN、トランザクション、外部キー制約が使用可能

2. **リアルタイム機能**
   - Supabase Realtime（PostgreSQLの変更をリアルタイムで通知）
   - WebSocket経由での更新通知

3. **認証機能**
   - Supabase Authとの統合
   - Row Level Security（RLS）による細かいアクセス制御

4. **REST API**
   - PostgRESTによる自動REST API生成
   - RustからHTTPリクエストで簡単にアクセス可能

5. **コスト効率**
   - 無料プランが充実
   - 従量課金が明確

#### 課題

1. **データ移行**
   - SQLiteからPostgreSQLへの移行
   - データ型の変換が必要な場合がある

2. **リアルタイム同期の実装**
   - WebSocket接続の管理
   - 競合解決の実装

3. **オフライン対応**
   - クライアント側でのキャッシュ実装が必要
   - 同期ロジックの実装が複雑

## 推奨アプローチ: Supabase

### 理由

1. **SQL互換性**: 既存のSQLiteクエリを最小限の変更で移行可能
2. **REST API**: Rustから簡単にアクセス可能（HTTPクライアントで実装）
3. **リアルタイム機能**: Supabase Realtimeで共同編集を実現
4. **コスト**: 無料プランで十分な機能を提供

## 実装設計

### 1. データアクセス層の抽象化

現在の`localFirebase.ts`を拡張し、データソースを切り替え可能にする：

```typescript
// lib/dataSource.ts
export interface DataSource {
  doc_get(collectionName: string, docId: string): Promise<any>;
  doc_set(collectionName: string, docId: string, data: any): Promise<void>;
  doc_update(collectionName: string, docId: string, data: any): Promise<void>;
  collection_get(collectionName: string, conditions?: any): Promise<any[]>;
  // ... その他のメソッド
}

// データソースの選択
const dataSource: DataSource = 
  process.env.NEXT_PUBLIC_USE_SUPABASE === 'true'
    ? new SupabaseDataSource()
    : new LocalSQLiteDataSource();
```

### 2. Supabaseクライアントの実装

#### Rust側の実装

```rust
// src-tauri/src/database/supabase.rs
use reqwest::Client;
use serde_json::Value;

pub struct SupabaseClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl SupabaseClient {
    pub async fn get_doc(&self, table: &str, id: &str) -> Result<Value, String> {
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, id);
        // HTTP GET リクエスト
    }
    
    pub async fn set_doc(&self, table: &str, id: &str, data: Value) -> Result<(), String> {
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        // HTTP POST/PATCH リクエスト
    }
}
```

#### TypeScript側の実装

```typescript
// lib/supabaseDataSource.ts
import { createClient } from '@supabase/supabase-js';

export class SupabaseDataSource implements DataSource {
  private supabase: SupabaseClient;
  
  async doc_get(collectionName: string, docId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from(collectionName)
      .select('*')
      .eq('id', docId)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // ... その他のメソッド
}
```

### 3. リアルタイム同期の実装

#### Supabase Realtimeの利用

```typescript
// lib/realtimeSync.ts
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeSync {
  private channels: Map<string, RealtimeChannel> = new Map();
  
  subscribe(table: string, callback: (payload: any) => void) {
    const channel = this.supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: table,
      }, callback)
      .subscribe();
    
    this.channels.set(table, channel);
  }
  
  unsubscribe(table: string) {
    const channel = this.channels.get(table);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(table);
    }
  }
}
```

### 4. 競合解決の実装

#### 楽観的ロック（Optimistic Locking）

```typescript
// lib/conflictResolution.ts
export interface Document {
  id: string;
  updatedAt: string;
  version: number; // バージョン番号を追加
  // ... その他のフィールド
}

export async function updateWithConflictResolution(
  table: string,
  id: string,
  updates: Partial<Document>
): Promise<Document> {
  // 1. 現在のドキュメントを取得
  const current = await dataSource.doc_get(table, id);
  
  // 2. バージョンチェック
  if (updates.version && updates.version !== current.version) {
    throw new ConflictError('ドキュメントが他のユーザーによって更新されました');
  }
  
  // 3. 更新（バージョンをインクリメント）
  const updated = {
    ...updates,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
  
  return await dataSource.doc_update(table, id, updated);
}
```

#### 最後の書き込みが優先（Last Write Wins）

```typescript
// シンプルな実装（タイムスタンプベース）
export async function updateWithLWW(
  table: string,
  id: string,
  updates: Partial<Document>
): Promise<Document> {
  const current = await dataSource.doc_get(table, id);
  
  // タイムスタンプを比較
  if (updates.updatedAt && current.updatedAt > updates.updatedAt) {
    // サーバーの方が新しい場合は、サーバーのデータを優先
    return current;
  }
  
  return await dataSource.doc_update(table, id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}
```

### 5. オフライン対応

#### ローカルキャッシュの実装

```typescript
// lib/offlineCache.ts
export class OfflineCache {
  private cache: Map<string, any> = new Map();
  private pendingWrites: Array<{ table: string; id: string; data: any }> = [];
  
  async get(table: string, id: string): Promise<any> {
    // 1. キャッシュから取得を試みる
    const cacheKey = `${table}:${id}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // 2. ネットワークから取得（オフライン時はエラー）
    try {
      const data = await dataSource.doc_get(table, id);
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      if (this.isOffline()) {
        throw new OfflineError('オフライン中です。キャッシュされたデータのみ利用可能です。');
      }
      throw error;
    }
  }
  
  async set(table: string, id: string, data: any): Promise<void> {
    // 1. キャッシュを更新
    const cacheKey = `${table}:${id}`;
    this.cache.set(cacheKey, data);
    
    // 2. ネットワークに書き込み（オフライン時はキューに追加）
    try {
      await dataSource.doc_set(table, id, data);
    } catch (error) {
      if (this.isOffline()) {
        this.pendingWrites.push({ table, id, data });
        throw new OfflineError('オフライン中です。接続回復後に同期されます。');
      }
      throw error;
    }
  }
  
  async syncPendingWrites(): Promise<void> {
    // 接続回復時に保留中の書き込みを実行
    for (const write of this.pendingWrites) {
      try {
        await dataSource.doc_set(write.table, write.id, write.data);
      } catch (error) {
        console.error('同期エラー:', error);
      }
    }
    this.pendingWrites = [];
  }
}
```

### 6. ChromaDB同期の維持

ChromaDBはローカルに保持するため、以下のフローを維持：

```
1. Supabaseにデータを保存
2. バックグラウンドでChromaDBに埋め込みベクトルを生成・保存
3. 同期状態をSupabaseに記録（chromaSynced, chromaSyncError）
```

**注意**: ChromaDBの埋め込みベクトルは各ユーザーのローカルに保存されるため、共同編集の対象外です。各ユーザーが自分のChromaDBに埋め込みベクトルを生成します。

## データ移行計画

### フェーズ1: 準備

1. **Supabaseプロジェクトの作成**
   - プロジェクト作成
   - APIキーの取得
   - データベーススキーマの設計

2. **スキーマの設計**
   - SQLiteのテーブル構造をPostgreSQLに変換
   - 外部キー制約の確認
   - インデックスの設計

### フェーズ2: 実装

1. **データアクセス層の抽象化**
   - `DataSource`インターフェースの定義
   - `SupabaseDataSource`の実装
   - `LocalSQLiteDataSource`の実装（既存コードのラップ）

2. **Supabaseクライアントの実装**
   - Rust側のHTTPクライアント実装
   - TypeScript側のSupabase SDK統合

3. **リアルタイム同期の実装**
   - Supabase Realtimeの統合
   - 変更通知の処理

4. **競合解決の実装**
   - 楽観的ロックの実装
   - エラーハンドリング

### フェーズ3: データ移行

1. **既存データのエクスポート**
   - SQLiteからJSON形式でエクスポート
   - データの検証

2. **Supabaseへのインポート**
   - バッチインポート
   - データ整合性の確認

3. **段階的移行**
   - 一部のテーブルから移行開始
   - 動作確認
   - 全テーブルの移行

### フェーズ4: テスト

1. **単体テスト**
   - データアクセス層のテスト
   - 競合解決のテスト

2. **統合テスト**
   - 複数ユーザーでの共同編集テスト
   - オフライン/オンライン切り替えテスト

3. **パフォーマンステスト**
   - 大量データでの動作確認
   - リアルタイム同期の遅延測定

## 課題と対策

### 課題1: パフォーマンス

**問題**: クラウドへのアクセスはローカルSQLiteより遅い可能性がある

**対策**:
- ローカルキャッシュの実装
- バッチ処理の最適化
- インデックスの適切な設計

### 課題2: オフライン対応

**問題**: ネットワーク切断時にアプリが動作しない

**対策**:
- オフラインキャッシュの実装
- 保留中の書き込みをキューに保存
- 接続回復時の自動同期

### 課題3: 競合解決

**問題**: 複数ユーザーが同時に同じデータを編集した場合の競合

**対策**:
- 楽観的ロックの実装
- バージョン管理
- ユーザーへの競合通知

### 課題4: コスト

**問題**: クラウドサービスの利用コスト

**対策**:
- 無料プランの活用
- 読み取り/書き込み回数の最適化
- キャッシュによるAPI呼び出し削減

### 課題5: データ移行

**問題**: 既存のSQLiteデータをSupabaseに移行する作業

**対策**:
- 段階的な移行計画
- データ検証ツールの作成
- ロールバック計画の策定

## 実装の優先順位

### 高優先度

1. **データアクセス層の抽象化**
   - 既存コードへの影響を最小限に
   - 段階的な移行を可能にする

2. **Supabaseクライアントの実装**
   - 基本的なCRUD操作の実装
   - エラーハンドリング

### 中優先度

3. **リアルタイム同期の実装**
   - 共同編集の核心機能
   - ユーザー体験の向上

4. **競合解決の実装**
   - データ整合性の保証
   - ユーザーへの通知

### 低優先度

5. **オフライン対応の強化**
   - 基本的なオフライン対応は必須
   - 高度な機能は後回しでも可

6. **パフォーマンス最適化**
   - 基本的な動作確認後
   - 必要に応じて最適化

## 次のステップ

1. **Supabaseプロジェクトの作成**
   - アカウント作成
   - プロジェクト作成
   - APIキーの取得

2. **プロトタイプの作成**
   - 1つのテーブル（例: `organizations`）で実装
   - 基本的なCRUD操作の確認
   - リアルタイム同期の動作確認

3. **設計の詳細化**
   - スキーマ設計の詳細化
   - API設計の詳細化
   - エラーハンドリングの設計

4. **実装計画の策定**
   - タスクの分解
   - 実装順序の決定
   - テスト計画の策定

## 参考資料

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [PostgREST API](https://postgrest.org/)
- [Firebase vs Supabase比較](https://supabase.com/docs/guides/getting-started/comparing-firebase)

