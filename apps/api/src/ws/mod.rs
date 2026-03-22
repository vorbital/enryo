use axum::{
    extract::{Query, State, WebSocketUpgrade},
    response::Response,
};
use std::sync::Arc;
use crate::AppState;

mod handlers;

pub use handlers::{handle_connection, WsMessage, AuthQuery};

pub async fn handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(params): Query<AuthQuery>,
) -> Response {
    ws.on_upgrade(move |socket| {
        handle_connection(socket, Arc::new(state), params.token)
    })
}
