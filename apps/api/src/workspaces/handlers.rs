use crate::auth::{verify_token, AuthError};
use crate::channels::{Channel, CreateChannel};
use crate::AppState;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Workspace {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub owner_id: Uuid,
    #[serde(default)]
    pub settings: Value,
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkspace {
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettings {
    pub primary_hue: Option<i32>,
    pub primary_saturation: Option<i32>,
    pub secondary_hue: Option<i32>,
    pub secondary_saturation: Option<i32>,
}

pub fn extract_user_id(headers: &HeaderMap, secret: &str) -> Result<Uuid, AuthError> {
    let auth_header = headers
        .get("Authorization")
        .ok_or(AuthError::InvalidToken)?;
    let token = auth_header.to_str().map_err(|_| AuthError::InvalidToken)?;
    let token = token
        .strip_prefix("Bearer ")
        .ok_or(AuthError::InvalidToken)?;
    let claims = verify_token(token, secret)?;
    Uuid::parse_str(&claims.sub).map_err(|_| AuthError::InvalidToken)
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<Workspace>>, AuthError> {
    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let workspaces = sqlx::query_as::<_, Workspace>(
        r#"
        SELECT id, name, slug, owner_id, COALESCE(settings, '{}'::jsonb) as settings
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
        RETURNING id, name, slug, owner_id, COALESCE(settings, '{}'::jsonb) as settings
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
        SELECT id, name, slug, owner_id, COALESCE(settings, '{}'::jsonb) as settings
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

#[derive(Debug, Serialize)]
pub struct WorkspaceSettings {
    pub primary_hue: Option<i32>,
    pub primary_saturation: Option<i32>,
    pub secondary_hue: Option<i32>,
    pub secondary_saturation: Option<i32>,
}

pub async fn get_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<WorkspaceSettings>, AuthError> {
    tracing::debug!("Getting settings for workspace: {}", slug);

    let user_id = extract_user_id(&headers, &state.jwt_secret)?;
    tracing::debug!("User ID: {}", user_id);

    let (workspace_id, role): (Uuid, String) = sqlx::query_as(
        r#"
        SELECT w.id, wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        "#,
    )
    .bind(&slug)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to find workspace: {}", e);
        AuthError::Database
    })?
    .ok_or(AuthError::InvalidToken)?;

    tracing::debug!("Found workspace_id: {}, role: {}", workspace_id, role);

    let settings_json: String = sqlx::query_scalar(
        "SELECT COALESCE(settings, '{}'::jsonb)::text FROM workspaces WHERE id = $1",
    )
    .bind(workspace_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get workspace settings: {:?}", e);
        AuthError::Database
    })?;

    let settings: Value = serde_json::from_str(&settings_json).map_err(|e| {
        tracing::error!("Failed to parse settings: {:?}", e);
        AuthError::Database
    })?;

    tracing::debug!("Settings raw: {:?}", settings);

    let primary_hue = settings
        .get("primaryHue")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let primary_saturation = settings
        .get("primarySaturation")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let secondary_hue = settings
        .get("secondaryHue")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let secondary_saturation = settings
        .get("secondarySaturation")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    Ok(Json(WorkspaceSettings {
        primary_hue,
        primary_saturation,
        secondary_hue,
        secondary_saturation,
    }))
}

pub async fn update_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(slug): Path<String>,
    Json(payload): Json<UpdateSettings>,
) -> Result<Json<WorkspaceSettings>, AuthError> {
    tracing::debug!("Updating settings for workspace: {}", slug);

    let user_id = extract_user_id(&headers, &state.jwt_secret)?;

    let (workspace_id, role): (Uuid, String) = sqlx::query_as(
        r#"
        SELECT w.id, wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.slug = $1 AND wm.user_id = $2
        "#,
    )
    .bind(&slug)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to find workspace for update: {}", e);
        AuthError::Database
    })?
    .ok_or(AuthError::InvalidToken)?;

    if role != "owner" && role != "admin" {
        tracing::warn!("User {} is not owner/admin, role={}", user_id, role);
        return Err(AuthError::InvalidToken);
    }

    let current_settings_json: String = sqlx::query_scalar(
        "SELECT COALESCE(settings, '{}'::jsonb)::text FROM workspaces WHERE id = $1",
    )
    .bind(workspace_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get current settings: {:?}", e);
        AuthError::Database
    })?;

    let current_settings: Value = serde_json::from_str(&current_settings_json).map_err(|e| {
        tracing::error!("Failed to parse current settings: {:?}", e);
        AuthError::Database
    })?;

    let mut new_settings = current_settings.clone();
    if let Some(hue) = payload.primary_hue {
        new_settings["primaryHue"] = serde_json::json!(hue);
    }
    if let Some(sat) = payload.primary_saturation {
        new_settings["primarySaturation"] = serde_json::json!(sat);
    }
    if let Some(hue) = payload.secondary_hue {
        new_settings["secondaryHue"] = serde_json::json!(hue);
    }
    if let Some(sat) = payload.secondary_saturation {
        new_settings["secondarySaturation"] = serde_json::json!(sat);
    }

    sqlx::query("UPDATE workspaces SET settings = $1 WHERE id = $2")
        .bind(&new_settings)
        .bind(workspace_id)
        .execute(&state.db)
        .await
        .map_err(|e| {
            tracing::error!("Failed to update workspace settings: {:?}", e);
            AuthError::Database
        })?;

    let primary_hue = new_settings
        .get("primaryHue")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let primary_saturation = new_settings
        .get("primarySaturation")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let secondary_hue = new_settings
        .get("secondaryHue")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let secondary_saturation = new_settings
        .get("secondarySaturation")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    Ok(Json(WorkspaceSettings {
        primary_hue,
        primary_saturation,
        secondary_hue,
        secondary_saturation,
    }))
}
