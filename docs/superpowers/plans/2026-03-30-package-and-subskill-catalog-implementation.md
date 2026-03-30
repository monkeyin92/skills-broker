# skills-broker Package and Subskill Catalog Implementation Plan

Date: 2026-03-30
Status: Incremental implementation in progress, core foundations shipped in `main`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-package-and-subskill-catalog-design.md`

## Goal

Move `skills-broker` from a flattened downstream implementation model toward a two-layer catalog where:

- packages are the distribution, installation, and lifecycle unit
- leaf capabilities are the retrieval, ranking, and handoff unit

This should preserve the existing capability-query foundations while fixing the long-term identity model.

## Non-Goals

- marketplace UI
- autonomous third-party internet installs
- deleting capability-query routing
- making the host aware of package-versus-subskill decisions

## Current Constraint

The current runtime already has useful foundations:

- capability-query normalization exists
- richer query metadata exists on capability cards
- broker-owned downstream implementations exist

But the current identity model is still flattened in places such as:

- `/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts`
- `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json`
- `/Users/monkeyin/projects/skills-broker/src/broker/handoff.ts`

That means this migration should be additive first.

## Shipped So Far

The following parts of this plan are already live in `main`:

- Task 1 foundations, explicit package and leaf identity types
- Task 2 foundations, two-layer seed modeling in the host catalog
- Task 3 foundations, leaf-first ranking with package-aware installed-state signals
- Task 4 foundations, package-aware handoff fields with compatibility `chosenImplementation`
- Task 5 foundations, package-aware acquisition hints and runtime availability probing
- Task 6 proof families for requirements analysis and QA on top of the new model
- Task 7 regression coverage for handoff, acquisition, package probing, host auto-routing, and catalog validation

The biggest shipped delta after the original draft is this:

- package availability is now validated through manifest and metadata contracts
- host catalog entries now carry explicit `probe` contracts
- MCP candidates are being aligned to the same package-plus-leaf model

So this plan is now a migration tracker, not a greenfield proposal.

## Implementation Strategy

Do not rip out the current proof-family path first.

Instead:

1. add explicit package and subskill identity to the current model
2. make the seed catalog represent package and leaf concerns separately
3. make ranking and handoff preserve both identities
4. shift acquisition logic to the package layer
5. migrate the proof families away from hardcoded flat implementation strings

## Architecture Delta

```text
CURRENT
  host shell
    -> capability query
      -> broker
        -> flat leaf candidate with implementation.id = gstack.qa
          -> rank + handoff

TARGET
  host shell
    -> capability query
      -> broker
        -> leaf candidate index
          -> winning leaf capability
            -> owning package lookup
              -> package-aware handoff or acquisition
```

## Task Breakdown

### Task 1: Introduce package and leaf identity types

Files:

- `/Users/monkeyin/projects/skills-broker/src/core/types.ts`
- `/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts`

Deliverables:

- `CapabilityPackageRef`
- `LeafCapabilityRef`
- compatibility bridge from the current flattened implementation id

Acceptance:

- current build stays green
- current proof families can still be represented during migration

### Task 2: Evolve the seed model into a two-layer catalog

Files:

- `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json`
- `/Users/monkeyin/projects/skills-broker/src/sources/host-skill-catalog.ts`

Deliverables:

- explicit package metadata
- explicit leaf capability metadata
- package-to-leaf mapping

Preferred migration shape:

- keep the existing seed file path
- evolve it to carry both package and capability sections

That keeps the diff smaller than exploding the config into many new files.

Acceptance:

- `gstack` can expose multiple leaf capabilities cleanly
- `baoyu` can expose one or many leaf capabilities without changing the core model
- probe contracts can describe how package and leaf installation should be validated

### Task 3: Make ranking leaf-first and package-aware

Files:

- `/Users/monkeyin/projects/skills-broker/src/broker/rank.ts`
- `/Users/monkeyin/projects/skills-broker/src/broker/run.ts`

Deliverables:

- preserve current query-based leaf matching
- add package-aware ranking signals such as installed state and package burden
- allow preferred package and preferred subskill hints without making them mandatory

Acceptance:

- the broker still compares leaf capabilities directly across packages
- package-level hints improve ranking but do not replace leaf matching

### Task 4: Make handoff and prepare preserve both identities

Files:

- `/Users/monkeyin/projects/skills-broker/src/broker/prepare.ts`
- `/Users/monkeyin/projects/skills-broker/src/broker/handoff.ts`

Deliverables:

- handoff exposes the winning leaf capability
- handoff exposes the owning package
- compatibility field for legacy `chosenImplementation` if needed

Acceptance:

- the host can still consume the handoff simply
- the internal model no longer depends on a single flat implementation string

### Task 5: Move acquisition semantics to the package layer

Files:

- `/Users/monkeyin/projects/skills-broker/src/broker/run.ts`
- discovery or install helpers under `/Users/monkeyin/projects/skills-broker/src/broker/`
- shared-home lifecycle code where package presence is tracked

Deliverables:

- package-aware "installed vs known-but-missing" state
- package-oriented recommendation or acquisition path
- ability to say "this request wants leaf X from package Y"

Acceptance:

- install and discovery no longer pretend that leaf identity alone is enough
- future reuse can happen at the package level
- package availability upgrades require validated package-plus-leaf presence, not raw directory hits

### Task 6: Migrate current proof families onto the new model

Files:

- `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json`
- tests covering broker routing outcomes

Deliverables:

- `requirements-analysis` represented as one or more leaf capabilities with explicit package ownership
- `website-qa` represented the same way
- distinction between neighboring leafs such as `qa` and `qa-only` becomes representable

Acceptance:

- a user can ask for the job without naming the package
- the broker can choose the correct subskill inside a package when multiple related leafs exist

### Task 7: Test and migration safety

Required tests:

- capability-card tests for package and leaf identity
- catalog loader tests for package-to-leaf mapping
- rank tests for leaf-first, package-aware ordering
- broker-flow tests for package-aware handoffs
- acquisition tests for missing-package behavior
- host auto-routing smoke for:
  - requirements analysis
  - QA
  - markdown conversion

Acceptance:

- no regression in the current shipped flows
- package-versus-subskill identity is visible in tests, not just implied in docs
- invalid probe contracts fail at catalog-load time with path-specific errors

## Remaining Work

The main unfinished pieces are now above the catalog layer, not inside it.

Remaining product work:

- keep shrinking the legacy fixed-intent boundary at the top of broker request normalization
- decide how far MCP install semantics should go beyond "known but not installed"
- document the now-shipped probe contract and catalog validation behavior in the higher-level architecture docs

Remaining technical work:

- add stronger schema ownership so seed validation rules are not duplicated across loaders
- decide whether package and leaf probe contracts should become reusable shared config schemas
- extend richer package metadata beyond local skill bundles and broker-native packages

## Migration Notes

The current proof implementation ids such as:

- `gstack.office_hours`
- `gstack.qa`

should survive one compatibility phase, but they should become derived identifiers, not the primary domain model.

That means the runtime should eventually know:

- package: `gstack`
- subskill: `office-hours`

instead of only knowing:

- `gstack.office_hours`

## End State

When this plan lands, `skills-broker` should be able to say:

- "the user wants requirements analysis"
- "the best matching leaf capability is this specific subskill"
- "that subskill belongs to this package"
- "the package is already installed" or "the package needs acquisition"

That is a much better product surface than a router that merely recognizes a few good example ids.
