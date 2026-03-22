pub mod handlers;

use axum::{
    extract::{Query, State, WebSocketUpgrade},
    response::Response,
    Extension,
};
use crate::AppState;

pub async fn handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(params): Query<AuthQuery>,
) -> Response {
    ws.on_upgrade(move |socket| {
        handlers::handle_connection(socket, state, params.token)
    })
}

#[derive(Debug, serde::Deserialize)]
pub struct AuthQuery {
    pub token: String,
}
