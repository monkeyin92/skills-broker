---
phase: 02-generalize-family-proofs
plan: 02
subsystem: routing
tags: [semantic-metadata, host-catalog, proof-family, web-markdown, website-qa]
requires: []
provides:
  - Explicit `website_qa` and `web_content_to_markdown` proof-family metadata contract
  - Host catalog loader validation for query metadata beyond proofFamily/confidenceHints
  - Deterministic web-markdown-only semantic routing boundary with explainable trace fields
affects: [phase-02-family-proofs, phase-03-runtime-hardening]
tech-stack:
  added: []
  patterns: [explicit-prooffamily-metadata, loader-validates-query-metadata, web-markdown-only-direct-route]
key-files:
  created: []
  modified:
    - src/core/types.ts
    - src/sources/host-skill-catalog.ts
    - config/host-skills.seed.json
    - tests/core/capability-card.test.ts
    - tests/broker/semantic-resolver.test.ts
key-decisions:
  - "显式把 `website_qa` 加入 `CapabilityProofFamily`，但不改变 website QA 的 public compatibility intent。"
  - "host catalog query metadata 不再只校验 `proofFamily` 和 `confidenceHints`，而是一起覆盖 `jobFamilies`、`targetTypes`、`artifacts`、`examples`。"
  - "semantic direct-route 仍然只为 web markdown 服务，其他 proof family 继续 fail-closed。"
patterns-established:
  - "Explicit metadata without open-domain drift: website QA seed 可以带 proven-family metadata，但不会把 discovery lane 偷渡成通用语义搜索。"
  - "Loader-backed contracts: type allowed-values 与 seed loader validation 双重锁住 query metadata。"
requirements-completed: [ROUTE-04, GROW-01]
duration: 1h
completed: 2026-04-22
---

# Phase 2 Plan 02 Summary

**semantic metadata contract 现在能显式表达 `website_qa` / `web_content_to_markdown`，loader 也会拦住 malformed query metadata，而 direct-route 仍然只属于 web markdown**

## Accomplishments

- `src/core/types.ts` 新增 `website_qa` proof family，给 Phase 2 已证明的 family 一个正式的 type contract。
- `config/host-skills.seed.json` 现在为 `website-qa` 明确写入 `summary`、`keywords`、`antiKeywords`、`confidenceHints`、`proofFamily`，不再只靠隐式默认值。
- `src/sources/host-skill-catalog.ts` 现在会校验 `jobFamilies`、`targetTypes`、`artifacts`、`examples`，并用 `tests/broker/semantic-resolver.test.ts` 锁住 invalid metadata 会 fail-fast。
- `tests/core/capability-card.test.ts` 证明 website QA 可以携带显式 `proofFamily: "website_qa"`，同时继续保持 `compatibilityIntent: "capability_discovery_or_install"`。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs --run tests/core/capability-card.test.ts tests/broker/semantic-resolver.test.ts tests/broker/trace.test.ts`

## Deviations

- `semantic-resolver.ts` 和 `run.ts` 的 web-markdown boundary 在 brownfield 基线上已经基本到位；本次执行重点转成补 contract、补 seed truth、补 loader validation，而不是重写 resolver。

## Next Readiness

- semantic query metadata 已经能稳定表达已证明 family，Phase 2 的 integration proof 和 operator docs 可以直接引用 `website_qa` / `web_content_to_markdown` 这两个 canonical family label。
