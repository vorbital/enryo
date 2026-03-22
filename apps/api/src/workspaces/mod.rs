pub mod handlers;

use axum::{
    routing::{get, post},
    Router,
};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handlers::list).post(handlers::create))
        .route("/:slug", get(handlers::get))
        .route("/:slug/channels", get(handlers::list_channels).post(handlers::create_channel))
}

pub use handlers::*;
