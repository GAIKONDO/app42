// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;
mod api;
mod db;

use std::net::SocketAddr;
// SQLite削除のため、以下のインポートは不要（後方互換性のためコメントアウト）
// use tauri::Manager;
// use db::{WriteJob, WriteWorker, WriteQueueState};

fn main() {
    // ログシステムの初期化（リリースビルドではINFOレベル）
    tracing_subscriber::fmt()
        .with_max_level(if cfg!(debug_assertions) {
            tracing::Level::DEBUG
        } else {
            tracing::Level::INFO
        })
        .with_target(false)
        .init();
    
    tauri::Builder::default()
        .setup(|_app| {
            // 開発環境でのみ環境変数ファイルを読み込む
            #[cfg(debug_assertions)]
            {
                // 環境変数ファイルの読み込み（local.envを優先、なければ.env）
                if let Err(_e) = dotenv::from_filename("local.env") {
                    // local.envがない場合は.envを試す
                    if dotenv::from_filename(".env").is_err() {
                        eprintln!("⚠️  環境変数ファイル（local.env または .env）が見つかりません。環境変数から直接読み込みます。");
                    }
                } else {
                    eprintln!("✅ 環境変数ファイル（local.env）を読み込みました");
                }
            }
            
            // リリースビルドでは静的ファイルをTauriのカスタムプロトコルで配信
            // Node.jsサーバーは不要（静的エクスポートを使用）
            #[cfg(not(debug_assertions))]
            {
                eprintln!("✅ 静的ファイルをTauriのカスタムプロトコルで配信します");
                eprintln!("   Node.jsは不要です");
            }
            
            // SQLiteデータベースの初期化は削除（Supabase専用のため）
            // 認証はSupabaseを使用するため、SQLiteの初期化は不要
            #[cfg(debug_assertions)]
            eprintln!("ℹ️  SQLiteデータベースの初期化をスキップしました（Supabase専用）");
            
            // Rust APIサーバーの起動は無効化（Supabase専用のため、TypeScript側はSupabaseを直接使用）
            // 注意: TypeScript側はSupabaseを直接使用するため、Rust側のAPIサーバーは不要
            // ポート競合を避けるため、APIサーバーの起動をスキップ
            #[cfg(debug_assertions)]
            eprintln!("ℹ️  Rust APIサーバーの起動をスキップしました（Supabase専用）");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 認証コマンド（Supabaseを使用するため、SQLiteの初期化は不要だがコマンドは残す）
            // 注意: 認証はSupabaseを使用するため、これらのコマンドは実際には使用されない
            commands::db::sign_in,
            commands::db::sign_up,
            commands::db::sign_out,
            commands::db::get_current_user,
            // ドキュメント操作コマンド（SQLite削除のため無効化、後方互換性のため残す）
            // 注意: TypeScript側からは呼び出されない（Supabaseを使用）
            commands::db::doc_get,
            commands::db::doc_set,
            commands::db::doc_update,
            commands::db::doc_delete,
            commands::db::delete_meeting_note_with_relations,
            commands::db::update_meeting_note_item_content,
            // コレクション操作コマンド（SQLite削除のため無効化、後方互換性のため残す）
            commands::db::collection_add,
            commands::db::collection_get,
            // クエリ操作コマンド（SQLite削除のため無効化、後方互換性のため残す）
            commands::db::query_get,
            // データエクスポート/インポートコマンド（SQLite削除のため無効化、後方互換性のため残す）
            commands::db::export_database_data,
            commands::db::import_database_data,
            commands::db::export_organizations_and_members,
            // アプリ情報コマンド
            commands::app::get_version,
            commands::app::get_path,
            commands::app::get_database_path,
            commands::app::get_project_root,
            commands::app::check_database_status,
            commands::app::reinitialize_database,
            commands::app::list_tables,
            commands::app::diagnose_database,
            commands::app::get_table_schema,
            commands::app::update_chroma_sync_status,
            // 組織管理コマンド
            commands::organization::create_org,
            commands::organization::update_org,
            commands::organization::update_org_parent,
            commands::organization::get_org,
            commands::organization::search_orgs_by_name,
            commands::organization::get_orgs_by_parent,
            commands::organization::get_org_tree,
            commands::organization::delete_org,
            commands::organization::add_org_member,
            commands::organization::update_org_member,
            commands::organization::get_org_member,
            commands::organization::get_org_members,
            commands::organization::delete_org_member,
            commands::organization::update_theme_positions_cmd,
            commands::organization::get_themes_cmd,
            commands::organization::get_deletion_targets_cmd,
            // 事業会社管理コマンドは削除（事業会社ページ削除のため）
            // commands::companies::create_company_cmd,
            // commands::companies::update_company_cmd,
            // commands::companies::get_company,
            // commands::companies::get_company_by_code_cmd,
            // commands::companies::get_companies_by_org,
            // commands::companies::get_all_companies_cmd,
            // commands::companies::delete_company_cmd,
            // 組織と事業会社の表示関係管理コマンドは削除（事業会社ページ削除のため）
            // commands::organization_company_display::create_org_company_display,
            // commands::organization_company_display::get_companies_by_org_display,
            // commands::organization_company_display::get_organizations_by_company_display_cmd,
            // commands::organization_company_display::get_all_org_company_displays,
            // commands::organization_company_display::update_org_company_display_order,
            // commands::organization_company_display::delete_org_company_display,
            // commands::organization_company_display::delete_org_company_display_by_ids,
            // commands::organization_company_display::delete_all_org_company_displays_by_org,
            // commands::organization_company_display::delete_all_org_company_displays_by_company,
            // ChromaDBコマンドは削除されました（Supabase専用のため）
            // 後方互換性のため、コマンドは残していますが、TypeScript側からは呼び出されません
            // システム設計ドキュメントセクション管理コマンド
            commands::design_doc::create_design_doc_section_cmd,
            commands::design_doc::update_design_doc_section_cmd,
            commands::design_doc::get_design_doc_section_cmd,
            commands::design_doc::get_all_design_doc_sections_cmd,
            commands::design_doc::get_all_design_doc_sections_lightweight_cmd,
            commands::design_doc::delete_design_doc_section_cmd,
            // システム設計ドキュメントセクション関係管理コマンド
            commands::design_doc::create_design_doc_section_relation_cmd,
            commands::design_doc::update_design_doc_section_relation_cmd,
            commands::design_doc::get_design_doc_section_relation_cmd,
            commands::design_doc::get_design_doc_section_relations_by_section_cmd,
            commands::design_doc::get_all_design_doc_section_relations_cmd,
            commands::design_doc::delete_design_doc_section_relation_cmd,
            // ファイル操作コマンド
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::file_exists,
            commands::fs::save_topic_file,
            commands::fs::save_topic_image, // 後方互換性のため保持
            commands::fs::save_graphviz_yaml_file_attachment,
            commands::fs::open_file,
            commands::fs::open_url,
            // PlantUMLコマンド
            commands::plantuml::render_plantuml,
            commands::plantuml::check_java_installed,
            // Agentシステムコマンド
            commands::agent_system::save_task_command,
            commands::agent_system::get_task_command,
            commands::agent_system::get_all_tasks_command,
            commands::agent_system::delete_task_command,
            commands::agent_system::save_task_execution_command,
            commands::agent_system::get_task_execution_command,
            commands::agent_system::get_task_executions_command,
            commands::agent_system::get_all_task_executions_command,
            commands::agent_system::save_task_chain_command,
            commands::agent_system::get_task_chain_command,
            commands::agent_system::get_all_task_chains_command,
            commands::agent_system::delete_task_chain_command,
            commands::agent_system::save_agent_command,
            commands::agent_system::get_agent_command,
            commands::agent_system::get_all_agents_command,
            commands::agent_system::delete_agent_command,
            commands::agent_system::save_mcp_tool_command,
            commands::agent_system::get_mcp_tool_command,
            commands::agent_system::get_all_mcp_tools_command,
            commands::agent_system::get_enabled_mcp_tools_command,
            commands::agent_system::delete_mcp_tool_command,
            commands::agent_system::update_mcp_tool_enabled_command,
            // システムリソース監視コマンド
            commands::system::get_system_resources,
            commands::system::get_process_resources,
            // Graphvizコマンド
            commands::graphviz::create_graphviz_yaml_file_cmd,
            commands::graphviz::update_graphviz_yaml_file_cmd,
            commands::graphviz::get_graphviz_yaml_file_cmd,
            commands::graphviz::get_all_graphviz_yaml_files_cmd,
            commands::graphviz::delete_graphviz_yaml_file_cmd,
            commands::graphviz::create_graphviz_dot_file_cmd,
            commands::graphviz::get_graphviz_dot_file_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

