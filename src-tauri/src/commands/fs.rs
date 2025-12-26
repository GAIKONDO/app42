use std::fs;
use std::path::Path;
use std::collections::HashMap;
use std::process::Command;
use serde_json::Value;
use tauri::{AppHandle, Manager};
use crate::database::{get_db, get_timestamp};
use uuid::Uuid;

#[tauri::command]
pub async fn read_file(file_path: String) -> Result<HashMap<String, Value>, String> {
    match fs::read_to_string(&file_path) {
        Ok(data) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("data".to_string(), Value::String(data));
            Ok(result)
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(e.to_string()));
            Ok(result)
        }
    }
}

#[tauri::command]
pub async fn write_file(file_path: String, data: String) -> Result<HashMap<String, Value>, String> {
    // 親ディレクトリが存在しない場合は作成
    if let Some(parent) = Path::new(&file_path).parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("ディレクトリ作成エラー: {}", e)));
            return Ok(result);
        }
    }
    
    match fs::write(&file_path, data) {
        Ok(_) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            Ok(result)
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(e.to_string()));
            Ok(result)
        }
    }
}

#[tauri::command]
pub async fn file_exists(file_path: String) -> Result<HashMap<String, Value>, String> {
    let exists = Path::new(&file_path).exists();
    let mut result = HashMap::new();
    result.insert("exists".to_string(), Value::Bool(exists));
    Ok(result)
}

/// トピックファイルを保存
/// 
/// ファイルのバイナリデータを受け取り、`app_data_dir/mission-ai-local/images/topics/{organizationId}/{topicId}/` に保存します。
/// 画像、PDF、Excel、その他のすべてのファイルタイプに対応します。
/// 
/// # 引数
/// - `app`: TauriのAppHandle
/// - `organization_id`: 組織ID
/// - `topic_id`: トピックID
/// - `file_bytes`: ファイルのバイナリデータ（Vec<u8>）
/// - `file_name`: 保存するファイル名（拡張子を含む、例: "document.pdf"）
/// 
/// # 戻り値
/// - `success`: 成功したかどうか
/// - `file_path`: 保存されたファイルのパス（成功時）
/// - `error`: エラーメッセージ（失敗時）
#[tauri::command]
pub async fn save_topic_file(
    app: AppHandle,
    organization_id: String,
    topic_id: String,
    file_bytes: Vec<u8>,
    file_name: String,
    meeting_note_id: Option<String>,
    parent_topic_id: Option<String>,
    description: Option<String>,
    detailed_description: Option<String>,
    mime_type: Option<String>,
) -> Result<HashMap<String, Value>, String> {
    // アプリケーションデータディレクトリを取得
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("アプリケーションデータディレクトリの取得に失敗しました: {}", e)));
            return Ok(result);
        }
    };

    // データベースディレクトリ名（開発環境と本番環境で異なる）
    let db_dir_name = if cfg!(debug_assertions) {
        "network-mock-local-dev"
    } else {
        "network-mock-local"
    };

    // ファイル保存ディレクトリのパスを構築（既存のimagesディレクトリを使用）
    let file_dir = app_data_dir
        .join(db_dir_name)
        .join("images")
        .join("topics")
        .join(&organization_id)
        .join(&topic_id);

    // ディレクトリが存在しない場合は作成
    if let Err(e) = fs::create_dir_all(&file_dir) {
        let mut result = HashMap::new();
        result.insert("success".to_string(), Value::Bool(false));
        result.insert("error".to_string(), Value::String(format!("ディレクトリ作成エラー: {}", e)));
        return Ok(result);
    }

    // ファイルパスを構築
    let file_path = file_dir.join(&file_name);

    // ファイルサイズを先に取得（file_bytesがmoveされる前に）
    let file_size = file_bytes.len() as i64;

    // ファイルに書き込み
    match fs::write(&file_path, file_bytes) {
        Ok(_) => {
            // データベースにファイル情報を保存
            let file_id = Uuid::new_v4().to_string();
            let now = get_timestamp();
            
            // meetingNoteIdを取得（引数で指定されていない場合、topicsテーブルから取得）
            let final_meeting_note_id = if let Some(note_id) = meeting_note_id {
                eprintln!("✅ [save_topic_file] meetingNoteIdを引数から取得: {}", note_id);
                note_id
            } else {
                // topicsテーブルから取得を試みる（topicIdで検索）
                eprintln!("🔍 [save_topic_file] topicsテーブルからmeetingNoteIdを取得を試みます: topicId={}", topic_id);
                if let Some(db) = get_db() {
                    if let Ok(conn) = db.get_connection() {
                        // まず、topicIdで検索
                        match conn.query_row(
                            "SELECT meetingNoteId FROM topics WHERE topicId = ?1",
                            [&topic_id],
                            |row| row.get::<_, String>(0)
                        ) {
                            Ok(meeting_note_id) => {
                                eprintln!("✅ [save_topic_file] topicsテーブルからmeetingNoteIdを取得: {}", meeting_note_id);
                                meeting_note_id
                            }
                            Err(e) => {
                                eprintln!("⚠️ [save_topic_file] topicsテーブルからmeetingNoteIdを取得できませんでした (topicId検索): topicId={}, error={}", topic_id, e);
                                // idで検索も試みる（{meetingNoteId}-topic-{topicId}の形式）
                                if let Ok(meeting_note_id) = conn.query_row(
                                    "SELECT meetingNoteId FROM topics WHERE id LIKE ?1",
                                    [&format!("%-topic-{}", topic_id)],
                                    |row| row.get::<_, String>(0)
                                ) {
                                    eprintln!("✅ [save_topic_file] topicsテーブルからmeetingNoteIdを取得 (id検索): {}", meeting_note_id);
                                    meeting_note_id
                                } else {
                                    eprintln!("⚠️ [save_topic_file] topicsテーブルからmeetingNoteIdを取得できませんでした (id検索): topicId={}", topic_id);
                                    String::new()
                                }
                            }
                        }
                    } else {
                        eprintln!("⚠️ [save_topic_file] データベースコネクションの取得に失敗しました");
                        String::new()
                    }
                } else {
                    eprintln!("⚠️ [save_topic_file] データベースが初期化されていません");
                    String::new()
                }
            };
            
            if final_meeting_note_id.is_empty() {
                eprintln!("❌ [save_topic_file] meetingNoteIdが空のため、topicFilesテーブルへの保存をスキップします");
            } else {
                // topicsテーブルから実際のidを取得（外部キー制約のため）
                let actual_topic_id = if let Some(db) = get_db() {
                    if let Ok(conn) = db.get_connection() {
                        // まず、topicIdで検索してidを取得
                        match conn.query_row(
                            "SELECT id FROM topics WHERE topicId = ?1 AND meetingNoteId = ?2",
                            [&topic_id, &final_meeting_note_id],
                            |row| row.get::<_, String>(0)
                        ) {
                            Ok(id) => {
                                eprintln!("✅ [save_topic_file] topicsテーブルからidを取得: {}", id);
                                Some(id)
                            }
                            Err(e) => {
                                eprintln!("⚠️ [save_topic_file] topicsテーブルからidを取得できませんでした: topicId={}, meetingNoteId={}, error={}", topic_id, final_meeting_note_id, e);
                                None
                            }
                        }
                    } else {
                        eprintln!("⚠️ [save_topic_file] データベースコネクションの取得に失敗しました");
                        None
                    }
                } else {
                    eprintln!("⚠️ [save_topic_file] データベースが初期化されていません");
                    None
                };
                
                // topicFilesテーブルに保存（meetingNoteIdが空でない場合のみ）
                if let Some(actual_id) = actual_topic_id {
                    if let Some(db) = get_db() {
                        if let Ok(conn) = db.get_connection() {
                            // parentTopicIdも同様に変換する必要がある場合
                            let actual_parent_topic_id = if let Some(parent_id) = &parent_topic_id {
                                if let Ok(parent_actual_id) = conn.query_row(
                                    "SELECT id FROM topics WHERE topicId = ?1 AND meetingNoteId = ?2",
                                    [parent_id, &final_meeting_note_id],
                                    |row| row.get::<_, String>(0)
                                ) {
                                    Some(parent_actual_id)
                                } else {
                                    None
                                }
                            } else {
                                None
                            };
                            
                            eprintln!("🔍 [save_topic_file] topicFilesテーブルに保存を試みます: file_id={}, actual_topic_id={}, meetingNoteId={}", file_id, actual_id, final_meeting_note_id);
                            match conn.execute(
                                "INSERT INTO topicFiles (
                                    id, topicId, parentTopicId, filePath, fileName, mimeType,
                                    description, detailedDescription, fileSize, organizationId,
                                    meetingNoteId, createdAt, updatedAt
                                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                                rusqlite::params![
                                    file_id,
                                    actual_id,  // topicsテーブルの実際のidを使用
                                    actual_parent_topic_id,
                                    file_path.to_string_lossy().to_string(),
                                    file_name,
                                    mime_type,
                                    description,
                                    detailed_description,
                                    file_size,
                                    organization_id,
                                    final_meeting_note_id,
                                    now,
                                    now,
                                ],
                            ) {
                                Ok(_) => {
                                    eprintln!("✅ [save_topic_file] topicFilesテーブルに保存しました: file_id={}, actual_topic_id={}, filePath={}", file_id, actual_id, file_path.to_string_lossy());
                                }
                                Err(e) => {
                                    eprintln!("❌ [save_topic_file] topicFilesテーブルへの保存に失敗しました: error={}, file_id={}, actual_topic_id={}", e, file_id, actual_id);
                                }
                            }
                        } else {
                            eprintln!("⚠️ [save_topic_file] データベースコネクションの取得に失敗しました");
                        }
                    } else {
                        eprintln!("⚠️ [save_topic_file] データベースが初期化されていません");
                    }
                } else {
                    eprintln!("❌ [save_topic_file] topicsテーブルからidを取得できなかったため、topicFilesテーブルへの保存をスキップします");
                }
            }
            
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(true));
            result.insert("file_path".to_string(), Value::String(file_path.to_string_lossy().to_string()));
            result.insert("file_id".to_string(), Value::String(file_id));
            Ok(result)
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("ファイル書き込みエラー: {}", e)));
            Ok(result)
        }
    }
}

/// Graphviz YAMLファイルに関連ファイルを保存
#[tauri::command]
pub async fn save_graphviz_yaml_file_attachment(
    app: AppHandle,
    organization_id: String,
    yaml_file_id: String,
    file_bytes: Vec<u8>,
    file_name: String,
    description: Option<String>,
    detailed_description: Option<String>,
    mime_type: Option<String>,
) -> Result<HashMap<String, Value>, String> {
    // アプリケーションデータディレクトリを取得
    let app_data_dir = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("アプリケーションデータディレクトリの取得に失敗しました: {}", e)));
            return Ok(result);
        }
    };

    // データベースディレクトリ名（開発環境と本番環境で異なる）
    let db_dir_name = if cfg!(debug_assertions) {
        "network-mock-local-dev"
    } else {
        "network-mock-local"
    };

    // ファイル保存ディレクトリのパスを構築（Graphviz用）
    let file_dir = app_data_dir
        .join(db_dir_name)
        .join("images")
        .join("graphviz")
        .join(&organization_id)
        .join(&yaml_file_id);

    // ディレクトリが存在しない場合は作成
    if let Err(e) = fs::create_dir_all(&file_dir) {
        let mut result = HashMap::new();
        result.insert("success".to_string(), Value::Bool(false));
        result.insert("error".to_string(), Value::String(format!("ディレクトリ作成エラー: {}", e)));
        return Ok(result);
    }

    // ファイルパスを構築
    let file_path = file_dir.join(&file_name);

    // ファイルサイズを先に取得
    let file_size = file_bytes.len() as i64;

    // ファイルに書き込み
    match fs::write(&file_path, file_bytes) {
        Ok(_) => {
            // データベースにファイル情報を保存（graphvizYamlFileAttachmentsテーブルに保存）
            let file_id = Uuid::new_v4().to_string();
            let now = get_timestamp();
            
            if let Some(db) = get_db() {
                if let Ok(conn) = db.get_connection() {
                    // graphvizYamlFileAttachmentsテーブルが存在するか確認し、存在しない場合は作成
                    let _ = conn.execute(
                        "CREATE TABLE IF NOT EXISTS graphvizYamlFileAttachments (
                            id TEXT PRIMARY KEY,
                            yamlFileId TEXT NOT NULL,
                            filePath TEXT NOT NULL,
                            fileName TEXT NOT NULL,
                            mimeType TEXT,
                            description TEXT,
                            detailedDescription TEXT,
                            fileSize INTEGER,
                            organizationId TEXT,
                            createdAt TEXT NOT NULL,
                            updatedAt TEXT NOT NULL,
                            FOREIGN KEY (yamlFileId) REFERENCES graphvizYamlFiles(id) ON DELETE CASCADE,
                            FOREIGN KEY (organizationId) REFERENCES organizations(id)
                        )",
                        [],
                    );
                    
                    // ファイル情報を保存
                    match conn.execute(
                        "INSERT INTO graphvizYamlFileAttachments (
                            id, yamlFileId, filePath, fileName, mimeType,
                            description, detailedDescription, fileSize, organizationId,
                            createdAt, updatedAt
                        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                        rusqlite::params![
                            file_id,
                            yaml_file_id,
                            file_path.to_string_lossy().to_string(),
                            file_name,
                            mime_type,
                            description,
                            detailed_description,
                            file_size,
                            organization_id,
                            now,
                            now,
                        ],
                    ) {
                        Ok(_) => {
                            eprintln!("✅ [save_graphviz_yaml_file_attachment] ファイルを保存しました: file_id={}, yaml_file_id={}, filePath={}", file_id, yaml_file_id, file_path.to_string_lossy());
                            let mut result = HashMap::new();
                            result.insert("success".to_string(), Value::Bool(true));
                            result.insert("file_path".to_string(), Value::String(file_path.to_string_lossy().to_string()));
                            result.insert("file_id".to_string(), Value::String(file_id));
                            Ok(result)
                        }
                        Err(e) => {
                            eprintln!("❌ [save_graphviz_yaml_file_attachment] データベースへの保存に失敗しました: error={}", e);
                            let mut result = HashMap::new();
                            result.insert("success".to_string(), Value::Bool(false));
                            result.insert("error".to_string(), Value::String(format!("データベースへの保存に失敗しました: {}", e)));
                            Ok(result)
                        }
                    }
                } else {
                    let mut result = HashMap::new();
                    result.insert("success".to_string(), Value::Bool(false));
                    result.insert("error".to_string(), Value::String("データベースコネクションの取得に失敗しました".to_string()));
                    Ok(result)
                }
            } else {
                let mut result = HashMap::new();
                result.insert("success".to_string(), Value::Bool(false));
                result.insert("error".to_string(), Value::String("データベースが初期化されていません".to_string()));
                Ok(result)
            }
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("ファイル書き込みエラー: {}", e)));
            Ok(result)
        }
    }
}

/// トピック画像を保存（後方互換性のため保持）
/// 
/// @deprecated このコマンドは後方互換性のため保持されています。新しいコードでは`save_topic_file`を使用してください。
#[tauri::command]
pub async fn save_topic_image(
    app: AppHandle,
    organization_id: String,
    topic_id: String,
    image_bytes: Vec<u8>,
    file_name: String,
) -> Result<HashMap<String, Value>, String> {
    save_topic_file(
        app,
        organization_id,
        topic_id,
        image_bytes,
        file_name,
        None,
        None,
        None,
        None,
        None,
    ).await
}

/// ファイルをシステムのデフォルトアプリケーションで開く
/// 
/// # 引数
/// - `file_path`: 開くファイルのパス
/// 
/// # 戻り値
/// - `success`: 成功したかどうか
/// - `error`: エラーメッセージ（失敗時）
#[tauri::command]
pub async fn open_file(file_path: String) -> Result<HashMap<String, Value>, String> {
    let path = Path::new(&file_path);
    
    // ファイルが存在するか確認
    if !path.exists() {
        let mut result = HashMap::new();
        result.insert("success".to_string(), Value::Bool(false));
        result.insert("error".to_string(), Value::String("ファイルが存在しません".to_string()));
        return Ok(result);
    }
    
    // プラットフォームごとに適切なコマンドを実行
    let output = if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&file_path)
            .output()
    } else if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", "", &file_path])
            .output()
    } else {
        // Linux
        Command::new("xdg-open")
            .arg(&file_path)
            .output()
    };
    
    match output {
        Ok(output) => {
            if output.status.success() {
                let mut result = HashMap::new();
                result.insert("success".to_string(), Value::Bool(true));
                Ok(result)
            } else {
                let error_msg = String::from_utf8_lossy(&output.stderr);
                let mut result = HashMap::new();
                result.insert("success".to_string(), Value::Bool(false));
                result.insert("error".to_string(), Value::String(format!("ファイルを開けませんでした: {}", error_msg)));
                Ok(result)
            }
        }
        Err(e) => {
            let mut result = HashMap::new();
            result.insert("success".to_string(), Value::Bool(false));
            result.insert("error".to_string(), Value::String(format!("コマンド実行エラー: {}", e)));
            Ok(result)
        }
    }
}

