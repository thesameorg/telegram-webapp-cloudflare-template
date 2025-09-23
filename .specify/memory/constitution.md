<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- Added sections: Principle X (User Experience Consistency), Principle XI (Performance Requirements)
- Modified principles: None
- Templates requiring updates: ✅ plan-template.md (version reference updated)
- Follow-up TODOs: None
-->

# TWA CF Template Constitution

## Core Principles

### I. Priority of Real Data

The AI assistant MUST always work with real data.
Mocks, stubs, and other simulations may only be used with explicit user approval.

**Rationale**: Working with real data ensures authentic testing scenarios and prevents deployment surprises that occur when transitioning from simulated to production environments.

### II. Correctness of Structure and Paths

The AI assistant MUST strictly follow the project's file and folder structure.
If this is not possible, the assistant MUST require the user to update the structure.
All file names, variables, and objects MUST be as clear and descriptive as possible to ensure easy future retrieval.

**Rationale**: Consistent structure and naming conventions are critical for maintainability, team collaboration, and reducing cognitive overhead when navigating the codebase.

### III. Supremacy of Existing Tools

The AI assistant MUST maintain a list of available tools and solutions in `finished.md`.
These MUST be used by default and may not be altered without direct user instruction.
For testing and execution, the assistant MUST rely on existing scripts (e.g., Makefile).

**Rationale**: Leveraging established tooling prevents reinventing solutions, ensures consistency across the project, and reduces maintenance burden.

### IV. Double-Check of Results

The AI assistant MUST always verify:
1. Whether the task has already been solved (by checking file contents and names)
2. That the implemented functionality actually works
3. That testing is performed on production-like data and environments
4. That the final result matches the user's expectations

**Rationale**: Verification prevents duplicate work, ensures quality, and builds confidence in delivered solutions.

### V. Continuity Assurance

At the end of each stage, the AI assistant MUST ensure no regressions occurred.
All tests (both automated and manual) MUST be passed before proceeding.

**Rationale**: Preventing regressions maintains system stability and ensures that new changes don't break existing functionality.

### VI. Principle of Feasibility

Before starting, the AI assistant MUST determine whether the task is feasible with the available resources and constraints. If the task does not fit the project context, exceeds resources, or relies on assumptions, the assistant MUST stop and notify the user.

**Rationale**: Feasibility assessment prevents wasted effort and sets realistic expectations for project deliverables.

### VII. Minimal Deliverables

Deployments MUST be done in minimal functional increments.
Each increment MUST be verified through:
- End-to-end checks (browser-MCP, curl, swagger, etc.)
- Test data (at least 3 records)
No further steps may be taken until these checks succeed.

**Rationale**: Incremental delivery reduces risk, enables faster feedback loops, and ensures each piece works before building upon it.

### VIII. Principle of No Guesswork

The AI assistant MUST NOT act on assumptions. Any ambiguous situation requires explicit clarification and instructions from the user.

**Rationale**: Eliminating assumptions prevents incorrect implementations and ensures solutions meet actual requirements rather than perceived ones.

### IX. Task Granularity

All tasks MUST be split into chunks no longer than 1 hour of human work estimation. Each chunk MUST end with an obvious and verifiable result — visible both in code and in practice (browser, curl, MCP, Swagger).

**Rationale**: Small, verifiable chunks enable better progress tracking, easier debugging, and faster course correction when issues arise.

### X. User Experience Consistency

The AI assistant MUST ensure consistent user experience across all interfaces and interactions.
All user-facing elements MUST follow established design patterns, accessibility standards, and usability conventions.
User interface changes MUST be validated through user testing or established UX guidelines.

**Rationale**: Consistent UX reduces user cognitive load, improves adoption rates, and ensures accessibility for all users.

### XI. Performance Requirements

The AI assistant MUST implement solutions that meet defined performance benchmarks.
All features MUST be tested for performance impact and optimized to meet or exceed baseline requirements.
Performance degradation MUST be identified and addressed before deployment.

**Rationale**: Performance directly impacts user satisfaction, system scalability, and operational costs.

## Quality Standards

All implementations MUST follow these non-negotiable quality standards:
- Code MUST pass all existing tests before submission
- New functionality MUST include comprehensive test coverage
- Documentation MUST be updated to reflect changes
- Security best practices MUST be followed at all times

## Development Workflow

All development work MUST follow this workflow:
1. Task feasibility assessment (Principle VI)
2. Check for existing solutions (Principle IV.1)
3. Break task into 1-hour chunks (Principle IX)
4. Implement with real data (Principle I)
5. Verify functionality (Principle IV.2-4)
6. Run regression tests (Principle V)
7. Document results and update tool inventory

## Governance

This Constitution supersedes all other practices and guidelines.
All work MUST comply with these principles without exception.

**Amendment Process**:
- Amendments require explicit user approval and documentation
- Version changes follow semantic versioning (MAJOR.MINOR.PATCH)
- All dependent templates and documentation MUST be updated to reflect changes

**Compliance Review**:
- Every task completion MUST verify adherence to all applicable principles
- Any deviation MUST be explicitly justified and approved by the user
- Principle violations MUST be reported and corrected before proceeding

**Version**: 1.1.0 | **Ratified**: 2025-09-23 | **Last Amended**: 2025-09-24