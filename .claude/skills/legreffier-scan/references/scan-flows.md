# LeGreffier Scan Flows

Source of truth for:

- scan execution states
- scan batch execution flow
- entry post-processing and re-scan reconciliation

If this document and the scan skill prose diverge, this document wins.

## 1. Scan Execution State Machine

```mermaid
stateDiagram-v2
    [*] --> discovery : user requests scan

    discovery --> language_fingerprint : repo discovery complete
    language_fingerprint --> planning : language map ready
    planning --> awaiting_approval : dry-run plan shown
    awaiting_approval --> planning : user adjusts scope/mode
    awaiting_approval --> phase1_running : user approves
    awaiting_approval --> [*] : user cancels

    phase1_running --> phase1_running : batch complete
    phase1_running --> phase2_running : phase1 done
    phase1_running --> summary_pending : phase2 skipped

    phase2_running --> phase2_running : tier complete
    phase2_running --> summary_pending : all planned batches complete

    summary_pending --> authoritative_session : summary entry created
    authoritative_session --> reported : user report emitted
    reported --> [*]

    phase1_running --> interrupted : context compression / crash / timeout
    phase2_running --> interrupted : context compression / crash / timeout
    interrupted --> recovery : reload session
    recovery --> phase1_running : resume phase1
    recovery --> phase2_running : resume phase2
    recovery --> summary_pending : ready for summary

    authoritative_session --> rescan_planning : rescan requested
    rescan_planning --> diffing : load prior summary
    diffing --> phase1_running : changes found
    diffing --> summary_pending : no changes

    state language_fingerprint {
        [*] --> enry_check
        enry_check --> enry_run : enry available
        enry_check --> manifest_fallback : enry unavailable
        enry_run --> [*] : enry map ready
        manifest_fallback --> [*] : fallback map ready
    }
```

## 2. Batch Execution Flow

```mermaid
%%{init: {"theme": "base", "flowchart": {"curve": "basis"}}}%%
flowchart TD
  A["User requests scan"] --> B["Discovery
  read repo layout
  detect docs / workspace / tools"]
  B --> B2{"enry available?"}
  B2 -->|yes| B3["Run enry
  repo-level language zones
  per-package language map"]
  B2 -->|no| B4["Fallback discovery
  manifests + config files
  package manager heuristics"]
  B3 --> C["Build dry-run plan
  assign scan-session
  assign scan-batch IDs
  assign scan-entry-key values"]
  B4 --> C
  C --> D{"User approves?"}
  D -->|no| E["Adjust plan or stop"]
  D -->|yes| F["Execute planned batches"]

  subgraph EXEC ["Per batch"]
    F --> G["Read assigned files only"]
    G --> H["Extract entries
    constraints first
    apply nugget acceptance gate"]
    H --> I["Create entries immediately
    with scan-session + scan-batch + scan-entry-key"]
    I --> J["Log entry IDs and counts
    keep only compact digests in memory"]
  end

  J --> K{"More planned batches?"}
  K -->|yes| F
  K -->|no| L["Create authoritative summary entry
  with completed batches + coverage + gaps"]
  L --> M["Report results to user"]

  style C fill:#dbeafe,stroke:#2563eb
  style I fill:#dcfce7,stroke:#16a34a
  style L fill:#fef9c3,stroke:#ca8a04
```

## 3. Entry Post-Processing and Re-Scan Flow

```mermaid
%%{init: {"theme": "base", "flowchart": {"curve": "basis"}}}%%
flowchart TD
  A["Most recent non-superseded
  scan summary"] --> B["Extract authoritative
  scan-session"]
  B --> C["Load previous session entries"]
  C --> D["Build local index by
  scan-entry-key
  not by source path"]
  D --> E["Build new scan plan
  with planned scan-entry-key values"]
  E --> F["For each planned entry
  compute current source digest"]
  F --> G{"Classify"}

  G -->|unchanged| H["Skip entry"]
  G -->|new| I["Create new entry"]
  G -->|changed| J["Create new entry
  then supersede old entry best-effort"]
  G -->|deleted| K["Record deletion
  in summary only"]

  H --> L{"More planned entries?"}
  I --> L
  J --> L
  K --> L
  L -->|yes| F
  L -->|no| M["Create new summary entry
  for new scan-session"]
  M --> N["Supersede previous summary"]
  N --> O["New summary becomes
  authoritative session root"]

  style D fill:#dbeafe,stroke:#2563eb
  style J fill:#dcfce7,stroke:#16a34a
  style N fill:#fef9c3,stroke:#ca8a04
```

## 4. Canonical Rules

- Discovery must perform deterministic language detection with `enry` when available, and fall back to manifest/config heuristics only when `enry` is unavailable.
- The dry-run plan must assign `scan-session`, `scan-batch`, and `scan-entry-key` before execution starts.
- Recovery checks completion by `scan-batch` and planned `scan-entry-key`, not only by category.
- Re-scan reconciliation indexes previous entries by `scan-entry-key`, not by `scan-source`, because one source file may yield multiple entries.
- Phase 2 may extract small representative patterns from targeted source files. It must not perform broad code mining or paste full implementations.
- The summary supersession chain is authoritative. Individual entry supersession is best-effort hygiene.
