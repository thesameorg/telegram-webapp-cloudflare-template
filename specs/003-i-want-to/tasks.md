# Tasks: Telegram Authorization System

**Input**: Design documents from `/specs/003-i-want-to/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: TypeScript/Node.js, Hono.js, Cloudflare Workers, React
2. Load optional design documents ✓:
   → data-model.md: Session, TelegramUser, AuthToken entities
   → contracts/: auth-api.yaml with 4 endpoints
   → research.md: @telegram-apps/init-data-node, KV storage decisions
3. Generate tasks by category ✓:
   → Setup: dependencies, KV configuration, project structure
   → Tests: contract tests, integration tests (TDD approach)
   → Core: TypeScript interfaces, services, endpoints
   → Integration: middleware, error handling, KV operations
   → Polish: performance validation, documentation
4. Apply task rules ✓:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓:
   → All contracts have tests? ✓ (4 endpoints, 4 contract tests)
   → All entities have models? ✓ (3 entities, 3 interface tasks)
   → All endpoints implemented? ✓ (4 endpoints covered)
9. Return: SUCCESS (tasks ready for execution) ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Paths use web app structure: `backend/src/`, `frontend/src/`

## Phase 3.1: Setup & Dependencies

- [ ] T001 Install @telegram-apps/init-data-node dependency in backend/package.json
- [ ] T002 Install @twa-dev/sdk dependency in frontend/package.json
- [ ] T003 Configure Cloudflare KV namespace in backend/wrangler.toml (binding: SESSIONS)
- [ ] T004 Set up BOT_TOKEN environment variable in backend/.dev.vars and wrangler.toml
- [ ] T005 [P] Configure TypeScript types for Cloudflare Workers in backend/src/types/env.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T006 [P] Contract test POST /api/auth/authenticate in backend/src/tests/contract/auth-authenticate.test.ts
- [ ] T007 [P] Contract test GET /api/auth/validate in backend/src/tests/contract/auth-validate.test.ts
- [ ] T008 [P] Contract test POST /api/auth/logout in backend/src/tests/contract/auth-logout.test.ts
- [ ] T009 [P] Contract test GET /api/auth/profile in backend/src/tests/contract/auth-profile.test.ts
- [ ] T010 [P] Integration test: First-time authentication scenario in backend/src/tests/integration/auth-flow.test.ts
- [ ] T011 [P] Integration test: Session validation scenario in backend/src/tests/integration/session-validation.test.ts
- [ ] T012 [P] Integration test: Session expiration scenario in backend/src/tests/integration/session-expiration.test.ts
- [ ] T013 [P] Integration test: Explicit logout scenario in backend/src/tests/integration/logout-flow.test.ts
- [ ] T014 [P] Integration test: Invalid initData security scenario in backend/src/tests/integration/security-validation.test.ts

## Phase 3.3: TypeScript Interfaces & Models (ONLY after tests are failing)

- [ ] T015 [P] Session interface and validation in backend/src/models/session.ts
- [ ] T016 [P] TelegramUser interface and validation in backend/src/models/telegram-user.ts
- [ ] T017 [P] AuthToken interface and helpers in backend/src/models/auth-token.ts
- [ ] T018 [P] Error response types in backend/src/models/error-response.ts

## Phase 3.4: Core Services Implementation

- [ ] T019 InitData validation service using @telegram-apps/init-data-node in backend/src/services/telegram-auth.ts
- [ ] T020 KV session storage service with TTL management in backend/src/services/session-storage.ts
- [ ] T021 Session management service (create, validate, invalidate) in backend/src/services/session-manager.ts
- [ ] T022 User profile service for data extraction in backend/src/services/user-profile.ts

## Phase 3.5: Authentication Middleware & Endpoints

- [ ] T023 Telegram authentication middleware for Hono.js in backend/src/middleware/telegram-auth.ts
- [ ] T024 POST /api/auth/authenticate endpoint implementation in backend/src/api/auth/authenticate.ts
- [ ] T025 GET /api/auth/validate endpoint implementation in backend/src/api/auth/validate.ts
- [ ] T026 POST /api/auth/logout endpoint implementation in backend/src/api/auth/logout.ts
- [ ] T027 GET /api/auth/profile endpoint implementation in backend/src/api/auth/profile.ts

## Phase 3.6: Frontend Integration

- [ ] T028 [P] Authentication context provider with React in frontend/src/contexts/auth-context.tsx
- [ ] T029 [P] InitData extraction hook using @twa-dev/sdk in frontend/src/hooks/use-telegram-auth.ts
- [ ] T030 [P] API client for authentication endpoints in frontend/src/services/auth-api.ts
- [ ] T031 [P] Auth state persistence and management in frontend/src/utils/auth-storage.ts

## Phase 3.7: Integration & Error Handling

- [ ] T032 Route registration and middleware application in backend/src/index.ts
- [ ] T033 Global error handler for authentication errors in backend/src/middleware/error-handler.ts
- [ ] T034 Request/response logging for auth operations in backend/src/middleware/logger.ts
- [ ] T035 CORS configuration for frontend-backend communication in backend/src/middleware/cors.ts

## Phase 3.8: Performance & Polish

- [ ] T036 [P] Performance test: session validation <50ms in backend/src/tests/performance/session-performance.test.ts
- [ ] T037 [P] Performance test: authentication <100ms in backend/src/tests/performance/auth-performance.test.ts
- [ ] T038 [P] Unit tests for session validation logic in backend/src/tests/unit/session-validation.test.ts
- [ ] T039 [P] Unit tests for initData parsing in backend/src/tests/unit/telegram-auth.test.ts
- [ ] T040 [P] Frontend integration test using mock initData in frontend/src/tests/auth.integration.test.ts
- [ ] T041 Run quickstart validation scenarios from specs/003-i-want-to/quickstart.md
- [ ] T042 Update CLAUDE.md with authentication system documentation

## Dependencies

**Critical Path**:
```
T001-T005 (Setup) → T006-T014 (Tests) → T015-T018 (Models) → T019-T022 (Services) → T023-T027 (Endpoints) → T032-T035 (Integration) → T036-T042 (Polish)
```

**Specific Dependencies**:
- T003, T004 (KV + Bot Token) before T019, T020
- T015-T018 (Models) before T019-T022 (Services)
- T019-T022 (Services) before T023-T027 (Endpoints)
- T023 (Auth Middleware) before T024-T027 (Protected Endpoints)
- T024-T027 (Backend) before T028-T031 (Frontend Integration)
- All implementation before T036-T042 (Performance & Polish)

## Parallel Execution Examples

### Phase 3.2: All Contract Tests (Run Together)
```bash
# Launch T006-T009 in parallel:
Task: "Contract test POST /api/auth/authenticate in backend/src/tests/contract/auth-authenticate.test.ts"
Task: "Contract test GET /api/auth/validate in backend/src/tests/contract/auth-validate.test.ts"
Task: "Contract test POST /api/auth/logout in backend/src/tests/contract/auth-logout.test.ts"
Task: "Contract test GET /api/auth/profile in backend/src/tests/contract/auth-profile.test.ts"
```

### Phase 3.2: All Integration Tests (Run Together)
```bash
# Launch T010-T014 in parallel:
Task: "Integration test: First-time authentication scenario in backend/src/tests/integration/auth-flow.test.ts"
Task: "Integration test: Session validation scenario in backend/src/tests/integration/session-validation.test.ts"
Task: "Integration test: Session expiration scenario in backend/src/tests/integration/session-expiration.test.ts"
Task: "Integration test: Explicit logout scenario in backend/src/tests/integration/logout-flow.test.ts"
Task: "Integration test: Invalid initData security scenario in backend/src/tests/integration/security-validation.test.ts"
```

### Phase 3.3: All TypeScript Models (Run Together)
```bash
# Launch T015-T018 in parallel:
Task: "Session interface and validation in backend/src/models/session.ts"
Task: "TelegramUser interface and validation in backend/src/models/telegram-user.ts"
Task: "AuthToken interface and helpers in backend/src/models/auth-token.ts"
Task: "Error response types in backend/src/models/error-response.ts"
```

### Phase 3.6: All Frontend Components (Run Together)
```bash
# Launch T028-T031 in parallel:
Task: "Authentication context provider with React in frontend/src/contexts/auth-context.tsx"
Task: "InitData extraction hook using @twa-dev/sdk in frontend/src/hooks/use-telegram-auth.ts"
Task: "API client for authentication endpoints in frontend/src/services/auth-api.ts"
Task: "Auth state persistence and management in frontend/src/utils/auth-storage.ts"
```

### Phase 3.8: All Performance & Unit Tests (Run Together)
```bash
# Launch T036-T040 in parallel:
Task: "Performance test: session validation <50ms in backend/src/tests/performance/session-performance.test.ts"
Task: "Performance test: authentication <100ms in backend/src/tests/performance/auth-performance.test.ts"
Task: "Unit tests for session validation logic in backend/src/tests/unit/session-validation.test.ts"
Task: "Unit tests for initData parsing in backend/src/tests/unit/telegram-auth.test.ts"
Task: "Frontend integration test using mock initData in frontend/src/tests/auth.integration.test.ts"
```

## Notes
- [P] tasks target different files and have no dependencies
- All tests (T006-T014) MUST fail before implementation begins
- KV configuration (T003) and Bot Token (T004) required before auth services
- Frontend tasks (T028-T031) require backend API endpoints to be functional
- Performance requirements: <50ms session validation, <100ms authentication
- Commit after each completed task for incremental progress

## Validation Checklist
*GATE: Verified before task execution*

- [x] All contracts have corresponding tests (4 endpoints → 4 contract tests T006-T009)
- [x] All entities have model tasks (3 entities → 3 interface tasks T015-T017)
- [x] All tests come before implementation (Phase 3.2 before 3.3-3.7)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path (backend/src/*, frontend/src/*)
- [x] No task modifies same file as another [P] task