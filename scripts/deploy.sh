#!/usr/bin/env bash
set -e

echo "======================================"
echo "Starting deployment..."
echo "======================================"

echo "Current directory:"
pwd

echo "Git version:"
git --version

echo "Docker version:"
docker --version

echo "Docker Compose version:"
docker compose version

echo "======================================"
echo "Checking environment file..."
echo "======================================"

if [ ! -f ".env.docker" ]; then
  echo "ERROR: .env.docker file does not exist!"
  exit 1
fi

echo ".env.docker exists."

echo "======================================"
echo "Building and starting containers..."
echo "======================================"

docker compose up -d --build

echo "======================================"
echo "Containers status:"
echo "======================================"

docker compose ps

echo "======================================"
echo "Cleaning unused Docker images..."
echo "======================================"

docker image prune -f

echo "======================================"
echo "Deployment finished successfully."
echo "======================================"

