use crate::AppState;
use axum::{
    routing::{delete, get},
    Router,
};

mod handlers;

pub use handlers::{Channel, CreateChannel};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/:id", get(handlers::get).patch(handlers::update))
        .route(
            "/:id/messages",
            get(handlers::list_messages).post(handlers::create_message),
        )
        .route("/:id/messages/relevant", get(handlers::relevant_messages))
        .route("/messages/:message_id/replies", get(handlers::get_thread))
        .route(
            "/:channel_id/messages/:message_id",
            delete(handlers::delete_message),
        )
}
