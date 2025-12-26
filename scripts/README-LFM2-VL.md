# LFM2-VL-1.6B モデルダウンロード & Ollama設定

このスクリプトは、Hugging FaceのLiquidAI/LFM2-VL-1.6B-GGUFモデルをダウンロードして、Ollamaで使用できるようにします。

## 前提条件

1. **Ollama** がインストールされていること
   - インストール方法: https://ollama.ai/download
   - インストール確認: `ollama --version`

2. **Python** と **pip** がインストールされていること
   - インストール確認: `python3 --version` と `pip3 --version`

3. **huggingface-cli** がインストールされていること（スクリプトが自動インストールを試みます）
   - 手動インストール: `pip install huggingface_hub[cli]`

## 使用方法

### 基本的な使用方法

```bash
cd scripts
./download-lfm2-vl-ollama.sh
```

### 実行手順

1. スクリプトを実行すると、以下の処理が自動的に行われます：
   - 必要なツール（Ollama、huggingface-cli）の確認
   - Hugging Faceからモデルのダウンロード
   - Ollama用のModelfileの作成
   - Ollamaへのモデルのインポート

2. ダウンロード先: `./models/lfm2-vl-1.6b/`

3. Ollamaモデル名: `lfm2-vl-1.6b`

## モデルの使用

### コマンドラインから使用

```bash
ollama run lfm2-vl-1.6b
```

### API経由で使用

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "lfm2-vl-1.6b",
  "prompt": "Hello, how are you?",
  "stream": false
}'
```

### チャットAPI経由で使用

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "lfm2-vl-1.6b",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ]
}'
```

## トラブルシューティング

### モデルが見つからない場合

1. Hugging Faceのモデルページを確認:
   https://huggingface.co/LiquidAI/LFM2-VL-1.6B-GGUF

2. 手動でダウンロード:
   ```bash
   huggingface-cli download LiquidAI/LFM2-VL-1.6B-GGUF --local-dir ./models/lfm2-vl-1.6b
   ```

### Ollamaへのインポートが失敗する場合

1. Ollamaが起動していることを確認:
   ```bash
   ollama list
   ```

2. モデルファイルのパスを確認:
   ```bash
   ls -lh ./models/lfm2-vl-1.6b/*.gguf
   ```

3. Modelfileを確認:
   ```bash
   cat ./models/lfm2-vl-1.6b/Modelfile
   ```

4. 手動でインポート:
   ```bash
   ollama create lfm2-vl-1.6b -f ./models/lfm2-vl-1.6b/Modelfile
   ```

### 視覚言語モデル（VL）のサポートについて

LFM2-VL-1.6Bは視覚言語モデルですが、Ollamaの標準的なチャットAPIでは画像入力がサポートされていない場合があります。

画像入力が必要な場合は、以下の方法を検討してください：

1. **Ollamaの最新バージョンを使用**（マルチモーダル対応が改善されている可能性があります）

2. **直接llama.cppを使用**:
   ```bash
   # llama.cppをインストール
   git clone https://github.com/ggerganov/llama.cpp.git
   cd llama.cpp
   make
   
   # モデルを実行
   ./llama-cli -m /path/to/model.gguf --image /path/to/image.jpg -p "Describe this image"
   ```

3. **Hugging Face Transformersを使用**:
   ```python
   from transformers import AutoProcessor, AutoModelForVision2Seq
   
   processor = AutoProcessor.from_pretrained("LiquidAI/LFM2-VL-1.6B")
   model = AutoModelForVision2Seq.from_pretrained("LiquidAI/LFM2-VL-1.6B")
   ```

## 参考リンク

- [LFM2-VL-1.6B-GGUF on Hugging Face](https://huggingface.co/LiquidAI/LFM2-VL-1.6B-GGUF)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/README.md)
- [Liquid AI](https://liquid.ai/)

