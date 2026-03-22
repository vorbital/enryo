use crate::{auth::jwt::verify_token, AppState};
use axum::{
    extract::{HeaderMap, Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
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

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub author_id: Uuid,
    pub content: String,
    pub is_pertinent: bool,
    pub parent_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
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

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<Channel>, crate::auth::AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let channel = sqlx::query_as!(
        Channel,
        "SELECT id, workspace_id, name, topic, position FROM channels WHERE id = $1",
        id
    )
    .fetch_optional(&*state.db)
    .await?
    .ok_or(crate::auth::AuthError::InvalidToken)?;

    Ok(Json(channel))
}

pub async fn list_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<Uuid>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<Vec<MessageWithAuthor>>, crate::auth::AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let limit = pagination.limit.unwrap_or(50).min(100);

    let messages = if let Some(before) = pagination.before {
        sqlx::query_as!(
            MessageWithAuthor,
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent, 
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1 AND m.id < $2
            ORDER BY m.created_at DESC
            LIMIT $3
            "#,
            channel_id,
            before,
            limit
        )
        .fetch_all(&*state.db)
        .await?
    } else {
        sqlx::query_as!(
            MessageWithAuthor,
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2
            "#,
            channel_id,
            limit
        )
        .fetch_all(&*state.db)
        .await?
    };

    Ok(Json(messages))
}

pub async fn create_message(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<Uuid>,
    Json(payload): Json<CreateMessage>,
) -> Result<Json<MessageWithAuthor>, crate::auth::AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let is_pertinent = crate::llm::score_pertinence(&payload.content, &state.llm_url)
        .await
        .unwrap_or(true);

    let message = sqlx::query_as!(
        MessageWithAuthor,
        r#"
        INSERT INTO messages (channel_id, author_id, content, is_pertinent)
        VALUES ($1, $2, $3, $4)
        RETURNING id, channel_id, author_id, content, is_pertinent, parent_id, created_at
        "#,
        channel_id,
        user_id,
        payload.content,
        is_pertinent
    )
    .fetch_one(&*state.db)
    .await?;

    let user: (String, Option<String>) = sqlx::query_as(
        "SELECT display_name, avatar_url FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_one(&*state.db)
    .await?;

    let response = MessageWithAuthor {
        author_name: user.0,
        author_avatar: user.1,
        ..message
    };

    Ok(Json(response))
}

pub async fn relevant_messages(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(channel_id): Path<Uuid>,
    Query(pagination): Query<Pagination>,
) -> Result<Json<Vec<MessageWithAuthor>>, crate::auth::AuthError> {
    extract_user_id(&headers, &state.jwt_secret)?;

    let limit = pagination.limit.unwrap_or(50).min(100);

    let messages = if let Some(before) = pagination.before {
        sqlx::query_as!(
            MessageWithAuthor,
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1 AND m.is_pertinent = true AND m.id < $2
            ORDER BY m.created_at DESC
            LIMIT $3
            "#,
            channel_id,
            before,
            limit
        )
        .fetch_all(&*state.db)
        .await?
    } else {
        sqlx::query_as!(
            MessageWithAuthor,
            r#"
            SELECT m.id, m.channel_id, m.author_id, m.content, m.is_pertinent,
                   m.parent_id, m.created_at, u.display_name as author_name, u.avatar_url as author_avatar
            FROM messages m
            INNER JOIN users u ON m.author_id = u.id
            WHERE m.channel_id = $1 AND m.is_pertinent = true
            ORDER BY m.created_at DESC
            LIMIT $2
            "#,
            channel_id,
            limit
        )
        .fetch_all(&*state.db)
        .await?
    };

    Ok(Json(messages))
}

fn extract_user_id(headers: &HeaderMap, secret: &str) -> Result<Uuid, crate::auth::AuthError> {
    let auth_header = headers
        .get("Authorization")
        .ok_or(crate::auth::AuthError::InvalidToken)?;
    let token = auth_header
        .to_str()
        .map_err(|_| crate::auth::AuthError::InvalidToken)?;
    let token = token.strip_prefix("Bearer ").ok_or(crate::auth::AuthError::InvalidToken)?;
    let claims = verify_token(token, secret)?;
    Ok(Uuid::parse_str(&claims.sub).map_err(|_| crate::auth::AuthError::InvalidToken)?)
}

#[derive(Debug, Deserialize)]
pub struct CreateMessage {
    pub content: String,
}
