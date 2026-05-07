# Content Templates and Subagent Prompts

Reference material for the scan skill. Contains:

- Category-specific content templates for scan entries
- Subagent prompt templates for Phase 2 and batch execution

The main skill document links here from the "Content structure per scan
category" and "Subagent execution" sections.

## Rule-readiness principle

Every template includes fields that feed downstream rule extraction. The scan
produces evidence entries, but those entries must be shaped so a consolidation
step can mechanically extract **rule nuggets** — small, triggered, bounded,
grounded constraints that load at task time. The key fields for rule extraction
are:

- `Constraints:` — MUST/NEVER/PREFER statements extracted verbatim from docs
- `Anti-patterns:` — what NOT to do and what happens if you do
- `Applies to:` — file glob where this knowledge is relevant
- `Verification:` — how to check compliance
- `Trigger hints:` — simple task/path/workflow triggers for later nugget selection

These fields appear in every category. Category-specific fields add further
rule-relevant structure (canonical patterns, exact commands, hard rules).

## Non-redundancy filter

Only extract constraints that are NOT already obvious from the code structure.
"Use TypeScript" is noise (there's a `tsconfig.json`). "NEVER use paths
aliases in tsconfig.json" is a real constraint. If a convention is inferable
from config files, don't extract it as a constraint — it adds cognitive load
without value.

---

## Category templates

### Project identity

```
Project: <name>
Purpose: <1-2 sentences>
Tech stack: <languages, frameworks, runtime>
Maturity: <early/active/stable/maintenance>
Repository type: <monorepo|single-package|multi-repo>
Key dependencies: <3-5 most important external deps>
Constraints:
  - MUST: <repo-wide hard requirements — e.g., "use catalog: for deps">
  - NEVER: <repo-wide prohibitions — e.g., "never use paths aliases">
  - PREFER: <repo-wide soft conventions>
Applies to: **
Trigger hints:
  - task-class:onboard-developer
  - task-class:understand-codebase
Helps with: onboard-developer, understand-codebase
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Project identity — <name>`
- Tags: `source:scan`, `scan-category:identity`, `scope:misc`
- Importance: 7 (high — frames everything else)
- One entry per repo
- Note: `Constraints:` here captures repo-wide rules that apply everywhere.
  Extract from CLAUDE.md, CONTRIBUTING.md, root README. These become
  always-loaded ("hot") rule nuggets.

### Architecture

```
Component: <name or subsystem>
Purpose: <what it does>
Boundaries: <what it owns, what it delegates>
Key abstractions: <patterns, interfaces, data models>
Dependencies: <what it depends on, what depends on it>
File conventions: <where new files go, naming pattern for this subsystem>
Data flow: <how data moves through this component>
Constraints:
  - MUST: <hard requirements for this subsystem>
  - NEVER: <prohibitions specific to this subsystem>
  - PREFER: <soft conventions>
Anti-patterns:
  - <what NOT to do in this subsystem + what breaks>
Canonical pattern: |
  <code snippet showing the right way to add/modify in this subsystem.
   In Phase 1, use a snippet from docs if available. In Phase 2, targeted
   source files may provide this snippet when docs do not. Extract only a
   small representative pattern, not a whole implementation.>
Applies to: <file glob, e.g., apps/rest-api/**, libs/database/**>
Verification: <how to check compliance — e.g., "pnpm run typecheck">
Trigger hints:
  - task-class:<1-2 task classes>
  - path:<major subsystem glob>
Helps with: <1-3 task classes, e.g., add-feature, debug-issue, review-code>
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Architecture — <component>`
- Tags: `source:scan`, `scan-category:architecture`, `scope:<area>`
- Importance: 6-8
- One entry per major component/subsystem (not one per file)
- Note: `Canonical pattern:` may come from docs in Phase 1 or from one
  targeted representative source file in Phase 2. Do not invent patterns
  from broad code inspection, and do not paste whole implementations.

### Plan or decision (ADR)

```
Decision: <what was decided>
Date: <when, from the document>
Status: <active|superseded|proposed>
Context: <why the decision was needed>
Alternatives considered: <what else was evaluated>
Reason chosen: <why this option>
Trade-offs: <what was given up>
Constraints:
  - MUST: <hard rules that follow from this decision>
  - NEVER: <approaches ruled out by this decision>
Applies to: <file glob where this decision constrains work>
Trigger hints:
  - task-class:understand-decision
  - task-class:review-architecture
Helps with: <1-3 task classes, e.g., understand-decision, review-architecture>
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Decision — <short description>`
- Tags: `source:scan`, `scan-category:plan`, `decision`, `scope:<area>`
- Importance: 5-7
- One entry per ADR/decision document
- Note: Decisions are a rich source of NEVER constraints — they document
  what was rejected and why. Extract these as negative rules.

### Developer workflow

```
Workflow: <name — build|test|deploy|review|release>
Required commands:
  - <exact copy-paste command with all flags>: <what it does>
  - <exact copy-paste command>: <what it does>
Prerequisites: <what must be true before running>
Common mistakes:
  - <what breaks if you skip a step + what the error looks like>
  - <wrong command variant + why it fails>
Constraints:
  - MUST: <e.g., "run db:generate after schema changes">
  - NEVER: <e.g., "never use git add -A">
CI integration: <how this relates to CI pipeline>
Applies to: <file glob, e.g., **/*.ts for lint, apps/rest-api/** for deploy>
Verification: <how to check the workflow was followed>
Trigger hints:
  - workflow:<build|test|deploy|review|release>
  - task-class:<matching task class>
Helps with: <1-3 task classes, e.g., setup-local-dev, run-tests, deploy>
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Workflow — <name>`
- Tags: `source:scan`, `scan-category:workflow`, `scope:<area>`
- Importance: 5-6
- One entry per distinct workflow (build, test, deploy, release)
- Note: `Required commands:` must be exact, copy-paste-ready. These are
  the most reliably followed instructions. Include
  all flags. `Common mistakes:` should include the error message when
  possible — helps agents recognize known issues.

### Project structure (workspace/module layout)

```
Structure: <monorepo|single-package|...>
Package manager: <pnpm|yarn|npm|bun|cargo|go|uv|...>
Workspace tool: <pnpm-workspaces|nx|turbo|lerna|cargo-workspace|go-work|...>
Build system: <tsc+vite|nx|turbo|bazel|make|cargo|go-build|...>

Layout:
  - <dir/>: <purpose> (<framework/pattern>)
  - <dir/>: <purpose>

Packages:
  - <name>:
      path: <relative path>
      type: <lib|app|tool|package>
      language: <typescript|go|python|rust|...>
      framework: <fastify|nestjs|react|none|...>
      test_framework: <vitest|jest|pytest|none|...>
      orm: <drizzle|prisma|none|...>
      build: <tsc|vite|esbuild|go-build|cargo|...>
      source_layout: <src/|lib/|pkg/|...>
      entry_point: <src/index.ts|main.go|...>
      internal_deps: [<workspace dep names>]
  - <name>: ...

Module boundaries: <what can import what>
Shared code: <where shared utilities/types live>
Build order: <dependency/build topology if relevant>
Constraints:
  - MUST: <e.g., "new packages must extend root tsconfig with composite: true">
  - NEVER: <e.g., "never use paths aliases — use pnpm workspace symlinks">
Anti-patterns:
  - <e.g., "don't create libs/ packages that depend on apps/ packages">
Applies to: <file glob, e.g., libs/**, apps/**, packages/**>
Verification: <how to check structure compliance>
Trigger hints:
  - task-class:add-module
  - path:<workspace area glob>
Helps with: onboard-developer, understand-codebase, add-module
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Project structure`
- Tags: `source:scan`, `scan-category:architecture`, `scope:misc`
- Importance: 7 (upgraded — this entry drives Phase 2 targeting)
- One entry per repo (or one per workspace root in multi-repo)
- Note: The `Packages:` section is the project graph that Phase 2 uses to
  determine what patterns to look for per package. It must be accurate —
  Phase 2 subagents receive this as their targeting input.

### Testing conventions

```
Framework: <test framework and version>
Test types:
  - unit: <location pattern, run command>
  - integration: <location pattern, run command, prerequisites>
  - e2e: <location pattern, run command, prerequisites>
Patterns: <AAA, BDD, etc.>
Required commands:
  - <exact test command with all flags>
  - <exact e2e command with prerequisites>
Test example: |
  <representative test structure. In Phase 1, use docs or CLAUDE.md if
   available. In Phase 2, a targeted test file may provide this example.
   Do not invent patterns, and do not paste full test suites.>
Mock pattern: <how this repo handles test doubles — e.g., vi.mock, manual>
Fixtures: <where fixtures live, how to create them>
Constraints:
  - MUST: <e.g., "e2e stack must be running before tests">
  - NEVER: <e.g., "never use jest.fn() — use vi.fn()">
Anti-patterns:
  - <what goes wrong in tests + how to recognize it>
Applies to: **/*.test.ts, **/test/e2e/**
CI integration: <how tests run in CI>
Verification: <how to check test compliance>
Trigger hints:
  - task-class:write-test
  - task-class:write-e2e-test
Helps with: write-test, write-e2e-test, debug-test-failure
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Testing conventions`
- Tags: `source:scan`, `scan-category:testing`, `scope:test`
- Importance: 5-6
- One entry per repo (or per major test category if complex)
- Note: Testing is the most reliably followed category (75% prevalence,
  F1=0.94). Concrete commands and patterns here
  have the highest chance of being acted on correctly.

### Infrastructure

```
Service: <name>
Role: <what it does in the system>
Provider: <where it runs — local Docker, cloud, managed>
Configuration: <where config lives — not secret values>
Dependencies: <what other services it needs>
Required commands:
  - <exact setup/start command>
Constraints:
  - MUST: <e.g., "reset volumes after migration changes">
  - NEVER: <e.g., "never extract env var values from compose files">
Applies to: <file glob, e.g., docker-compose*.yaml, infra/**>
Verification: <how to validate infra setup or compliance>
Trigger hints:
  - workflow:setup-local-dev
  - task-class:debug-infra
Helps with: <1-3 task classes, e.g., setup-local-dev, debug-infra, deploy>
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Infrastructure — <service>`
- Tags: `source:scan`, `scan-category:infrastructure`, `scope:infra`
- Importance: 4-6
- One entry per service/infrastructure component

### Security model

```
Auth model: <how authentication works>
Authorization: <how permissions are enforced>
Trust boundaries: <where trust transitions happen>
Secret management: <how secrets are stored and accessed — patterns only>
Key patterns: <signing, encryption, token lifecycle>
Constraints:
  - MUST: <non-negotiable security requirements — e.g., "all diary writes
     require Keto permission check">
  - NEVER: <security prohibitions — e.g., "private key NEVER leaves the
     agent's machine", "never extract secret values from config files">
  - PREFER: <security best practices>
Anti-patterns:
  - <security mistakes to avoid + consequences>
Verification: <how to check security compliance — e.g., commands, audits>
Applies to: <file glob, e.g., libs/auth/**, libs/crypto-service/**>
Trigger hints:
  - task-class:review-security
  - trust-boundary:<boundary name>
Helps with: review-security, add-auth, audit-permissions
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Security model`
- Tags: `source:scan`, `scan-category:security`, `scope:auth`
- Importance: 7
- One entry per repo (or split if auth and crypto are separate concerns)
- Note: Security rules appear in only ~15% of context files
  but are the highest-value rules. The scanner MUST
  actively search ALL docs for security-related MUST/NEVER statements,
  not just dedicated security docs. Extract from ARCHITECTURE.md,
  MISSION_INTEGRITY.md, journal entries about auth changes, etc.

### Domain knowledge

```
Entity: <business concept or domain object>
Definition: <what it represents>
Invariants: <rules that must always hold — these are hard constraints>
Naming: <how it's referred to in code vs docs vs UI>
Relationships: <how it connects to other entities>
Lifecycle: <states, transitions, ownership>
Constraints:
  - MUST: <domain invariants expressed as rules>
  - NEVER: <domain violations — e.g., "never create diary without owner">
Applies to: <file glob where this entity is handled>
Helps with: <1-3 task classes, e.g., add-feature, understand-domain, review-code>
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Domain — <entity or concept>`
- Tags: `source:scan`, `scan-category:domain`, `scope:<area>`
- Importance: 5-6
- One entry per major domain concept (not per database table)
- Note: Domain `Invariants:` are the most valuable rule source here.
  They map directly to hard constraints that prevent data corruption.

### Known issues and caveats

```
Issue: <what the problem is>
Context: <when it manifests>
Trigger: <what task or action causes this to surface>
Workaround: <current mitigation — exact commands if applicable>
Error signature: <what the error message looks like>
Status: <open|mitigated|resolved>
Impact: <what breaks if you hit this>
Constraints:
  - NEVER: <what to avoid to prevent this>
  - MUST: <what to do when encountering this>
Applies to: <file glob where this issue is relevant>
Helps with: <1-3 task classes, e.g., debug-issue, avoid-pitfall, onboard-developer>
Confidence: <high|medium|low>

<metadata>
...
</metadata>
```

- Title: `Scan: Caveat — <short description>`
- Tags: `source:scan`, `scan-category:incident`, `incident`, `scope:<area>`
- Entry type: `episodic`
- Importance: 4-6
- One entry per distinct issue
- Note: Caveats are high-value negative rules. The `Error signature:` field
  helps agents recognize known issues. `Trigger:` maps directly to the
  nugget trigger type.

---

## Subagent prompt templates

### Phase 2 package scan subagent

Used when spawning per-package subagents in the code-aware scan phase.

```
You are scanning package <package-path> for code-level conventions.
Diary ID: <DIARY_ID>
Scan session: <scan-session-id>
Scan mode: <bootstrap|deep>
Repo: <repo-name>

Upstream context (conventions from dependencies):
<brief summary of constraints/patterns from already-scanned deps>

Your assignment:
  Package: <package-path>
  Package type: <lib|app|tool|package>
  Files to read:
    - entry point: <path>
    - pattern file: <path>
    - test file: <path> (if exists)

Extract:
1. File conventions (naming, location patterns)
2. Canonical pattern (20-40 line code snippet showing the right way)
3. Constraints (MUST/NEVER rules not already in docs)
4. Anti-patterns (what would break this package's conventions)
5. Test patterns (if test file read)

Create one architecture entry via entries_create with tags:
  ["source:scan", "scan-session:<id>", "scan-category:architecture",
   "scan-phase:code", "scope:<package-name>"]

Important:
- Do NOT restate constraints already in the upstream context
- Do NOT copy entire files — extract the pattern, not the implementation
- If the package is thin (just re-exports), note that and skip
- Apply the non-redundancy filter: if a convention is obvious from the
  upstream deps, skip it

Return: { id, title, category, confidence, constraint_count, patterns_found }
```

### Batch scan subagent

Used when delegating Phase 1 batches to subagents for context window management.

```
You are executing batch <N> of a LeGreffier scan.
Diary ID: <DIARY_ID>
Scan session: <scan-session-id>
Scan mode: <bootstrap|deep>
Repo: <repo-name>

Your assignment:
  Categories: <list>
  Files to read: <list>

For each file:
1. Read the file
2. Scan for MUST/NEVER/ALWAYS/PREFER statements FIRST — these populate
   the Constraints: field and are the highest-value output
3. Extract entries using the templates below
4. Apply the non-redundancy filter: skip constraints already inferable
   from code structure (e.g., "use TypeScript" when tsconfig.json exists)
5. Apply the nugget acceptance gate to each constraint: is it triggerable,
   specific, bounded, grounded, and actionable? If not, keep it as
   descriptive text, not a constraint.
6. Create each entry via entries_create — include tags:
   ["source:scan", "scan-session:<scan-session-id>", "scan-category:<cat>",
    "scan-batch:<batch-id>", "scope:<scope>"]
7. Include metadata:
   - scan-batch: <batch-id>
   - scan-entry-key: <category>:<subject-slug>
8. Return the list:
   [{ id, title, category, confidence, constraint_count, scan_entry_key }]

Entry templates:
<paste only the relevant category templates for this batch>

Extraction priorities:
- Constraints (MUST/NEVER) > Anti-patterns > Canonical patterns > Description
- If running low on context, prioritize constraints over descriptive fields
- Write entries immediately after extraction — don't accumulate

Do not create a summary entry — the primary agent handles that.
```
