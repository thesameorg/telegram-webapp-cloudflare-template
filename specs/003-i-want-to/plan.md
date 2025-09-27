
# Implementation Plan: Telegram Authorization System

**Branch**: `003-i-want-to` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-i-want-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement Telegram Web App authentication system using initData validation for automatic user authentication. The system will create and manage 1-hour TTL sessions stored in Cloudflare KV, maintaining user identity (ID, username, display name, profile picture URL) with minimal user friction.

## Technical Context
**Language/Version**: TypeScript/JavaScript (Node.js 18+)
**Primary Dependencies**: Hono.js framework, @twa-dev/sdk, React + Vite, Tailwind CSS, Drizzle ORM, Zod, Grammy (Telegram Bot)
**Storage**: Cloudflare KV (session storage), Drizzle ORM (user data if needed)
**Testing**: Vitest (backend), frontend test framework TBD
**Target Platform**: Cloudflare Workers (backend), Web (frontend as Telegram Web App)
**Project Type**: web - determines source structure (frontend + backend)
**Performance Goals**: <100ms session validation, Telegram Web App responsiveness standards
**Constraints**: Cloudflare Workers limits, 1-hour session TTL, minimal user friction
**Scale/Scope**: Telegram Web App users, session management system, authentication endpoints

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I (Real Data)**: ✅ PASS - Using actual Telegram Web App authentication data, real KV storage
**Principle II (Structure/Paths)**: ✅ PASS - Following existing backend/frontend structure
**Principle III (Existing Tools)**: ✅ PASS - Using existing Hono.js, Vitest, project scripts
**Principle IV (Double-Check)**: ✅ DEFER - Will verify during implementation phases
**Principle V (Continuity)**: ✅ DEFER - Will ensure no regressions during implementation
**Principle VI (Feasibility)**: ✅ PASS - Feature fits within Cloudflare Workers + React constraints
**Principle VII (Minimal Deliverables)**: ✅ PASS - Authentication system can be delivered incrementally
**Principle VIII (No Guesswork)**: ✅ PASS - All ambiguities resolved in clarification phase
**Principle IX (Task Granularity)**: ✅ DEFER - Will ensure 1-hour chunks during task planning
**Principle X (UX Consistency)**: ✅ PASS - Automatic authentication maintains smooth UX
**Principle XI (Performance)**: ✅ PASS - <100ms session validation meets performance requirements

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - frontend/ and backend/ directories detected

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Authentication API contract → contract test tasks [P]
- Session/User entities → TypeScript interface tasks [P]
- Each user story scenario → integration test task
- Backend implementation tasks (middleware, endpoints, KV operations)
- Frontend implementation tasks (SDK integration, auth context)
- Infrastructure tasks (KV setup, environment configuration)

**Specific Task Categories**:
1. **Contract Tests** (4 tasks):
   - POST /auth/authenticate endpoint test [P]
   - GET /auth/validate endpoint test [P]
   - POST /auth/logout endpoint test [P]
   - GET /auth/profile endpoint test [P]

2. **Model Implementation** (3 tasks):
   - Session TypeScript interface and validation [P]
   - TelegramUser interface and validation [P]
   - AuthToken interface and helpers [P]

3. **Backend Core** (8 tasks):
   - Install @telegram-apps/init-data-node dependency
   - Telegram initData validation service
   - KV session storage service
   - Authentication middleware for Hono.js
   - Authentication endpoints implementation
   - Session management endpoints
   - Error handling and logging
   - Environment configuration and KV binding

4. **Frontend Integration** (4 tasks):
   - Install @twa-dev/sdk dependency
   - Authentication context provider
   - InitData extraction and transmission
   - Auth state management and persistence

5. **Integration & Testing** (5 tasks):
   - Backend integration tests (auth flow)
   - Frontend integration tests (SDK integration)
   - End-to-end authentication scenario tests
   - Performance testing (session validation <50ms)
   - Quickstart validation and documentation

6. **Infrastructure** (3 tasks):
   - Cloudflare KV namespace configuration
   - Environment variables setup (BOT_TOKEN)
   - Deployment configuration updates

**Ordering Strategy**:
- **Prerequisites first**: Dependencies and infrastructure setup
- **TDD approach**: Contract tests before implementation
- **Bottom-up dependency order**: Models → Services → Endpoints → Integration
- **Parallel execution markers [P]**: Independent tasks that can run concurrently
- **Validation last**: Integration tests and quickstart verification

**Dependency Chain**:
```
Infrastructure Setup → Dependencies → Models [P] → Services → Endpoints → Tests → Integration
```

**Estimated Output**: 27 numbered, dependency-ordered tasks in tasks.md
**Estimated Completion**: 15-20 hours (following 1-hour chunk principle)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
