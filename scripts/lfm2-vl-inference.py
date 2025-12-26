#!/usr/bin/env python3
"""
LFM2-VL-1.6Bモデルを直接使用して画像説明を生成するスクリプト
Ollama経由ではなく、Hugging Face Transformersを直接使用
"""

import sys
import json
import base64
import argparse
from pathlib import Path

def generate_image_description(image_base64: str = None, image_file: str = None, model_path: str = None) -> str:
    """
    画像のbase64エンコードデータから説明を生成
    
    Args:
        image_base64: base64エンコードされた画像データ（オプション）
        image_file: base64データが含まれるファイルのパス（オプション）
        model_path: モデルのパス（オプション、デフォルトはHugging Faceから自動ダウンロード）
    
    Returns:
        生成された説明文
    """
    try:
        from transformers import AutoProcessor, AutoModel
        from PIL import Image
        import io
        
        # モデルパスを決定
        # Ollama形式のモデル名（例: lfm2-vl-1.6b:latest）をHugging Face形式に変換
        if model_path:
            # Ollama形式のモデル名を検出して変換
            if ':' in model_path or model_path.startswith('lfm2') or model_path.startswith('LFM2'):
                # Ollama形式のモデル名をHugging Face形式に変換
                if 'lfm2' in model_path.lower() or 'lfm' in model_path.lower():
                    model_name = "LiquidAI/LFM2-VL-1.6B"
                else:
                    # その他のモデル名の場合は、デフォルトを使用
                    model_name = "LiquidAI/LFM2-VL-1.6B"
            else:
                # 既にHugging Face形式の場合はそのまま使用
                model_name = model_path
        else:
            model_name = "LiquidAI/LFM2-VL-1.6B"
        
        print(f"[lfm2-vl-inference] モデルを読み込み中: {model_name}", file=sys.stderr)
        
        # プロセッサとモデルを読み込み
        # trust_remote_code=Trueでカスタムコードを読み込む
        processor = AutoProcessor.from_pretrained(model_name, trust_remote_code=True)
        # AutoModelを使用してモデルタイプを自動検出（カスタムコードが自動的に読み込まれる）
        model = AutoModel.from_pretrained(model_name, trust_remote_code=True)
        
        print("[lfm2-vl-inference] モデルの読み込み完了", file=sys.stderr)
        
        # base64データを取得（ファイルから読み込むか、直接渡されたか）
        if image_file:
            with open(image_file, 'r', encoding='utf-8') as f:
                image_base64 = f.read()
        
        if not image_base64:
            raise ValueError("image_base64またはimage_fileのいずれかが必要です")
        
        # base64データをデコードして画像に変換
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # 画像をRGB形式に変換（RGBAやPモードなどに対応）
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # プロンプト（LFM2-VLモデルは画像プレースホルダーが必要）
        # テキスト内に画像のプレースホルダーを含める必要がある
        prompt = "<image>\nこの画像の内容を簡潔に説明してください。説明はRAG検索で使われるため、重要なキーワードを含めてください。日本語で100文字以内で説明してください。"
        
        # 画像とプロンプトを処理
        # LFM2-VLモデルは画像をリスト形式で受け取る必要がある
        # テキスト内の画像プレースホルダー数と画像数が一致する必要がある
        inputs = processor(images=[image], text=prompt, return_tensors="pt")
        
        # 推論を実行
        print("[lfm2-vl-inference] 推論を実行中...", file=sys.stderr)
        
        # モデルがgenerateメソッドを持っているか確認
        if hasattr(model, 'generate'):
            generated_ids = model.generate(**inputs, max_new_tokens=200, temperature=0.7)
            # 結果をデコード
            generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        else:
            # generateメソッドがない場合は、forwardを使用
            outputs = model(**inputs)
            # 出力からテキストを取得（モデルの構造に依存）
            if hasattr(outputs, 'logits'):
                # logitsからトークンを取得
                generated_ids = outputs.logits.argmax(dim=-1)
                generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            elif hasattr(outputs, 'text'):
                generated_text = outputs.text
            else:
                # モデルリポジトリのカスタムメソッドを使用
                # LFM2-VLモデルは通常、forwardメソッドで直接テキストを返す
                raise ValueError("モデルの出力形式が認識できませんでした。モデルの構造を確認してください。")
        
        print(f"[lfm2-vl-inference] 推論完了: {generated_text[:100]}...", file=sys.stderr)
        
        return generated_text.strip()
        
    except ImportError as e:
        error_msg = f"必要なライブラリがインストールされていません: {e}\n"
        error_msg += "以下のコマンドでインストールしてください:\n"
        error_msg += "pip install transformers pillow torch"
        print(error_msg, file=sys.stderr)
        raise
    except Exception as e:
        error_msg = f"エラーが発生しました: {e}"
        print(error_msg, file=sys.stderr)
        raise

def main():
    parser = argparse.ArgumentParser(description='LFM2-VL-1.6Bで画像説明を生成')
    parser.add_argument('--image-base64', type=str, default=None, help='base64エンコードされた画像データ')
    parser.add_argument('--image-file', type=str, default=None, help='base64データが含まれるファイルのパス')
    parser.add_argument('--model-path', type=str, default=None, help='モデルのパス（オプション）')
    
    args = parser.parse_args()
    
    if not args.image_base64 and not args.image_file:
        result = {
            "success": False,
            "error": "--image-base64または--image-fileのいずれかが必要です"
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    try:
        description = generate_image_description(
            image_base64=args.image_base64,
            image_file=args.image_file,
            model_path=args.model_path
        )
        
        # JSON形式で出力
        result = {
            "success": True,
            "description": description
        }
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        result = {
            "success": False,
            "error": str(e),
            "traceback": error_trace
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()

