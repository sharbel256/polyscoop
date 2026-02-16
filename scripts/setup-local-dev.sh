#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

info()  { echo -e "${BOLD}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo -e "${BOLD}🔭 polyscoop — Local Development Setup${NC}"
echo ""

# ── Check prerequisites ────────────────────────────────
info "Checking prerequisites..."

command -v python3 >/dev/null 2>&1 || fail "python3 is required but not installed"
command -v uv >/dev/null 2>&1      || fail "uv is required (https://docs.astral.sh/uv/getting-started/installation/)"
command -v bun >/dev/null 2>&1     || fail "bun is required (https://bun.sh/docs/installation)"
command -v just >/dev/null 2>&1    || warn "just is recommended but not required (https://just.systems/man/en/)"

ok "All required tools found"

# ── Create .env if missing ─────────────────────────────
if [ ! -f .env ]; then
    info "Creating .env from .env.example..."
    cp .env.example .env

    # Generate a random SECRET_KEY
    SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/SECRET_KEY=changethis/SECRET_KEY=$SECRET/" .env
    else
        sed -i "s/SECRET_KEY=changethis/SECRET_KEY=$SECRET/" .env
    fi

    ok ".env created with a fresh SECRET_KEY"
    warn "Edit .env to fill in Polymarket builder credentials and other values"
else
    ok ".env already exists"
fi

# ── Backend setup ──────────────────────────────────────
info "Setting up backend (Python / FastAPI)..."
cd backend
uv sync
ok "Backend dependencies installed"
cd ..

# ── Frontend setup ─────────────────────────────────────
info "Setting up frontend (React / Vite)..."
cd frontend
bun install
ok "Frontend dependencies installed"
cd ..

# ── Done ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅ Setup complete!${NC}"
echo ""
echo "  Next steps:"
echo "    1. Edit .env with your Polymarket builder credentials"
echo "    2. Run the dev servers:  just dev"
echo "       Or manually:"
echo "         Backend:   cd backend && uv run fastapi dev app/main.py"
echo "         Frontend:  cd frontend && bun run dev"
echo ""
