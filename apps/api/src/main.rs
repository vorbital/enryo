use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod channels;
mod db;
mod llm;
mod messages;
mod users;
mod workspaces;
mod ws;

pub use db::DbPool;

pub type AppState = Arc<State>;

pub struct State {
    pub db: DbPool,
    pub jwt_secret: String,
    pub llm_url: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");
    let llm_url = std::env::var("LLM_URL")
        .unwrap_or_else(|_| "http://localhost:8080".to_string());

    let db = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&db).await?;

    let state = Arc::new(State {
        db,
        jwt_secret,
        llm_url,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/auth/register", post(auth::register))
        .route("/auth/login", post(auth::login))
        .route("/auth/refresh", post(auth::refresh))
        .nest("/workspaces", workspaces::router())
        .nest("/channels", channels::router())
        .route("/ws", get(ws::handler))
        .layer(cors)
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:3001").await?;
    tracing::info!("Server running on http://0.0.0.0:3001");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> &'static str {
    "OK"
}
