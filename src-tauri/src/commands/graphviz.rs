/**
 * Graphviz YAML/DOTファイル関連のTauriコマンド
 * JavaScript側からYAML/DOTファイルを管理するためのAPI
 */

use crate::database::{
    create_graphviz_yaml_file, update_graphviz_yaml_file, get_graphviz_yaml_file_by_id,
    get_all_graphviz_yaml_files, delete_graphviz_yaml_file,
    create_graphviz_dot_file, get_graphviz_dot_file_by_yaml_file_id,
};

/// YAMLファイルを作成
#[tauri::command]
pub fn create_graphviz_yaml_file_cmd(
    name: String,
    description: Option<String>,
    yaml_content: String,
    yaml_schema: Option<String>,
    yaml_type: Option<String>,
    organization_id: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<serde_json::Value, String> {
    match create_graphviz_yaml_file(
        name,
        description,
        yaml_content,
        yaml_schema,
        yaml_type,
        organization_id,
        tags,
    ) {
        Ok(yaml_file) => Ok(serde_json::to_value(yaml_file).unwrap()),
        Err(e) => Err(format!("YAMLファイルの作成に失敗しました: {}", e)),
    }
}

/// YAMLファイルを更新
#[tauri::command]
pub fn update_graphviz_yaml_file_cmd(
    id: String,
    name: Option<String>,
    description: Option<String>,
    yaml_content: Option<String>,
    yaml_schema: Option<String>,
    yaml_type: Option<String>,
    tags: Option<Vec<String>>,
    semantic_category: Option<String>,
    keywords: Option<String>,
    content_summary: Option<String>,
) -> Result<serde_json::Value, String> {
    match update_graphviz_yaml_file(
        &id,
        name,
        description,
        yaml_content,
        yaml_schema,
        yaml_type,
        tags,
        semantic_category,
        keywords,
        content_summary,
    ) {
        Ok(yaml_file) => Ok(serde_json::to_value(yaml_file).unwrap()),
        Err(e) => Err(format!("YAMLファイルの更新に失敗しました: {}", e)),
    }
}

/// IDでYAMLファイルを取得
#[tauri::command]
pub fn get_graphviz_yaml_file_cmd(id: String) -> Result<serde_json::Value, String> {
    match get_graphviz_yaml_file_by_id(&id) {
        Ok(yaml_file) => Ok(serde_json::to_value(yaml_file).unwrap()),
        Err(e) => Err(format!("YAMLファイルの取得に失敗しました: {}", e)),
    }
}

/// すべてのYAMLファイルを取得
#[tauri::command]
pub fn get_all_graphviz_yaml_files_cmd(organization_id: Option<String>) -> Result<Vec<serde_json::Value>, String> {
    match get_all_graphviz_yaml_files(organization_id) {
        Ok(yaml_files) => Ok(yaml_files.into_iter().map(|y| serde_json::to_value(y).unwrap()).collect()),
        Err(e) => Err(format!("YAMLファイル一覧の取得に失敗しました: {}", e)),
    }
}

/// YAMLファイルを削除
#[tauri::command]
pub fn delete_graphviz_yaml_file_cmd(id: String) -> Result<(), String> {
    match delete_graphviz_yaml_file(&id) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("YAMLファイルの削除に失敗しました: {}", e)),
    }
}

/// DOTファイルを作成
#[tauri::command]
pub fn create_graphviz_dot_file_cmd(
    yaml_file_id: String,
    name: String,
    description: Option<String>,
    dot_content: String,
    graph_type: String,
    view_type: Option<String>,
    node_count: Option<i32>,
    edge_count: Option<i32>,
    organization_id: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<serde_json::Value, String> {
    match create_graphviz_dot_file(
        yaml_file_id,
        name,
        description,
        dot_content,
        graph_type,
        view_type,
        node_count,
        edge_count,
        organization_id,
        tags,
    ) {
        Ok(dot_file) => Ok(serde_json::to_value(dot_file).unwrap()),
        Err(e) => Err(format!("DOTファイルの作成に失敗しました: {}", e)),
    }
}

/// YAMLファイルIDでDOTファイルを取得
#[tauri::command]
pub fn get_graphviz_dot_file_cmd(yaml_file_id: String) -> Result<Option<serde_json::Value>, String> {
    match get_graphviz_dot_file_by_yaml_file_id(&yaml_file_id) {
        Ok(Some(dot_file)) => Ok(Some(serde_json::to_value(dot_file).unwrap())),
        Ok(None) => Ok(None),
        Err(e) => Err(format!("DOTファイルの取得に失敗しました: {}", e)),
    }
}

