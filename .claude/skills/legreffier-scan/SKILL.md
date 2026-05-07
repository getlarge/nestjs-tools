---
name: legreffier-scan
description: 'Scan a codebase and create structured diary entries for later consolidation into reusable context tiles. Works best with repos that have readable docs and standard project config.'
---

# LeGreffier Scan Skill

Scan a codebase to create structured diary entries that capture enough
information for later consolidation into reusable context tiles. This is the
**Generate** stage of the context flywheel.

The scan produces evidence entries — not final optimized context. Consolidation
is a separate step.

Visual source of truth:

- `references/scan-flows.md` — canonical state/flow diagrams for
  scan execution and entry post-processing

## Prerequisites

- LeGreffier must be initialized for this repo (`.moltnet/` directory exists)
- Agent identity must be active (`moltnet_whoami` returns a valid identity)
- A diary must exist for this repo (`diaries_list` returns a matching diary)
- **CRITICAL: The diary MUST have `moltnet` visibility (not `private`).** Private
  diaries do not index entries for vector search — consolidation and retrieval
  will be severely degraded. Changing visibility after entries are created does
  NOT retroactively index them. Create the diary with `moltnet` visibility
  from the start.
- `DIARY_ID` and `AGENT_NAME` must be resolved (use the `legreffier` skill
  activation steps if not already done)

### Optional tools

- **[enry](https://github.com/go-enry/enry)** — deterministic language
  detection (Go port of GitHub Linguist). Strongly recommended for polyglot
  repos. Install: `go install github.com/go-enry/enry@latest` (requires Go).
  Or download a binary from [releases](https://github.com/go-enry/enry/releases).
  The scan will prompt if enry is not found and fall back to manifest-based
  detection.

## When to trigger

- First time an agent works on a repo that has no diary entries yet
- When the repo has changed significantly since the last scan
- When a user explicitly asks to scan or bootstrap the diary
- When onboarding a new design partner repo

## Transport detection

After resolving AGENT_NAME and DIARY_ID, detect available transport:

1. If MCP tools are available (`moltnet_whoami` responds): use MCP for all operations.
2. If MCP unavailable or errors with "Auth required" / connection failures: use CLI via `npx @themoltnet/cli` for all operations.
3. **Do not mix transports within a session.** Pick one at activation and stick with it.

CLI credentials: `.moltnet/<AGENT_NAME>/moltnet.json`
CLI global flags: `--credentials ".moltnet/<AGENT_NAME>/moltnet.json"`

### CLI equivalents

| MCP Tool         | CLI Command                                              |
| ---------------- | -------------------------------------------------------- |
| `moltnet_whoami` | `moltnet agents whoami`                                  |
| `diaries_list`   | `moltnet diary list`                                     |
| `diaries_create` | `moltnet diary create --name <name>`                     |
| `entries_create` | `moltnet entry create --diary-id <uuid> --content "..."` |

## Scan modes

### Bootstrap (default)

Fast, safe first pass. Use this for the first scan of any repo.

- Phase 1: docs, project config, workspace layout, CI config
- Phase 2: entry points + one representative file per package
- Entry count: 12-25
- Categories: identity, architecture, workflow, testing, security, caveat
- Additional categories (domain, infrastructure, plans) are emitted only if
  high-quality source docs exist — do not infer from code structure alone
- Goal: generate a usable evidence base with real code patterns quickly

### Deep (explicit request only)

Comprehensive scan for repos with rich documentation. Only use when the user
explicitly requests a deep scan or when re-scanning after significant changes.

- Phase 1: all documentation, config, schemas, journal entries, ADRs
- Phase 2: entry points + multiple representative files per package
- Entry count: 25-50
- All categories active
- Goal: capture full repo knowledge including domain, infrastructure, plans,
  incidents, and code-level conventions

Default is **bootstrap**. If the user says "scan", use bootstrap. If the user
says "deep scan" or "full scan", use deep.

## Secret and sensitive file policy

**Hard gate: never read or create entries from files that may contain secrets.**

The scan MUST skip these files entirely — do not read them, do not extract
from them, do not reference their content in entries:

- `.env`, `.env.*`, `*.env` (all dotenv variants)
- `credentials.*`, `secrets.*`, `tokens.*`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`
- `*-credentials.json`, `*-key.json`, `*-secret.*`
- `genesis-credentials.json`
- `.env.keys`, `.dotenvx/`
- SSH keys (`id_*`, `*.pub` in `.ssh/` or `.moltnet/*/ssh/`)
- `moltnet.json` (contains Ed25519 key seed)
- CI secret configs (`.github/secrets/`, vault configs)
- Any file matched by `.gitignore` that appears to contain credentials

For infrastructure entries, extract **structure and conventions** from
`docker-compose*.yaml` and CI workflows — never extract environment variable
values, connection strings, API keys, or tokens. Reference service names and
configuration patterns, not secret values.

If unsure whether a file contains secrets: skip it and note the skip in the
scan summary.

## Scan scope

The scan runs in two phases:

1. **Phase 1 (structure)**: Read docs, config, and workspace layout to build
   a project graph — what packages exist, how they relate, what patterns are
   documented. This phase produces identity, structure, workflow, and
   cross-cutting entries.

2. **Phase 2 (code-aware)**: For each node in the project graph, read targeted
   source files (entry points, one representative pattern file, test setup) to
   extract conventions not captured in docs. Respects dependency order so that
   when scanning a downstream package, the agent already knows upstream
   conventions.

Phase 2 reads at most 3 targeted files per package (see "What to read per
package" below), not source code line-by-line.

### Artifact categories and scan order

Scan in this order. Earlier categories provide framing for later ones.

| Priority | Category                | Mode      | What to look for                                         | Target paths                                                                                             |
| -------- | ----------------------- | --------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1        | **Project identity**    | bootstrap | Name, purpose, domain, tech stack, maturity              | Root `README.md`, `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`                               |
| 2        | **Architecture docs**   | bootstrap | System design, ER diagrams, data flows, boundaries       | `docs/ARCHITECTURE.md`, `docs/design/`, `docs/adr/`, `ARCHITECTURE.md`                                   |
| 3        | **Developer workflow**  | bootstrap | Build, test, deploy, review process                      | `CONTRIBUTING.md`, `Makefile`, root `package.json` scripts, `docker-compose*.yaml`, `.github/workflows/` |
| 4        | **Project structure**   | bootstrap | Workspace layout, module boundaries, dependency graph    | Workspace config, `apps/`, `libs/`, `packages/`, `src/` top-level dirs                                   |
| 5        | **Testing conventions** | bootstrap | Test framework, patterns, locations, E2E setup           | Test config files, `__tests__/`, `test/`, `e2e/`, `*.test.*` patterns                                    |
| 6        | **Security model**      | bootstrap | Auth flows, trust boundaries, secret management patterns | Auth modules, identity configs, permission models (not actual secrets)                                   |
| 7        | **Known issues**        | bootstrap | Sharp edges, caveats, workarounds                        | `TROUBLESHOOTING.md`, `KNOWN_ISSUES.md`, most recent journal handoff                                     |
| 8        | **Plans and decisions** | deep      | Active plans, ADRs, RFCs, design docs                    | `docs/plans/`, `docs/adr/`, `docs/decisions/`, `docs/rfcs/`, `docs/research/`                            |
| 9        | **Infrastructure**      | deep      | Databases, auth, external services, deployment targets   | `infra/`, `docker-compose*.yaml`, CI configs (structure only, not secrets)                               |
| 10       | **Domain knowledge**    | deep      | Business entities, naming conventions, invariants        | Domain model files, API schemas, database schema                                                         |

In bootstrap mode, categories 8-10 are still emitted if **high-quality source
docs exist** (e.g., a clear `docs/adr/` folder with real ADRs). The mode
column indicates the minimum mode where the category is actively sought.

### Path discovery and tech stack fingerprinting

The full path discovery algorithm, enry integration, framework/ORM/test
detection tables, and per-package recording format are in
`references/path-discovery.md`.

**Summary:** Discovery runs in three passes:

1. **Pass 1 — Repo-level**: Read root README, list top-level dirs, check for
   doc patterns (`docs/`, `adr/`, `plans/`) and agent context (`CLAUDE.md`,
   `.claude/`).
2. **Pass 2 — Workspace detection**: Identify package manager, workspace tool,
   and build system from signal files (`pnpm-workspace.yaml`, `Cargo.toml`,
   `go.work`, etc.) and lock files.
3. **Pass 3 — Per-package fingerprinting**: Detect language (enry preferred,
   manifest fallback), framework, test framework, ORM, and build tool per
   package. Record results in the structure entry.

**Principle: deterministic first, LLM second.** Use enry for language
detection; reserve the LLM for judgment calls (framework selection, pattern
naming).

### Phase 2: Code-aware scan

After Phase 1 produces the project graph (structure entry with dependency
relationships), Phase 2 spawns per-package subagents that read targeted source
files to extract conventions not captured in documentation.

#### Building the project graph

Phase 1's structure entry provides the dependency graph. For monorepos, parse
the workspace config and each package's `package.json` (or `Cargo.toml`,
`go.mod`, etc.) to determine:

```
{
  "libs/database": { deps: [], type: "lib" },
  "libs/models": { deps: [], type: "lib" },
  "libs/auth": { deps: ["libs/database"], type: "lib" },
  "libs/crypto-service": { deps: [], type: "lib" },
  "libs/diary-service": { deps: ["libs/database", "libs/auth", "libs/crypto-service"], type: "lib" },
  "apps/rest-api": { deps: ["libs/auth", "libs/database", "libs/diary-service"], type: "app" },
  "apps/mcp-server": { deps: ["libs/diary-service", "libs/auth"], type: "app" },
  ...
}
```

#### Dependency-ordered scanning

Sort packages in topological order (leaves first). This ensures that when a
subagent scans `apps/rest-api`, it can receive a brief context summary of
conventions already extracted from `libs/auth`, `libs/database`, etc.

Scanning tiers:

| Tier | Packages                         | Rationale                                 |
| ---- | -------------------------------- | ----------------------------------------- |
| 0    | Leaf libs (no internal deps)     | Pure conventions, no composition patterns |
| 1    | Mid-tier libs (depend on tier 0) | Composition patterns with leaf libs       |
| 2    | Apps + top-tier libs             | Full composition, integration patterns    |

Packages within the same tier can be scanned in parallel (separate subagents).

#### What to read per package

For each package, read at most 3 files:

1. **Entry point** (`src/index.ts` or main export): What does this package
   expose? What are the module boundaries?
2. **One representative pattern file**: The file that best shows the canonical
   way to add functionality in this package. Heuristics to pick it:
   - For route-based apps: the most recently modified route file
   - For libs with services: the main service file
   - For libs with repositories: one repository implementation
   - For CLI tools: the main command file
3. **One test file** (if tests exist): The most representative test — ideally
   an integration or e2e test, falling back to a unit test. Shows test
   patterns, mock strategies, fixture usage.

**Do not read**: generated files, lock files, migration SQL, node_modules,
dist/, build output, or any file matching the secret denylist.

#### What to extract per package

Each Phase 2 subagent produces one entry per package using the architecture
template, populating fields that Phase 1 couldn't fill:

- `File conventions:` — actual file naming and location patterns observed
- `Canonical pattern:` — a real code snippet (20-40 lines) showing the
  idiomatic way to add to this package
- `Constraints:` — MUST/NEVER rules observable from code that aren't in docs
  (e.g., every route handler registers as a Fastify plugin)
- `Anti-patterns:` — patterns that would break conventions (inferred from
  consistency of existing code)

For test files, populate:

- `Test example:` — actual test structure from this package
- `Mock pattern:` — how this package handles test doubles

#### Phase 2 subagent prompt template

See `references/content-templates.md` § "Phase 2 package scan subagent" for
the full prompt template. Key points: each subagent receives its assigned
files, upstream convention digests, and returns
`{ id, title, category, confidence, constraint_count, patterns_found }`.

#### Skipping thin packages

Not every package warrants a code-aware entry. Skip Phase 2 for packages that:

- Are pure re-export wrappers (entry point is just `export * from './...'`)
- Have fewer than 3 source files (too thin to have conventions)
- Are generated code (API clients, schema outputs)

Note skips in the scan summary.

#### Context flow between tiers

The primary agent maintains a **convention digest** — a compact summary
(~200 tokens per package) of the key patterns and constraints extracted from
each scanned package. When spawning a tier N+1 subagent, include the digests
from its direct dependencies (not all upstream — just direct deps).

This keeps the per-subagent prompt small while ensuring downstream agents
don't restate upstream conventions.

## Confidence levels

Every scan entry MUST include a confidence level in the content, right after
the `Helps with:` line:

```
Confidence: <high|medium|low>
```

Definitions:

- **high** — directly documented in a dedicated doc or config file
  (e.g., `docs/ARCHITECTURE.md` describes auth flow)
- **medium** — documented + confirmed by config or code structure alignment
  (e.g., README says "uses Vitest" and `vitest.config.ts` exists)
- **low** — inferred from code structure, file names, or partial references
  only (e.g., "appears to use repository pattern based on file names")

Low-confidence entries should have importance reduced by 1-2 points and should
be flagged in the scan summary for human review.

## Entry conventions for scan-generated entries

Scan entries follow LeGreffier conventions with additions specific to scan
provenance.

### Entry type selection

| Source artifact                | Entry type   | Rationale                                     |
| ------------------------------ | ------------ | --------------------------------------------- |
| Architecture docs, design docs | `semantic`   | Captures decisions, patterns, structure       |
| Plans, ADRs, RFCs              | `semantic`   | Captures rationale and trade-offs             |
| Workflow/build/deploy docs     | `semantic`   | Captures conventions and processes            |
| Incident/troubleshooting docs  | `episodic`   | Captures what went wrong and fixes            |
| Journal handoff entries        | `episodic`   | Captures what happened and what's next        |
| Config/infra observations      | `semantic`   | Captures conventions derived from config      |
| Cross-cutting patterns         | `reflection` | Captures patterns spanning multiple artifacts |

**Default is `semantic`.** Most scan artifacts describe how things are and why,
which is semantic knowledge.

### Required tags

Every scan-generated entry MUST include:

- `source:scan` — marks this as scan-derived (not organic experience)
- `scan-session:<session-id>` — unique ID for this scan run (ISO-8601
  timestamp, e.g., `scan-session:2026-03-01T14:30:00Z`). Generate once at
  the start of Step 1 and reuse for all entries in this scan.
- `scan-category:<category>` — one of: `architecture`, `workflow`, `testing`,
  `security`, `domain`, `infrastructure`, `incident`, `plan`, `identity`,
  `summary`
- `scan-batch:<batch-id>` — the planned batch that produced this entry
- `scope:<scope>` — at least one scope tag matching the area

Optional but recommended:

- `freshness:<date>` — the source file's last meaningful modification date
  (from git log)

### Metadata block

Every scan entry includes a `<metadata>` block in the content:

```
<metadata>
operator: <$USER>
tool: <claude|codex|cursor|...>
scan-session: <session-id, same as the tag value>
scan-batch: <batch-id, same as the tag value>
scan-entry-key: <stable key, e.g., architecture:rest-api>
scan-source: <relative path to source file>
scan-source-type: <doc|config|schema|workflow|code-structure>
scan-source-digest: <SHA-256 hex of source file content, first 16 chars>
scan-mode: <bootstrap|deep>
confidence: <high|medium|low>
refs: <comma-separated refs extracted from the content>
timestamp: <ISO-8601 UTC>
branch: <current git branch>
scope: <comma-separated scope tags>
</metadata>
```

New metadata keys specific to scan entries:

| Key                  | Format                                                  | Purpose                                                                                                                 |
| -------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `scan-session`       | ISO-8601 timestamp                                      | Groups all entries from one scan run. Used for recovery after context compression and for bulk supersession on re-scan. |
| `scan-batch`         | planned batch ID                                        | Lets recovery determine which batches actually completed                                                                |
| `scan-entry-key`     | `<category>:<subject-slug>`                             | Stable identity for one logical scan entry, even when multiple entries come from the same source file                   |
| `scan-source`        | relative file path                                      | Which file this entry was extracted from                                                                                |
| `scan-source-type`   | `doc`, `config`, `schema`, `workflow`, `code-structure` | What kind of artifact the source is                                                                                     |
| `scan-source-digest` | first 16 chars of SHA-256 hex                           | Content-based staleness detection on re-scan (stable across rebases, works for untracked files)                         |
| `scan-mode`          | `bootstrap` or `deep`                                   | Which scan mode produced this entry                                                                                     |
| `confidence`         | `high`, `medium`, `low`                                 | How well-sourced this entry is                                                                                          |

### Content structure per scan category

Category-specific content templates are in `references/content-templates.md`.
Each batch subagent should receive only the templates for its assigned
categories.

Every template includes these rule-extraction fields:

- `Constraints:` — MUST/NEVER/PREFER statements
- `Anti-patterns:` — what NOT to do
- `Applies to:` — file glob scope
- `Verification:` — compliance check
- `Trigger hints:` — task/path triggers for nugget selection

Apply the **non-redundancy filter** (see Step 2 extraction rules below).

Available categories: project-identity, architecture, plan/decision, workflow,
structure, testing, infrastructure, security, domain, caveats. Each has a
deterministic template with title, tags, importance, and notes on usage.

## Scan execution workflow

### Step 1: Dry-run plan (mandatory)

Before reading any source files beyond what's needed for discovery, produce a
scan plan and present it to the user for approval.

Generate the scan session ID at this step: an ISO-8601 UTC timestamp
(e.g., `2026-03-01T14:30:00Z`). This ID is used as the `scan-session` tag
and metadata value for every entry in this scan. Write it in the plan.

Also assign:

- a `scan-batch` ID for every planned batch (e.g., `phase1-b1`,
  `phase2-tier0`, `phase2-tier1`)
- a stable `scan-entry-key` for every planned entry

`scan-entry-key` is required because one source file may produce multiple
entries. Format:

`<category>:<subject-slug>`

Examples:

- `architecture:rest-api`
- `architecture:mcp-server`
- `workflow:test`
- `decision:signed-diary-commits`

The plan should include the enry output if available. Run enry before
producing the plan:

```bash
# Check availability
which enry 2>/dev/null && enry --json -prog . || echo "enry not available"
```

If enry is available, include its output in the plan. If not, prompt the user
and fall back to manifest-based detection.

```
Scan plan for <repo-name>
Session: <scan-session-id>
Mode: <bootstrap|deep>
Branch: <current branch>

=== Language detection (enry) ===

<enry output or "enry not available — using manifest-based detection">

Language zones:
  - TypeScript: apps/, libs/, tools/
  - SQL: libs/database/drizzle/
  ...

=== Phase 1: Documentation & config ===

Batches:
  - phase1-b1:
      categories: [identity, structure]
      files:
        - README.md
        - package.json
        - pnpm-workspace.yaml
      planned_entries:
        - identity:project-identity
        - architecture:project-structure
  - phase1-b2:
      categories: [architecture]
      files:
        - docs/ARCHITECTURE.md
      planned_entries:
        - architecture:rest-api
        - architecture:mcp-server
        - architecture:auth-flow
  - ...

Categories to emit:
  - identity: 1 entry
  - structure: 1 entry
  - architecture: 3-4 entries (from docs)
  - workflow: 2 entries
  - testing: 1 entry
  - security: 1 entry
  - caveat: 0-2 entries

Estimated Phase 1 entries: <N>

=== Phase 2: Code-aware scan ===

Project graph (from workspace config):
  Tier 0 (leaf libs): database, models, crypto-service, embedding-service, observability
  Tier 1 (mid libs): auth, diary-service, api-client
  Tier 2 (apps): rest-api, mcp-server, landing

Per-package files:
  libs/database:
    batch: phase2-tier0
    planned_entry: architecture:libs-database
    entry: src/index.ts
    pattern: src/repositories/<most recent>.ts
    test: <first test file found>
  libs/auth:
    batch: phase2-tier1
    planned_entry: architecture:libs-auth
    entry: src/index.ts
    pattern: src/<main service file>.ts
    test: <first test file found>
  apps/rest-api:
    batch: phase2-tier2
    planned_entry: architecture:apps-rest-api
    entry: src/index.ts
    pattern: src/routes/<most recent>.ts
    test: test/e2e/<first e2e file found>
  ...

Packages to skip (thin/generated):
  - libs/models (mostly TypeBox schemas, generated-like)
  - libs/api-client (generated from OpenAPI)

Estimated Phase 2 entries: <N>

=== Totals ===

Estimated total entries: <Phase 1 + Phase 2>
Phase 1 batches: <N>
Phase 2 tiers: <N> (packages within a tier run in parallel)

Skipped (secret/unsafe):
  - .env, .env.local
  - genesis-credentials.json

Skipped (not found):
  - No CONTRIBUTING.md
  - No TROUBLESHOOTING.md
```

**Wait for user approval before proceeding.** The user may:

- Remove files or packages from the scan list
- Add files the discovery missed
- Switch modes
- Adjust batch count
- Skip Phase 2 entirely (docs-only scan)

### Step 2: Phase 1 — Read docs and extract (batched)

Process Phase 1 scan targets (docs, config) in batches to manage context
window pressure (see "Context window strategy" section below).

For each scan target:

```
1. Read the source file
2. Determine scan category
3. Extract structured content using the category template
4. Resolve refs (file paths, modules, services, endpoints)
5. Determine importance level and confidence
6. Build the entry content with metadata block
```

**Extraction rules:**

- **Summarize, don't copy.** The entry should capture the essential knowledge
  from the source, not reproduce it verbatim. Aim for 100-500 words per entry.
- **One concept per entry.** If a doc covers 3 separate architectural
  components, create 3 entries.
- **Constraints first.** Scan for MUST/NEVER/ALWAYS/PREFER statements before
  writing descriptive text. These are the highest-value output. If the source
  says "never do X" or "always do Y", put these in the `Constraints:` field.
  If the source documents what was rejected and why, put these in `Anti-patterns:`.
- **Non-redundancy filter.** Only extract constraints not already inferable
  from the code structure. "Use TypeScript" is noise (there's a tsconfig.json).
  "NEVER use paths aliases in tsconfig.json" is a real constraint. Ask: would
  an agent reading just the code and config still get this wrong? If yes,
  extract it. If no, skip it.
- **Preserve decisions and rationale.** If the source says "we chose X because
  Y", capture both X and Y — this is the most valuable signal for future agents.
  Decisions are a rich source of NEVER constraints (what was rejected and why).
- **Capture task relevance.** For each entry, think: "what task would an agent
  need this knowledge for?" Add a `Helps with:` line listing 1-3 task classes
  (e.g., `add-feature`, `debug-auth`, `write-e2e-test`, `review-security`,
  `onboard-developer`). This directly feeds tile `helps_with` during
  consolidation.
- **Keep constraints atomic.** Split unrelated MUST/NEVER/PREFER items into
  separate bullets. Do not bundle multiple rules into one line.
- **Assign confidence.** Use `high` if the knowledge comes directly from a
  doc. Use `medium` if confirmed by cross-referencing config/code. Use `low`
  if inferred from structure only.
- **Note staleness.** If the source appears outdated (references removed
  features, old versions, deprecated APIs), note this in the content and lower
  the importance.
- **Cross-reference via refs.** If two sources discuss the same component, use
  matching `refs:` values in both entries. This enables consolidation to group
  related entries across categories.
- **Nugget acceptance gate.** When populating `Constraints:` and
  `Anti-patterns:`, apply this filter to each candidate rule: is it
  **triggerable** (clear when it applies), **specific** (real convention,
  not vague), **bounded** (fits one subsystem or task family), **grounded**
  (links to concrete files), and **actionable** (agent can follow it or
  validator can check it)? If a candidate fails, keep it as descriptive text
  rather than promoting it to a constraint.

### Step 3: Create Phase 1 entries

For each extracted entry:

```
1. Call entries_create({
     diary_id: DIARY_ID,
     title: "Scan: <category> — <subject>",
     content: <structured content with metadata block>,
     entry_type: <semantic|episodic|reflection>,
     tags: ["source:scan", "scan-session:<id>", "scan-category:<cat>",
       "scan-batch:<batch-id>", "scope:<scope>", ...],
     importance: <1-10>
   })
2. Log the entry ID for the scan report
```

Do not verify returned fields beyond checking for errors — minimize API calls.

### Step 4: Phase 2 — Code-aware scan

Execute Phase 2 as described in the "Phase 2: Code-aware scan" section above:
build the project graph, resolve representative files, spawn tier-ordered
subagents, collect entry IDs. Between tiers, the primary agent holds only the
scan plan, entry IDs + titles, convention digests (~200 tokens/package), and
constraint counts.

### Step 5: Create scan summary (covers both phases)

After all entries are created, write one `reflection` entry summarizing the
scan. This summary is the first Observe artifact — it tells the next agent
(or the consolidation step) what was covered and what's missing.

```
Scan summary for <repo-name>
Mode: <bootstrap|deep>
Date: <timestamp>
Entries created: <count>

Coverage:
  categories_covered: <list with entry count per category>
  categories_missing: <list — categories with no source material found>
  categories_partial: <list — categories with low-confidence entries only>
  constraints_extracted: <total MUST/NEVER/PREFER count across all entries>
  anti_patterns_extracted: <total anti-pattern count>

Gaps:
  - <gap description — e.g., "No testing docs found; testing entry inferred
    from config only (low confidence)">
  - <gap description — e.g., "Security model inferred from Ory config files;
    no dedicated security documentation exists">
  - <gap description — e.g., "Architecture docs cover REST API but not MCP
    server; MCP architecture entry is partial">

Sources skipped:
  unsafe: <list of files skipped for secret/safety reasons>
  not_found: <list of expected doc paths that don't exist>

Staleness:
  - <source file>: <reason it appears outdated>

Low-confidence entries (recommend human review):
  - <entry title>: <why confidence is low>

Recommended next:
  - <what a human or follow-up scan should address>
  - <what tiles could be derived from current entries>

<metadata>
operator: <user>
tool: <tool>
scan-session: <scan-session-id>
scan-mode: <bootstrap|deep>
timestamp: <ISO-8601 UTC>
branch: <branch>
scope: scope:misc
</metadata>
```

- Title: `Scan: Summary — <repo-name>`
- Tags: `source:scan`, `scan-category:summary`, `reflection`
- Importance: 5

### Step 6: Report to user

Print a summary table:

```
=== Phase 1 (docs & config) ===
| # | Category | Title | Confidence | Entry ID | Constraints |
|---|---|---|---|---|---|
| 1 | identity | Scan: Project identity — moltnet | high | abc-123 | 4 |
| 2 | architecture | Scan: Architecture — rest-api | high | def-456 | 3 |
| 3 | testing | Scan: Testing conventions | medium | ghi-789 | 2 |
...

=== Phase 2 (code-aware) ===
| # | Package | Title | Confidence | Entry ID | Patterns |
|---|---|---|---|---|---|
| 1 | libs/database | Scan: Code — database | medium | jkl-012 | repository |
| 2 | libs/auth | Scan: Code — auth | medium | mno-345 | jwt-plugin |
| 3 | apps/rest-api | Scan: Code — rest-api | medium | pqr-678 | route-plugin |
...

Totals: <Phase 1 entries> + <Phase 2 entries> = <total>
Constraints extracted: <count>
Canonical patterns found: <count>
Packages skipped (thin): <count>
Gaps found: <count>
Low-confidence entries: <count>
```

## Context window strategy

**This is the most important operational concern for the scan workflow.**

A full scan reads many files and creates many entries. Without management, the
agent will exhaust its context window mid-scan, losing the scan plan, the
accumulated entry IDs, and the ability to produce a coherent summary.

### Principles

1. **The scan plan is the checkpoint.** It is produced in Step 1, approved by
   the user, and serves as the recovery document if context is compressed.
2. **Batch by category, not by file.** Each batch should process one or two
   related categories end-to-end (read sources → extract → create entries).
   This keeps related context together and allows earlier file contents to be
   evicted before the next batch.
3. **Write entries immediately.** Do not accumulate extracted content in
   memory. Read a file, extract, call `entries_create`, log the ID, move on.
   The diary is the durable store — the context window is not.
4. **The summary entry uses entry IDs, not entry content.** The scan summary
   references entries by ID and title. It does not need to hold full entry
   content in context.

### Batch structure

Split the scan into batches based on category groups. Keep batches small —
the enriched templates with Constraints/Anti-patterns/Verification fields
require more cognitive work per file than plain description.

| Batch         | Categories             | Typical files                               | Expected entries |
| ------------- | ---------------------- | ------------------------------------------- | ---------------- |
| 1             | identity, structure    | README, package.json, workspace config      | 2-3              |
| 2             | architecture           | Architecture docs, design docs              | 2-4              |
| 3             | workflow, testing      | CONTRIBUTING, CI config, test config        | 2-4              |
| 4             | security, caveat       | Auth docs, troubleshooting, journal handoff | 1-3              |
| 5 (deep only) | plans, decisions       | ADRs, RFCs, plans                           | 2-4              |
| 6 (deep only) | infrastructure, domain | Infra config, schemas                       | 2-4              |

**Rule of thumb**: no batch should produce more than 4 entries. If a category
would produce 5+ entries (e.g., architecture on a large monorepo), split it
into two batches by subsystem.

Between batches, the agent should:

- Log a running tally: `Batch N complete: M entries created so far, C constraints extracted`
- Release file contents from working memory (don't re-read them)
- Keep only: scan plan, entry ID list, running tally, constraint counts

### Subagent execution (preferred for most scans)

When subagent support is available, delegate per-batch to subagents:

- **Primary agent**: produces the scan plan, assigns batches, collects
  entry IDs, writes the summary
- **Batch subagent**: receives a batch assignment (category list + file list
  - DIARY_ID), reads files, creates entries, returns entry IDs + titles +
    confidence levels + constraint counts

Each subagent gets a fresh context window. The primary agent's context holds
only the plan and the collected results, not the file contents.

This is the **recommended approach for repos with 10+ expected entries**.
The enriched templates (with Constraints, Anti-patterns, Applies to,
Verification) require more cognitive work per file than plain description.
Subagent delegation keeps each batch within a manageable context budget.

**When to use subagents vs single-agent:**

| Expected entries | Approach               | Rationale                                       |
| ---------------- | ---------------------- | ----------------------------------------------- |
| < 10             | Single agent, batched  | Small enough to fit in one context window       |
| 10-20            | Subagents, 2-3 batches | Enriched templates need fresh context per batch |
| 20+              | Subagents, 4-5 batches | Deep scan on large repo, mandatory delegation   |

Batch subagent prompt template: see `references/content-templates.md`
§ "Batch scan subagent". Each subagent receives its assigned categories,
file list, and the relevant category templates from the same file.

### Context budget per batch

Each batch subagent should aim to stay within this budget:

| Context section        | Approximate tokens | Notes                                  |
| ---------------------- | ------------------ | -------------------------------------- |
| Prompt + templates     | 2,000-3,000        | Only templates for assigned categories |
| File reads (2-4 files) | 3,000-8,000        | Depends on file size                   |
| Entry composition      | 1,500-3,000        | 100-500 words per entry                |
| API calls overhead     | 500-1,000          | entries_create calls                   |
| **Total per batch**    | **7,000-15,000**   | Well within a single context window    |

If a single file is very large (> 3,000 tokens), the subagent should read it
in sections or extract only the constraint-relevant portions. Large README or
ARCHITECTURE files should be read with targeted grep for MUST/NEVER/ALWAYS
keywords before full extraction.

### Recovery after context compression

If the agent's context is compressed mid-scan:

1. Retrieve the scan session ID from the scan plan (which should be in the
   conversation summary or the user's approval message)
2. Query only this session's entries:
   `entries_search({ query: "<scan-session-id>", tags: ["scan-session:<scan-session-id>"] })`
3. Compare returned entries against the scan plan to determine which batches
   are complete (match by `scan-batch` tags and planned `scan-entry-key` values)
4. Resume from the next incomplete batch
5. Note the interruption in the scan summary

The session ID is the key that makes recovery reliable — it filters out entries
from previous scans. Without it, recovery would return a mix of current and
stale entries.

The scan plan + session-tagged diary entries together form a durable checkpoint
that survives context compression.

## Re-scan behavior

When re-scanning a repo that already has scan entries, download the previous
scan state locally first, diff locally, then push changes. This minimizes API
calls and keeps the comparison logic in a single pass.

### Step 1: Download previous scan state (2 API calls)

```
1. entries_search({
     query: "Scan: Summary",
     tags: ["source:scan", "scan-category:summary"],
     exclude_superseded: true,
     limit: 1
   })
   → extract prev_session_id and prev_summary_id

2. entries_list({
     diary_id: DIARY_ID,
     tags: ["source:scan", "scan-session:<prev_session_id>"],
     limit: 100
   })
   → download all entries from the previous scan session
```

### Step 2: Build local index (zero API calls)

Parse each downloaded entry's content to extract the `<metadata>` block.
Build an in-memory index:

```
{
  "architecture:rest-api": {
    entry_id, source: "docs/ARCHITECTURE.md", digest: "a1b2c3d4...", category, title
  },
  "identity:project-identity": {
    entry_id, source: "README.md", digest: "e5f6g7h8...", category, title
  },
  ...
}
```

Key: `scan-entry-key` value → value: entry ID + source + digest + category.

### Step 3: Diff against current files (zero API calls)

For each planned entry in the new scan plan:

- compute the source digest for that entry's source file
- look up `scan-entry-key` in the local index
- classify as:
  - `unchanged` if the entry key exists and the source digest matches
  - `changed` if the entry key exists and the source digest differs
  - `new` if the entry key does not exist in the previous session
  - `deleted` if an old entry key exists in the previous session but not in the new plan

### Step 4: Execute changes (only for changed/new entries)

- **unchanged**: skip entirely — no API call
- **changed**: create new entry, then supersede old:
  `entries_create(...)` then `entries_update({ entry_id: <old>, superseded_by: <new> })`
- **new**: create new entry only
- **deleted**: note in scan summary, do not delete old entry

### Step 5: Supersede the previous summary

After all new entries are created:

```
entries_update({ entry_id: <prev_summary_id>, superseded_by: <new_summary_id> })
```

This is the critical step. Even if individual entry supersession is incomplete
(e.g., the agent ran out of context before superseding all changed entries),
the summary supersession chain tells consumers which session is authoritative.

### Best-effort individual supersession

Individual entry supersession (step 6) is best-effort. If the agent can't
complete it (context pressure, crash, timeout), the system still works because:

- The new summary entry lists the current session ID
- Consumers resolve the current session from the summary chain (see below)
- Old entries from previous sessions are implicitly stale

### How consumers resolve the current scan session

Any tool or workflow that reads scan entries (consolidation, session pack
assembly, the `reflect` tool) should follow this protocol:

1. Find the most recent **non-superseded** scan summary:
   `entries_search({ query: "Scan: Summary", tags: ["scan-category:summary"], exclude_superseded: true })`
2. Extract `scan-session` from that summary's metadata — this is the
   **authoritative session ID**
3. Query entries from that session only:
   `entries_search({ tags: ["scan-session:<authoritative-session-id>"] })`
4. Ignore entries from other scan sessions, even if they're not formally
   superseded

This means the summary supersession chain is the only thing that _must_ be
maintained. Individual entry supersession is nice-to-have for cleanliness but
not required for correctness.

## What the scan does NOT do

- Does not create `procedural` entries (those are for commits)
- Does not sign entries (scan entries are not part of the accountability chain)
- Does not produce tiles or packs (that's the consolidation step)
- Does not read source code exhaustively (Phase 2 reads targeted files only —
  entry points, one representative pattern, one test — not every file)
- Does not replace existing organic entries (scan entries coexist with them)
- Does not evaluate whether the extracted knowledge is correct (that's the
  eval step)

## Entry count guidance

Aim for the right granularity. Counts include both Phase 1 and Phase 2 entries.

| Repo size                        | Bootstrap entries | Deep entries | Rationale                                        |
| -------------------------------- | ----------------- | ------------ | ------------------------------------------------ |
| Small (< 10 files, no docs)      | 8-15              | 12-20        | Identity, structure, workflow + 2-4 code entries |
| Medium (10-100 files, some docs) | 15-25             | 25-40        | Above + architecture, testing, security + code   |
| Large (100+ files, rich docs)    | 20-30             | 35-50        | Above + multiple architecture entries + code     |
| Monorepo (many packages)         | 20-35             | 40-60        | Above + per-package code-aware entries           |

Phase 2 typically adds 1 entry per scanned package (not per file). A monorepo
with 15 packages might add 8-12 Phase 2 entries (thin packages are skipped).

More than 60 entries suggests the scan is too granular. Consolidate at the
scan level — don't create entries per file or per function.

## Consolidation

After a scan is complete, the consolidation step transforms raw scan entries
into **context tiles** (~200-400 tokens each) — synthesized knowledge units
scoped to subsystems, with constraints and code patterns.

The `legreffier-consolidate` skill handles the consolidation execution. It
uses server-side clustering (`diaries_consolidate`) to identify merge groups,
then creates tiles from merged scan entries.

See also [CONTEXT_PACK_GUIDE.md](../../../docs/CONTEXT_PACK_GUIDE.md) for
how tiles feed into compiled context packs.

## Permissions

- Scan entries use the same diary as organic LeGreffier entries
- Diary visibility should be `moltnet` (standard for team-visible entries)
- No signing is required for scan entries (they're derived, not accountable)
- The scan agent must have write access to the diary (standard LeGreffier
  identity is sufficient)
