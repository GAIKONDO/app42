#!/bin/bash

# LFM2-VL-1.6BモデルをHugging FaceからダウンロードしてOllamaで使えるようにするスクリプト

set -e

MODEL_NAME="LiquidAI/LFM2-VL-1.6B-GGUF"
OLLAMA_MODEL_NAME="lfm2-vl-1.6b"
DOWNLOAD_DIR="./models/lfm2-vl-1.6b"

echo "=========================================="
echo "LFM2-VL-1.6B モデルダウンロード & Ollama設定"
echo "=========================================="
echo ""

# 必要なツールの確認
echo "📋 必要なツールを確認中..."

if ! command -v ollama &> /dev/null; then
    echo "❌ エラー: Ollamaがインストールされていません"
    echo "   インストール方法: https://ollama.ai/download"
    exit 1
fi
echo "✅ Ollama: インストール済み"

if ! command -v huggingface-cli &> /dev/null; then
    echo "⚠️  警告: huggingface-cliがインストールされていません"
    echo "   インストール中..."
    pip install -q huggingface_hub[cli]
    if [ $? -ne 0 ]; then
        echo "❌ エラー: huggingface-cliのインストールに失敗しました"
        echo "   手動でインストール: pip install huggingface_hub[cli]"
        exit 1
    fi
fi
echo "✅ huggingface-cli: インストール済み"

# ダウンロードディレクトリの作成
mkdir -p "${DOWNLOAD_DIR}"
DOWNLOAD_DIR_ABS=$(cd "${DOWNLOAD_DIR}" && pwd)
cd "${DOWNLOAD_DIR_ABS}"

echo ""
echo "📥 Hugging Faceからモデルをダウンロード中..."
echo "   モデル: ${MODEL_NAME}"
echo "   保存先: ${DOWNLOAD_DIR}"
echo ""

# Hugging Faceからモデルをダウンロード
# 複数のGGUFファイルがある場合、Q4_0（軽量版）を優先的にダウンロード
echo "🔍 利用可能なモデルファイルを確認中..."
huggingface-cli download "${MODEL_NAME}" --local-dir . --local-dir-use-symlinks False

# ダウンロードされたファイルを確認
echo ""
echo "📂 ダウンロードされたファイル:"
ls -lh *.gguf 2>/dev/null || ls -lh *.bin 2>/dev/null || echo "   (ファイルが見つかりません)"

# GGUFファイルを探す
GGUF_FILE=$(find . -name "*.gguf" -type f | head -n 1)

if [ -z "$GGUF_FILE" ]; then
    echo ""
    echo "⚠️  GGUFファイルが見つかりませんでした"
    echo "   利用可能なファイルを確認してください"
    echo ""
    echo "   手動でダウンロードする場合:"
    echo "   huggingface-cli download ${MODEL_NAME} --local-dir ."
    echo ""
    echo "   または、Hugging Faceのウェブサイトから直接ダウンロード:"
    echo "   https://huggingface.co/${MODEL_NAME}"
    exit 1
fi

echo ""
echo "✅ モデルファイルが見つかりました: ${GGUF_FILE}"

# 絶対パスに変換
ABSOLUTE_GGUF_FILE="${DOWNLOAD_DIR_ABS}/$(basename "${GGUF_FILE}")"
OLLAMA_MODELFILE="${DOWNLOAD_DIR_ABS}/Modelfile"

# Modelfileの作成
echo ""
echo "📝 Ollama用のModelfileを作成中..."

cat > "${OLLAMA_MODELFILE}" <<EOF
FROM ${ABSOLUTE_GGUF_FILE}

# LFM2-VL-1.6B モデル設定
# Liquid AIが開発した新世代のビジョン言語モデル
# エッジAIやオンデバイスでの展開に最適化

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096

# システムプロンプト（オプション）
SYSTEM """
You are LFM2-VL-1.6B, a vision-language model developed by Liquid AI.
You can understand and generate text based on images and text inputs.
"""

TEMPLATE """{{ .System }}

{{ .Prompt }}
"""
EOF

echo "✅ Modelfileを作成しました: ${OLLAMA_MODELFILE}"

# Ollamaにモデルをインポート
echo ""
echo "🚀 Ollamaにモデルをインポート中..."
echo "   モデル名: ${OLLAMA_MODEL_NAME}"

# Modelfileの絶対パスに変換
ABSOLUTE_MODELFILE=$(cd "$(dirname "${OLLAMA_MODELFILE}")" && pwd)/$(basename "${OLLAMA_MODELFILE}")

# 既存のモデルがある場合は削除
if ollama list | grep -q "${OLLAMA_MODEL_NAME}"; then
    echo "⚠️  既存のモデルが見つかりました。削除中..."
    ollama rm "${OLLAMA_MODEL_NAME}" || true
fi

# モデルを作成
ollama create "${OLLAMA_MODEL_NAME}" -f "${ABSOLUTE_MODELFILE}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ モデルのインポートが完了しました！"
    echo ""
    echo "📝 使用方法:"
    echo "   ollama run ${OLLAMA_MODEL_NAME}"
    echo ""
    echo "   または、API経由で使用:"
    echo "   curl http://localhost:11434/api/generate -d '{\"model\": \"${OLLAMA_MODEL_NAME}\", \"prompt\": \"Hello\"}'"
    echo ""
else
    echo ""
    echo "❌ モデルのインポートに失敗しました"
    echo ""
    echo "   手動でインポートする場合:"
    echo "   ollama create ${OLLAMA_MODEL_NAME} -f ${ABSOLUTE_MODELFILE}"
    exit 1
fi

echo "=========================================="
echo "完了！"
echo "=========================================="

