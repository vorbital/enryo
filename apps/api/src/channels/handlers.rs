use crate::auth::{verify_token, AuthError};
use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Channel {
    pub id: Uuid,
    pub workspace_id: Uuid,
    pub name: String,
    pub topic: Option<String>,
    pub position: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannel {
    pub name: String,
    pub topic: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub is_pertinent: bool,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct MessageWithAuthor {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub is_pertinent: bool,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub author_name: String,
    pub author_avatar: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Pagination {
    pub before: Option<Uuid>,
    pub limit: Option<i64>,
}

pub fn extract_user_id(headers: &HeaderMap, secret: &str) -> Result<Uuid, AuthError> {
    let auth_header = headers
        .get("Authorization")
        .ok_or(AuthError::InvalidToken)?;
    let token = auth_header
        .to_str()
        .map_err(|_| AuthError::InvalidToken)?;
    let token = token.strip_prefix("Bearer ").ok_or(AuthError::InvalidToken)?;
    let claims = verify_token(token, secret)?;
    Ok(Uuid::parse_str(&claims.sub).map_err(|_| AuthError::InvalidToken)?)
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<Channel>, AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let channel = sqlx::query_as::<_, Channel>(
        "SELECT id, workspace_id, name, topic, position FROM channels WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| AuthError::Database)?
    .ok_or(AuthError::InvalidToken)?;

    Ok(Json(channel))
}

#[derive(Debug, Deserialize)]
pub struct UpdateChannel {
    pub name: Option<String>,
    pub topic: Option<String>,
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateChannel>,
) -> Result<Json<Channel>, AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let channel = sqlx::query_as::<_, Channel>(
        "SELECT id, workspace_id, name, topic, position FROM channels WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| AuthError::Database)?
    .ok_or(AuthError::InvalidToken)?;

    let name = payload.name.unwrap_or(channel.name);
    let topic = payload.topic.or(channel.topic);

    let updated: Channel = sqlx::query_as(
        r#"
        UPDATE channels SET name = $1, topic = $2 WHERE id = $3
        RETURNING id, workspace_id, name, topic, position
        "#,
    )
    .bind(&name)
    .bind(&topic)
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    Ok(Json(updated))
}

pub async fn list_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<Uuid>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<Vec<MessageWithAuthor>>, AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let limit = pagination.limit.unwrap_or(50).min(100);

    let messages = if let Some(before) = pagination.before {
        sqlx::query_as::<_, MessageWithAuthor>(
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent, 
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1 AND m.id < $2
            ORDER BY m.created_at DESC
            LIMIT $3
            "#,
        )
        .bind(channel_id)
        .bind(before)
        .bind(limit)
        .fetch_all(&state.db)
        .await
        .map_err(|_| AuthError::Database)?
    } else {
        sqlx::query_as::<_, MessageWithAuthor>(
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2
            "#,
        )
        .bind(channel_id)
        .bind(limit)
        .fetch_all(&state.db)
        .await
        .map_err(|_| AuthError::Database)?
    };

    Ok(Json(messages))
}

#[derive(Debug, Deserialize)]
pub struct CreateMessage {
    pub content: String,
    pub parent_id: Option<Uuid>,
}

pub async fn create_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<CreateMessage>,
) -> Result<Json<MessageWithAuthor>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let is_pertinent = crate::llm::score_pertinence(&payload.content, &state.llm_url)
        .await
        .unwrap_or(true);

    let message: Message = sqlx::query_as::<_, Message>(
        r#"
        INSERT INTO messages (channel_id, author_id, content, is_pertinent, parent_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, channel_id, author_id, content, is_pertinent, parent_id, created_at
        "#,
    )
    .bind(channel_id)
    .bind(user_id)
    .bind(&payload.content)
    .bind(is_pertinent)
    .bind(payload.parent_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    let user: (String, Option<String>) = sqlx::query_as(
        "SELECT display_name, avatar_url FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    let response = MessageWithAuthor {
        id: message.id,
        channel_id: message.channel_id,
        author_id: message.author_id,
        content: message.content,
        is_pertinent: message.is_pertinent,
        parent_id: message.parent_id,
        created_at: message.created_at,
        author_name: user.0,
        author_avatar: user.1,
    };

    Ok(Json(response))
}

pub async fn relevant_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<Uuid>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<Vec<MessageWithAuthor>>, AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let limit = pagination.limit.unwrap_or(50).min(100);

    let messages = if let Some(before) = pagination.before {
        sqlx::query_as::<_, MessageWithAuthor>(
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1 AND m.is_pertinent = true AND m.id < $2
            ORDER BY m.created_at DESC
            LIMIT $3
            "#,
        )
        .bind(channel_id)
        .bind(before)
        .bind(limit)
        .fetch_all(&state.db)
        .await
        .map_err(|_| AuthError::Database)?
    } else {
        sqlx::query_as::<_, MessageWithAuthor>(
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1 AND m.is_pertinent = true
            ORDER BY m.created_at DESC
            LIMIT $2
            "#,
        )
        .bind(channel_id)
        .bind(limit)
        .fetch_all(&state.db)
        .await
        .map_err(|_| AuthError::Database)?
    };

    Ok(Json(messages))
}

pub async fn get_thread(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(message_id): Path<Uuid>,
) -> Result<Json<Vec<MessageWithAuthor>>, AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let replies = sqlx::query_as::<_, MessageWithAuthor>(
        r#"
        SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
               m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
        FROM messages m
        INNER JOIN users u ON m.author_id = u.id
        WHERE m.parent_id = $1
        ORDER BY m.created_at ASC
        "#,
    )
    .bind(message_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    Ok(Json(replies))
}
