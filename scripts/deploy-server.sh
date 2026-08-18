#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/opt/docker/dlivrit/beycom"
SOURCE_DIR="$BASE_DIR/source"
REPO_URL="https://github.com/KernicDE/beyblade-x-companion.git"

echo "Ensuring base directory exists..."
mkdir -p "$BASE_DIR"

cd "$BASE_DIR"

if [ ! -d "$SOURCE_DIR/.git" ]; then
  echo "Cloning repository..."
  git clone "$REPO_URL" "$SOURCE_DIR"
fi

cd "$SOURCE_DIR"
echo "Pulling latest compose and config..."
git pull

if [ ! -f "$SOURCE_DIR/.env" ]; then
  echo "Creating .env with generated secrets..."
  {
    echo "SESSION_SECRET=$(openssl rand -hex 32)"
    echo "TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)"
  } > "$SOURCE_DIR/.env"
fi

if ! docker network inspect traefik >/dev/null 2>&1; then
  echo "Creating Traefik network..."
  docker network create traefik
fi

echo "Pulling latest Docker image..."
docker compose pull

echo "Starting/restarting container..."
docker compose up -d --remove-orphans

echo "Cleaning up old images..."
docker image prune -f

echo "Deploy finished."
