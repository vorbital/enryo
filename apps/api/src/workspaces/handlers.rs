use crate::auth::{verify_token, AuthError};
use crate::channels::{Channel, CreateChannel};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Workspace {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub owner_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkspace {
    pub name: String,
    pub slug: String,
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

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<Workspace>>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspaces = sqlx::query_as::<_, Workspace>(
        r#"
        SELECT id, name, slug, owner_id
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY w.name
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    Ok(Json(workspaces))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateWorkspace>,
) -> Result<Json<Workspace>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspace = sqlx::query_as::<_, Workspace>(
        r#"
        INSERT INTO workspaces (name, slug, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, slug, owner_id
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.slug)
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    sqlx::query(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
    )
    .bind(workspace.id)
    .bind(user_id)
    .execute(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    sqlx::query(
        "INSERT INTO channels (workspace_id, name, topic, position) VALUES ($1, 'general', 'General discussion', 0)",
    )
    .bind(workspace.id)
    .execute(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    Ok(Json(workspace))
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Workspace>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspace = sqlx::query_as::<_, Workspace>(
        r#"
        SELECT id, name, slug, owner_id
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        "#,
    )
    .bind(&slug)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| AuthError::Database)?
    .ok_or(AuthError::InvalidToken)?;

    Ok(Json(workspace))
}

pub async fn list_channels(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<Channel>>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let channels = sqlx::query_as::<_, Channel>(
        r#"
        SELECT c.id, c.workspace_id, c.name, c.topic, c.position
        FROM channels c
        INNER JOIN workspaces w ON c.workspace_id = w.id
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        ORDER BY c.position
        "#,
    )
    .bind(&slug)
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    Ok(Json(channels))
}

pub async fn create_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(payload): Json<CreateChannel>,
) -> Result<Json<Channel>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspace_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT w.id
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        "#,
    )
    .bind(&slug)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| AuthError::Database)?
    .ok_or(AuthError::InvalidToken)?;

    let max_pos = sqlx::query_scalar::<_, i32>(
        "SELECT COALESCE(MAX(position), -1) FROM channels WHERE workspace_id = $1",
    )
    .bind(workspace_id)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    let channel = sqlx::query_as::<_, Channel>(
        r#"
        INSERT INTO channels (workspace_id, name, topic, position)
        VALUES ($1, $2, $3, $4)
        RETURNING id, workspace_id, name, topic, position
        "#,
    )
    .bind(workspace_id)
    .bind(&payload.name)
    .bind(&payload.topic)
    .bind(max_pos + 1)
    .fetch_one(&state.db)
    .await
    .map_err(|_| AuthError::Database)?;

    Ok(Json(channel))
}
