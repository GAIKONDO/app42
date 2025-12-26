/**
 * LFM2-VL-1.6B推論APIエンドポイント
 * Pythonスクリプトを呼び出して画像説明を生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

// タイムアウトを10分（600秒）に設定（モデルの読み込みと推論に時間がかかるため）
export const maxDuration = 600;

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const body = await request.json();
    const { image_base64, model_path } = body;

    if (!image_base64) {
      return NextResponse.json(
        { success: false, error: 'image_base64が必要です' },
        { status: 400 }
      );
    }

    // Pythonスクリプトのパス
    const scriptPath = path.join(process.cwd(), 'scripts', 'lfm2-vl-inference.py');
    
    // 一時ファイルを作成してbase64データを書き込む（コマンドライン引数のサイズ制限を回避）
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `image_${randomUUID()}.base64`);
    await writeFile(tempFilePath, image_base64, 'utf8');
    
    console.log('[lfm2-vl-inference] リクエスト受信:', {
      image_base64_length: image_base64?.length,
      model_path,
      scriptPath,
      tempFilePath,
    });

    // Pythonスクリプトを実行（一時ファイルのパスを渡す）
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [
        scriptPath,
        '--image-file', tempFilePath,
        ...(model_path ? ['--model-path', model_path] : []),
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        // 一時ファイルを削除（処理完了後）
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            await unlink(tempFilePath);
            console.log('[lfm2-vl-inference] 一時ファイルを削除しました:', tempFilePath);
          } catch (error: any) {
            console.error('[lfm2-vl-inference] 一時ファイルの削除に失敗:', error);
          }
        }
        
        // stdoutとstderrの両方を確認（エラーはstdoutにJSON形式で出力される可能性がある）
        const output = stdout || stderr;
        
        if (code !== 0) {
          console.error('[lfm2-vl-inference] Pythonスクリプトエラー:', {
            code,
            stderr,
            stdout,
          });
          
          // stdoutにJSON形式のエラーが含まれている場合
          try {
            const errorResult = JSON.parse(stdout);
            if (!errorResult.success) {
              resolve(
                NextResponse.json(
                  { 
                    success: false, 
                    error: errorResult.error || '説明の生成に失敗しました',
                    traceback: errorResult.traceback
                  },
                  { status: 500 }
                )
              );
              return;
            }
          } catch (e) {
            // JSONパースに失敗した場合は、生のエラーメッセージを返す
          }
          
          resolve(
            NextResponse.json(
              { 
                success: false, 
                error: `Pythonスクリプトの実行に失敗しました (終了コード: ${code})`,
                details: stderr || stdout || 'エラーの詳細が取得できませんでした'
              },
              { status: 500 }
            )
          );
          return;
        }

        try {
          const result = JSON.parse(stdout);
          if (result.success) {
            resolve(NextResponse.json(result));
          } else {
            console.error('[lfm2-vl-inference] 推論エラー:', result);
            resolve(
              NextResponse.json(
                { 
                  success: false, 
                  error: result.error || '説明の生成に失敗しました',
                  traceback: result.traceback
                },
                { status: 500 }
              )
            );
          }
        } catch (error: any) {
          console.error('[lfm2-vl-inference] パースエラー:', {
            error: error.message,
            stdout,
            stderr,
          });
          resolve(
            NextResponse.json(
              { 
                success: false, 
                error: `結果のパースに失敗しました: ${error.message}`,
                details: `stdout: ${stdout.substring(0, 500)}, stderr: ${stderr.substring(0, 500)}`
              },
              { status: 500 }
            )
          );
        }
      });

      pythonProcess.on('error', async (error) => {
        // エラー時も一時ファイルを削除
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            await unlink(tempFilePath);
          } catch (e) {
            // 無視
          }
        }
        resolve(
          NextResponse.json(
            { success: false, error: `Pythonスクリプトの実行エラー: ${error.message}` },
            { status: 500 }
          )
        );
      });
    });
  } catch (error: any) {
    // エラー時も一時ファイルを削除
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        await unlink(tempFilePath);
      } catch (e) {
        // 無視
      }
    }
    return NextResponse.json(
      { success: false, error: error.message || '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

