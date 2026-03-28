use serde::{Deserialize, Serialize};

pub async fn score_pertinence(
    content: &str,
    llm_url: &str,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    // Try Ollama API first (more common for self-hosted)
    let response = client
        .post(format!("{}/api/embeddings", llm_url))
        .json(&serde_json::json!({
            "model": "nomic-embed-text",
            "prompt": content
        }))
        .send()
        .await;

    if let Ok(resp) = response {
        if resp.status().is_success() {
            let _embedding: OllamaEmbeddingResponse = resp.json().await?;
            // Ollama returns a single embedding vector
            // For now, we'll use a simple heuristic based on content characteristics
            return Ok(calculate_pertinence_heuristic(content));
        }
    }

    // Fallback to simple heuristic-based scoring
    Ok(calculate_pertinence_heuristic(content))
}

fn calculate_pertinence_heuristic(content: &str) -> bool {
    let content_lower = content.to_lowercase();

    // Check for off-topic indicators
    let off_topic_patterns = [
        "meme",
        "lol",
        "lmao",
        "haha",
        "funny",
        "off topic",
        "random",
        "unrelated",
        "what about",
        "btw",
        "by the way",
        "did anyone",
        "does anyone",
        "can we",
        "should we",
    ];

    let on_topic_patterns = [
        "code", "bug", "error", "fix", "pr", "review", "merge", "deploy", "test", "feature",
        "issue", "ticket", "task", "meeting", "deadline", "sprint",
    ];

    let off_topic_count: usize = off_topic_patterns
        .iter()
        .filter(|pattern| content_lower.contains(*pattern))
        .count();

    let on_topic_count: usize = on_topic_patterns
        .iter()
        .filter(|pattern| content_lower.contains(*pattern))
        .count();

    // If more off-topic indicators than on-topic, and has off-topic markers, consider off-topic
    if off_topic_count > 0 && off_topic_count > on_topic_count {
        return false;
    }

    // Short messages with no context are more likely off-topic
    let word_count = content.split_whitespace().count();
    if word_count < 3 && off_topic_count > 0 {
        return false;
    }

    true
}

#[derive(Debug, Deserialize)]
struct OllamaEmbeddingResponse {
    embedding: Vec<f32>,
}

#[derive(Debug, Serialize)]
pub struct EmbeddingRequest {
    pub model: String,
    pub prompt: String,
}

pub async fn get_embedding(
    content: &str,
    llm_url: &str,
) -> Result<Vec<f32>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/embeddings", llm_url))
        .json(&serde_json::json!({
            "model": "nomic-embed-text",
            "prompt": content
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err("Failed to get embedding from LLM".into());
    }

    let embedding: OllamaEmbeddingResponse = response.json().await?;
    Ok(embedding.embedding)
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }

    dot_product / (magnitude_a * magnitude_b)
}
