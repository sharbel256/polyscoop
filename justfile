# polyscoop – development task runner
# Usage: just <recipe>

set dotenv-load := true

# ── Setup ────────────────────────────────────────────────

# First-time local development setup
setup:
    @echo "🔧 Setting up polyscoop local development..."
    just setup-backend
    just setup-frontend
    @echo ""
    @echo "✅ Setup complete! Copy .env.example → .env and fill in values, then run: just dev"

# Set up the backend (Python / FastAPI)
setup-backend:
    @echo "── Backend ──"
    cd backend && uv sync
    @echo "✅ Backend dependencies installed"

# Set up the frontend (React / Vite)
setup-frontend:
    @echo "── Frontend ──"
    cd frontend && bun install
    @echo "✅ Frontend dependencies installed"

# ── Infrastructure ──────────────────────────────────────

# Start Postgres + Redis for local development
infra:
    docker compose up -d postgres redis
    @echo "✅ Postgres (5432) + Redis (6379) running"

# Stop local infrastructure
infra-down:
    docker compose down

# Run Alembic migration (auto-generate)
db-migrate message="auto":
    cd backend && uv run alembic revision --autogenerate -m "{{message}}"

# Apply Alembic migrations
db-upgrade:
    cd backend && uv run alembic upgrade head

# ── Development ──────────────────────────────────────────

# Run both backend and frontend in parallel
dev:
    just dev-backend &
    just dev-frontend &
    wait

# Run backend dev server
dev-backend:
    cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run frontend dev server
dev-frontend:
    cd frontend && bun run dev

# ── Build ────────────────────────────────────────────────

# Build frontend for production (output to frontend/dist)
build-frontend:
    cd frontend && bun run build
    @echo "✅ Frontend built to frontend/dist"

# Build frontend and serve everything from the backend
build-and-serve:
    just build-frontend
    just dev-backend

# ── Format ───────────────────────────────────────────────

# Format backend (ruff)
fmt-backend:
    cd backend && uv run ruff check . --fix && uv run ruff format .

# Format frontend (prettier)
fmt-frontend:
    cd frontend && bun run format

# Format everything
fmt: fmt-backend fmt-frontend

# ── Quality ──────────────────────────────────────────────

# Lint backend
lint-backend:
    cd backend && uv run ruff check .

# Lint frontend
lint-frontend:
    cd frontend && bun run lint

# Type-check backend
typecheck-backend:
    cd backend && uv run pyright app/

# Type-check frontend
typecheck-frontend:
    cd frontend && bun run typecheck

# Check backend (lint + format + types)
check-backend:
    cd backend && uv run ruff check . && uv run ruff format --check . && uv run pyright app/

# Check frontend (format + lint + types)
check-frontend:
    cd frontend && bun run format:check && bun run lint && bun run typecheck

# Run all checks (lint + format + types)
check: check-backend check-frontend

# ── Testing ──────────────────────────────────────────────

# Run backend tests
test-backend:
    cd backend && uv run pytest

# Run frontend tests
test-frontend:
    cd frontend && bun run test

test: test-backend test-frontend

# ── Deploy ─────────────────────────────────────────────────

# Deploy locally (default: docker compose with auto-loaded override)
deploy-local:
    docker compose up --build -d
    @echo "local deploy running on http://localhost:8000"

# Deploy production
deploy-prod:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    @echo "production deploy running on http://127.0.0.1:4200"

# Stop local deployment
deploy-local-down:
    docker compose down

# Stop production deployment
deploy-prod-down:
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# View logs for a deployment (usage: just logs or just logs prod)
logs target="local":
    #!/usr/bin/env bash
    if [ "{{ target }}" = "prod" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    else
        docker compose logs -f
    fi

# ── Utilities ────────────────────────────────────────────

# Generate a random secret key
secret:
    python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Clean build artifacts
clean:
    rm -rf backend/__pycache__ backend/.pytest_cache backend/logs
    rm -rf frontend/node_modules frontend/dist
    @echo "🧹 Cleaned"
