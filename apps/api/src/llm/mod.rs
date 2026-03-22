use serde::{Deserialize, Serialize};

pub async fn score_pertinence(content: &str, llm_url: &str) -> Result<bool, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/v1/embeddings", llm_url))
        .json(&serde_json::json!({
            "input": content,
            "model": "embedding-model"
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Ok(true);
    }

    let embedding: EmbeddingResponse = response.json().await?;

    Ok(embedding.score > 0.5)
}

#[derive(Debug, Deserialize)]
pub struct EmbeddingResponse {
    pub score: f32,
}
