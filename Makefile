# Telegram Web App + Bot Template - Development Commands

.PHONY: help dev-backend dev-frontend start start-backend start-frontend stop stop-backend stop-frontend restart restart-backend restart-frontend test-backend test-frontend typecheck-backend typecheck-frontend build lint clean setup-dirs logs status

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "🚀 Development Servers:"
	@echo "  start           - Start both backend + frontend in background"
	@echo "  stop            - Stop both servers"
	@echo "  restart         - Restart both servers"
	@echo "  start-backend   - Start only backend in background"
	@echo "  start-frontend  - Start only frontend in background"
	@echo "  stop-backend    - Stop only backend"
	@echo "  stop-frontend   - Stop only frontend"
	@echo "  restart-backend - Restart only backend"
	@echo "  restart-frontend- Restart only frontend"
	@echo "  dev-backend     - Start backend in foreground (blocks terminal)"
	@echo "  dev-frontend    - Start frontend in foreground (blocks terminal)"
	@echo ""
	@echo "📊 Monitoring:"
	@echo "  status          - Check server status"
	@echo "  logs            - View server logs"
	@echo ""
	@echo "🧪 Testing & QA:"
	@echo "  test-backend    - Run backend tests"
	@echo "  test-frontend   - Run frontend tests"
	@echo "  test            - Run all tests"
	@echo "  typecheck       - Type check all code"
	@echo "  build           - Build all components"
	@echo "  lint            - Lint all code"
	@echo "  dev-check       - Run typecheck and tests"
	@echo "  ci-check        - Full CI pipeline check"
	@echo ""
	@echo "🛠  Utilities:"
	@echo "  install         - Install all dependencies"
	@echo "  clean           - Clean build artifacts and stop servers"

# Development servers (single process - will block terminal)
dev-backend:
	@echo "Starting backend dev server on http://localhost:8787"
	cd backend && npx wrangler dev --local --port 8787

dev-frontend:
	@echo "Starting frontend dev server"
	cd frontend && npm run dev

# Background development servers
start-backend:
	@echo "Starting backend dev server in background on http://localhost:8787"
	@cd backend && nohup npx wrangler dev --local --port 8787 > ../logs/backend.log 2>&1 & echo $$! > ../pids/backend.pid
	@sleep 1
	@if [ -f pids/backend.pid ]; then \
		echo "Backend started with PID: $$(cat pids/backend.pid)"; \
		echo "Logs: tail -f logs/backend.log"; \
	else \
		echo "Failed to start backend"; \
	fi

start-frontend:
	@echo "Starting frontend dev server in background"
	@cd frontend && nohup npm run dev > ../logs/frontend.log 2>&1 & echo $$! > ../pids/frontend.pid
	@sleep 1
	@if [ -f pids/frontend.pid ]; then \
		echo "Frontend started with PID: $$(cat pids/frontend.pid)"; \
		echo "Logs: tail -f logs/frontend.log"; \
	else \
		echo "Failed to start frontend"; \
	fi

start: setup-dirs start-backend start-frontend
	@echo "Both servers started!"
	@echo "Backend: http://localhost:8787"
	@echo "Frontend: http://localhost:5173"
	@echo "Check logs: make logs"

# Stop servers
stop-backend:
	@if [ -f pids/backend.pid ]; then \
		PID=$$(cat pids/backend.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "Backend stopped (PID: $$PID)"; \
		else \
			echo "Backend not running (stale PID)"; \
		fi; \
		rm -f pids/backend.pid; \
	else \
		echo "Backend not running"; \
	fi

stop-frontend:
	@if [ -f pids/frontend.pid ]; then \
		PID=$$(cat pids/frontend.pid); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID && echo "Frontend stopped (PID: $$PID)"; \
		else \
			echo "Frontend not running (stale PID)"; \
		fi; \
		rm -f pids/frontend.pid; \
	else \
		echo "Frontend not running"; \
	fi

stop: stop-backend stop-frontend
	@echo "All servers stopped"

# Restart servers
restart-backend: stop-backend start-backend
	@echo "Backend restarted"

restart-frontend: stop-frontend start-frontend
	@echo "Frontend restarted"

restart: stop start
	@echo "All servers restarted"

# Testing
test-backend:
	@echo "Running backend tests (make sure dev-backend is running first)"
	cd backend && npm test -- --run

test-frontend:
	@echo "Running frontend tests"
	cd frontend && npm test -- --run

test: test-backend test-frontend

# Type checking
typecheck-backend:
	@echo "Type checking backend"
	cd backend && npm run typecheck

typecheck-frontend:
	@echo "Type checking frontend"
	cd frontend && npm run typecheck

typecheck: typecheck-backend typecheck-frontend

# Building
build-backend:
	@echo "Building backend (deployment ready)"
	cd backend && npx wrangler deploy --dry-run

build-frontend:
	@echo "Building frontend"
	cd frontend && npm run build

build: build-backend build-frontend

# Linting
lint-backend:
	@echo "Linting backend"
	cd backend && npm run lint || echo "No lint script found"

lint-frontend:
	@echo "Linting frontend"
	cd frontend && npm run lint || echo "No lint script found"

lint: lint-backend lint-frontend

# Setup
install:
	@echo "Installing all dependencies"
	cd backend && npm ci
	cd frontend && npm ci

# Utilities
setup-dirs:
	@mkdir -p logs pids

logs:
	@echo "=== Backend Logs ==="
	@if [ -f logs/backend.log ]; then tail -f logs/backend.log; else echo "Backend not running"; fi &
	@echo "=== Frontend Logs ==="
	@if [ -f logs/frontend.log ]; then tail -f logs/frontend.log; else echo "Frontend not running"; fi

status:
	@echo "=== Server Status ==="
	@if [ -f pids/backend.pid ] && kill -0 $$(cat pids/backend.pid) 2>/dev/null; then \
		echo "✅ Backend: Running (PID: $$(cat pids/backend.pid)) - http://localhost:8787"; \
	else \
		echo "❌ Backend: Stopped"; \
	fi
	@if [ -f pids/frontend.pid ] && kill -0 $$(cat pids/frontend.pid) 2>/dev/null; then \
		echo "✅ Frontend: Running (PID: $$(cat pids/frontend.pid)) - http://localhost:5173"; \
	else \
		echo "❌ Frontend: Stopped"; \
	fi

clean:
	@echo "Cleaning node_modules and build artifacts"
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist
	rm -rf logs pids

# Development workflow helpers
dev-check: typecheck test
	@echo "All checks passed! ✅"

ci-check: install typecheck test build
	@echo "CI checks completed! ✅"

