# 環境変数設定ガイド

ChromaDBとSupabase（pgvector）を切り替えるための環境変数設定方法です。

## 環境変数の設定

`.env.local`ファイルに以下を設定します：

### ChromaDBを使用する場合（デフォルト）

```env
# 何も設定しない、または以下を設定
NEXT_PUBLIC_USE_SUPABASE=false
# または
NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=false
```

### Supabaseを使用する場合

```env
# 既存のSupabase設定（データベース用）
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWV2Y3p3bWlybGlwY2JwdHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE2MDUsImV4cCI6MjA4MjY5NzYwNX0.Su-XuXMykMChwW4W6b6BtDGruJUhfh70KPqn91MLKQM

# ベクトル検索にSupabaseを使用する場合（明示的に指定）
NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true
```

## 優先順位

1. **`NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true`** → Supabaseを使用
2. **`NEXT_PUBLIC_USE_SUPABASE=true`** かつ Supabase設定が完了 → Supabaseを使用
3. **それ以外** → ChromaDBを使用（デフォルト）

## 設定の確認

アプリケーション内で設定を確認する方法：

```typescript
import { getVectorSearchConfig } from './lib/vectorSearchConfig';

const config = getVectorSearchConfig();
console.log('ベクトル検索バックエンド:', config.backend);
console.log('設定:', config.config);
```

## 注意事項

- 環境変数を変更した後は、アプリケーションを再起動してください
- 開発環境と本番環境で異なる設定を使用する場合は、それぞれの環境変数ファイルを用意してください

