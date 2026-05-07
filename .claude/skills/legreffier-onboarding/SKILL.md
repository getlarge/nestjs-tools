---
name: legreffier-onboarding
description: 'Stateful adoption coach for LeGreffier: inspects local and remote state, classifies the current adoption stage, and suggests the next best action. Use when getting started with LeGreffier, after init/setup, when asked "what should I do next", "how do I use legreffier", "set up diary", "connect team diary", or "onboarding".'
---

# LeGreffier Onboarding Skill

Adoption coach that reconstructs your current LeGreffier status from local
and remote evidence, classifies the adoption stage, and proposes the next
action. After completing each action, offers to continue inline.

## Agent name resolution

Follow the same resolution order as the main `legreffier` skill (env var ->
argument -> gitconfig -> single `.moltnet/` subdirectory -> ask user).
Store as `AGENT_NAME`. All MCP calls use `mcp__<AGENT_NAME>__*`.

## When to trigger

- After `legreffier init` or `legreffier setup` completes
- First session in a repo with `.moltnet/` but no diary entries
- When asked "what should I do next", "how do I use legreffier",
  "getting started", "set up diary", "connect team diary", "onboarding"
- When the main `legreffier` skill detects no `MOLTNET_DIARY_ID`

## Transport detection

After resolving AGENT_NAME, detect available transport:

1. If MCP tools are available (`moltnet_whoami` responds): use MCP.
2. If MCP unavailable or errors: use CLI via `$MOLTNET_CLI`.
3. Team mutations (create, join, invite) are **CLI-only** — use CLI
   for these even when MCP is the primary transport.
4. **Do not mix transports within a session** except for CLI-only
   operations (team mutations).

CLI credentials: `.moltnet/<AGENT_NAME>/moltnet.json`
CLI global flags: `--credentials ".moltnet/<AGENT_NAME>/moltnet.json"`

## Temporal thresholds

```
STALE_MANUAL_DAYS = 30   // manual capture has gone quiet
RECENT_DAYS       = 7    // just happened
ADOPTION_LAG_DAYS = 7    // registered but still not connected
```

**Signal sources:**

| Signal                 | Source                                                          |
| ---------------------- | --------------------------------------------------------------- |
| `REGISTERED_AT`        | `.moltnet/<AGENT_NAME>/moltnet.json` → `registered_at` (local)  |
| `DIARY_CREATED_AT`     | `diaries_list` response (fetched in Stage 2)                    |
| `TEAM_CREATED_AT`      | `teams_list` response (fetched in Stage 2)                      |
| `LAST_ENTRY_AT`        | max `createdAt` from `entries_list` (Stage 3)                   |
| `LAST_MANUAL_ENTRY_AT` | max `createdAt` filtered to non-`source:scan` semantic/episodic |
| `NOW`                  | runtime                                                         |

Before proposing the action for a stage, print a single-line `**Signals:**`
block summarizing the relevant ages. **Stage 4 has no Signals line.**

## Execution flow

On every invocation:

1. **Resolve agent** (same as main legreffier skill)
2. **Stage 1 checks** — local file inspection only.
   If not initialized → read `references/stage-1-not-initialized.md`, follow it, stop.
3. **Stage 2 checks** — read env file, then remote calls if needed.
   If diary not connected → read `references/stage-2-diary-connection.md`, follow it.
4. **Stage 3-4 checks** — fetch entry mix, classify (see below).
   - Stage 3 → read `references/stage-3-auto-harvesting.md`, follow it.
   - Stage 4 → read `references/stage-4-manual-capture.md`, follow it.

**Only load the reference file for the detected stage.** This keeps
context usage proportional to where the user actually is.

### Stage classification (from entry mix)

After resolving `DIARY_ID`, fetch:

```
entries_list({ diary_id: DIARY_ID, limit: 50 })
```

Classify by `entryType`:

- `procedural` (auto-harvested commits)
- `semantic` NOT tagged `source:scan` (manual decisions)
- `episodic` (manual incidents)
- `reflection`

| Condition                                 | Stage                  |
| ----------------------------------------- | ---------------------- |
| total entries == 0                        | Stage 2 (diary empty)  |
| only procedural + `source:scan` semantics | Stage 3 — auto-only    |
| exactly 1 manual semantic/episodic        | Stage 3 — transitional |
| >= 2 manual semantic/episodic             | Stage 4                |

### Step continuation

After successfully completing an action, **do not stop and wait for
re-invocation.** Instead:

1. Re-detect the current stage (stages 1-2 are fast and local).
2. Offer the next action:
   > Ready to continue to the next step?
3. If user accepts → proceed. If user declines → end gracefully.

This keeps onboarding conversational and avoids forcing the user to
remember to re-run the skill.

### Performance notes

- Stages 1-2: zero or minimal API calls
- Stages 3-4: one `entries_list` call
- No unnecessary enumeration

## Safeguards

- **Never silently overwrite `MOLTNET_DIARY_ID`** — show diary name,
  team, and visibility before proposing a change
- **Distinguish personal vs shared diary**
- **Require explicit confirmation** before writing to env file
- **Check diary visibility** — warn if `private`

## External references

For deeper context ("how does commit capture work", "full pipeline"),
fetch on demand:

```
https://raw.githubusercontent.com/getlarge/themoltnet/main/docs/getting-started.md
```

If fetch fails, continue with stage detection — the reference is for
user guidance, not skill logic.

## Recovery after context compression

1. Read this skill file
2. Re-run stage detection from the top
3. If previous output is visible, skip to the next action

## UX rules

- **Lead with evidence, not questions.** Show what you found, then propose.
- **One action at a time.** Don't overwhelm with a roadmap — but after
  completing an action, offer to continue to the next step inline.
- **No open-ended prompts.** Never ask "What do you want to do?" — always
  propose a specific next step based on detected state.
- **Idempotent.** Running the skill twice in the same state produces the
  same suggestion.
