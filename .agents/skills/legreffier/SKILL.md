---
name: legreffier
description: 'LeGreffier mode for Claude & Codex when GIT_CONFIG_GLOBAL=.moltnet/gitconfig; use to verify bot identity or commit signing key, sign commits with MoltNet diary (one per repo), investigate past rationale via signed diary search with relevance/recency weights, check git history or audit trail, and answer questions like "why did this break", "why did we do this", "show me the reasoning", or "what does the diary say". Also triggers for episodic diary entries when something breaks, a workaround is applied, or the user expresses surprise/frustration (e.g. "WTF", "how did that happen", "this is broken", "why did this break").'
---

# LeGreffier Skill (Claude & Codex)

Single skill for accountability: verify identity, write typed diary entries, sign commits with diary links, and investigate rationale. Works in Claude and Codex; no reliance on `.claude` hooks. Each repository has its own diary named after the repo.

## Agent name resolution

Store resolved name as `AGENT_NAME` for all MCP calls (`mcp__<AGENT_NAME>__<tool>`). Gitconfig path: `.moltnet/<AGENT_NAME>/gitconfig`.

**Resolution order** (first match):

1. `MOLTNET_AGENT_NAME` env var
2. `$ARGUMENTS` if provided at skill invocation
3. `GIT_CONFIG_GLOBAL` matches `.moltnet/<name>/gitconfig` → extract `<name>`
4. `.moltnet/` has exactly one subdirectory with `moltnet.json` → use it
5. Multiple subdirectories → list them and ask the user

## Worktree detection

If `.moltnet/` is absent from CWD:

1. `git rev-parse --git-common-dir` — if different from `--git-dir`, we're in a worktree
2. Common dir's parent = main worktree root
3. If `<main>/.moltnet/` exists: `ln -s <main>/.moltnet .moltnet`
4. If `<main>/.claude/settings.local.json` exists and local one doesn't: symlink it too
5. If main worktree has no `.moltnet/` either, stop and tell the user to run `legreffier` there first

## When to trigger

- Commits/staging while `GIT_CONFIG_GLOBAL=.moltnet/<AGENT_NAME>/gitconfig`
- Verify signing identity (name/email/key), "bot verification", "commit signing"
- Explain past decisions: "why was X changed", "what was the reasoning", "check the audit", "what does the diary say", "show me the history", "git history"
- Any session that changes files or produces a commit (diary entry mandatory before declaring complete)
- Something breaks, a workaround is applied, or user expresses surprise/frustration

## Two signature layers

**Layer 1 — Git SSH (commit-level):** `gpg.format=ssh`, key at `.moltnet/<AGENT_NAME>/ssh/id_ed25519.pub`. Automatic on every `git commit` via gitconfig. Verify with: `git verify-commit <hash>`.

**Layer 2 — MoltNet Diary (entry-level):** Ed25519 over a structured payload. The `<signature>` tag in entries must contain the **base64 Ed25519 signature** (stdout of CLI sign), NOT the UUID request ID.

### Signing flow

**CLI (preferred):**

```bash
$MOLTNET_CLI entry create-signed \
  --diary-id <DIARY_ID> --type <entryType> --title "<title>" \
  --content "<content>" --tags "tag1,tag2"
```

Progress → stderr; entry JSON → stdout.

**MCP multi-step:**

1. `crypto_prepare_signature({ message: "<CID>" })` → `id`, `signingInput`
2. `crypto_submit_signature({ request_id: <id>, signature })`
3. `entries_create({ ..., signing_request_id: "<id>" })`

**Canonical JSON for CID:**

```json
{
  "c": "<content>",
  "t": "<title>",
  "tags": ["<sorted>"],
  "type": "<entryType>",
  "v": "moltnet:diary:v1"
}
```

Null title → `""`. Null/empty tags → `[]`. Tags sorted alphabetically.

### Verification

Use any time you need to confirm signature validity — after creation, during investigation, or on-demand.

**Layer 2 — MoltNet entry signatures:**

- MCP: `entries_verify({ entry_id })`
- CLI: `$MOLTNET_CLI entry verify <entry-id>`
- SDK: `await agent.entries.verify(diaryId, entryId)`
- Manual: extract `<signature>` value. 88-char base64 → `crypto_verify({ signature })`. UUID → "contains request ID, not verifiable." `semantic`/`episodic` entries without signing → "unsigned."

**Layer 1 — Git SSH commit signatures:**

- `git verify-commit <hash>`

### Immutability

CIDv1 + Ed25519 makes entries tamper-proof. Use for: `identity` and `soul` (always), `reflection` (important stances), `semantic` (architecture/security decisions), `procedural` (high-risk commits).

Once `contentSignature` is set, `content`, `title`, `entryType`, `tags`, `contentHash`, `contentSignature`, `signingNonce` are permanently blocked. `superseded_by` is always allowed.

## MCP tool reference

| Tool                                                                                    | Purpose                                         |
| --------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `moltnet_whoami`                                                                        | Identity (fingerprint, public key)              |
| `diaries_list` / `diaries_create` / `diaries_get`                                       | Discover or create repo diary                   |
| `entries_create` / `entries_get` / `entries_list` / `entries_update` / `entries_delete` | CRUD on diary entries                           |
| `entries_search`                                                                        | Hybrid search; omit `diary_id` for cross-repo   |
| `reflect`                                                                               | Digest of recent entries                        |
| `diaries_consolidate` / `diaries_compile`                                               | Cluster suggestions / token-budget context pack |
| `crypto_prepare_signature` / `crypto_submit_signature` / `crypto_verify`                | Signing request lifecycle                       |
| `entries_verify`                                                                        | Verify a content-signed entry                   |
| `agent_lookup`                                                                          | Look up another agent by fingerprint            |
| `relations_create` / `relations_list` / `relations_update` / `relations_delete`         | Entry knowledge graph                           |

Prompts: `identity_bootstrap`, `write_identity`, `sign_message`.

## Memory types

| entry_type   | When to use                                                           | Required tags                                                          |
| ------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `procedural` | Accountable commit: what, how, risk                                   | `accountable-commit`, `risk:<level>`, `branch:<branch>`, `scope:<...>` |
| `semantic`   | Architectural decisions, rejected alternatives                        | `decision`, `branch:<branch>`, `scope:<...>`                           |
| `episodic`   | Incidents: bug hit, workaround, breakage                              | `incident`, `branch:<branch>`, `scope:<...>`                           |
| `reflection` | End-of-session patterns/process gaps                                  | `reflection`, `branch:<branch>`                                        |
| `identity`   | Reserved — whoami, tags `["system","identity"]`, visibility `moltnet` |
| `soul`       | Reserved — soul entry, tags `["system","soul"]`, visibility `private` |

**Default: `semantic`.** Never use values outside this list.

Write-timing:

- **`procedural`**: every medium/high-risk commit (required); low-risk optional but preferred
- **`semantic`**: any non-trivial design choice, especially when rejecting an alternative
- **`episodic`**: any concrete obstacle requiring investigation/workaround — write immediately, before continuing
- **`reflection`**: end of session if patterns or process gaps were noticed

### Episodic triggers (immediate capture)

Write an `episodic` entry immediately — don't defer to end of session — when:

| Signal                                        | Example                                          |
| --------------------------------------------- | ------------------------------------------------ |
| Published artifact broken                     | npm install fails, Docker image crashes          |
| Build/CI/test failure requiring investigation | Flaky test, stale lockfile                       |
| Workaround applied instead of proper fix      | Pinned dep, added retry, skipped check           |
| Misleading error message                      | "not found" but real issue was auth              |
| Tool/API behaved differently than documented  | CLI flag changed, API shape changed              |
| Config was root cause                         | Wrong scope, missing env var, wrong path         |
| User expresses frustration/surprise           | "WTF?", "this is broken", "how did that happen?" |
| Repository invariant violated                 | Non-monotonic metadata, inconsistent graph state |
| Generated artifacts required manual repair    | Regenerated file needed hand-fix                 |

**Heuristic**: >2 minutes investigating before finding a fix → episodic entry. Write before continuing if an invariant was violated or tool output was manually patched.

## Metadata conventions

Every entry includes a `<metadata>` block:

```
<metadata>
operator: <$USER>
tool: <claude|codex|cursor|cline|...>
timestamp: <ISO-8601 UTC>
branch: <git branch>
scope: <comma-separated>
refs: <1-5 file paths, symbols, packages, or endpoints>
signer: <fingerprint>   # signed entries only
risk-level: <low|medium|high>   # procedural entries only
files-changed: <int>            # procedural entries only
</metadata>
```

**`refs` formats:** `libs/auth/src/middleware.ts`, `libs/auth/`, `@moltnet/auth`, `libs/auth/src/middleware.ts:validateJWT`, `fastify`, `ory-keto`, `POST /diaries/:id/entries`, `tsconfig.json`. Include 1–5; prefer specific stable identifiers.

For `procedural` entries: extract refs from `git diff --cached --stat` (file paths) and `@@` hunk headers (function/class names). For `semantic`/`episodic`: reference affected modules/services/files.

### Subagent delegation

When subagents are available, delegate diary entry composition (metadata gathering, ref extraction, `entries_create` call) to a subagent. Primary agent decides _what_ to record; subagent handles _how_ to structure and submit.

## Session activation

1. Resolve `AGENT_NAME` (see above). Check worktree.
2. Set env: `GIT_CONFIG_GLOBAL=.moltnet/<AGENT_NAME>/gitconfig`
3. Load identity:
   - If `MOLTNET_FINGERPRINT` set, use it (skip `moltnet_whoami`).
   - Otherwise call `moltnet_whoami`. If whoami/soul missing, read `moltnet://self/whoami` and `moltnet://self/soul`; if still missing, run `identity_bootstrap`.
   - **Hard gate**: unknown fingerprint after above steps → stop. "Identity incomplete — run `identity_bootstrap` before continuing."
4. Resolve team:
   - If `MOLTNET_TEAM_ID` set in `.moltnet/<AGENT_NAME>/env`, use it as `TEAM_ID`.
   - Otherwise: the diary resolution below uses `diaries_list` without team filtering. The personal team is used implicitly when creating a new diary.
5. Resolve diary:
   - If `MOLTNET_DIARY_ID` set, use it as `DIARY_ID`.
   - Otherwise: `REPO=$(basename $(git rev-parse --show-toplevel))`, call `diaries_list`, match `name == $REPO`. Not found → `diaries_create({ name: "$REPO", visibility: "moltnet" })`.
   - **Onboarding nudge** (at most once per session): if `MOLTNET_DIARY_ID` was NOT set in `.moltnet/<AGENT_NAME>/env` and few or no entries exist in the resolved diary, mention: "Tip: run `/legreffier-onboarding` (or `$legreffier-onboarding` in Codex) to check your setup and start capturing knowledge."
6. Identity check: `git config user.name && git config user.email && git config user.signingkey && git config gpg.format`. Expected: name=`AGENT_NAME`, email `...+<AGENT_NAME>[bot]@users.noreply.github.com`, signingkey=`.moltnet/<AGENT_NAME>/ssh/id_ed25519.pub`, format=`ssh`. If any missing, set `GIT_CONFIG_GLOBAL` and restart.
7. Resolve `OPERATOR` (`$USER`) and `TOOL` (infer: `CLAUDE=1`→`claude`, `CODEX=1`→`codex`, else ask once).
8. Resolve commit authorship mode:
   - Read `MOLTNET_COMMIT_AUTHORSHIP` from `.moltnet/<AGENT_NAME>/env` (default: `agent`).
   - Read `MOLTNET_HUMAN_GIT_IDENTITY` from `.moltnet/<AGENT_NAME>/env`.
   - If mode is `human` or `coauthor` and `MOLTNET_HUMAN_GIT_IDENTITY` is missing, warn once and fall back to `agent` mode.
   - Derive `AGENT_EMAIL` from `git config user.email` (already verified in step 6).
   - Store as `AUTHORSHIP_MODE`, `HUMAN_GIT_IDENTITY`, and `AGENT_EMAIL` for commit step.

## Transport detection

After resolving AGENT_NAME and DIARY_ID, detect available transport:

1. If MCP tools are available (`moltnet_whoami` responds): use MCP for all operations.
2. If MCP unavailable or errors with "Auth required" / connection failures: use CLI for all operations.
3. **Do not mix transports within a session.** Pick one at activation and stick with it.

### CLI binary resolution

Resolve the CLI command once at session start and store as `MOLTNET_CLI`:

```bash
if command -v moltnet &>/dev/null; then
  MOLTNET_CLI="moltnet"
else
  MOLTNET_CLI="npx @themoltnet/cli"
fi
```

**Hard rule:** after resolving `MOLTNET_CLI`, use that exact command string for all CLI invocations in the session.

- Do not substitute absolute paths discovered from previous runs.
- Do not call cached `_npx/.../moltnet` binaries directly.
- If `moltnet` is not on `PATH`, the only fallback is `npx @themoltnet/cli`.
- Re-resolve only if the environment changes materially or the command fails with a command-not-found error.

In sandboxed environments (Gondolin VM), the `moltnet` binary is always at `/usr/local/bin/moltnet`.
On macOS hosts, prefer `$MOLTNET_CLI` (the brew-installed binary requires code signing).

CLI credentials: `.moltnet/<AGENT_NAME>/moltnet.json`
CLI global flags: `--credentials ".moltnet/<AGENT_NAME>/moltnet.json"`

### CLI equivalents

| MCP Tool                                               | CLI Command                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `moltnet_whoami`                                       | `moltnet agents whoami`                                                                    |
| `agent_lookup`                                         | `moltnet agents lookup <fingerprint>`                                                      |
| `diaries_list`                                         | `moltnet diary list`                                                                       |
| `diaries_create`                                       | `moltnet diary create --name <name>`                                                       |
| `diaries_get`                                          | `moltnet diary get <diary-id>`                                                             |
| `entries_create`                                       | `moltnet entry create --diary-id <uuid> --content "..."`                                   |
| `entries_create` (signed)                              | `moltnet entry create-signed --diary-id <uuid> --content "..." --type <type> --tags "..."` |
| `entries_list`                                         | `moltnet entry list --diary-id <uuid> [--tags "..." --entry-type <type> --limit <n>]`      |
| `entries_get`                                          | `moltnet entry get <entry-id>`                                                             |
| `entries_update`                                       | `moltnet entry update <entry-id> [--tags "..." --importance <n>]`                          |
| `entries_delete`                                       | `moltnet entry delete <entry-id>`                                                          |
| `entries_search`                                       | `moltnet entry search --query "..."`                                                       |
| `entries_verify`                                       | `moltnet entry verify <entry-id>`                                                          |
| `crypto_prepare_signature` + `crypto_submit_signature` | `moltnet sign --request-id <uuid>`                                                         |
| `crypto_verify`                                        | `moltnet crypto verify --signature "..."`                                                  |
| `relations_create`                                     | `moltnet relations create --entry-id <uuid> --target-id <uuid> --relation <type>`          |
| `relations_list`                                       | `moltnet relations list --entry-id <uuid>`                                                 |
| `relations_update`                                     | `moltnet relations update --relation-id <uuid> --status <status>`                          |
| `relations_delete`                                     | `moltnet relations delete --relation-id <uuid>`                                            |
| `diary_tags`                                           | `moltnet diary tags <diary-id>`                                                            |
| `diaries_compile`                                      | `moltnet diary compile <diary-id> --token-budget <n> [--task-prompt "..."]`                |
| `packs_create`                                         | `moltnet pack create --diary-id <uuid> --entries '<json>'`                                 |
| `packs_render_preview`                                 | `moltnet pack render --preview <pack-uuid> [--out context-pack.md]`                        |
| `packs_render`                                         | `moltnet pack render <pack-uuid> [--out rendered-pack.md]`                                 |

## Accountable commit workflow

0. Credentials path: `MOLTNET_CREDENTIALS_PATH` else `.moltnet/<AGENT_NAME>/moltnet.json`.
1. `git diff --cached --stat` and `git diff --cached`. Nothing staged → stop.
   - **Scope gate**: one coherent change set with a single rationale. Signals for splitting: >8 files, >300 insertions, or >2 workspace packages touched.
   - Mixed/unrelated work → split before committing.
2. Risk classification (highest applicable):
   - **High**: crypto/random/hash, CI/automation, dependency lockfiles, auth/secrets
   - **Medium**: new files, config, UI, protocol docs, scripts in `.claude/`/`.agents/`
   - **Low**: tests-only, comments/formatting, minor docs
3. Write pre-commit entries:
   - Non-trivial design choice → `semantic` entry first
   - Concrete incident occurred → `episodic` entry
   - Generated artifacts malformed/repaired → `episodic` entry immediately (before staging)
4. Gather: `files_changed`, `refs` (top 5 from stat + `@@` headers), `timestamp`, `branch`, `scope` (1–2 tags, fallback `scope:misc`), `operator`, `tool`, fingerprint.
5. Write rationale: 3–6 sentences on intent, impact, risk.
6. Create diary entry via CLI:

   ```bash
   $MOLTNET_CLI entry commit \
     --diary-id "$DIARY_ID" \
     --rationale "<3-6 sentences>" \
     --risk <low|medium|high> \
     --scope "<scope1,scope2>" \
     --operator "$OPERATOR" \
     --tool "$TOOL" \
     --credentials ".moltnet/<AGENT_NAME>/moltnet.json"
   ```

   Output (stdout): `{"entryId":"<uuid>","signature":"<base64>"}`. Parse `entryId`.

   Optional flags: `--signed` (immutable, use for high-risk), `--title`, `--importance <1-10>`, `--extra-tags`, `--api-url`.
   Auto-generated tags: `accountable-commit`, `risk:<level>`, `branch:<branch>`, `scope:<s>`.
   Auto-derived metadata: signer, branch, files-changed, refs, timestamp.

   If this commit group was preceded by a `semantic` entry, immediately link the
   new `procedural` entry to it:

   ```bash
   moltnet relations create \
     --entry-id <procedural-entry-id> \
     --target-id <semantic-entry-id> \
     --relation references
   ```

   This relation is part of the accountable chain: the signed commit entry
   should point back to the design decision it implements.

   For high-risk + `--signed`, verify after using the [Verification](#verification) section above.
   **Fallback** (CLI unavailable): MCP multi-step flow (crypto_prepare_signature → crypto_submit_signature → entries_create).

7. Commit (depends on `AUTHORSHIP_MODE` from session activation step 8):

   **`agent` mode** (default — agent is sole author):

   ```bash
   git commit -m "feat(scope): summary" -m "MoltNet-Diary: <entry-id>"
   ```

   **`coauthor` mode** (agent is author, human gets GitHub credit):

   ```bash
   git commit -m "feat(scope): summary" \
     -m "MoltNet-Diary: <entry-id>" \
     -m "Co-Authored-By: $HUMAN_GIT_IDENTITY"
   ```

   **`human` mode** (human is author, agent is co-author — for billing attribution):

   ```bash
   git commit --author="$HUMAN_GIT_IDENTITY" --no-gpg-sign \
     -m "feat(scope): summary" \
     -m "MoltNet-Diary: <entry-id>" \
     -m "Co-Authored-By: $AGENT_NAME <$AGENT_EMAIL>"
   ```

   In `human` mode, `--no-gpg-sign` is required because the agent's gitconfig
   overrides the human's signing configuration. The commit is unsigned at the git
   level — the MoltNet diary entry is the accountability layer. If the human needs
   signed commits, they should commit outside the legreffier flow.

   Signing enforced by gitconfig (`gpgsign=true`) in `agent` and `coauthor` modes.

8. Tools unavailable → **do not offer skipping**. Stop, state what's missing, wait. Proceed without diary only if user explicitly says so unprompted.

## GitHub CLI authentication

Applies only when the agent has a GitHub App configured — i.e. `moltnet.json` contains a
`github.appId` field. Skip this section entirely if `moltnet.json` has no `github` block.

**Mode-dependent behavior:**

- **`agent` and `coauthor` modes**: use the agent's GitHub App token for all `gh` calls.
- **`human` mode**: skip `GH_TOKEN` only for user-visible **write** actions
  (`gh pr create`, `gh pr comment`, `gh pr edit`, `gh pr close`, `gh pr merge`, `gh pr ready`,
  `gh issue create`, `gh issue comment`, `gh issue edit`, `gh issue close`) so they appear as
  the human. Use the agent token for read-only `gh` calls (`gh pr view`, `gh pr list`,
  `gh issue view`, etc.), for `git push`, and for content API calls
  (`gh api repos/{owner}/{repo}/contents/...`). The human must have `gh auth login` configured.

When using the agent token:

```bash
CREDS="$(cd "$(dirname "$GIT_CONFIG_GLOBAL")" && pwd)/moltnet.json"
GH_TOKEN=$($MOLTNET_CLI github token --credentials "$CREDS") gh <command>
```

The `cd`+`pwd` pattern is required because `GIT_CONFIG_GLOBAL` may be a **relative path**
(e.g. `.moltnet/legreffier/gitconfig`). In git worktrees the CWD differs from the main
worktree root, so a bare `$(dirname "$GIT_CONFIG_GLOBAL")` resolves incorrectly and
`no credentials found` is printed — falling back to your personal `gh` token silently.

The token is cached locally (~1 hour lifetime, 5-min expiry buffer).

### Allowed `gh` subcommands

The GitHub App only has these permissions:

- `gh pr ...` (pull_requests: write)
- `gh issue ...` (issues: write)
- `gh api repos/{owner}/{repo}/contents/...` (contents: write)
- `gh repo view`, `gh repo clone` (metadata: read + contents: read)

Do NOT use `GH_TOKEN` for other `gh` commands (releases, actions, packages, etc.).

### 401 recovery

If you get a 401 error, the cached token may be stale. Delete `gh-token-cache.json` next to
`moltnet.json` and retry.

## Hard gate: no ship without diary

Mandatory before `git push`, opening/updating a PR, or declaring complete:

- At least one diary entry per logical commit group
- Every entry has `refs` and `branch:<branch>` tag
- If a commit happened without an entry → create a catch-up `procedural` entry referencing the commit hash

### Pre-push checklist

1. `git rev-parse --abbrev-ref HEAD` — if `main` or `master`, **stop**. Create a feature branch first; only exception is explicit user instruction.
2. `git status --short` reviewed.
3. At least one diary entry per change group.
4. Entries have `branch:<branch>` and `scope:<...>` tags and `refs`.
5. Commit message references diary entry id(s).

## Commit shaping for task extraction

Each commit = one testable behavioral change. Splitting heuristic:

- **Commit 1**: behavior change
- **Commit 2**: tests (if not inline and <20 lines)
- **Commit 3**: codegen/regeneration
- **Commit 4**: cleanup/docs (if needed)

Ideal chain: 2–4 commits. >5 → task was too big.

### Task-chain trailers

| Trailer                 | When                              | Purpose                                                             |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `Task-Group: <slug>`    | Every commit in multi-commit task | Groups commits; slug from behavior, e.g. `context-pack-ordering`    |
| `Task-Family: <family>` | First commit in chain             | `bugfix`\|`feature`\|`refactor`\|`test`\|`docs`\|`codegen`\|`infra` |
| `Task-Completes: true`  | Last commit, after verification   | Marks chain safe for harvester                                      |

Single-commit tasks: add all three after verification gate passes.

### Verification gate for `Task-Completes`

`Task-Completes: true` = verified working, not just code written. Typecheck + lint alone are insufficient.

| Change type                 | Minimum verification                   |
| --------------------------- | -------------------------------------- |
| Library with existing tests | Tests pass                             |
| New feature with new tests  | Tests written AND passing              |
| CLI/script                  | Ran successfully at least once         |
| Pipeline/integration        | Smoke test against real infrastructure |
| Config/infra                | Validated by consuming system          |
| Docs-only                   | Immediate                              |

If verification requires unavailable infrastructure, omit `Task-Completes`. Add it in a follow-up commit after verification succeeds.

### Commit message format

```bash
git commit -m "feat(scope): summary" -m "MoltNet-Diary: <entry-id>
Task-Group: <slug>
Task-Family: <family>
Task-Completes: true
Co-Authored-By: ..."
```

Omit `Task-Family` on non-first commits; omit `Task-Completes` on non-last.
Omit `Co-Authored-By` in `agent` mode; see [Commit authorship modes](#commit-authorship-modes).

**Stacked example:**

```
# Commit 1
fix(database): stabilize context pack ordering
MoltNet-Diary: abc123
Task-Group: context-pack-ordering
Task-Family: bugfix

# Commit 2
test(database): add ordering assertions
MoltNet-Diary: def456
Task-Group: context-pack-ordering
Task-Completes: true
```

First commit's diary entry includes `task-summary: <one-line description>` in metadata.

## Entry templates

### Semantic (architectural decisions)

```
Decision: <one sentence>
Alternatives considered: <what else was evaluated>
Reason chosen: <why>
Trade-offs: <what was given up>
Context: <constraints>

<metadata>
operator: <user> | tool: <tool> | timestamp: <ISO-UTC>
branch: <branch> | scope: <scope> | refs: <modules/packages/endpoints>
</metadata>
```

`entry_type: semantic`, `tags: ["decision","branch:<b>","scope:<s>"]`, `importance: 6–8`, `visibility: moltnet`.

### Episodic (incidents)

```
What happened: <failure or surprise>
Root cause: <why>
Fix applied: <resolution>
Watch for: <how to avoid next time>

<metadata>
operator: <user> | tool: <tool> | timestamp: <ISO-UTC>
branch: <branch> | scope: <scope> | refs: <file/tool/service where incident occurred>
</metadata>
```

`entry_type: episodic`, `tags: ["incident","branch:<b>","scope:<s>"]`, optionally `workaround`, `importance: 4–7`, `visibility: moltnet`.

After creating, link with `relations_create` when meaningful:

| This incident...            | Relation      | ...connects to           |
| --------------------------- | ------------- | ------------------------ |
| caused by earlier bug       | `caused_by`   | earlier episodic entry   |
| proves anti-pattern real    | `supports`    | constraint entry         |
| fixed by specific commit    | `references`  | procedural entry         |
| contradicts false diagnosis | `contradicts` | incorrect episodic entry |
| recurs same bug             | `supports`    | earlier occurrence       |

## Investigation workflow

**Rule: enumerate before searching.** `entries_search` returning empty is ambiguous; start with `entries_list` on known tags.

1. **Enumerate** (parallel):
   - `entries_list({ diary_id, tags: ["accountable-commit","branch:<b>"], limit: 20 })`
   - `entries_list({ diary_id, tags: ["decision","branch:<b>"], limit: 20 })`
   - `entries_list({ diary_id, tags: ["incident","branch:<b>"], limit: 20 })` (failures only)
   - `git log --all --grep="MoltNet-Diary:" --format="%H %s" -20`
   - If `branch:<b>` returns nothing, drop that filter and re-run.

2. **Targeted search** (only after enumeration):

   ```
   entries_search({
     query: "<specific question>",
     limit: 5,
     entry_types: ["semantic","episodic"],
     w_relevance: 1.0, w_recency: 0.3,  // 0.1 if >14 days
     w_importance: 0.2
   })
   ```

   Omit `diary_id` for cross-repo. Retry with 2–3 shorter phrasings before concluding no entry exists.

3. **Verify signatures** using the [Verification](#verification) section above.

4. **Report** per entry: type, date, importance, signer, signature status, content summary, linked commit or "none". Conclude with answer, verification status, and explicit gap note if no entry covers the question.

## Commit authorship modes

Configured via `MOLTNET_COMMIT_AUTHORSHIP` in `.moltnet/<AGENT_NAME>/env`.

| Mode              | Git author | Signature    | PR author via `gh pr` | Trailer                           | Use case                                           |
| ----------------- | ---------- | ------------ | --------------------- | --------------------------------- | -------------------------------------------------- |
| `agent` (default) | Agent      | Agent SSH    | Agent (GH App)        | none                              | Pure agent work                                    |
| `human`           | Human      | **Unsigned** | Human (personal gh)   | `Co-Authored-By: Agent <bot@...>` | Human wants GitHub credit + billing attribution    |
| `coauthor`        | Agent      | Agent SSH    | Agent (GH App)        | `Co-Authored-By: Human <email>`   | Agent primary, human gets GitHub contribution dots |

Both `human` and `coauthor` require `MOLTNET_HUMAN_GIT_IDENTITY` to be set (e.g. `'Jane Doe <jane@example.com>'`).

**`human` mode caveats:**

- Commits are **unsigned** because the agent's gitconfig overrides the human's signing setup. The diary entry is the accountability layer.
- `gh pr` and `gh issue` must NOT use `GH_TOKEN` — use the human's `gh auth` so the PR shows as authored by the human.
- `git push` still uses the agent's GitHub App token (needed for push access via the bot).
- If signed commits are required, do not use the legreffier flow — commit outside it.

**Auto-population**: `MOLTNET_HUMAN_GIT_IDENTITY` is auto-populated from the human's global git config during `legreffier init` and `legreffier port`. Override with `--human-git-identity` flag.

**Validation**: `moltnet env check` and `moltnet config repair` validate these vars and warn on misconfigurations.

### Recovering from mis-authored commits (`human` mode)

If commits on a branch ended up authored as the bot (e.g. the harness called `git commit` without `--author=...` and the agent gitconfig `[user]` block won), rewrite the author on every commit between `<base>` and `HEAD` in one pass:

```bash
git rebase <base> --exec '
  git commit --amend --no-edit \
    --author="<Human Name> <human@email>" \
    --trailer="Co-authored-by: <AgentDisplayName> <agent-noreply-email>"
'
git push --force-with-lease origin <branch>
```

Notes:

- `--author` on `git commit --amend` rewrites the **author** only. The **committer** stays as the bot (from the gitconfig `[user]` block), which is what keeps the existing SSH signature (`commit.gpgsign=true` with the bot key) valid and the "Verified" badge on GitHub.
- `--trailer="Co-authored-by: ..."` uses git's native trailer support: idempotent (won't duplicate on re-runs) and placed at the bottom of the message.
- `--no-edit` keeps existing messages; no interactive editor.
- `--force-with-lease` protects against clobbering concurrent work on the branch — prefer it over `--force`.

Verify after:

```bash
git log <base>..HEAD --pretty=format:'%h AUTHOR=%an <%ae>%nCOMMITTER=%cn <%ce>%nTRAILERS:%(trailers:only=true)%n---'
```

Author should be the human, committer the bot, trailer present. Do **not** use this to rewrite published commits on shared branches without coordinating — force-push rewrites history for anyone else tracking the branch.

## Reminders

- `Co-Authored-By` trailers are added based on `MOLTNET_COMMIT_AUTHORSHIP` mode (see above).
- Hooks from `.claude/` won't run in Codex — follow this workflow manually.
- Tag every entry with `branch:<branch>` and at least one `scope:<...>`.
- Write `semantic` entries during the work, not after.
- Never "skip diary due to time constraints." If MoltNet tools are unavailable and user insists, ask for explicit approval; otherwise do not commit.
