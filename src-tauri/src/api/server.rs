use axum::Router;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tower::ServiceBuilder;

// SQLite削除のため、get_dbのインポートは不要（Supabase専用）
// use crate::database::get_db;

pub async fn start_api_server(addr: SocketAddr) -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("🚀 APIサーバーを起動中: http://{}", addr);
    
    // SQLiteデータベースの初期化チェックは削除（Supabase専用のため）
    // 注意: APIサーバーはSupabaseを使用するため、SQLiteの初期化は不要
    
    // CORS設定（プリフライトリクエストを適切に処理）
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false)
        .max_age(std::time::Duration::from_secs(3600));
    
    // ルーターの作成
    let app: Router = crate::api::routes::create_routes()
        .layer(ServiceBuilder::new().layer(cors));
    
    // サーバーの起動
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("✅ APIサーバーが起動しました: http://{}", addr);
    
    axum::serve(listener, app).await?;
    
    Ok(())
}
