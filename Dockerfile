# ── Stage 1: Build frontend ───────────────────────────────
FROM oven/bun:1 AS frontend-build

ARG VITE_WALLETCONNECT_PROJECT_ID
ARG VITE_POLYGON_RPC_URL=https://polygon-rpc.com

WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend/ ./
RUN bun run build

# ── Stage 2: Install backend deps ─────────────────────────
FROM python:3.12-slim-bookworm AS backend-build

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --no-dev --frozen

# ── Stage 3: Production image ─────────────────────────────
FROM python:3.12-slim-bookworm

RUN groupadd --gid 1000 app && \
    useradd --uid 1000 --gid app --shell /bin/bash --create-home app

WORKDIR /app

# Copy backend virtualenv and source (keep same path so shebangs work)
COPY --from=backend-build /app/backend/.venv backend/.venv/
COPY backend/ backend/

# Copy built frontend into where the backend expects it
COPY --from=frontend-build /app/frontend/dist frontend/dist/

# Create log directory
RUN mkdir -p backend/logs && chown -R app:app /app

ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

USER app

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
