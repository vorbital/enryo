#!/bin/bash
set -e

echo "Starting PostgreSQL..."
docker compose up db -d

echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "Database ready!"
echo ""
echo "To start the API, create .env from .env.example and run:"
echo "  cd apps/api && cargo run"
echo ""
echo "Optional: Start LLM for pertinence scoring:"
echo "  docker compose --profile ollama up -d"
