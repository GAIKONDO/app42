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

## 現在の状況

提供されたキー: `sb_secret_tF4P7sviHo3TG6t1Ai3bXQ_FP2iKZIt`

これは`service_role secret key`です。クライアントサイドでは使用できません。

**次のステップ**: Supabaseダッシュボードで`anon public key`を取得してください。

