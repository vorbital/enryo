use axum::{routing::{get, patch}, Router};
use crate::AppState;

mod handlers;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(handlers::list).post(handlers::create))
        .route("/:slug", get(handlers::get))
        .route("/:slug/channels", get(handlers::list_channels).post(handlers::create_channel))
        .route("/:slug/settings", get(handlers::get_settings).patch(handlers::update_settings))
}
