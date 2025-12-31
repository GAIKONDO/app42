#!/bin/bash

# 開発環境起動スクリプト
# macOS用: ダブルクリックで実行可能

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# カラー出力用の関数
print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# タイトル表示
echo "=========================================="
echo "  Network 開発環境起動"
echo "=========================================="
echo ""

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null; then
    print_error "Node.jsがインストールされていません"
    echo "Node.jsをインストールしてください: https://nodejs.org/"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# npmがインストールされているか確認
if ! command -v npm &> /dev/null; then
    print_error "npmがインストールされていません"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# Rustがインストールされているか確認
if ! command -v cargo &> /dev/null; then
    print_error "Rustがインストールされていません"
    echo "Rustをインストールしてください: https://www.rust-lang.org/tools/install"
    read -p "Enterキーを押して終了..."
    exit 1
fi

# 依存関係がインストールされているか確認
if [ ! -d "node_modules" ]; then
    print_info "依存関係をインストール中..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "依存関係のインストールに失敗しました"
        read -p "Enterキーを押して終了..."
        exit 1
    fi
    print_success "依存関係のインストールが完了しました"
    echo ""
fi

# Supabase設定の確認
print_info "Supabase設定を確認中..."
if [ -f ".env.local" ]; then
    # .env.localファイルが存在する場合は、既存のファイルを保護
    # このスクリプトは.env.localファイルを上書きしません
    
    # バックアップを作成（存在しない場合のみ）
    if [ ! -f ".env.local.backup" ]; then
        cp .env.local .env.local.backup
        print_info ".env.localファイルのバックアップを作成しました（.env.local.backup）"
    fi
    
    # ファイルの内容を確認（表示はしない）
    if grep -q "NEXT_PUBLIC_USE_SUPABASE=true" .env.local 2>/dev/null; then
        if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local 2>/dev/null; then
            print_success "Supabase設定が検出されました"
            echo "  - .env.localファイルが存在し、Supabase設定が含まれています"
            echo "  - 詳細な設定内容は表示しません（セキュリティのため）"
            echo "  - 注意: このスクリプトは.env.localファイルを上書きしません"
        else
            print_error "Supabase設定が不完全です"
            echo "  .env.localファイルに以下を設定してください:"
            echo "  - NEXT_PUBLIC_USE_SUPABASE=true"
            echo "  - NEXT_PUBLIC_SUPABASE_URL"
            echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
            echo ""
            echo "詳細は SETUP_ENV_LOCAL.md を参照してください"
        fi
    else
        print_info "ローカルSQLiteデータベースを使用します"
    fi
    
    # ファイルの変更を検知（バックアップと比較）
    if [ -f ".env.local.backup" ]; then
        if ! cmp -s .env.local .env.local.backup 2>/dev/null; then
            print_info "警告: .env.localファイルが変更されました"
            echo "  - バックアップから復元する場合は、以下を実行してください:"
            echo "    cp .env.local.backup .env.local"
        fi
    fi
else
    print_info ".env.localファイルが見つかりません"
    echo "  Supabaseを使用する場合は、.env.localファイルを作成してください"
    echo "  詳細は SETUP_ENV_LOCAL.md を参照してください"
    echo ""
    print_info "ローカルSQLiteデータベースを使用します"
    echo ""
    print_info "注意: このスクリプトは.env.localファイルを自動生成しません"
    echo "      手動で.env.localファイルを作成してください"
fi
echo ""

# 開発サーバーを起動
print_info "開発サーバーを起動しています..."
print_info "ポート3020でNext.js開発サーバーが起動します"
print_info "Tauriアプリケーションが自動的に起動します"
echo ""
print_info "停止するには、このウィンドウで Ctrl+C を押してください"
echo ""

# Tauri開発サーバーを起動
npm run tauri:dev

# エラーが発生した場合
if [ $? -ne 0 ]; then
    print_error "開発サーバーの起動に失敗しました"
    read -p "Enterキーを押して終了..."
    exit 1
fi

