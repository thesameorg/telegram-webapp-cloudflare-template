# Tasks: Telegram Web App + Bot Template Initial Deployment

**Input**: Design documents from `/specs/002-we-are-building/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: TypeScript/JavaScript, Hono.js, React + Vite, @twa-dev/sdk
   → Structure: Web app (frontend + backend)
2. Load design documents: ✓
   → data-model.md: NO DATABASE for Hello World
   → contracts/: bot-webhook.yaml, web-app-api.yaml
   → research.md: Environment-specific webhooks, cloudflared tunnel
3. Generate tasks by category:
   → Setup: Project init, dependencies, environments
   → Tests: Contract tests for API endpoints
   → Core: Bot webhook handler, hello API, frontend
   → Integration: Deployment, webhook configuration
   → Polish: Documentation, validation
4. Apply task rules:
   → Different files = [P] for parallel
   → Tests before implementation (TDD)
5. Tasks numbered T001-T020
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `backend/src/`, `frontend/src/` per plan.md
- **Tests**: `backend/tests/`, `frontend/tests/`

## Phase 3.1: Setup & Environment
- [X] T001 Create project structure (backend/, frontend/, .env templates, wrangler.toml)
- [X] T002 [P] Initialize backend with Hono.js + TypeScript in `backend/package.json`
- [X] T003 [P] Initialize frontend with React + Vite + @twa-dev/sdk in `frontend/package.json`
- [X] T004 [P] Setup environment configuration templates (.env.example, wrangler configs)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [X] T005 [P] Contract test POST /webhook in `backend/tests/contract/webhook.test.ts`
- [X] T006 [P] Contract test GET /health in `backend/tests/contract/health.test.ts`
- [X] T007 [P] Contract test GET /api/hello in `backend/tests/contract/hello.test.ts`
- [X] T008 [P] Frontend component test Hello World page in `frontend/tests/components/HelloWorld.test.tsx`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [X] T009 [P] Hono.js server setup with environment detection in `backend/src/index.ts`
- [X] T010 [P] Telegram webhook handler for /start command in `backend/src/webhook.ts`
- [X] T011 [P] Hello API endpoint with environment info in `backend/src/api/hello.ts`
- [X] T012 [P] Health check endpoint in `backend/src/api/health.ts`
- [X] T013 [P] React Hello World component in `frontend/src/components/HelloWorld.tsx`
- [X] T014 [P] Telegram Web App SDK integration in `frontend/src/utils/telegram.ts`
- [X] T015 Main App component with Web App setup in `frontend/src/App.tsx`

## Phase 3.4: Deployment & Integration
- [X] T016 GitHub Actions workflow for automated deployment and webhook configuration in `.github/workflows/deploy.yml`
- [X] T017 [P] Local development webhook setup script in `scripts/webhook-local.sh`
- [X] T018 [P] Environment validation script in `scripts/validate-env.sh`

## Phase 3.5: Documentation & Validation
- [X] T019 [P] Comprehensive README with deployment instructions
- [X] T020 Update quickstart.md with actual npm scripts

## Dependencies
- Setup (T001-T004) before everything
- Tests (T005-T008) before implementation (T009-T015)
- Backend API (T011) before frontend integration (T015)
- Core implementation (T009-T015) before deployment (T016-T018)
- Deployment before validation (T019-T020)

## Parallel Examples

### Phase 3.1 - Setup (Run T002-T004 in parallel after T001):
```bash
# T002-T004 can run simultaneously:
Task: "Initialize backend with Hono.js + TypeScript in backend/package.json"
Task: "Initialize frontend with React + Vite + @twa-dev/sdk in frontend/package.json"
Task: "Setup environment configuration templates (.env.example, wrangler configs)"
```

### Phase 3.2 - Contract Tests (Run T005-T008 in parallel):
```bash
# All contract tests are independent:
Task: "Contract test POST /webhook in backend/tests/contract/webhook.test.ts"
Task: "Contract test GET /health in backend/tests/contract/health.test.ts"
Task: "Contract test GET /api/hello in backend/tests/contract/hello.test.ts"
Task: "Frontend component test Hello World page in frontend/tests/components/HelloWorld.test.tsx"
```

### Phase 3.3 - Core Implementation (Run T009-T014 in parallel, then T015):
```bash
# Backend and frontend modules are independent:
Task: "Hono.js server setup with environment detection in backend/src/index.ts"
Task: "Telegram webhook handler for /start command in backend/src/webhook.ts"
Task: "Hello API endpoint with environment info in backend/src/api/hello.ts"
Task: "Health check endpoint in backend/src/api/health.ts"
Task: "React Hello World component in frontend/src/components/HelloWorld.tsx"
Task: "Telegram Web App SDK integration in frontend/src/utils/telegram.ts"
```

### Phase 3.4 - Deployment (Run T017-T018 in parallel after T016):
```bash
# Scripts are independent:
Task: "Local development webhook setup script in scripts/webhook-local.sh"
Task: "Environment validation script in scripts/validate-env.sh"
```

## Task File Specifications

### Contract Tests (Must fail initially)
- **webhook.test.ts**: Test Telegram webhook signature validation, /start command handling
- **health.test.ts**: Test /health endpoint returns environment status
- **hello.test.ts**: Test /api/hello returns Hello World with environment info
- **HelloWorld.test.tsx**: Test React component renders "Hello World" text

### Implementation Files
- **backend/src/index.ts**: Main Hono.js server, environment setup, route registration
- **backend/src/webhook.ts**: Telegram webhook handler, /start command response
- **backend/src/api/hello.ts**: GET /api/hello endpoint with environment detection
- **backend/src/api/health.ts**: GET /health endpoint for monitoring
- **frontend/src/components/HelloWorld.tsx**: Main page component
- **frontend/src/utils/telegram.ts**: Web App SDK initialization
- **frontend/src/App.tsx**: Root component with Telegram integration

### Environment Configuration
- **.env.example**: Template with TELEGRAM_BOT_TOKEN_*, CLOUDFLARE_ACCOUNT_ID, ENVIRONMENT
- **wrangler.toml**: Cloudflare Workers configuration per environment
- **.github/workflows/deploy.yml**: GitHub Actions workflow with deployment + webhook setup for preview/prod
- **scripts/webhook-local.sh**: Local development webhook setup (uses cloudflared tunnel)
- **scripts/validate-env.sh**: Environment validation script

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests (T005-T008)
- [x] All tests come before implementation (T005-T008 → T009-T015)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (tests must fail first)

## Notes
- **NO DATABASE**: This Hello World template requires no persistent storage
- **Environment Isolation**: Each environment (local/preview/prod) uses separate bot tokens
- **Webhook Management**: Local uses cloudflared tunnel, preview/prod use deployment URLs
- **Testing Strategy**: Contract tests ensure API compliance, component tests verify UI
- **Deployment**: Automated via GitHub Actions with environment-specific secrets