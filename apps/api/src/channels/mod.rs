pub mod handlers;

use axum::{routing::get, Router};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:id", get(handlers::get))
        .route("/:id/messages", get(handlers::list_messages).post(handlers::create_message))
        .route("/:id/messages/relevant", get(handlers::relevant_messages))
}

pub use handlers::*;
