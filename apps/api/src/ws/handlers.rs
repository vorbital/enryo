use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use uuid::Uuid;
use sqlx::FromRow;

use crate::auth::verify_token;
use crate::AppState;

#[derive(Debug, Clone, sqlx::FromRow)]
struct StoredMessage {
    id: Uuid,
    channel_id: Uuid,
    author_id: Uuid,
    content: String,
    is_pertinent: bool,
    parent_id: Option<Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
}

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

#[derive(Debug, serde::Deserialize)]
pub struct AuthQuery {
    pub token: String,
}

pub async fn handle_connection(
    ws: WebSocket,
    state: Arc<AppState>,
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

    tracing::info!("WebSocket client connected: {}", user_id);

    let (mut sender, mut receiver) = ws.split();
    let mut broadcaster_rx = state.broadcaster.subscribe();

    let mut subscribed_channels: Vec<Uuid> = Vec::new();

    loop {
        tokio::select! {
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&text) {
                            let msg_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("");
                            
                            if msg_type == "subscribe" {
                                if let Some(channel_id_str) = parsed.get("channelId").and_then(|v| v.as_str()) {
                                    if let Ok(channel_id) = Uuid::parse_str(channel_id_str) {
                                        if !subscribed_channels.contains(&channel_id) {
                                            subscribed_channels.push(channel_id);
                                        }
                                        tracing::info!("User {} subscribed to channel {}", user_id, channel_id);
                                    }
                                }
                                continue;
                            }
                            
                            if let Some(response) = process_client_message(&state, user_id, &parsed).await {
                                let _ = state.broadcaster.send(response.clone());
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break;
                    }
                    _ => {}
                }
            }
            broadcast_msg = broadcaster_rx.recv() => {
                match broadcast_msg {
                    Ok(msg) => {
                        if let Some(channel_id) = msg.channel_id {
                            if subscribed_channels.contains(&channel_id) {
                                let json = serde_json::to_string(&msg).unwrap_or_default();
                                if sender.send(Message::Text(json)).await.is_err() {
                                    break;
                                }
                            }
                        }
                    }
                    Err(_) => {}
                }
            }
        }
    }

    tracing::info!("WebSocket client disconnected: {}", user_id);
}

async fn process_client_message(
    state: &Arc<AppState>,
    user_id: Uuid,
    msg: &serde_json::Value,
) -> Option<WsMessage> {
    let msg_type = msg.get("type")?.as_str()?;

    match msg_type {
        "send_message" => {
            let channel_id_str = msg.get("channelId")?.as_str()?;
            let channel_id = Uuid::parse_str(channel_id_str).ok()?;
            let content = msg.get("content")?.as_str()?.to_string();

            let is_pertinent = crate::llm::score_pertinence(&content, &state.llm_url)
                .await
                .unwrap_or(true);

            let stored_msg: Result<StoredMessage, _> = sqlx::query_as(
                r#"
                INSERT INTO messages (channel_id, author_id, content, is_pertinent)
                VALUES ($1, $2, $3, $4)
                RETURNING id, channel_id, author_id, content, is_pertinent, parent_id, created_at
                "#,
            )
            .bind(channel_id)
            .bind(user_id)
            .bind(&content)
            .bind(is_pertinent)
            .fetch_one(&state.db)
            .await;

            if let Ok(msg) = stored_msg {
                let author_name: Option<String> = sqlx::query_scalar(
                    "SELECT display_name FROM users WHERE id = $1"
                )
                .bind(user_id)
                .fetch_optional(&state.db)
                .await
                .ok()
                .flatten();

                Some(WsMessage {
                    msg_type: "message".to_string(),
                    message_id: Some(msg.id),
                    channel_id: Some(msg.channel_id),
                    content: Some(msg.content),
                    author_id: Some(msg.author_id),
                    author_name,
                    is_pertinent: Some(msg.is_pertinent),
                    created_at: Some(msg.created_at.to_rfc3339()),
                    user_id: None,
                    display_name: None,
                })
            } else {
                None
            }
        }
        _ => None,
    }
}
