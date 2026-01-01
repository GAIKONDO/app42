# Supabase APIキーの取得ガイド

## 重要な注意事項

Supabaseには2種類のAPIキーがあります：

1. **anon public key**（クライアントサイド用）
   - 形式: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - 用途: フロントエンド（Next.js）で使用
   - 公開しても安全（RLSで保護されているため）

2. **service_role secret key**（サーバーサイド用）
   - 形式: `sb_secret_...` または `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - 用途: サーバーサイド（Rustバックエンド）で使用
   - **秘密にしてください**（クライアントサイドでは使用しない）

## 正しいAPIキーの取得方法

### クライアントサイド用（anon public key）の取得

1. Supabaseダッシュボードにアクセス
2. 左側メニューから「Settings」→「API」をクリック
3. 「Project API keys」セクションで以下を確認：
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ← これを使用
   - **service_role secret**: `sb_secret_...` ← これは使用しない（サーバーサイドのみ）

### 環境変数の設定

`.env.local`ファイルに以下を設定：

```env
# クライアントサイド用（anon public key）
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← anon public keyを貼り付け
```

**注意**: `service_role secret key`は`.env.local`には設定しません。Rustバックエンドで使用する場合は、別の環境変数ファイル（`local.env`など）に設定してください。

## 現在の設定

### プロジェクト情報

- **Project URL**: `https://uxuevczwmirlipcbptsx.supabase.co`
- **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWV2Y3p3bWlybGlwY2JwdHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE2MDUsImV4cCI6MjA4MjY5NzYwNX0.Su-XuXMykMChwW4W6b6BtDGruJUhfh70KPqn91MLKQM`

### `.env.local`ファイルの設定例

プロジェクトルートに`.env.local`ファイルを作成（または更新）し、以下を設定：

```env
# Supabase設定（データベース用）
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWV2Y3p3bWlybGlwY2JwdHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE2MDUsImV4cCI6MjA4MjY5NzYwNX0.Su-XuXMykMChwW4W6b6BtDGruJUhfh70KPqn91MLKQM

# ベクトル検索にSupabaseを使用する場合（明示的に指定）
NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true
```

**注意**: 
- `.env.local`ファイルは`.gitignore`に含まれているため、Gitにコミットされません
- 環境変数を変更した後は、アプリケーションを再起動してください

