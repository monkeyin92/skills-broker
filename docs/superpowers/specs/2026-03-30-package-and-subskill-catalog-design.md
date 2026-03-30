# skills-broker Package and Subskill Catalog Design

Date: 2026-03-30
Status: Active design, core model implemented in `main`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-capability-query-router-design.md`
Builds on: `/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-30-broker-owned-downstream-capabilities.md`

## Summary

The capability-query router direction is correct.

The current downstream identity model is not.

Today the broker can rank richer capability metadata, but it still flattens package identity and subskill identity into one implementation string such as:

- `gstack.office_hours`
- `gstack.qa`
- `baoyu.url_to_markdown`

That is good enough for the first proof lake.
It is not the durable product model.

`skills-broker` should move to a two-layer catalog:

- package catalog for distribution, installation, and lifecycle
- leaf capability catalog for retrieval, ranking, and handoff

The routing unit should be the leaf capability.
The acquisition and lifecycle unit should be the package.

## Implementation Status

This model is no longer theoretical.

As of 2026-03-30, `main` already ships:

- explicit `package` and `leaf` identity on capability cards
- package-aware handoff fields
- package-aware acquisition hints when the winning leaf belongs to an uninstalled package
- runtime package availability probing
- manifest-based install detection instead of raw directory-hit upgrades
- catalog-side `probe` contracts for packages and leaf capabilities
- load-time validation for those probe contracts
- MCP candidates aligned onto the same package-plus-leaf shape

This means the design center is now real:

- retrieve at the leaf layer
- install and lifecycle-manage at the package layer
- validate package and leaf identity through metadata contracts, not just guessed directory names

## Problem Statement

The current proof-family path demonstrates that capability-query routing can select something more specific than generic discovery.

But the current model still compresses four different concepts into one field in `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json` and `/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts`:

- package or bundle identity
- subskill identity
- execution implementation identity
- installation ownership

This creates product and architectural problems.

### Problem 1: package and subskill are not the same thing

Examples:

- `gstack` is a package or bundle
- `office-hours`, `plan-ceo-review`, and `qa` are subskills inside that package
- `baoyu` can also be treated as a package, even when one package currently exposes only one obvious routed leaf

The broker should not treat `gstack.qa` as if it were a top-level product identity.

### Problem 2: retrieval should happen across subskills, not across packages first

When the user says:

- "帮我分析这个需求"
- "帮我做需求分析并产出设计文档"
- "QA 这个网站"

the broker should compare the relevant leaf capabilities directly, even if they live in different packages.

If the broker first chooses `gstack` and only then searches inside it, the system gets blunt.
The real competition is between leaf capabilities, not between parent packages.

### Problem 3: installation and lifecycle belong at the package layer

If the best matching leaf is not installed, the broker should reason about:

- which package provides that leaf
- whether that package can be acquired
- whether installation is worth it

The current flattened model does not represent this cleanly.

### Problem 4: the current proof model hardcodes examples too early

Today the proof families point at:

- `gstack.office_hours`
- `gstack.qa`

That proves the routing direction.
It does not yet prove the right long-term abstraction.

The product goal is not "route to gstack."

The product goal is:

- understand the user's intended work
- find the best leaf capability
- acquire the package if needed
- hand off to the correct subskill

## Product Goal

Users should be able to describe the job they want done in natural language.

The broker should:

1. understand the requested capability type through the capability query
2. retrieve the best matching leaf capabilities across all known packages
3. choose the winning leaf capability
4. if needed, acquire or recommend the package that contains it
5. hand off to the correct subskill without the user needing to know the package name

Examples:

- "帮我分析这个需求"
- "帮我做需求分析并产出设计文档"
- "QA 这个网站"
- "检查这个网站质量"
- "把这个页面转成 markdown"

The user should not need to know:

- whether the winner comes from `gstack`, `baoyu`, `superpowers`, or another package
- whether the winning leaf is `office-hours`, `plan-ceo-review`, `qa`, `qa-only`, or a future equivalent
- whether the final execution surface is a local skill, an MCP-backed tool, or a broker-native workflow

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Capability-query routing exists
  Broker-owned downstream implementations exist
  Proof families can point to concrete implementations
  Package identity and subskill identity are still flattened together

THIS PLAN
  Introduce a package catalog and a leaf capability catalog
  Retrieve and rank leaf capabilities across packages
  Keep installation, lifecycle, and acquisition on the package layer
  Preserve broker control over ranking and handoff

12-MONTH IDEAL
  Users ask for work, not package names
  Packages can expose one or many subskills without changing router shape
  Multiple packages can compete for the same job family cleanly
  Package acquisition becomes a broker flywheel, not a side path
```

## Chosen Approach

The chosen approach is:

- keep capability-query routing
- separate package identity from leaf capability identity
- retrieve at the leaf layer
- install and lifecycle-manage at the package layer
- keep the broker, not the LLM, in charge of ranking and the final handoff

Rejected approaches:

- keep using one flat `implementation.id` forever
- choose a package first and only then search its subskills
- let the host model choose the final subskill directly

## Scope

### In Scope

- define package versus leaf capability responsibilities
- define the two-layer catalog model
- define routing, ranking, and handoff at the leaf layer
- define package acquisition and lifecycle at the package layer
- define the migration path from the current flattened implementation ids

### Not In Scope

- marketplace UI
- arbitrary internet package installation
- removing capability-query routing
- replacing the host-visible single-entrypoint broker model

## Core Product Principle

Retrieve at the leaf layer.
Install at the package layer.

That is the whole game.

If the user asks for QA, brainstorming, requirements analysis, or markdown conversion:

- the broker should search leaf capabilities
- the broker should not ask the host to choose a package
- the host should not need to know which subskill won

## Catalog Model

### Package Catalog

A package is the distribution and lifecycle unit.

Examples:

- `gstack`
- `baoyu`
- `superpowers`
- `skills_broker`

Suggested package fields:

- `packageId`
- `label`
- `kind`
  - `skill_bundle`
  - `mcp_bundle`
  - `broker_native`
- `source`
  - local path, published package, broker-owned bundle, or registry reference
- `hosts`
- `install`
  - installed state
  - acquisition method
  - burden
  - trust notes
- `version`
- `sourceMetadata`

Example mental model:

```json
{
  "packageId": "gstack",
  "label": "gstack",
  "installState": "installed",
  "acquisition": "local_skill_bundle",
  "probe": {
    "layouts": ["bundle_root_children", "nested_agent_skills"],
    "manifestNames": ["gstack"]
  }
}
```

### Leaf Capability Catalog

A leaf capability is the retrieval and routing unit.

Examples:

- `gstack / office-hours`
- `gstack / plan-ceo-review`
- `gstack / qa`
- `gstack / qa-only`
- `baoyu / url-to-markdown`

Suggested leaf fields:

- `capabilityId`
- `packageId`
- `subskillId`
- `probe`
- `label`
- `kind`
- `query`
  - job families
  - target types
  - artifacts
  - examples
- `execution`
  - implementation type
  - ownership surface
- `prepare`
- `ranking`
- `sourceMetadata`

Example mental model:

```json
{
  "capabilityId": "gstack.qa",
  "packageId": "gstack",
  "subskillId": "qa",
  "probe": {
    "manifestNames": ["qa"],
    "aliases": ["gstack-qa"]
  },
  "label": "Website QA",
  "kind": "skill",
  "query": {
    "jobFamilies": ["quality_assurance"],
    "targetTypes": ["website", "url"],
    "artifacts": ["qa_report"]
  },
  "execution": {
    "type": "local_skill",
    "ownerSurface": "broker_owned_downstream"
  }
}
```

The package is the thing you install.
The leaf is the thing you route to.

## Probe Contract

The runtime now depends on an explicit probe contract on both layers.

### Package probe

The package probe describes how to validate that a package really exists on disk.

Current shape:

- `layouts`
- `manifestFiles`
- `manifestNames`
- `aliases`

Current layout modes:

- `single_skill_directory`
- `bundle_root_children`
- `nested_agent_skills`

This lets the broker distinguish between very different package shapes, such as:

- a single standalone skill directory under `~/.agents/skills`
- a bundle such as `gstack` whose subskills live directly under the root
- a bundle whose routed skills live under `.agents/skills` or similar nested directories

### Leaf probe

The leaf probe describes how to validate that the specific subskill exists, not only the parent package.

Current shape:

- `manifestFiles`
- `manifestNames`
- `aliases`

This is what fixes the old bug where seeing a package root could incorrectly upgrade every leaf inside that package to `installed`.

## Runtime Install Detection

The current runtime logic is now:

1. find candidate roots
2. validate package manifests against the package probe contract
3. validate leaf manifests against the leaf probe contract
4. only then upgrade `available -> installed`

This is stricter than the earlier directory-hit approach.

That strictness matters because the user outcome is binary:

- either the broker can really hand off
- or it should honestly recommend acquisition instead of bluffing

## Catalog Validation

The host skill catalog is now validated when loaded.

That validation checks:

- package-level probe layout values
- probe string-array fields such as `manifestNames` and `aliases`
- basic package and leaf identity shape

This is important because a broken catalog entry should fail at load time, not silently degrade routing quality at runtime.

## MCP Alignment

MCP sources are now being shaped into the same internal model:

- explicit package identity
- explicit leaf identity
- explicit implementation metadata
- explicit probe hints

That does not mean MCP install detection is feature-complete.
It means the internal routing model is now unified enough that skill and MCP sources no longer need separate mental models inside the broker.

### Relationship Rules

- one package may expose many leaf capabilities
- one package may expose only one leaf capability
- multiple packages may expose leaf capabilities for the same job family
- the broker compares leafs directly, even when their packages differ

## Retrieval Model

The broker should retrieve leaf candidates, not packages.

```text
host shell
  -> capability query
    -> broker validation
      -> leaf capability retrieval
        -> leaf ranking
          -> winning leaf
            -> package availability check
              -> handoff or acquisition path
```

Primary retrieval unit:

- leaf capability

Secondary operational context:

- owning package

Package-first lookup may still exist as an optimization, but it must not become the primary product decision layer.

## Ranking Model

Leaf ranking should remain broker-owned.

Primary ranking signals:

- job-family match
- target-type match
- artifact match
- explicit preferred package or preferred subskill, when the user names one

Secondary ranking signals:

- package installed state
- current host support
- preparation burden
- prior successful routes
- portability and confidence

Important rule:

A package mention should be a hint, not a trump card.

If the user explicitly says "use office-hours", that matters.
If the user says "帮我分析这个需求", the broker should compare all relevant leaf capabilities, not pre-commit to one package family.

## Acquisition and Lifecycle Model

Package lifecycle and leaf routing should be separate.

If the winning leaf is in an installed package:

- prepare the leaf handoff directly

If the winning leaf is in a known but uninstalled package:

- return a broker-managed acquisition or recommendation path that names the package and the desired leaf

If multiple good leafs live inside the same not-yet-installed package:

- package-level acquisition should be reusable across future requests

This is why package identity needs to be explicit.

## Handoff Model

The current handoff in `/Users/monkeyin/projects/skills-broker/src/broker/handoff.ts` exposes `chosenImplementation`, but that is still too flat.

The long-term handoff should expose both:

- chosen package
- chosen leaf capability

Suggested direction:

```json
{
  "brokerDone": true,
  "chosenPackage": {
    "packageId": "gstack"
  },
  "chosenLeafCapability": {
    "capabilityId": "gstack.qa",
    "subskillId": "qa"
  }
}
```

Backward compatibility can preserve the old flattened implementation id for one migration phase, but the internal model should stop depending on it.

## What Changes For Current Proof Families

The current proof families should be treated as temporary leaf examples, not final product families.

That means:

- `requirements-analysis -> gstack.office_hours` is an intermediate proof, not the permanent architecture
- `website-qa -> gstack.qa` is an intermediate proof, not the permanent architecture

Under the target model:

- requirements-analysis should retrieve the best leaf capability across packages
- QA should retrieve the best QA leaf capability across packages
- if a package has multiple QA-like leafs, the broker should choose among those leafs using artifact and execution hints

Example:

- `qa` might mean test-and-fix
- `qa-only` might mean report-only

The package remains `gstack`.
The routing unit is still the leaf.

## Migration Path

### Phase 1: Add explicit package and leaf references

Evolve the current capability card model so it can represent:

- `packageId`
- `subskillId`
- existing flattened `implementation.id` for compatibility

### Phase 2: Split catalog responsibilities

Evolve `/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json` or its successor so package metadata and leaf capability metadata are modeled separately.

### Phase 3: Make ranking and handoff package-aware

Teach ranking, preparation, and handoff to preserve:

- leaf identity
- package availability
- package acquisition semantics

### Phase 4: Move discovery and install to package semantics

`capability_discovery_or_install` should eventually stop acting like a generic catch-all leaf and become a package-aware acquisition path.

## Why This Matters

This is the difference between:

- "a router with some example implementation ids"

and:

- "a capability broker that can understand user intent, compare subskills across packages, and grow its reachable capability surface over time"

That is the product.
