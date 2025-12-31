#!/bin/bash

# SQLiteからSupabaseへのデータ移行スクリプト（シェルラッパー）

echo "🚀 SQLiteからSupabaseへのデータ移行を開始します..."
echo ""

# 環境変数の確認
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ エラー: Supabase環境変数が設定されていません"
  echo "   .env.localファイルを確認してください"
  exit 1
fi

# 依存関係の確認
if ! command -v npx &> /dev/null; then
  echo "❌ エラー: npxが見つかりません"
  echo "   Node.jsとnpmがインストールされているか確認してください"
  exit 1
fi

# 必要なパッケージのインストール確認
if [ ! -d "node_modules/better-sqlite3" ]; then
  echo "📦 必要な依存関係をインストール中..."
  npm install --save-dev better-sqlite3 tsx @types/better-sqlite3
fi

# 移行スクリプトの実行
echo "📊 データ移行を実行中..."
echo ""

npx tsx scripts/migrate_sqlite_to_supabase.ts

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo ""
  echo "✅ データ移行が完了しました！"
else
  echo ""
  echo "❌ データ移行中にエラーが発生しました"
  exit $exit_code
fi

