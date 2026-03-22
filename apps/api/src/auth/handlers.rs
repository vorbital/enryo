use super::jwt::{create_token, verify_token};
use super::password::{hash_password, verify_password};
use crate::AppState;
use axum::{
    extract::{Extension, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub display_name: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub display_name: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, super::AuthError> {
    let password_hash = hash_password(&payload.password)?;

    let user_id: (String,) = sqlx::query_as(
        r#"
        INSERT INTO users (email, password_hash, display_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING
        RETURNING id
        "#,
    )
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(&payload.display_name)
    .fetch_optional(&*state.db)
    .await?
    .ok_or(super::AuthError::UserExists)?;

    let token = create_token(&user_id.0, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        token,
        user_id: user_id.0,
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, super::AuthError> {
    let row: Option<(String, String)> = sqlx::query_as(
        "SELECT id, password_hash FROM users WHERE email = $1",
    )
    .bind(&payload.email)
    .fetch_optional(&*state.db)
    .await?;

    let (user_id, password_hash) = row.ok_or(super::AuthError::InvalidCredentials)?;

    if !verify_password(&payload.password, &password_hash)? {
        return Err(super::AuthError::InvalidCredentials);
    }

    let token = create_token(&user_id, &state.jwt_secret)?;

    Ok(Json(AuthResponse { token, user_id }))
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, super::AuthError> {
    let claims = verify_token(&payload.token, &state.jwt_secret)?;
    let token = create_token(&claims.sub, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        token,
        user_id: claims.sub,
    }))
}
