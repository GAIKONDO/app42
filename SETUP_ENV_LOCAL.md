# .env.localファイルの作成手順

## 問題

`.env.local`ファイルが存在しないため、環境変数が読み込まれていません。

## 解決方法

プロジェクトルート（`package.json`と同じディレクトリ）に`.env.local`ファイルを作成してください。

### 方法1: ターミナルから作成

```bash
cd /Users/gaikondo/Desktop/test-app/app42_ネットワークモック_Supabase

cat > .env.local << 'EOF'
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWV2Y3p3bWlybGlwY2JwdHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE2MDUsImV4cCI6MjA4MjY5NzYwNX0.Su-XuXMykMChwW4W6b6BtDGruJUhfh70KPqn91MLKQM
EOF
```

### 方法2: エディタから作成

1. プロジェクトルートに`.env.local`という名前のファイルを作成
2. 以下の内容を貼り付け：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWV2Y3p3bWlybGlwY2JwdHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE2MDUsImV4cCI6MjA4MjY5NzYwNX0.Su-XuXMykMChwW4W6b6BtDGruJUhfh70KPqn91MLKQM
```

## ファイル作成後の確認

```bash
# ファイルが正しく作成されたか確認
cat .env.local
```

## アプリケーションの再起動

`.env.local`ファイルを作成したら、**必ずアプリケーションを再起動**してください：

```bash
# 現在のアプリケーションを停止（Ctrl+C）
# 再度起動
npm run tauri:dev
```

## 注意事項

- `.env.local`ファイルは`.gitignore`に含まれているため、Gitにコミットされません
- 環境変数を変更した場合は、必ずアプリケーションを再起動してください
- Next.jsでは、環境変数はビルド時に読み込まれるため、再起動が必要です

