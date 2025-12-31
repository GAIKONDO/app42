/**
 * ChromaDB統合モジュール
 * ChromaDB Serverを起動・管理し、Rust側から接続する機能を提供
 */

use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, OnceLock};
use tokio::sync::Mutex;
use tokio::process::Command as TokioCommand;
use tokio::time::{sleep, Duration};
use tokio::io::AsyncReadExt;
use chromadb::client::{ChromaAuthMethod, ChromaClient, ChromaClientOptions};
use chromadb::collection::{ChromaCollection, CollectionEntries, QueryOptions, GetOptions};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;

// ChromaDB Serverの管理
pub struct ChromaDBServer {
    process: Option<tokio::process::Child>,
    port: u16,
    data_dir: PathBuf,
    python_path: String,
}

// グローバルなChromaDB Serverインスタンス（安全な実装）
// ChromaDBServerはstd::sync::Mutexを使用（同期処理）
static CHROMADB_SERVER: OnceLock<Arc<std::sync::Mutex<Option<ChromaDBServer>>>> = OnceLock::new();
// ChromaClientはArcで包んで、MutexGuardをdropしてから.awaitできるようにする
static CHROMADB_CLIENT: OnceLock<Arc<Mutex<Option<Arc<ChromaClient>>>>> = OnceLock::new();

impl ChromaDBServer {
    /// ChromaDB Serverを起動
    pub async fn start(data_dir: PathBuf, port: u16) -> Result<Self, String> {
        eprintln!("🚀 ChromaDB Serverの起動を開始します...");
        eprintln!("   データディレクトリ: {}", data_dir.display());
        eprintln!("   ポート: {}", port);

        // Python環境の確認
        let python_path = Self::find_python()?;
        eprintln!("   Pythonパス: {}", python_path);

        // ChromaDBがインストールされているか確認
        Self::check_chromadb_installed(&python_path)?;

        // データディレクトリの作成
        if let Err(e) = std::fs::create_dir_all(&data_dir) {
            return Err(format!("ChromaDBデータディレクトリの作成に失敗しました: {}", e));
        }

        // chromaコマンドを探す（優先順位: chroma > chromadb）
        let (chroma_cmd, use_python_module, module_name) = Self::find_chroma_command()?;
        if use_python_module {
            eprintln!("   ChromaDBコマンド: {} -m {}", chroma_cmd, module_name);
        } else {
            eprintln!("   ChromaDBコマンド: {}", chroma_cmd);
        }

        // ポートが使用されているかチェック
        let port_listening = Self::check_port_listening(port).await;
        let port_in_use = Self::check_port_in_use(port).await;
        
        if port_listening || port_in_use {
            eprintln!("⚠️ ポート{}が既に使用されています。既存のChromaDBサーバーを停止します...", port);
            if port_listening && !port_in_use {
                eprintln!("   ⚠️ ポート{}は開いていますが、ChromaDBサーバーは応答していません", port);
            }
            
            if let Err(e) = Self::kill_process_on_port(port).await {
                eprintln!("   ⚠️ 既存プロセスの停止に失敗しました（続行します）: {}", e);
            } else {
                eprintln!("   ✅ 既存プロセスを停止しました");
            }
            
            // プロセスが完全に終了し、ポートが閉じるまで待機
            eprintln!("   ⏳ ポート{}が使用可能になるまで待機中...", port);
            for i in 0..10 {
                let still_listening = Self::check_port_listening(port).await;
                if !still_listening {
                    eprintln!("   ✅ ポート{}が使用可能になりました", port);
                    break;
                }
                if i == 9 {
                    eprintln!("   ⚠️ ポート{}はまだ使用中ですが、続行します...", port);
                } else if i % 2 == 0 {
                    eprintln!("   ⏳ ポート待機中... ({}秒経過)", i * 500 / 1000);
                }
                sleep(Duration::from_millis(500)).await;
            }
        }

        // ChromaDBサーバーを起動
        let mut command = TokioCommand::new(&chroma_cmd);
        if use_python_module {
            command.arg("-m").arg(&module_name);
        }
        
        // macOSの場合、PATH環境変数を設定（GUIアプリから起動した場合でも動作するように）
        #[cfg(target_os = "macos")]
        {
            let path_env = std::env::var("PATH").unwrap_or_default();
            let common_paths = "/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin";
            let new_path = if path_env.is_empty() {
                common_paths.to_string()
            } else {
                format!("{}:{}", common_paths, path_env)
            };
            command.env("PATH", &new_path);
        }
        
        let mut child = command
            .arg("run")
            .arg("--host")
            .arg("localhost")
            .arg("--port")
            .arg(port.to_string())
            .arg("--path")
            .arg(data_dir.to_string_lossy().as_ref())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| {
                let cmd_str = if use_python_module {
                    format!("{} -m {}", chroma_cmd, module_name)
                } else {
                    chroma_cmd.clone()
                };
                let error_msg = format!("ChromaDBサーバーの起動に失敗しました: {}\nコマンド: {} run --host localhost --port {} --path {}", 
                    e, cmd_str, port, data_dir.display());
                eprintln!("❌ {}", error_msg);
                error_msg
            })?;

        eprintln!("   ChromaDB Serverプロセスを起動しました (PID: {})", child.id().unwrap_or(0));
        
        // stdoutとstderrを読み取るためのタスクを開始（ログとエラーメッセージを取得するため）
        let stdout_arc = Arc::new(Mutex::new(Vec::<u8>::new()));
        let stderr_arc = Arc::new(Mutex::new(Vec::<u8>::new()));
        
        if let Some(mut stdout_reader) = child.stdout.take() {
            let stdout_arc_clone = stdout_arc.clone();
            tokio::spawn(async move {
                let mut buf = vec![0u8; 1024];
                loop {
                    match stdout_reader.read(&mut buf).await {
                        Ok(0) => break, // EOF
                        Ok(n) => {
                            let mut guard = stdout_arc_clone.lock().await;
                            guard.extend_from_slice(&buf[..n]);
                            // ログを出力（デバッグ用）
                            if let Ok(text) = String::from_utf8(buf[..n].to_vec()) {
                                eprintln!("   [ChromaDB stdout] {}", text.trim());
                            }
                        }
                        Err(_) => break,
                    }
                }
            });
        }
        
        if let Some(mut stderr_reader) = child.stderr.take() {
            let stderr_arc_clone = stderr_arc.clone();
            tokio::spawn(async move {
                let mut buf = vec![0u8; 1024];
                loop {
                    match stderr_reader.read(&mut buf).await {
                        Ok(0) => break, // EOF
                        Ok(n) => {
                            let mut guard = stderr_arc_clone.lock().await;
                            guard.extend_from_slice(&buf[..n]);
                            // エラーログを出力（デバッグ用）
                            if let Ok(text) = String::from_utf8(buf[..n].to_vec()) {
                                eprintln!("   [ChromaDB stderr] {}", text.trim());
                            }
                        }
                        Err(_) => break,
                    }
                }
            });
        }

        // サーバーが起動するまで待機（最大10秒）
        eprintln!("   ChromaDB Serverの起動を待機中...");
        for i in 0..20 {
            sleep(Duration::from_millis(500)).await;
            
            // ヘルスチェック
            let health_check = reqwest::Client::new()
                .get(&format!("http://localhost:{}/api/v1/heartbeat", port))
                .timeout(Duration::from_secs(1))
                .send()
                .await;
            
            if health_check.is_ok() {
                eprintln!("✅ ChromaDB Serverが正常に起動しました ({}秒後)", i * 500 / 1000);
                // ChromaDB 1.xでは、chroma.sqlite3は最初のコレクション作成時に自動的に作成される
                // そのため、サーバー起動時には存在しない可能性がある
                // サーバーが完全に初期化されるまで少し待機
                eprintln!("   ChromaDBサーバーの初期化完了を待機中...");
                sleep(Duration::from_secs(2)).await;
                eprintln!("   ChromaDBサーバーの初期化が完了しました");
                return Ok(Self {
                    process: Some(child),
                    port,
                    data_dir,
                    python_path,
                });
            }
            
            if i % 2 == 0 {
                eprintln!("   起動待機中... ({}秒経過)", i * 500 / 1000);
            }
        }

        // 起動に失敗した場合、プロセスを終了してstderrを読み取る
        let _ = child.kill().await;
        let _ = child.wait().await;
        
        // 少し待ってからstderrの内容を取得
        sleep(Duration::from_millis(200)).await;
        
        // stderrの内容を取得
        let stderr_output = {
            use tokio::time::timeout;
            match timeout(Duration::from_millis(300), async {
                let guard = stderr_arc.lock().await;
                String::from_utf8_lossy(&guard).to_string()
            }).await {
                Ok(output) => output,
                Err(_) => String::new(),
            }
        };
        
        let error_msg = if !stderr_output.trim().is_empty() {
            format!("ChromaDB Serverの起動確認に失敗しました（10秒以内に起動しませんでした）\nエラー出力:\n{}", stderr_output)
        } else {
            "ChromaDB Serverの起動確認に失敗しました（10秒以内に起動しませんでした）\n考えられる原因:\n- Python環境が見つからない\n- ChromaDBがインストールされていない（pip3 install chromadb）\n- ポート8001が既に使用されている\n- ChromaDB Serverの起動に時間がかかりすぎている".to_string()
        };
        
        Err(error_msg)
    }

    /// Python環境を検出
    fn find_python() -> Result<String, String> {
        // macOSの場合、GUIアプリから起動した場合でもPATHが正しく設定されるようにする
        #[cfg(target_os = "macos")]
        {
            // PATH環境変数を設定（GUIアプリから起動した場合でも動作するように）
            let path_env = std::env::var("PATH").unwrap_or_default();
            let common_paths = "/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin";
            let new_path = if path_env.is_empty() {
                common_paths.to_string()
            } else {
                format!("{}:{}", common_paths, path_env)
            };
            
            // Python 3.8以上を探す（3.12も許可）
            let candidates = vec!["python3.12", "python3.11", "python3.10", "python3.9", "python3.8", "python3", "python"];
            
            for cmd in &candidates {
                let mut command = Command::new(cmd);
                command.arg("--version");
                command.env("PATH", &new_path);
                
                if let Ok(output) = command.output() {
                    if output.status.success() {
                        let version = String::from_utf8_lossy(&output.stdout);
                        eprintln!("   Python環境を検出: {} ({})", cmd, version.trim());
                        return Ok(cmd.to_string());
                    }
                }
            }
            
            // フルパスで確認（HomebrewのPython + ユーザーのローカルPython環境）
            let home_dir = std::env::var("HOME").unwrap_or_default();
            let mut homebrew_python_paths: Vec<String> = vec![
                "/opt/homebrew/bin/python3.12".to_string(),
                "/opt/homebrew/bin/python3.11".to_string(),
                "/opt/homebrew/bin/python3.10".to_string(),
                "/opt/homebrew/bin/python3".to_string(),
                "/opt/homebrew/opt/python@3.12/bin/python3".to_string(),
                "/opt/homebrew/opt/python@3.11/bin/python3".to_string(),
                "/opt/homebrew/opt/python@3.10/bin/python3".to_string(),
                "/usr/local/bin/python3.12".to_string(),
                "/usr/local/bin/python3.11".to_string(),
                "/usr/local/bin/python3.10".to_string(),
                "/usr/local/bin/python3".to_string(),
                "/usr/bin/python3".to_string(),
            ];
            
            // ユーザーのローカルPython環境も追加（開発環境でよく使われる）
            if !home_dir.is_empty() {
                homebrew_python_paths.extend(vec![
                    format!("{}/Library/Python/3.12/bin/python3", home_dir),
                    format!("{}/Library/Python/3.11/bin/python3", home_dir),
                    format!("{}/Library/Python/3.10/bin/python3", home_dir),
                    format!("{}/Library/Python/3.9/bin/python3", home_dir),
                    format!("{}/Library/Python/3.8/bin/python3", home_dir),
                ]);
            }
            
            for python_path in &homebrew_python_paths {
                let mut command = Command::new(python_path);
                command.arg("--version");
                command.env("PATH", &new_path);
                
                if let Ok(output) = command.output() {
                    if output.status.success() {
                        let version = String::from_utf8_lossy(&output.stdout);
                        eprintln!("   Python環境を検出（フルパス）: {} ({})", python_path, version.trim());
                        return Ok(python_path.to_string());
                    }
                }
            }
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            // Python 3.8以上を探す（3.12も許可）
            let candidates = vec!["python3.12", "python3.11", "python3.10", "python3.9", "python3.8", "python3", "python"];
            
            for cmd in candidates {
                let output = Command::new(cmd)
                    .arg("--version")
                    .output();
                
                if let Ok(output) = output {
                    if output.status.success() {
                        let version = String::from_utf8_lossy(&output.stdout);
                        eprintln!("   Python環境を検出: {} ({})", cmd, version.trim());
                        return Ok(cmd.to_string());
                    }
                }
            }
        }
        
        Err("Python環境が見つかりません。Python 3.8以上が必要です。\n\nインストール方法:\n- macOS: `brew install python@3.12` または `brew install python3`\n- または公式サイトからインストール: https://www.python.org/downloads/\n\nインストール後、アプリケーションを再起動してください。".to_string())
    }

    /// chromaコマンドを探す
    /// 戻り値: (コマンドパス, Pythonモジュールとして実行するかどうか, モジュール名)
    fn find_chroma_command() -> Result<(String, bool, String), String> {
        // chromaコマンドを探す（優先順位: chroma > chromadb）
        let candidates = vec!["chroma", "chromadb"];
        
        #[cfg(target_os = "macos")]
        {
            let path_env = std::env::var("PATH").unwrap_or_default();
            // ユーザーのローカルPython環境も含める（開発環境でよく使われる）
            let home_dir = std::env::var("HOME").unwrap_or_default();
            let user_python_bins = if !home_dir.is_empty() {
                format!("{}/Library/Python/3.12/bin:{}/Library/Python/3.11/bin:{}/Library/Python/3.10/bin:{}/Library/Python/3.9/bin:{}/Library/Python/3.8/bin", 
                    home_dir, home_dir, home_dir, home_dir, home_dir)
            } else {
                String::new()
            };
            let common_paths = if !user_python_bins.is_empty() {
                format!("/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin:{}", user_python_bins)
            } else {
                "/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin".to_string()
            };
            let new_path = if path_env.is_empty() {
                common_paths
            } else {
                format!("{}:{}", common_paths, path_env)
            };
            
            for cmd in &candidates {
                let mut command = Command::new(cmd);
                command.arg("--version");
                command.env("PATH", &new_path);
                
                if let Ok(output) = command.output() {
                    if output.status.success() {
                        eprintln!("   chromaコマンドを検出: {}", cmd);
                        return Ok((cmd.to_string(), false, String::new()));
                    }
                }
            }
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            for cmd in candidates {
                let output = Command::new(cmd)
                    .arg("--version")
                    .output();
                
                if let Ok(output) = output {
                    if output.status.success() {
                        eprintln!("   chromaコマンドを検出: {}", cmd);
                        return Ok((cmd.to_string(), false, String::new()));
                    }
                }
            }
        }
        
        // chromaコマンドが見つからない場合、python -m chromadb を試す（chromadb.cli ではなく）
        let python_path = Self::find_python()?;
        
        #[cfg(target_os = "macos")]
        {
            // macOSの場合、PATH環境変数を設定
            let path_env = std::env::var("PATH").unwrap_or_default();
            // ユーザーのローカルPython環境も含める（開発環境でよく使われる）
            let home_dir = std::env::var("HOME").unwrap_or_default();
            let user_python_bins = if !home_dir.is_empty() {
                format!("{}/Library/Python/3.12/bin:{}/Library/Python/3.11/bin:{}/Library/Python/3.10/bin:{}/Library/Python/3.9/bin:{}/Library/Python/3.8/bin", 
                    home_dir, home_dir, home_dir, home_dir, home_dir)
            } else {
                String::new()
            };
            let common_paths = if !user_python_bins.is_empty() {
                format!("/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin:{}", user_python_bins)
            } else {
                "/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin".to_string()
            };
            let new_path = if path_env.is_empty() {
                common_paths
            } else {
                format!("{}:{}", common_paths, path_env)
            };
            
            // chromadb.cli は新しいバージョンでは使えない可能性があるため、エラーメッセージを改善
            // まず chromadb.cli を試す（古いバージョン）
            let mut command = Command::new(&python_path);
            command.arg("-c");
            command.arg("import chromadb.cli; print('ok')");
            command.env("PATH", &new_path);
            
            if let Ok(output) = command.output() {
                if output.status.success() {
                    // chromadb.cli が使える場合でも、実際に実行できるか確認
                    let mut test_cmd = Command::new(&python_path);
                    test_cmd.arg("-m");
                    test_cmd.arg("chromadb.cli");
                    test_cmd.arg("--help");
                    test_cmd.env("PATH", &new_path);
                    
                    if let Ok(test_output) = test_cmd.output() {
                        if test_output.status.success() {
                            eprintln!("   chromaコマンドが見つかりません。python -m chromadb.cli を使用します");
                            return Ok((python_path, true, "chromadb.cli".to_string()));
                        }
                    }
                }
            }
            
            // chromadb.cli が使えない場合、エラーメッセージを改善
            eprintln!("   ⚠️ chromadb.cli は使用できません（新しいバージョンのChromaDBでは非推奨）");
            eprintln!("   chroma コマンドをインストールしてください: pip3 install chromadb");
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            // まず chromadb.cli を試す（古いバージョン、確実に動作する）
            let output = Command::new(&python_path)
                .arg("-c")
                .arg("import chromadb.cli; print('ok')")
                .output();
            
            if let Ok(output) = output {
                if output.status.success() {
                    eprintln!("   chromaコマンドが見つかりません。python -m chromadb.cli を使用します");
                    return Ok((python_path, true, "chromadb.cli".to_string()));
                }
            }
            
            // chromadb.cli が使えない場合、chromadb モジュールを試す（新しいバージョン）
            // ただし、chromadb モジュールを直接使う場合、run コマンドが使えるか確認する
            let output = Command::new(&python_path)
                .arg("-m")
                .arg("chromadb")
                .arg("--help")
                .output();
            
            if let Ok(output) = output {
                if output.status.success() {
                    // chromadb モジュールが使える場合、run コマンドが使えるか確認
                    let output = Command::new(&python_path)
                        .arg("-m")
                        .arg("chromadb")
                        .arg("run")
                        .arg("--help")
                        .output();
                    
                    if let Ok(output) = output {
                        if output.status.success() {
                            eprintln!("   chromaコマンドが見つかりません。python -m chromadb を使用します");
                            return Ok((python_path, true, "chromadb".to_string()));
                        }
                    }
                }
            }
        }
        
        Err(format!("chromaコマンドが見つかりません。\n\nPythonパス: {}\n\nインストール方法:\n1. ターミナルを開く\n2. 以下のコマンドを実行:\n   {} -m pip install chromadb\n\nまたは:\n   pip3 install chromadb\n\n注意: 新しいバージョンのChromaDBでは、`chromadb.cli` を `-m` で実行できません。\n`chromadb` をインストールすると、`chroma` コマンドが自動的にインストールされます。\n\nインストール後、アプリケーションを再起動してください。", python_path, python_path))
    }

    /// ChromaDBがインストールされているか確認
    fn check_chromadb_installed(python_path: &str) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            // macOSの場合、PATH環境変数を設定
            let path_env = std::env::var("PATH").unwrap_or_default();
            let common_paths = "/opt/homebrew/bin:/opt/homebrew/opt/python@3.12/bin:/opt/homebrew/opt/python@3.11/bin:/opt/homebrew/opt/python@3.10/bin:/usr/local/bin:/usr/bin:/bin";
            let new_path = if path_env.is_empty() {
                common_paths.to_string()
            } else {
                format!("{}:{}", common_paths, path_env)
            };
            
            let mut command = Command::new(python_path);
            command.arg("-c");
            command.arg("import chromadb; print(chromadb.__version__)");
            command.env("PATH", &new_path);
            
            let output = command
                .output()
                .map_err(|e| format!("Pythonの実行に失敗しました: {}\n\nPythonパス: {}\n\n考えられる原因:\n- Pythonが正しくインストールされていない\n- Pythonの実行権限がない", e, python_path))?;
            
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!(
                    "ChromaDBがインストールされていません。\n\nPythonパス: {}\n\nエラー: {}\n\nインストール方法:\n1. ターミナルを開く\n2. 以下のコマンドを実行:\n   {} -m pip install chromadb\n\nまたは:\n   pip3 install chromadb\n\nインストール後、アプリケーションを再起動してください。",
                    python_path,
                    stderr.trim(),
                    python_path
                ));
            }
            
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            eprintln!("   ChromaDBバージョン: {}", version);
            Ok(())
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            let output = Command::new(python_path)
                .arg("-c")
                .arg("import chromadb; print(chromadb.__version__)")
                .output()
                .map_err(|e| format!("Pythonの実行に失敗しました: {}\n\nPythonパス: {}\n\n考えられる原因:\n- Pythonが正しくインストールされていない\n- Pythonの実行権限がない", e, python_path))?;
            
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!(
                    "ChromaDBがインストールされていません。\n\nPythonパス: {}\n\nエラー: {}\n\nインストール方法:\n1. ターミナルを開く\n2. 以下のコマンドを実行:\n   {} -m pip install chromadb\n\nまたは:\n   pip3 install chromadb\n\nインストール後、アプリケーションを再起動してください。",
                    python_path,
                    stderr.trim(),
                    python_path
                ));
            }
            
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            eprintln!("   ChromaDBバージョン: {}", version);
            Ok(())
        }
    }

    /// ポートが使用されているかチェック
    /// ChromaDBサーバーが正常に応答している場合のみtrueを返す
    async fn check_port_in_use(port: u16) -> bool {
        let client = reqwest::Client::new();
        let url = format!("http://localhost:{}/api/v1/heartbeat", port);
        match client.get(&url).timeout(Duration::from_secs(1)).send().await {
            Ok(response) => {
                // ステータスコードが200の場合は、ChromaDBサーバーが正常に動作している
                response.status().is_success()
            },
            Err(_) => {
                // 接続エラーまたはタイムアウトの場合は、ポートが使用されていない（またはサーバーが応答していない）
                false
            }
        }
    }
    
    /// ポートがリッスンしているかチェック（TCP接続のみ）
    /// ChromaDBサーバーが起動しているかどうかに関わらず、ポートが開いているかどうかを確認
    async fn check_port_listening(port: u16) -> bool {
        use tokio::net::TcpStream;
        match tokio::time::timeout(Duration::from_millis(500), TcpStream::connect(format!("127.0.0.1:{}", port))).await {
            Ok(Ok(_)) => true,  // 接続成功 = ポートがリッスンしている
            _ => false,  // 接続失敗またはタイムアウト = ポートがリッスンしていない
        }
    }

    /// 指定されたポートを使用しているプロセスを停止
    async fn kill_process_on_port(port: u16) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            use std::process;
            
            // 自分自身のPIDを取得（自分自身を停止しないようにするため）
            let self_pid = process::id();
            
            // lsofでポートを使用しているプロセスのPIDとコマンド名を取得
            let output = Command::new("lsof")
                .arg("-ti")
                .arg(format!(":{}", port))
                .output()
                .map_err(|e| format!("lsofコマンドの実行に失敗しました: {}", e))?;
            
            if output.stdout.is_empty() {
                return Ok(()); // プロセスが見つからない場合は成功とする
            }
            
            // 改行で分割して、各PIDを個別に処理
            let pid_str = String::from_utf8_lossy(&output.stdout);
            let pids: Vec<&str> = pid_str.trim().split('\n').filter(|s| !s.is_empty()).collect();
            
            if pids.is_empty() {
                return Ok(());
            }
            
            eprintln!("   ポート{}を使用しているプロセスを確認中: PIDs={:?}", port, pids);
            
            // 各PIDを個別に確認してからkill
            let mut killed_count = 0;
            for pid_str in &pids {
                // PIDを数値に変換
                let pid: u32 = match pid_str.parse() {
                    Ok(p) => p,
                    Err(_) => {
                        eprintln!("   ⚠️ 無効なPID: {}", pid_str);
                        continue;
                    }
                };
                
                // 自分自身のプロセスは停止しない
                if pid == self_pid {
                    eprintln!("   ⚠️ 自分自身のプロセス（PID: {}）はスキップします", pid);
                    continue;
                }
                
                // プロセス名とコマンドライン引数を確認（ChromaDBサーバーのみを停止するため）
                let ps_output = Command::new("ps")
                    .arg("-p")
                    .arg(pid_str)
                    .arg("-o")
                    .arg("comm=")
                    .output();
                
                let ps_args_output = Command::new("ps")
                    .arg("-p")
                    .arg(pid_str)
                    .arg("-o")
                    .arg("args=")
                    .output();
                
                // プロセス名とコマンドライン引数を取得（デバッグ情報用）
                let process_name = ps_output.as_ref().ok()
                    .and_then(|o| if o.status.success() {
                        String::from_utf8(o.stdout.clone()).ok()
                    } else {
                        None
                    })
                    .map(|s| s.trim().to_string());
                
                let process_args = ps_args_output.as_ref().ok()
                    .and_then(|o| if o.status.success() {
                        String::from_utf8(o.stdout.clone()).ok()
                    } else {
                        None
                    })
                    .map(|s| s.trim().to_string());
                
                let is_chromadb = if let Ok(ps_output) = &ps_output {
                    if ps_output.status.success() {
                        let comm = String::from_utf8_lossy(&ps_output.stdout).trim().to_string();
                        // コマンドライン引数も確認
                        let has_chromadb_args = if let Ok(ps_args_output) = &ps_args_output {
                            if ps_args_output.status.success() {
                                let args = String::from_utf8_lossy(&ps_args_output.stdout).trim().to_string();
                                args.contains("chroma") || args.contains("chromadb") || args.contains("chromadb.cli")
                            } else {
                                false
                            }
                        } else {
                            false
                        };
                        
                        // chroma、chromadb、python（chromadb.cliを実行している場合）を確認
                        comm.contains("chroma") || comm.contains("python") || has_chromadb_args
                    } else {
                        // psコマンドが失敗した場合、プロセスが既に終了している可能性がある
                        false
                    }
                } else {
                    false
                };
                
                if !is_chromadb {
                    eprintln!("   ⚠️ PID {}はChromaDBサーバーではないため、スキップします（プロセス名を確認してください）", pid);
                    // デバッグ情報を出力
                    if let Some(ref name) = process_name {
                        eprintln!("     プロセス名: {}", name);
                    }
                    if let Some(ref args) = process_args {
                        eprintln!("     コマンドライン: {}", args);
                    }
                    continue;
                }
                
                eprintln!("   ChromaDBサーバープロセス（PID: {}）を停止します", pid);
                
                // プロセスを停止（まずSIGTERMを送信、その後SIGKILL）
                let _ = Command::new("kill")
                    .arg("-TERM")
                    .arg(pid_str)
                    .output();
                
                // 少し待ってから、まだ実行中の場合はSIGKILLを送信
                sleep(Duration::from_millis(500)).await;
                
                let kill_output = Command::new("kill")
                    .arg("-0")
                    .arg(pid_str)
                    .output();
                
                // プロセスがまだ実行中の場合はSIGKILLを送信
                if kill_output.is_ok() && kill_output.unwrap().status.success() {
                    let kill_output = Command::new("kill")
                        .arg("-9")
                        .arg(pid_str)
                        .output()
                        .map_err(|e| format!("killコマンドの実行に失敗しました: {}", e))?;
                    
                    if !kill_output.status.success() {
                        eprintln!("   ⚠️ PID {}の停止に失敗しました: {}", pid_str, String::from_utf8_lossy(&kill_output.stderr));
                    } else {
                        killed_count += 1;
                    }
                } else {
                    killed_count += 1;
                }
            }
            
            if killed_count > 0 {
                eprintln!("   ✅ {}個のChromaDBサーバープロセスを停止しました", killed_count);
                // プロセスが完全に終了するまで少し待機
                sleep(Duration::from_millis(500)).await;
            } else {
                eprintln!("   ℹ️ 停止するChromaDBサーバープロセスはありませんでした");
            }
            
            Ok(())
        }
        
        #[cfg(not(target_os = "macos"))]
        {
            // macOS以外のOSでは、ポートチェックのみ行う
            // 必要に応じて、他のOS用の実装を追加
            Ok(())
        }
    }

    /// ChromaDB Serverを停止
    pub async fn stop(&mut self) -> Result<(), String> {
        eprintln!("🛑 ChromaDB Serverの停止を開始します...");
        
        if let Some(mut process) = self.process.take() {
            if let Err(e) = process.kill().await {
                return Err(format!("ChromaDBサーバーの停止に失敗しました: {}", e));
            }
            
            // プロセスが終了するまで待機
            let _ = process.wait().await;
            eprintln!("✅ ChromaDB Serverを停止しました");
        }
        
        Ok(())
    }

    /// ポート番号を取得
    pub fn port(&self) -> u16 {
        self.port
    }

    /// データディレクトリを取得
    pub fn data_dir(&self) -> &PathBuf {
        &self.data_dir
    }
}

/// デフォルトのChromaDBデータディレクトリを取得
fn get_default_chromadb_data_dir() -> Result<PathBuf, String> {
    // ユーザーのホームディレクトリから取得を試みる
    if let Some(home_dir) = dirs::home_dir() {
        let db_dir_name = if cfg!(debug_assertions) {
            "network-mock-local-dev"
        } else {
            "network-mock-local"
        };
        #[cfg(target_os = "macos")]
        {
            Ok(home_dir.join("Library/Application Support").join(db_dir_name).join("chromadb"))
        }
        #[cfg(target_os = "windows")]
        {
            Ok(home_dir.join("AppData/Roaming").join(db_dir_name).join("chromadb"))
        }
        #[cfg(target_os = "linux")]
        {
            Ok(home_dir.join(".local/share").join(db_dir_name).join("chromadb"))
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
        {
            Ok(home_dir.join(".mission-ai").join(db_dir_name).join("chromadb"))
        }
    } else {
        Err("ホームディレクトリを取得できませんでした。アプリケーションを再起動してください。".to_string())
    }
}

/// ChromaDBのデータディレクトリをクリア（破損したデータベースを修復するため）
/// 注意: この関数を呼び出す前に、ChromaDBサーバーを停止しておく必要があります
pub async fn clear_chromadb_data_dir() -> Result<(), String> {
    let data_dir = get_default_chromadb_data_dir()?;
    
    eprintln!("🗑️ ChromaDBのデータディレクトリをクリアします: {}", data_dir.display());
    
    // ディレクトリが存在する場合、削除
    if data_dir.exists() {
        // ディレクトリを削除
        if let Err(e) = fs::remove_dir_all(&data_dir) {
            return Err(format!("ChromaDBデータディレクトリの削除に失敗しました: {}", e));
        }
        
        eprintln!("✅ ChromaDBのデータディレクトリをクリアしました");
    } else {
        eprintln!("ℹ️ ChromaDBのデータディレクトリは存在しませんでした");
    }
    
    Ok(())
}

/// ChromaDB Serverを初期化（グローバルに保持）
pub async fn init_chromadb_server(data_dir: PathBuf, port: u16) -> Result<(), String> {
    let server_lock = CHROMADB_SERVER.get_or_init(|| Arc::new(std::sync::Mutex::new(None)));
    
    // MutexGuardをdropしてから.awaitする必要がある
    let should_init = {
        let server_guard = server_lock.lock().unwrap();
        if server_guard.is_some() {
            eprintln!("⚠️ ChromaDB Serverは既に初期化されています");
            return Ok(());
        }
        true
    };
    
    if should_init {
        let server = ChromaDBServer::start(data_dir, port).await?;
        
        // サーバーを保存
        {
            let mut server_guard = server_lock.lock().unwrap();
            *server_guard = Some(server);
        }
        
        // クライアントも初期化
        init_chromadb_client(port).await?;
    }
    
    Ok(())
}

/// ChromaDB Serverを停止
pub async fn stop_chromadb_server() -> Result<(), String> {
    // MutexGuardをスコープ内でドロップしてから.awaitする必要がある
    let server_to_stop = if let Some(server_lock) = CHROMADB_SERVER.get() {
        let mut server_guard = server_lock.lock().unwrap();
        server_guard.take()
    } else {
        None
    };
    
    // MutexGuardをドロップした後、.awaitを呼び出す
    if let Some(mut server) = server_to_stop {
        server.stop().await?;
    }
    
    if let Some(client_lock) = CHROMADB_CLIENT.get() {
        let mut client_guard = client_lock.lock().await;
        *client_guard = None;
    }
    
    Ok(())
}

/// ChromaDBクライアントを初期化
pub async fn init_chromadb_client(port: u16) -> Result<(), String> {
    let client_lock = CHROMADB_CLIENT.get_or_init(|| Arc::new(Mutex::new(None)));
    
    // 既に初期化されているか確認
    {
        let client_guard = client_lock.lock().await;
        if client_guard.is_some() {
            eprintln!("⚠️ ChromaDBクライアントは既に初期化されています");
            return Ok(());
        }
    }

    // ChromaDB 1.xでは、データベースの概念がないが、Rustクライアント（v2.3.0）が
    // 空文字列を[]として解釈してしまうため、明示的なデフォルト値を設定する
    // ChromaDB 2.xでは、データベース名を指定する必要がある
    let base_url = format!("http://localhost:{}", port);
    
    // 空文字列ではなく、明示的なデフォルト値を設定
    // ChromaDB 1.xでは、この値は無視されるが、Rustクライアントのエラーを回避する
    let options = ChromaClientOptions {
        url: Some(base_url),
        database: "default_database".to_string(), // 明示的なデフォルト値を設定
        auth: ChromaAuthMethod::None,
    };
    
    let client = ChromaClient::new(options)
        .await
        .map_err(|e| format!("ChromaDBクライアントの初期化に失敗しました: {}", e))?;
    
    // クライアントを設定
    {
        let mut client_guard = client_lock.lock().await;
        *client_guard = Some(Arc::new(client));
    }
    
    eprintln!("✅ ChromaDBクライアントを初期化しました");
    Ok(())
}

/// ChromaDBクライアントを取得
fn get_chromadb_client() -> Result<Arc<Mutex<Option<Arc<ChromaClient>>>>, String> {
    CHROMADB_CLIENT.get()
        .cloned()
        .ok_or("ChromaDBクライアントが初期化されていません".to_string())
}

/// コレクションを取得または作成（エラーハンドリング付き）
async fn get_or_create_collection_with_error_handling(
    client: Arc<ChromaClient>,
    collection_name: &str,
) -> Result<ChromaCollection, String> {
    // 最初の試行
    match client.get_or_create_collection(collection_name, None).await {
        Ok(collection) => Ok(collection),
        Err(e) => {
            let error_msg = format!("{}", e);
            eprintln!("❌ [get_or_create_collection] エラー: コレクション名='{}', エラー='{}'", collection_name, error_msg);
            // acquire_writeテーブルが見つからないエラーの場合、自動修復を試みる
            if error_msg.contains("acquire_write") || error_msg.contains("no such table") {
                eprintln!("⚠️ ChromaDBの内部データベースエラーを検出しました。自動修復を試みます...");
                
                // ChromaDBサーバーを再起動
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                
                let data_dir = match get_default_chromadb_data_dir() {
                    Ok(dir) => dir,
                    Err(e) => {
                        return Err(format!(
                            "コレクションの取得/作成に失敗しました: {}\nデータディレクトリの取得に失敗: {}",
                            error_msg, e
                        ));
                    }
                };
                
                // サーバーを停止
                eprintln!("🛑 ChromaDB Serverの停止を開始します...");
                if let Err(e) = stop_chromadb_server().await {
                    eprintln!("⚠️ ChromaDBサーバーの停止中にエラーが発生しました: {}", e);
                } else {
                    eprintln!("✅ ChromaDB Serverを停止しました");
                }
                
                // サーバーとクライアントの状態を完全にクリア（stop_chromadb_serverで既にクリアされているが、念のため）
                if let Some(server_lock) = CHROMADB_SERVER.get() {
                    let mut server_guard = server_lock.lock().unwrap();
                    if server_guard.is_some() {
                        eprintln!("⚠️ サーバーの状態が残っているため、クリアします...");
                        *server_guard = None;
                    }
                }
                
                if let Some(client_lock) = CHROMADB_CLIENT.get() {
                    let mut client_guard = client_lock.lock().await;
                    if client_guard.is_some() {
                        eprintln!("⚠️ クライアントの状態が残っているため、クリアします...");
                        *client_guard = None;
                    }
                }
                
                // 少し待機（サーバーが完全に停止するまで）
                tokio::time::sleep(Duration::from_secs(3)).await;
                
                // データディレクトリをクリア（破損したデータベースを修復）
                eprintln!("🗑️ 破損したデータベースを修復するため、データディレクトリをクリアします...");
                if let Err(e) = clear_chromadb_data_dir().await {
                    eprintln!("⚠️ データディレクトリのクリアに失敗しました: {}", e);
                    // クリアに失敗しても続行
                } else {
                    eprintln!("✅ データディレクトリをクリアしました");
                }
                
                // ポートが使用可能になるまで待機（最大10秒）
                eprintln!("⏳ ポート{}が使用可能になるまで待機中...", port);
                let mut port_available = false;
                let mut chromadb_not_responding_count = 0;
                
                for i in 0..20 {
                    // まず、ポートがリッスンしているかチェック
                    let port_listening = ChromaDBServer::check_port_listening(port).await;
                    if !port_listening {
                        // ポートがリッスンしていない = 使用可能
                        port_available = true;
                        eprintln!("✅ ポート{}が使用可能になりました（リッスンしていません）", port);
                        break;
                    }
                    
                    // ポートがリッスンしている場合、ChromaDBサーバーが正常に応答しているかチェック
                    let chromadb_responding = ChromaDBServer::check_port_in_use(port).await;
                    if !chromadb_responding {
                        // ポートは開いているが、ChromaDBサーバーが応答していない
                        chromadb_not_responding_count += 1;
                        eprintln!("   ポート{}は開いていますが、ChromaDBサーバーは応答していません（{}回目）", port, chromadb_not_responding_count);
                        
                        // 3回連続で応答しない場合、プロセスを強制的に停止する
                        if chromadb_not_responding_count >= 3 {
                            eprintln!("⚠️ ポート{}でChromaDBサーバーが応答しません。強制的にプロセスを停止します...", port);
                            if let Err(e) = ChromaDBServer::kill_process_on_port(port).await {
                                eprintln!("⚠️ ポート{}のプロセス停止に失敗しました: {}", port, e);
                            } else {
                                eprintln!("✅ ポート{}のプロセスを停止しました", port);
                            }
                            // プロセス停止後、ポートが閉じるまで待機
                            tokio::time::sleep(Duration::from_secs(3)).await;
                            
                            // 再度ポートが使用可能かチェック
                            let port_listening_after_kill = ChromaDBServer::check_port_listening(port).await;
                            if !port_listening_after_kill {
                                port_available = true;
                                eprintln!("✅ ポート{}が使用可能になりました（プロセス停止後）", port);
                                break;
                            } else {
                                eprintln!("⚠️ ポート{}はまだリッスンしています。追加の待機時間を設けます...", port);
                                tokio::time::sleep(Duration::from_secs(2)).await;
                            }
                        }
                    } else {
                        // ChromaDBサーバーが正常に応答している場合、カウンターをリセット
                        chromadb_not_responding_count = 0;
                    }
                    
                    if i % 2 == 0 {
                        eprintln!("   ポート待機中... ({}秒経過)", i * 500 / 1000);
                    }
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
                
                if !port_available {
                    eprintln!("⚠️ ポート{}が使用可能になりませんでした。最終的にプロセスを停止します...", port);
                    if let Err(e) = ChromaDBServer::kill_process_on_port(port).await {
                        eprintln!("⚠️ ポート{}のプロセス停止に失敗しました: {}", port, e);
                    }
                    // プロセス停止後、ポートが閉じるまで待機
                    tokio::time::sleep(Duration::from_secs(3)).await;
                    
                    // 最終確認
                    let port_listening = ChromaDBServer::check_port_listening(port).await;
                    if !port_listening {
                        eprintln!("✅ ポート{}が使用可能になりました（最終確認）", port);
                    } else {
                        eprintln!("⚠️ ポート{}はまだリッスンしていますが、続行します...", port);
                    }
                }
                
                // 少し待機してから再起動
                tokio::time::sleep(Duration::from_secs(1)).await;
                
                // サーバーを再起動（強制的に再初期化）
                eprintln!("🚀 ChromaDB Serverを再起動します...");
                // init_chromadb_serverは既に初期化されている場合、何もしないため、
                // サーバーの状態をNoneに設定した後、直接ChromaDBServer::startを呼び出す
                let server = match ChromaDBServer::start(data_dir.clone(), port).await {
                    Ok(server) => {
                        eprintln!("✅ ChromaDB Serverの起動に成功しました");
                        server
                    }
                    Err(e) => {
                        let data_dir_str = data_dir.display().to_string();
                        return Err(format!(
                            "コレクションの取得/作成に失敗しました: {}\n\
                            ChromaDBサーバーの再起動にも失敗しました: {}\n\n\
                            ChromaDBの内部データベースが破損している可能性があります。\n\
                            対処法:\n\
                            1. アプリケーションを再起動してください\n\
                            2. それでも解決しない場合、ChromaDBのデータディレクトリをクリアしてください\n\
                            3. データディレクトリの場所: {}",
                            error_msg, e, data_dir_str
                        ));
                    }
                };
                
                // サーバーを保存
                if let Some(server_lock) = CHROMADB_SERVER.get() {
                    let mut server_guard = server_lock.lock().unwrap();
                    *server_guard = Some(server);
                }
                
                // クライアントを再初期化
                eprintln!("🔄 ChromaDBクライアントを再初期化します...");
                match init_chromadb_client(port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBクライアントの再初期化に成功しました");
                        
                        // クライアントを再取得
                        let client_lock = CHROMADB_CLIENT.get()
                            .ok_or("ChromaDBクライアントが初期化されていません")?;
                        let new_client = {
                            let client_guard = client_lock.lock().await;
                            client_guard.as_ref()
                                .ok_or("ChromaDBクライアントが初期化されていません")?
                                .clone()
                        };
                        
                        // 再試行（最大3回まで）
                        let mut retry_count = 0;
                        loop {
                            match new_client.get_or_create_collection(collection_name, None).await {
                                Ok(collection) => {
                                    eprintln!("✅ コレクションの取得/作成に成功しました（再試行後）");
                                    return Ok(collection);
                                }
                                Err(e2) => {
                                    retry_count += 1;
                                    if retry_count >= 3 {
                                        let data_dir_str = data_dir.display().to_string();
                                        return Err(format!(
                                            "コレクションの取得/作成に失敗しました（再試行後も失敗）: {}\n\n\
                                            ChromaDBの内部データベースが破損している可能性があります。\n\
                                            対処法:\n\
                                            1. アプリケーションを再起動してください\n\
                                            2. それでも解決しない場合、ChromaDBのデータディレクトリをクリアしてください\n\
                                            3. データディレクトリの場所: {}",
                                            e2, data_dir_str
                                        ));
                                    }
                                    eprintln!("⚠️ 再試行 {}回目に失敗しました。待機してから再試行します...", retry_count);
                                    tokio::time::sleep(Duration::from_secs(2)).await;
                                }
                            }
                        }
                    }
                    Err(e2) => {
                        let data_dir_str = data_dir.display().to_string();
                        return Err(format!(
                            "コレクションの取得/作成に失敗しました: {}\n\
                            ChromaDBクライアントの再初期化にも失敗しました: {}\n\n\
                            ChromaDBの内部データベースが破損している可能性があります。\n\
                            対処法:\n\
                            1. アプリケーションを再起動してください\n\
                            2. それでも解決しない場合、ChromaDBのデータディレクトリをクリアしてください\n\
                            3. データディレクトリの場所: {}",
                            error_msg, e2, data_dir_str
                        ));
                    }
                }
            } else {
                Err(format!("コレクションの取得/作成に失敗しました: {}", error_msg))
            }
        }
    }
}

/// エンティティ埋め込みを保存
pub async fn save_entity_embedding(
    entity_id: String,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    let client_initialized = {
        if let Some(client_lock) = CHROMADB_CLIENT.get() {
            let client_guard = client_lock.lock().await;
            client_guard.is_some()
        } else {
            false
        }
    };
    
    if !client_initialized {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8001）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                
                // データディレクトリを取得（デフォルトのパスを使用）
                // 注意: これは一時的な解決策です。本来はAppHandleから取得すべきです
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8001）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8001);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を試みる
        if let Err(e) = init_chromadb_client(port).await {
            eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
            return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
        }
        eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        
        // クライアントが確実に初期化されているか確認（最大5秒待機）
        let mut retry_count = 0;
        loop {
            let is_initialized = {
                if let Some(client_lock) = CHROMADB_CLIENT.get() {
                    let client_guard = client_lock.lock().await;
                    client_guard.is_some()
                } else {
                    false
                }
            };
            
            if is_initialized {
                break;
            }
            
            retry_count += 1;
            if retry_count >= 10 {
                eprintln!("⚠️ ChromaDBクライアントがまだ初期化されていません。再度初期化を試みます...");
                if let Err(e) = init_chromadb_client(port).await {
                    eprintln!("❌ ChromaDBクライアントの再初期化に失敗しました: {}", e);
                    return Err(format!("ChromaDBクライアントが初期化されていません。再初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
                eprintln!("✅ ChromaDBクライアントの再初期化に成功しました");
                break;
            }
            
            eprintln!("⏳ ChromaDBクライアントの初期化を待機中... ({}回目)", retry_count);
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }
    
    // クライアントを取得（確実に初期化されているはず）
    let client_lock = match get_chromadb_client() {
        Ok(lock) => lock,
        Err(e) => {
            eprintln!("❌ ChromaDBクライアントの取得に失敗しました: {}", e);
            return Err(format!("ChromaDBクライアントが初期化されていません。アプリケーションを再起動してください。"));
        }
    };
    // organizationIdが空文字列の場合は"entities_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "entities_all".to_string()
    } else {
        format!("entities_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得または作成
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // メタデータにエンティティIDと組織IDを追加
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("entityId".to_string(), Value::String(entity_id.clone()));
    embedding_metadata.insert("organizationId".to_string(), Value::String(organization_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        chroma_metadata.insert(k, v);
    }
    
    // 埋め込みを追加
    let entries = CollectionEntries {
        ids: vec![entity_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("エンティティ埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// エンティティ埋め込みを取得
pub async fn get_entity_embedding(
    entity_id: String,
    organization_id: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8001）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8001）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を確認（サーバー起動時に既に初期化されている可能性がある）
        if CHROMADB_CLIENT.get().is_none() {
            // クライアントの初期化を試みる
            if let Err(e) = init_chromadb_client(port).await {
                eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
                return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
            }
            eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        }
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"entities_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "entities_all".to_string()
    } else {
        format!("entities_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // IDから直接取得
    let get_options = GetOptions {
        ids: vec![entity_id.clone()],
        where_metadata: None,
        where_document: None,
        limit: Some(1),
        offset: None,
        include: Some(vec!["embeddings".to_string(), "metadatas".to_string()]),
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("エンティティ埋め込みの取得に失敗しました: {}", e))?;
    
    // 結果を確認
    if results.ids.is_empty() {
        return Ok(None);
    }
    
    // メタデータと埋め込みを取得
    let mut result_data = HashMap::new();
    
    // 埋め込みを取得
    if let Some(embeddings) = &results.embeddings {
        if !embeddings.is_empty() {
            if let Some(embedding_opt) = embeddings.get(0) {
                if let Some(embedding_vec) = embedding_opt {
                    result_data.insert("combinedEmbedding".to_string(), Value::Array(
                        embedding_vec.iter().map(|&v| Value::Number(serde_json::Number::from_f64(v as f64).unwrap())).collect()
                    ));
                }
            }
        }
    }
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if !metadatas.is_empty() {
            if let Some(metadata_opt) = metadatas.get(0) {
                if let Some(metadata_map) = metadata_opt {
                    for (k, v) in metadata_map {
                        result_data.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }
    
    if result_data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result_data))
    }
}

/// ChromaDBのクエリレスポンス構造体（nullを適切に処理）
#[derive(Debug, Deserialize)]
struct ChromaQueryResponse {
    #[serde(default)]
    ids: Vec<Vec<String>>,
    #[serde(default)]
    distances: Option<Vec<Vec<f32>>>,
    #[serde(default)]
    documents: Option<Vec<Vec<Option<String>>>>,
    #[serde(default)]
    metadatas: Option<Vec<Vec<Option<HashMap<String, Value>>>>>,
    #[serde(default)]
    embeddings: Option<Vec<Vec<Vec<f32>>>>,
}

/// 単一のコレクションから類似エンティティを検索（ヘルパー関数）
async fn search_entities_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<(String, f32)>, String> {
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, collection_name).await?;
    
    // コレクションの件数を取得（デバッグ用）
    let collection_count = match collection.count().await {
        Ok(count) => {
            eprintln!("[search_entities_in_collection] コレクション '{}' の件数: {}件", collection_name, count);
            if count == 0 {
                eprintln!("[search_entities_in_collection] ⚠️ コレクションが空です。");
                // コレクションが空の場合は空の結果を返すが、エラーではなく正常な状態として扱う
                return Ok(Vec::new());
            }
            count
        },
        Err(e) => {
            eprintln!("[search_entities_in_collection] ⚠️ コレクションの件数取得に失敗しました: {}", e);
            // 件数取得に失敗しても検索は続行（コレクションが存在しない可能性がある）
            0
        },
    };
    
    eprintln!("[search_entities_in_collection] コレクション '{}' の件数: {}件（検索を続行します）", collection_name, collection_count);
    
    // 検索オプションを構築
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: None,
        where_document: None,
        n_results: Some(limit),
        include: Some(vec!["distances"]),
    };
    
    // 検索
    let results = collection.query(query_options, None).await
        .map_err(|e| {
            let error_msg = format!("類似エンティティの検索に失敗しました: {}", e);
            eprintln!("[search_entities_in_collection] ❌ ChromaDB検索エラー: {}", e);
            error_msg
        })?;
    
    // 結果を変換
    let mut similar_entities = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        for (i, id) in id_vec.iter().enumerate() {
                            if let Some(distance) = distance_vec.get(i) {
                                let distance_f32: f32 = *distance;
                                let similarity = (1.0_f32 - distance_f32).max(0.0_f32);
                                similar_entities.push((id.clone(), similarity));
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(similar_entities)
}

/// 類似エンティティを検索（組織横断検索対応）
pub async fn find_similar_entities(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<(String, f32)>, String> {
    eprintln!("[find_similar_entities] 検索開始: organizationId={:?}, limit={}, embedding_dim={}", 
        organization_id, limit, query_embedding.len());
    
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 検索対象の組織IDリストを決定
    let org_ids: Vec<String> = match organization_id {
        Some(id) if !id.is_empty() => {
            vec![id]
        },
        _ => {
            // 組織横断検索: すべての組織を検索
            eprintln!("[find_similar_entities] organizationIdが未指定のため、すべての組織を検索します");
            use crate::database::get_all_organizations;
            match get_all_organizations() {
                Ok(orgs) => {
                    let ids: Vec<String> = orgs.into_iter().map(|o| o.id).collect();
                    eprintln!("[find_similar_entities] 検索対象組織数: {}件", ids.len());
                    for (i, org_id) in ids.iter().enumerate() {
                        eprintln!("[find_similar_entities]   組織[{}]: {} (コレクション: entities_{})", i, org_id, org_id);
                    }
                    ids
                },
                Err(e) => {
                    eprintln!("[find_similar_entities] ⚠️ 組織一覧の取得に失敗しました: {}", e);
                    eprintln!("[find_similar_entities] ⚠️ SQLiteから組織を取得できませんでした。Supabaseを使用している場合は、組織IDを直接指定してください。");
                    return Ok(Vec::new());
                },
            }
        },
    };
    
    // 各組織のコレクションに対して検索を実行（並列実行）
    let mut all_results = Vec::new();
    let mut search_tasks = Vec::new();
    
    for org_id in org_ids {
        // org_idは組織IDのリストから来ているので、空文字列になることはないが、念のためチェック
        let collection_name = if org_id.is_empty() {
            "entities_all".to_string()
        } else {
            format!("entities_{}", org_id)
        };
        eprintln!("[find_similar_entities] 検索タスクを作成: 組織ID={}, コレクション名={}", org_id, collection_name);
        let client_clone = client.clone();
        let embedding_clone = query_embedding.clone();
        
        let task = tokio::spawn(async move {
            search_entities_in_collection(client_clone, &collection_name, embedding_clone, limit).await
        });
        search_tasks.push((org_id, task));
    }
    
    eprintln!("[find_similar_entities] {}件の検索タスクを作成しました", search_tasks.len());
    
    // すべての検索タスクの完了を待つ
    for (org_id, task) in search_tasks {
        match task.await {
            Ok(Ok(results)) => {
                eprintln!("[find_similar_entities] 組織 '{}' (コレクション: entities_{}) から {}件の結果を取得", 
                    org_id, org_id, results.len());
                if results.len() > 0 {
                    eprintln!("[find_similar_entities] サンプル結果: {:?}", results.iter().take(3).collect::<Vec<_>>());
                }
                all_results.extend(results);
            },
            Ok(Err(e)) => {
                eprintln!("[find_similar_entities] ⚠️ 組織 '{}' (コレクション: entities_{}) の検索エラー: {}", 
                    org_id, org_id, e);
            },
            Err(e) => {
                eprintln!("[find_similar_entities] ⚠️ 組織 '{}' (コレクション: entities_{}) の検索タスクエラー: {}", 
                    org_id, org_id, e);
            },
        }
    }
    
    // 結果を類似度でソートして上位limit件を返す
    all_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<(String, f32)> = all_results.into_iter().take(limit).collect();
    
    eprintln!("[find_similar_entities] 最終結果: {}件のエンティティを返します", final_results.len());
    Ok(final_results)
}

/// エンティティコレクションの件数を取得
pub async fn count_entities(organization_id: Option<String>) -> Result<usize, String> {
    let org_id = match organization_id {
        Some(id) if !id.is_empty() => id,
        _ => return Err("organizationIdが指定されていません".to_string()),
    };
    
    let client_lock = get_chromadb_client()?;
    let collection_name = format!("entities_{}", org_id);
    
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    let count = collection.count().await
        .map_err(|e| format!("コレクションの件数取得に失敗しました: {}", e))?;
    
    Ok(count)
}

/// リレーション埋め込みを保存
pub async fn save_relation_embedding(
    relation_id: String,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    let client_initialized = {
        if let Some(client_lock) = CHROMADB_CLIENT.get() {
            let client_guard = client_lock.lock().await;
            client_guard.is_some()
        } else {
            false
        }
    };
    
    if !client_initialized {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8001）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8001）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8001);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を試みる
        if let Err(e) = init_chromadb_client(port).await {
            eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
            return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
        }
        eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        
        // クライアントが確実に初期化されているか確認（最大5秒待機）
        let mut retry_count = 0;
        loop {
            let is_initialized = {
                if let Some(client_lock) = CHROMADB_CLIENT.get() {
                    let client_guard = client_lock.lock().await;
                    client_guard.is_some()
                } else {
                    false
                }
            };
            
            if is_initialized {
                break;
            }
            
            retry_count += 1;
            if retry_count >= 10 {
                eprintln!("⚠️ ChromaDBクライアントがまだ初期化されていません。再度初期化を試みます...");
                if let Err(e) = init_chromadb_client(port).await {
                    eprintln!("❌ ChromaDBクライアントの再初期化に失敗しました: {}", e);
                    return Err(format!("ChromaDBクライアントが初期化されていません。再初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
                eprintln!("✅ ChromaDBクライアントの再初期化に成功しました");
                break;
            }
            
            eprintln!("⏳ ChromaDBクライアントの初期化を待機中... ({}回目)", retry_count);
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }
    
    // クライアントを取得（確実に初期化されているはず）
    let client_lock = match get_chromadb_client() {
        Ok(lock) => lock,
        Err(e) => {
            eprintln!("❌ ChromaDBクライアントの取得に失敗しました: {}", e);
            return Err(format!("ChromaDBクライアントが初期化されていません。アプリケーションを再起動してください。"));
        }
    };
    // organizationIdが空文字列の場合は"relations_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "relations_all".to_string()
    } else {
        format!("relations_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("relationId".to_string(), Value::String(relation_id.clone()));
    embedding_metadata.insert("organizationId".to_string(), Value::String(organization_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        chroma_metadata.insert(k, v);
    }
    
    let entries = CollectionEntries {
        ids: vec![relation_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("リレーション埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// リレーション埋め込みを取得
pub async fn get_relation_embedding(
    relation_id: String,
    organization_id: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8001）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8001）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントの初期化を確認（サーバー起動時に既に初期化されている可能性がある）
        if CHROMADB_CLIENT.get().is_none() {
            // クライアントの初期化を試みる
            if let Err(e) = init_chromadb_client(port).await {
                eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
                return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
            }
            eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        }
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"relations_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "relations_all".to_string()
    } else {
        format!("relations_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // IDから直接取得
    let get_options = GetOptions {
        ids: vec![relation_id.clone()],
        where_metadata: None,
        where_document: None,
        limit: Some(1),
        offset: None,
        include: Some(vec!["embeddings".to_string(), "metadatas".to_string()]),
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("リレーション埋め込みの取得に失敗しました: {}", e))?;
    
    // 結果を確認
    if results.ids.is_empty() {
        return Ok(None);
    }
    
    // メタデータと埋め込みを取得
    let mut result_data = HashMap::new();
    
    // 埋め込みを取得
    if let Some(embeddings) = &results.embeddings {
        if !embeddings.is_empty() {
            if let Some(embedding_opt) = embeddings.get(0) {
                if let Some(embedding_vec) = embedding_opt {
                    result_data.insert("combinedEmbedding".to_string(), Value::Array(
                        embedding_vec.iter().map(|&v| Value::Number(serde_json::Number::from_f64(v as f64).unwrap())).collect()
                    ));
                }
            }
        }
    }
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if !metadatas.is_empty() {
            if let Some(metadata_opt) = metadatas.get(0) {
                if let Some(metadata_map) = metadata_opt {
                    for (k, v) in metadata_map {
                        result_data.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }
    
    if result_data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result_data))
    }
}

/// 単一のコレクションから類似リレーションを検索（ヘルパー関数）
async fn search_relations_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<(String, f32)>, String> {
    let collection = get_or_create_collection_with_error_handling(client, collection_name).await?;
    
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: None,
        where_document: None,
        n_results: Some(limit),
        include: Some(vec!["distances"]),
    };
    
    let results = collection.query(query_options, None).await
        .map_err(|e| {
            let error_msg = format!("類似リレーションの検索に失敗しました: {}", e);
            eprintln!("[search_relations_in_collection] ❌ ChromaDB検索エラー: {}", e);
            error_msg
        })?;
    
    let mut similar_relations = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        for (i, id) in id_vec.iter().enumerate() {
                            if let Some(distance) = distance_vec.get(i) {
                                let distance_f32: f32 = *distance;
                                let similarity = (1.0_f32 - distance_f32).max(0.0_f32);
                                similar_relations.push((id.clone(), similarity));
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(similar_relations)
}

/// 類似リレーションを検索（組織横断検索対応）
pub async fn find_similar_relations(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<(String, f32)>, String> {
    eprintln!("[find_similar_relations] 検索開始: organizationId={:?}, limit={}, embedding_dim={}", 
        organization_id, limit, query_embedding.len());
    
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 検索対象の組織IDリストを決定
    let org_ids: Vec<String> = match organization_id {
        Some(id) if !id.is_empty() => {
            vec![id]
        },
        _ => {
            // 組織横断検索: すべての組織を検索
            eprintln!("[find_similar_relations] organizationIdが未指定のため、すべての組織を検索します");
            use crate::database::get_all_organizations;
            match get_all_organizations() {
                Ok(orgs) => {
                    let ids: Vec<String> = orgs.into_iter().map(|o| o.id).collect();
                    eprintln!("[find_similar_relations] 検索対象組織数: {}件", ids.len());
                    ids
                },
                Err(e) => {
                    eprintln!("[find_similar_relations] ⚠️ 組織一覧の取得に失敗しました: {}", e);
                    return Ok(Vec::new());
                },
            }
        },
    };
    
    // 各組織のコレクションに対して検索を実行（並列実行）
    let mut all_results = Vec::new();
    let mut search_tasks = Vec::new();
    
    for org_id in org_ids {
        // org_idは組織IDのリストから来ているので、空文字列になることはないが、念のためチェック
        let collection_name = if org_id.is_empty() {
            "relations_all".to_string()
        } else {
            format!("relations_{}", org_id)
        };
        let client_clone = client.clone();
        let embedding_clone = query_embedding.clone();
        
        let task = tokio::spawn(async move {
            search_relations_in_collection(client_clone, &collection_name, embedding_clone, limit).await
        });
        search_tasks.push((org_id, task));
    }
    
    // すべての検索タスクの完了を待つ
    for (org_id, task) in search_tasks {
        match task.await {
            Ok(Ok(results)) => {
                eprintln!("[find_similar_relations] 組織 '{}' から {}件の結果を取得", org_id, results.len());
                all_results.extend(results);
            },
            Ok(Err(e)) => {
                eprintln!("[find_similar_relations] ⚠️ 組織 '{}' の検索エラー: {}", org_id, e);
            },
            Err(e) => {
                eprintln!("[find_similar_relations] ⚠️ 組織 '{}' の検索タスクエラー: {}", org_id, e);
            },
        }
    }
    
    // 結果を類似度でソートして上位limit件を返す
    all_results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<(String, f32)> = all_results.into_iter().take(limit).collect();
    
    eprintln!("[find_similar_relations] 最終結果: {}件のリレーションを返します", final_results.len());
    Ok(final_results)
}

/// トピック埋め込みを保存
pub async fn save_topic_embedding(
    topic_id: String,
    meeting_note_id: Option<String>,
    organization_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
    regulation_id: Option<String>,
) -> Result<(), String> {
    let _parent_id = meeting_note_id.as_ref().or(regulation_id.as_ref());
    eprintln!("[save_topic_embedding] 開始: topicId={}, meetingNoteId={:?}, regulationId={:?}, organizationId={}, embedding_dim={}", 
        topic_id, meeting_note_id, regulation_id, organization_id, combined_embedding.len());
    
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    let client_initialized = {
        if let Some(client_lock) = CHROMADB_CLIENT.get() {
            let client_guard = client_lock.lock().await;
            client_guard.is_some()
        } else {
            false
        }
    };
    
    if !client_initialized {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                port
            } else {
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                let data_dir = get_default_chromadb_data_dir()?;
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}", e));
                    }
                }
            }
        } else {
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            let data_dir = get_default_chromadb_data_dir()?;
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}", e));
                }
            }
        };
        
        // クライアントの初期化を試みる
        if let Err(e) = init_chromadb_client(port).await {
            eprintln!("❌ ChromaDBクライアントの自動初期化に失敗しました: {}", e);
            return Err(format!("ChromaDBクライアントが初期化されていません。初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
        }
        eprintln!("✅ ChromaDBクライアントの自動初期化に成功しました");
        
        // クライアントが確実に初期化されているか確認（最大5秒待機）
        let mut retry_count = 0;
        loop {
            let is_initialized = {
                if let Some(client_lock) = CHROMADB_CLIENT.get() {
                    let client_guard = client_lock.lock().await;
                    client_guard.is_some()
                } else {
                    false
                }
            };
            
            if is_initialized {
                break;
            }
            
            retry_count += 1;
            if retry_count >= 10 {
                eprintln!("⚠️ ChromaDBクライアントがまだ初期化されていません。再度初期化を試みます...");
                if let Err(e) = init_chromadb_client(port).await {
                    eprintln!("❌ ChromaDBクライアントの再初期化に失敗しました: {}", e);
                    return Err(format!("ChromaDBクライアントが初期化されていません。再初期化に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
                eprintln!("✅ ChromaDBクライアントの再初期化に成功しました");
                break;
            }
            
            eprintln!("⏳ ChromaDBクライアントの初期化を待機中... ({}回目)", retry_count);
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    }
    
    // クライアントを取得（確実に初期化されているはず）
    let client_lock = match get_chromadb_client() {
        Ok(lock) => lock,
        Err(e) => {
            eprintln!("❌ ChromaDBクライアントの取得に失敗しました: {}", e);
            return Err(format!("ChromaDBクライアントが初期化されていません。アプリケーションを再起動してください。"));
        }
    };
    let collection_name = format!("topics_{}", organization_id);
    eprintln!("[save_topic_embedding] コレクション名: {}", collection_name);
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    eprintln!("[save_topic_embedding] コレクションを取得/作成中...");
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    eprintln!("[save_topic_embedding] コレクションを取得/作成しました");
    
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("topicId".to_string(), Value::String(topic_id.clone()));
    embedding_metadata.insert("organizationId".to_string(), Value::String(organization_id.clone()));
    
    // タイトルが空でないことを確認
    let title_value = embedding_metadata.get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if title_value.is_empty() {
        eprintln!("[save_topic_embedding] ⚠️ 警告: タイトルが空です。topicId={}, organizationId={}", topic_id, organization_id);
        // contentSummaryからタイトルを推測
        if let Some(content_summary) = embedding_metadata.get("contentSummary")
            .and_then(|v| v.as_str()) {
            if !content_summary.is_empty() {
                let fallback_title = if content_summary.len() > 50 {
                    format!("{}...", &content_summary[..50])
                } else {
                    content_summary.to_string()
                };
                embedding_metadata.insert("title".to_string(), Value::String(fallback_title.clone()));
                eprintln!("[save_topic_embedding] contentSummaryからタイトルを生成: {}", fallback_title);
            } else {
                let fallback_title = format!("トピック {}", topic_id);
                embedding_metadata.insert("title".to_string(), Value::String(fallback_title.clone()));
                eprintln!("[save_topic_embedding] topicIdをタイトルとして使用: {}", fallback_title);
            }
        } else {
            let fallback_title = format!("トピック {}", topic_id);
            embedding_metadata.insert("title".to_string(), Value::String(fallback_title.clone()));
            eprintln!("[save_topic_embedding] topicIdをタイトルとして使用: {}", fallback_title);
        }
    }
    
    // meetingNoteIdまたはregulationIdを設定
    if let Some(meeting_note_id) = meeting_note_id {
        embedding_metadata.insert("meetingNoteId".to_string(), Value::String(meeting_note_id));
    }
    if let Some(regulation_id) = regulation_id {
        embedding_metadata.insert("regulationId".to_string(), Value::String(regulation_id));
    }
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        chroma_metadata.insert(k, v);
    }
    
    eprintln!("[save_topic_embedding] 埋め込みを保存中... (embedding_dim={})", combined_embedding.len());
    let entries = CollectionEntries {
        ids: vec![topic_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| {
            let error_msg = format!("トピック埋め込みの保存に失敗しました: {}", e);
            eprintln!("[save_topic_embedding] ❌ エラー: {}", error_msg);
            error_msg
        })?;
    
    eprintln!("[save_topic_embedding] ✅ 成功: topicId={}", topic_id);
    Ok(())
}

/// 単一のコレクションから類似トピックを検索（ヘルパー関数）
/// トピック検索結果（メタデータを含む）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopicSearchResult {
    pub topic_id: String,
    pub meeting_note_id: Option<String>,
    pub regulation_id: Option<String>,
    pub similarity: f32,
    pub title: String,
    pub content_summary: String,
    pub organization_id: Option<String>, // 組織ID（メタデータから取得）
}

async fn search_topics_in_collection(
    client: Arc<ChromaClient>,
    collection_name: &str,
    query_embedding: Vec<f32>,
    limit: usize,
) -> Result<Vec<TopicSearchResult>, String> {
    let collection = get_or_create_collection_with_error_handling(client, collection_name).await?;
    
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: None,
        where_document: None,
        n_results: Some(limit),
        include: Some(vec!["distances", "metadatas"]),
    };
    
    let results = collection.query(query_options, None).await
        .map_err(|e| {
            let error_msg = format!("類似トピックの検索に失敗しました: {}", e);
            eprintln!("[search_topics_in_collection] ❌ ChromaDB検索エラー: {}", e);
            error_msg
        })?;
    
    let mut similar_topics = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        if let Some(metadatas_vec) = &results.metadatas {
                            if let Some(metadatas) = metadatas_vec.get(0) {
                                for (i, topic_id) in id_vec.iter().enumerate() {
                                    if let Some(distance) = distance_vec.get(i) {
                                        let distance_f32: f32 = *distance;
                                        let similarity = (1.0_f32 - distance_f32).max(0.0_f32);
                                        
                                        let metadata = metadatas
                                            .get(i)
                                            .and_then(|m_opt| m_opt.as_ref());
                                        
                                        // メタデータからmeetingNoteIdまたはregulationIdを取得
                                        let meeting_note_id = metadata
                                            .and_then(|m| {
                                                m.get("meetingNoteId")
                                                    .and_then(|v| v.as_str())
                                                    .map(|s| s.to_string())
                                            });
                                        
                                        let regulation_id = metadata
                                            .and_then(|m| {
                                                m.get("regulationId")
                                                    .and_then(|v| v.as_str())
                                                    .map(|s| s.to_string())
                                            });
                                        
                                        // メタデータからtitleとcontentSummaryを取得
                                        let title = metadata
                                            .and_then(|m| {
                                                m.get("title")
                                                    .and_then(|v| v.as_str())
                                            })
                                            .unwrap_or("")
                                            .to_string();
                                        
                                        let content_summary = metadata
                                            .and_then(|m| {
                                                m.get("contentSummary")
                                                    .and_then(|v| v.as_str())
                                            })
                                            .unwrap_or("")
                                            .to_string();
                                        
                                        // メタデータからorganizationIdを取得
                                        let organization_id = metadata
                                            .and_then(|m| {
                                                m.get("organizationId")
                                                    .and_then(|v| v.as_str())
                                                    .map(|s| s.to_string())
                                            });
                                        
                                        similar_topics.push(TopicSearchResult {
                                            topic_id: topic_id.clone(),
                                            meeting_note_id,
                                            regulation_id,
                                            similarity,
                                            title,
                                            content_summary,
                                            organization_id,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(similar_topics)
}

/// トピック埋め込みを取得
pub async fn get_topic_embedding(
    topic_id: String,
    organization_id: String,
) -> Result<Option<HashMap<String, Value>>, String> {
    // クライアントが初期化されていない場合、自動的に初期化を試みる
    if CHROMADB_CLIENT.get().is_none() {
        eprintln!("⚠️ ChromaDBクライアントが初期化されていません。自動初期化を試みます...");
        
        // サーバーが起動しているか確認
        let server_lock = CHROMADB_SERVER.get();
        let port = if let Some(server_lock) = server_lock {
            // MutexGuardをスコープ内でドロップしてから.awaitを呼び出す
            let port_opt = {
                let server_guard = server_lock.lock().unwrap();
                server_guard.as_ref().map(|server| server.port())
            };
            
            if let Some(port) = port_opt {
                // サーバーが起動している場合、ポート番号を取得
                port
            } else {
                // サーバーが起動していない場合、自動的に起動を試みる
                eprintln!("⚠️ ChromaDBサーバーが起動していません。自動起動を試みます...");
                
                // ポート番号を環境変数から取得（デフォルトは8001）
                let port = std::env::var("CHROMADB_PORT")
                    .ok()
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(8001);
                
                // データディレクトリを取得
                let data_dir = get_default_chromadb_data_dir()?;
                
                // サーバーを起動
                match init_chromadb_server(data_dir, port).await {
                    Ok(_) => {
                        eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                        port
                    }
                    Err(e) => {
                        eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                        return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                    }
                }
            }
        } else {
            // CHROMADB_SERVERが初期化されていない場合、自動的に起動を試みる
            eprintln!("⚠️ ChromaDBサーバーが初期化されていません。自動起動を試みます...");
            
            // ポート番号を環境変数から取得（デフォルトは8001）
            let port = std::env::var("CHROMADB_PORT")
                .ok()
                .and_then(|s| s.parse::<u16>().ok())
                .unwrap_or(8000);
            
            // データディレクトリを取得
            let data_dir = get_default_chromadb_data_dir()?;
            
            // サーバーを起動
            match init_chromadb_server(data_dir, port).await {
                Ok(_) => {
                    eprintln!("✅ ChromaDBサーバーの自動起動に成功しました");
                    port
                }
                Err(e) => {
                    eprintln!("❌ ChromaDBサーバーの自動起動に失敗しました: {}", e);
                    return Err(format!("ChromaDBサーバーの起動に失敗しました: {}。アプリケーションを再起動してください。", e));
                }
            }
        };
        
        // クライアントを初期化
        init_chromadb_client(port).await?;
    }
    
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"topics_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "topics_all".to_string()
    } else {
        format!("topics_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // IDから直接取得
    let get_options = GetOptions {
        ids: vec![topic_id.clone()],
        where_metadata: None,
        where_document: None,
        limit: Some(1),
        offset: None,
        include: Some(vec!["embeddings".to_string(), "metadatas".to_string()]),
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("トピック埋め込みの取得に失敗しました: {}", e))?;
    
    // 結果を確認
    if results.ids.is_empty() {
        return Ok(None);
    }
    
    // メタデータと埋め込みを取得
    let mut result_data = HashMap::new();
    
    // 埋め込みを取得
    if let Some(embeddings) = &results.embeddings {
        if !embeddings.is_empty() {
            if let Some(embedding_opt) = embeddings.get(0) {
                if let Some(embedding_vec) = embedding_opt {
                    result_data.insert("combinedEmbedding".to_string(), Value::Array(
                        embedding_vec.iter().map(|&v| Value::Number(serde_json::Number::from_f64(v as f64).unwrap())).collect()
                    ));
                }
            }
        }
    }
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if !metadatas.is_empty() {
            if let Some(metadata_opt) = metadatas.get(0) {
                if let Some(metadata_map) = metadata_opt {
                    for (k, v) in metadata_map {
                        result_data.insert(k.clone(), v.clone());
                    }
                }
            }
        }
    }
    
    if result_data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(result_data))
    }
}

/// 類似トピックを検索（組織横断検索対応）
pub async fn find_similar_topics(
    query_embedding: Vec<f32>,
    limit: usize,
    organization_id: Option<String>,
) -> Result<Vec<TopicSearchResult>, String> {
    eprintln!("[find_similar_topics] 検索開始: organizationId={:?}, limit={}, embedding_dim={}", 
        organization_id, limit, query_embedding.len());
    
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 検索対象の組織IDリストを決定
    let org_ids: Vec<String> = match organization_id {
        Some(id) if !id.is_empty() => {
            vec![id]
        },
        _ => {
            // 組織横断検索: すべての組織を検索
            eprintln!("[find_similar_topics] organizationIdが未指定のため、すべての組織を検索します");
            use crate::database::get_all_organizations;
            match get_all_organizations() {
                Ok(orgs) => {
                    let ids: Vec<String> = orgs.into_iter().map(|o| o.id).collect();
                    eprintln!("[find_similar_topics] 検索対象組織数: {}件", ids.len());
                    ids
                },
                Err(e) => {
                    eprintln!("[find_similar_topics] ⚠️ 組織一覧の取得に失敗しました: {}", e);
                    return Ok(Vec::new());
                },
            }
        },
    };
    
    // 各組織のコレクションに対して検索を実行（並列実行）
    let mut all_results = Vec::new();
    let mut search_tasks = Vec::new();
    
    for org_id in org_ids {
        // org_idは組織IDのリストから来ているので、空文字列になることはないが、念のためチェック
        let collection_name = if org_id.is_empty() {
            "topics_all".to_string()
        } else {
            format!("topics_{}", org_id)
        };
        let client_clone = client.clone();
        let embedding_clone = query_embedding.clone();
        
        let task = tokio::spawn(async move {
            search_topics_in_collection(client_clone, &collection_name, embedding_clone, limit).await
        });
        search_tasks.push((org_id, task));
    }
    
    // すべての検索タスクの完了を待つ
    for (org_id, task) in search_tasks {
        match task.await {
            Ok(Ok(results)) => {
                eprintln!("[find_similar_topics] 組織 '{}' から {}件の結果を取得", org_id, results.len());
                all_results.extend(results);
            },
            Ok(Err(e)) => {
                eprintln!("[find_similar_topics] ⚠️ 組織 '{}' の検索エラー: {}", org_id, e);
            },
            Err(e) => {
                eprintln!("[find_similar_topics] ⚠️ 組織 '{}' の検索タスクエラー: {}", org_id, e);
            },
        }
    }
    
    // 結果を類似度でソートして上位limit件を返す
    all_results.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal));
    let final_results: Vec<TopicSearchResult> = all_results.into_iter().take(limit).collect();
    
    eprintln!("[find_similar_topics] 最終結果: {}件のトピックを返します", final_results.len());
    Ok(final_results)
}

/// システム設計ドキュメントの埋め込みを保存
pub async fn save_design_doc_embedding(
    section_id: String,
    combined_embedding: Vec<f32>,
    metadata: HashMap<String, Value>,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";  // 組織ごとではなく、全体で1つのコレクション
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // コレクションを取得または作成
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // メタデータにセクションIDを追加
    let mut embedding_metadata = metadata;
    embedding_metadata.insert("sectionId".to_string(), Value::String(section_id.clone()));
    
    // メタデータをChromaDBの形式に変換（serde_json::Mapを使用）
    // ChromaDBはnull値をサポートしないため、nullを空文字列に変換
    let mut chroma_metadata = serde_json::Map::new();
    for (k, v) in embedding_metadata {
        let value = match v {
            Value::Null => Value::String(String::new()),
            Value::String(s) => Value::String(s),
            Value::Number(n) => Value::Number(n),
            Value::Bool(b) => Value::Bool(b),
            Value::Array(a) => {
                // 配列内のnullも処理
                let cleaned: Vec<Value> = a.into_iter().map(|item| {
                    match item {
                        Value::Null => Value::String(String::new()),
                        _ => item,
                    }
                }).collect();
                Value::Array(cleaned)
            },
            Value::Object(o) => {
                // オブジェクト内のnullも処理
                let mut cleaned = serde_json::Map::new();
                for (key, val) in o {
                    let cleaned_val = match val {
                        Value::Null => Value::String(String::new()),
                        _ => val,
                    };
                    cleaned.insert(key, cleaned_val);
                }
                Value::Object(cleaned)
            },
        };
        chroma_metadata.insert(k, value);
    }
    
    // 埋め込みを追加
    let entries = CollectionEntries {
        ids: vec![section_id.as_str()],
        embeddings: Some(vec![combined_embedding]),
        metadatas: Some(vec![chroma_metadata]),
        documents: None,
    };
    
    collection.upsert(entries, None).await
        .map_err(|e| format!("システム設計ドキュメント埋め込みの保存に失敗しました: {}", e))?;
    
    Ok(())
}

/// 類似システム設計ドキュメントを検索
pub async fn find_similar_design_docs(
    query_embedding: Vec<f32>,
    limit: usize,
    section_id: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Vec<(String, f32)>, String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // メタデータフィルターを構築
    let mut where_metadata: Option<serde_json::Map<String, Value>> = None;
    if let Some(sid) = section_id {
        let mut filter = serde_json::Map::new();
        filter.insert("sectionId".to_string(), Value::String(sid));
        where_metadata = Some(filter);
    } else if let Some(tags_vec) = tags {
        // タグフィルター（ChromaDBでは$in演算子を使用）
        // タグはJSON文字列として保存されているため、完全一致で検索
        // 注意: ChromaDBのメタデータフィルターは完全一致のみサポート
        // タグの部分一致は検索後にフィルタリングする必要がある
        if !tags_vec.is_empty() {
            // 最初のタグでフィルタリング（簡易実装）
            // 完全な実装には検索後のフィルタリングが必要
            // タグはJSON文字列として保存されているため、直接フィルタリングは困難
            // 検索後にフィルタリングする方が実用的
            let _filter = serde_json::Map::new();
        }
    }
    
    // includeオプションでdistancesのみを指定（メタデータを除外してnull値の問題を回避）
    // 注意: ChromaDBでは"ids"は常に返されるため、includeオプションには含めない
    let include_options = vec!["distances"];
    
    let query_options = QueryOptions {
        query_texts: None,
        query_embeddings: Some(vec![query_embedding]),
        where_metadata: where_metadata.as_ref().map(|m| {
            serde_json::Value::Object(m.clone())
        }),
        where_document: None,
        n_results: Some(limit),
        include: Some(include_options), // distancesのみを指定（メタデータを除外）
    };
    
    let results = collection.query(query_options, None).await
        .map_err(|e| format!("類似システム設計ドキュメントの検索に失敗しました: {}", e))?;
    
    let mut similar_docs = Vec::new();
    if !results.ids.is_empty() {
        if let Some(distances) = &results.distances {
            if !distances.is_empty() {
                if let Some(id_vec) = results.ids.get(0) {
                    if let Some(distance_vec) = distances.get(0) {
                        for (i, section_id) in id_vec.iter().enumerate() {
                            if let Some(distance) = distance_vec.get(i) {
                                // 距離を類似度に変換（1 - distance）
                                let distance_f32: f32 = *distance;
                                let similarity = 1.0 - distance_f32;
                                similar_docs.push((section_id.clone(), similarity));
                            }
                        }

                    }
                }
            }
        }
    }
    
    Ok(similar_docs)
}

/// システム設計ドキュメントのメタデータを取得
pub async fn get_design_doc_metadata(
    section_id: String,
) -> Result<HashMap<String, Value>, String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // getメソッドを使用して特定のIDのメタデータを取得
    // ChromaDBのドキュメントIDはsection_idそのもの
    let get_options = GetOptions {
        ids: vec![section_id.clone()], // 特定のIDを指定
        where_metadata: None,
        limit: None,
        offset: None,
        where_document: None,
        include: Some(vec!["metadatas".to_string()]), // メタデータのみを取得
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("システム設計ドキュメントメタデータの取得に失敗しました: {}", e))?;
    
    // メタデータを取得
    if let Some(metadatas) = &results.metadatas {
        if let Some(metadata_opt) = metadatas.get(0) {
            if let Some(metadata_map) = metadata_opt {
                let mut result_map = HashMap::new();
                for (k, v) in metadata_map {
                    // null値を空文字列に変換（ChromaDBのレスポンスにnullが含まれる場合がある）
                    let cleaned_value = match v {
                        Value::Null => Value::String(String::new()),
                        _ => v.clone(),
                    };
                    result_map.insert(k.clone(), cleaned_value);
                }
                return Ok(result_map);
            }
        }
    }
    
    Err("メタデータが見つかりませんでした".to_string())
}

/// システム設計ドキュメントコレクション内の全セクションIDを取得（デバッグ用）
pub async fn list_design_doc_section_ids() -> Result<Vec<String>, String> {
    let client_lock = get_chromadb_client()?;
    let collection_name = "design_docs";
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // 全データを取得（getメソッドを使用）
    // idsを空のベクトルにすると全IDを取得できる
    // 注意: ChromaDBでは"ids"は常に返されるため、includeオプションには含めない
    let get_options = GetOptions {
        ids: vec![], // 空のベクトルで全IDを取得
        where_metadata: None,
        limit: None,
        offset: None,
        where_document: None,
        include: None, // idsは常に返されるため、NoneでOK
    };
    
    let results = collection.get(get_options).await
        .map_err(|e| format!("システム設計ドキュメント一覧の取得に失敗しました: {}", e))?;
    
    let mut section_ids = Vec::new();
    // results.idsはVec<String>型
    for section_id in results.ids {
        section_ids.push(section_id);
    }
    
    Ok(section_ids)
}

/// トピック埋め込みを削除
pub async fn delete_topic_embedding(
    topic_id: String,
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"topics_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "topics_all".to_string()
    } else {
        format!("topics_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // トピックIDで削除
    // ChromaDBのIDはtopicIdそのもの（save_topic_embeddingでtopic_idをそのままIDとして使用）
    collection.delete(
        Some(vec![topic_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("トピック埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}

/// エンティティ埋め込みを削除
pub async fn delete_entity_embedding(
    entity_id: String,
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"entities_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "entities_all".to_string()
    } else {
        format!("entities_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // エンティティIDで削除
    collection.delete(
        Some(vec![entity_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("エンティティ埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}

/// リレーション埋め込みを削除
pub async fn delete_relation_embedding(
    relation_id: String,
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    // organizationIdが空文字列の場合は"relations_all"を使用（ChromaDBの命名規則に準拠）
    let collection_name = if organization_id.is_empty() {
        "relations_all".to_string()
    } else {
        format!("relations_{}", organization_id)
    };
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    let collection = get_or_create_collection_with_error_handling(client, &collection_name).await?;
    
    // リレーションIDで削除
    collection.delete(
        Some(vec![relation_id.as_str()]),
        None,
        None,
    ).await
        .map_err(|e| format!("リレーション埋め込みの削除に失敗しました: {}", e))?;
    
    Ok(())
}

/// 組織に関連するChromaDBコレクションを削除
pub async fn delete_organization_collections(
    organization_id: String,
) -> Result<(), String> {
    let client_lock = get_chromadb_client()?;
    
    // MutexGuardをdropしてから.awaitする必要がある
    let client = {
        let client_guard = client_lock.lock().await;
        client_guard.as_ref()
            .ok_or("ChromaDBクライアントが初期化されていません")?
            .clone()
    };
    
    // 削除するコレクション名のリスト
    let collection_names = if organization_id.is_empty() {
        vec![
            "topics_all".to_string(),
            "entities_all".to_string(),
            "relations_all".to_string(),
        ]
    } else {
        vec![
            format!("topics_{}", organization_id),
            format!("entities_{}", organization_id),
            format!("relations_{}", organization_id),
        ]
    };
    
    // 各コレクションを削除
    for collection_name in collection_names {
        match client.delete_collection(&collection_name).await {
            Ok(_) => {
                eprintln!("✅ [delete_organization_collections] コレクション削除成功: {}", collection_name);
            }
            Err(e) => {
                let error_msg = format!("{}", e);
                // コレクションが存在しない場合はエラーを無視（既に削除されている可能性がある）
                if error_msg.contains("not found") || error_msg.contains("does not exist") {
                    eprintln!("⚠️ [delete_organization_collections] コレクションが存在しません（スキップ）: {}", collection_name);
                } else {
                    eprintln!("⚠️ [delete_organization_collections] コレクション削除エラー（続行します）: {} - {}", collection_name, error_msg);
                }
            }
        }
    }
    
    Ok(())
}
