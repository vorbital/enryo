use crate::{auth::jwt::verify_token, AppState};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
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

pub fn extract_user_id(headers: &HeaderMap, secret: &str) -> Result<Uuid, crate::auth::AuthError> {
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

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<Workspace>>, crate::auth::AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspaces = sqlx::query_as!(
        Workspace,
        r#"
        SELECT w.id, w.name, w.slug, w.owner_id
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = $1
        ORDER BY w.name
        "#,
        user_id
    )
    .fetch_all(&*state.db)
    .await?;

    Ok(Json(workspaces))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateWorkspace>,
) -> Result<Json<Workspace>, crate::auth::AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspace = sqlx::query_as!(
        Workspace,
        r#"
        INSERT INTO workspaces (name, slug, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, slug, owner_id
        "#,
        payload.name,
        payload.slug,
        user_id
    )
    .fetch_one(&*state.db)
    .await?;

    sqlx::query!(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        workspace.id,
        user_id
    )
    .execute(&*state.db)
    .await?;

    sqlx::query!(
        "INSERT INTO channels (workspace_id, name, topic, position) VALUES ($1, 'general', 'General discussion', 0)",
        workspace.id
    )
    .execute(&*state.db)
    .await?;

    Ok(Json(workspace))
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Workspace>, crate::auth::AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspace = sqlx::query_as!(
        Workspace,
        r#"
        SELECT w.id, w.name, w.slug, w.owner_id
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        "#,
        slug,
        user_id
    )
    .fetch_optional(&*state.db)
    .await?
    .ok_or(crate::auth::AuthError::InvalidToken)?;

    Ok(Json(workspace))
}

pub async fn list_channels(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<Vec<super::channels::Channel>>, crate::auth::AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let channels = sqlx::query_as!(
        super::channels::Channel,
        r#"
        SELECT c.id, c.workspace_id, c.name, c.topic, c.position
        FROM channels c
        INNER JOIN workspaces w ON c.workspace_id = w.id
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        ORDER BY c.position
        "#,
        slug,
        user_id
    )
    .fetch_all(&*state.db)
    .await?;

    Ok(Json(channels))
}

pub async fn create_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(payload): Json<super::channels::CreateChannel>,
) -> Result<Json<super::channels::Channel>, crate::auth::AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspace: (Uuid,) = sqlx::query_as(
        r#"
        SELECT w.id
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        "#,
    )
    .bind(&slug)
    .bind(user_id)
    .fetch_optional(&*state.db)
    .await?
    .ok_or(crate::auth::AuthError::InvalidToken)?;

    let max_pos: (i32,) = sqlx::query_as(
        "SELECT COALESCE(MAX(position), -1) FROM channels WHERE workspace_id = $1"
    )
    .bind(workspace.0)
    .fetch_one(&*state.db)
    .await?;

    let channel = sqlx::query_as!(
        super::channels::Channel,
        r#"
        INSERT INTO channels (workspace_id, name, topic, position)
        VALUES ($1, $2, $3, $4)
        RETURNING id, workspace_id, name, topic, position
        "#,
        workspace.0,
        payload.name,
        payload.topic,
        max_pos.0 + 1
    )
    .fetch_one(&*state.db)
    .await?;

    Ok(Json(channel))
}
