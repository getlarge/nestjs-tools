# Path Discovery and Tech Stack Fingerprinting

Reference material for the scan skill's discovery phase. The main skill
document links here from the "Scan scope" section.

## Path discovery algorithm

The scan must adapt to each repo's structure. Phase 1 discovery builds a
**project graph** that Phase 2 uses to know what conventions to look for in
each package. Discovery has three passes:

### Pass 1: Repo-level discovery

1. Read root `README.md` — it usually describes project structure
2. List top-level directories: `ls -1`
3. Check for common doc patterns:
   - `docs/`, `doc/`, `documentation/`
   - `adr/`, `decisions/`, `rfcs/`
   - `plans/`, `research/`
   - `journal/`, `changelog/`
4. Check for existing agent context:
   - `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `.cursorrules`
   - `.claude/`, `.github/copilot-instructions.md`

### Pass 2: Workspace and package manager detection

Identify the workspace tool, package manager, and build system at the repo
root. These determine how packages are organized and how to read dependency
graphs.

| Signal file                            | What it tells you                                |
| -------------------------------------- | ------------------------------------------------ |
| `pnpm-workspace.yaml`                  | pnpm monorepo, `packages:` lists workspace globs |
| `lerna.json`                           | Lerna monorepo (possibly with npm/yarn/pnpm)     |
| `turbo.json`                           | Turborepo build orchestration                    |
| `nx.json`                              | Nx monorepo, `projects` or auto-detection        |
| `rush.json`                            | Rush monorepo                                    |
| `Cargo.toml` with `[workspace]`        | Rust workspace, `members` lists crates           |
| `go.work`                              | Go workspace, `use` lists modules                |
| `pyproject.toml` with workspace config | Python monorepo (uv, pdm, poetry)                |
| `BUILD` / `BUILD.bazel` / `WORKSPACE`  | Bazel build system                               |
| `Makefile` at root                     | Make-based build (common in Go, C, mixed repos)  |
| `Justfile`                             | just command runner                              |
| `Taskfile.yml`                         | Task runner                                      |
| `docker-compose*.yaml`                 | Docker-based local dev                           |
| `flake.nix` / `shell.nix`              | Nix-based dev environment                        |

Also detect the package manager:

- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `package-lock.json` → npm
- `bun.lockb` / `bun.lock` → bun
- `Cargo.lock` → cargo
- `go.sum` → go modules
- `uv.lock` / `poetry.lock` / `pdm.lock` / `Pipfile.lock` → Python variant

### Pass 3: Per-package tech stack fingerprinting

For each package/module in the workspace, detect the language, framework,
and source layout. This tells Phase 2 subagents what patterns to look for.

**Principle: deterministic first, LLM second.** Language detection is a solved
problem — don't waste LLM tokens on it. Use external tools for what they do
well, reserve the LLM for judgment calls (framework selection, pattern naming).

#### Step 3a: Language detection with enry (deterministic)

Use [enry](https://github.com/go-enry/enry) (the Go port of GitHub Linguist)
as the primary language detection tool. Run it per package directory to get a
file-to-language map.

**Check availability:**

```bash
which enry
```

If `enry` is not installed, prompt the user:

```
enry is not installed. It provides fast, deterministic language detection.
Install options:
  - go install github.com/go-enry/enry@latest
  - Download binary from https://github.com/go-enry/enry/releases

Install now, or fall back to manifest-based detection?
```

If the user declines or `enry` is unavailable, fall back to manifest-based
detection (Step 3b).

**Run per package:**

```bash
enry --json <package-path>
```

Output is a JSON map of language → file list:

```json
{
  "JSON": ["package.json"],
  "TypeScript": ["src/index.ts", "src/routes/diary.ts"]
}
```

Use `-prog` flag to filter to programming languages only (excludes data,
markup, prose):

```bash
enry --json -prog <package-path>
```

**What to extract from enry output:**

- Primary language: the language with the most files (or most LOC if close)
- Secondary languages: any other programming languages present (e.g., SQL
  migration files in a TypeScript package)
- Language zones: at repo level, map which directories are which languages
  (critical for polyglot repos)

**Repo-level language map (run once at repo root):**

```bash
enry --json -prog .
```

This gives a global picture before per-package analysis. For monorepos, the
repo-level map reveals language zones that inform which detection heuristics
to apply per package (e.g., skip Python framework tables for a TypeScript
package).

#### Step 3b: Framework and tooling detection (manifest + config)

After language is known (from enry or fallback), detect the framework, test
framework, ORM, and build tool. This step reads package manifests and checks
for framework-specific config files.

**How to fingerprint:**

Read the package manifest (`package.json`, `Cargo.toml`, `go.mod`,
`pyproject.toml`) and check for framework dependencies. Then confirm by
checking for framework-specific config files.

> **Note:** The tables below are non-exhaustive — they cover common frameworks,
> test runners, and ORMs but are not a complete catalog. If the repo uses a
> framework not listed here, apply the same detection pattern (dependency in
> manifest + confirmation via config file or source structure).

| Framework                 | Detection signal (dependency) | Confirm (config/structure)        | Source pattern to expect         |
| ------------------------- | ----------------------------- | --------------------------------- | -------------------------------- |
| **Fastify**               | `fastify` in deps             | `fastify` plugin pattern in entry | Route files as Fastify plugins   |
| **NestJS**                | `@nestjs/core`                | `nest-cli.json`, `*.module.ts`    | Controllers, services, modules   |
| **Express**               | `express` in deps             | `app.use()` in entry              | Route handlers, middleware       |
| **Hono**                  | `hono` in deps                | —                                 | Route handlers                   |
| **Gin**                   | `github.com/gin-gonic/gin`    | —                                 | `router.Group()`, handlers       |
| **Echo**                  | `github.com/labstack/echo`    | —                                 | Route handlers                   |
| **Chi**                   | `github.com/go-chi/chi`       | —                                 | `r.Route()`, handlers            |
| **FastAPI**               | `fastapi` in deps             | —                                 | Route decorators `@app.get()`    |
| **Django**                | `django` in deps              | `settings.py`, `urls.py`          | Views, models, serializers       |
| **Flask** / **Starlette** | `flask` / `starlette`         | —                                 | Route decorators                 |
| **Actix-web**             | `actix-web` in `Cargo.toml`   | —                                 | Handler functions, `web::` types |
| **Axum**                  | `axum` in `Cargo.toml`        | —                                 | Router, handler functions        |
| **React**                 | `react` in deps               | `vite.config.ts` with JSX         | Components in `src/`             |
| **Next.js**               | `next` in deps                | `next.config.*`                   | `app/` or `pages/` routing       |
| **Vue**                   | `vue` in deps                 | `vite.config.ts` with Vue         | `.vue` SFC files                 |
| **Svelte**                | `svelte` in deps              | `svelte.config.js`                | `.svelte` files                  |

**Test framework detection:**

| Framework      | Detection signal     | Config file                                  |
| -------------- | -------------------- | -------------------------------------------- |
| **Vitest**     | `vitest` in devDeps  | `vitest.config.ts`                           |
| **Jest**       | `jest` in devDeps    | `jest.config.*`                              |
| **Mocha**      | `mocha` in devDeps   | `.mocharc.*`                                 |
| **pytest**     | `pytest` in deps     | `pytest.ini`, `pyproject.toml [tool.pytest]` |
| **Go test**    | Go module            | `*_test.go` files                            |
| **Rust test**  | Cargo crate          | `#[cfg(test)]` in source                     |
| **Playwright** | `@playwright/test`   | `playwright.config.ts`                       |
| **Cypress**    | `cypress` in devDeps | `cypress.config.*`                           |

**ORM / database detection:**

| ORM            | Detection signal       | What it means for patterns        |
| -------------- | ---------------------- | --------------------------------- |
| **Drizzle**    | `drizzle-orm`          | Schema in TS, migration SQL       |
| **Prisma**     | `prisma`               | `schema.prisma`, generated client |
| **TypeORM**    | `typeorm`              | Entity decorators, repositories   |
| **Sequelize**  | `sequelize`            | Model definitions                 |
| **GORM**       | `gorm.io/gorm`         | Struct tags, `db.Find()`          |
| **SQLAlchemy** | `sqlalchemy`           | Models, sessions                  |
| **Diesel**     | `diesel` in Cargo.toml | Schema macros                     |

**What to record per package in the structure entry:**

```
Package: <name>
  path: <relative path>
  type: <lib|app|tool|package>
  language: <typescript|javascript|go|python|rust>  # from enry or manifest
  secondary_languages: [<sql|json|...>]             # from enry (if any)
  framework: <fastify|nestjs|express|react|none|...>
  test_framework: <vitest|jest|pytest|go-test|none>
  orm: <drizzle|prisma|none|...>
  build: <tsc|vite|esbuild|go-build|cargo|none>
  source_layout: <src/|lib/|pkg/|internal/|...>
  entry_point: <src/index.ts|main.go|src/main.rs|...>
  internal_deps: [<list of workspace deps>]
```

For polyglot repos, also record the repo-level language map:

```
Language zones:
  - TypeScript: apps/, libs/, tools/
  - Go: services/gateway/, services/worker/
  - Python: ml/, scripts/
  - SQL: libs/database/drizzle/, infra/supabase/
```

This fingerprint feeds directly into Phase 2: when a subagent scans
`apps/rest-api`, it knows to look for Fastify plugin patterns (not NestJS
controllers), Vitest tests (not Jest), and Drizzle repositories (not Prisma
models).
