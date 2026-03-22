use axum::WebSocket;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::auth::jwt::verify_token;
use crate::AppState;

#[derive(Debug, Clone, serde::Serialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_pertinent: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

pub async fn handle_connection(
    ws: WebSocket,
    state: Arc<crate::State>,
    token: String,
) {
    let claims = match verify_token(&token, &state.jwt_secret) {
        Ok(c) => c,
        Err(_) => return,
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return,
    };

    let (mut sender, mut receiver) = ws.split();

    while let Some(msg) = receiver.next().await {
        if let Ok(msg) = msg {
            if let Ok(text) = msg.to_str() {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(text) {
                    let response = process_message(&state, user_id, parsed).await;
                    if let Some(resp) = response {
                        let _ = sender.send(axum::extract::ws::Message::Text(
                            serde_json::to_string(&resp).unwrap_or_default(),
                        )).await;
                    }
                }
            }
        } else {
            break;
        }
    }
}

async fn process_message(
    state: &Arc<crate::State>,
    user_id: Uuid,
    msg: serde_json::Value,
) -> Option<WsMessage> {
    let msg_type = msg.get("type")?.as_str()?;

    match msg_type {
        "send_message" => {
            let channel_id: Uuid = msg.get("channelId")?.as_str().and_then(|s| Uuid::parse_str(s).ok())?;
            let content: String = msg.get("content")?.as_str()?.to_string();

            let is_pertinent = crate::llm::score_pertinence(&content, &state.llm_url)
                .await
                .unwrap_or(true);

            let row: (Uuid, chrono::DateTime<chrono::Utc>) = sqlx::query_as(
                "INSERT INTO messages (channel_id, author_id, content, is_pertinent) VALUES ($1, $2, $3, $4) RETURNING id, created_at"
            )
            .bind(channel_id)
            .bind(user_id)
            .bind(&content)
            .bind(is_pertinent)
            .fetch_one(&*state.db)
            .await
            .ok()?;

            let user: (String,) = sqlx::query_as(
                "SELECT display_name FROM users WHERE id = $1"
            )
            .bind(user_id)
            .fetch_one(&*state.db)
            .await
            .ok()?;

            Some(WsMessage {
                msg_type: "message".to_string(),
                message_id: Some(row.0),
                channel_id: Some(channel_id),
                content: Some(content),
                author_id: Some(user_id),
                author_name: Some(user.0),
                is_pertinent: Some(is_pertinent),
                created_at: Some(row.1.to_rfc3339()),
                user_id: None,
                display_name: None,
            })
        }
        _ => None,
    }
}
