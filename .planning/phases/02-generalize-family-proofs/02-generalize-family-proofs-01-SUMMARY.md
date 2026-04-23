---
phase: 02-generalize-family-proofs
plan: 01
subsystem: shared-home
tags: [doctor, family-proofs, strict-gate, website-qa, web-markdown]
requires: []
provides:
  - Canonical `familyProofs` doctor surface for website QA and web markdown
  - `websiteQaLoop` compatibility alias for strict consumers
  - Fail-closed proof-rail behavior when acquisition memory or downstream manifests are unreadable
affects: [phase-02-semantic-metadata, phase-04-operator-truth]
tech-stack:
  added: []
  patterns: [canonical-family-proofs, websiteqa-compat-alias, fail-closed-proof-rails]
key-files:
  created: []
  modified:
    - src/shared-home/doctor.ts
    - tests/shared-home/doctor.test.ts
    - tests/cli/lifecycle-cli.test.ts
key-decisions:
  - "把 `familyProofs` 固定为 Phase 2 的 canonical operator truth。"
  - "`websiteQaLoop` 继续保留，但只作为 `familyProofs.website_qa` 的兼容 alias。"
  - "proof rails unreadable 时，website QA 和 web markdown 都必须 fail-closed 成 `blocked` / `proof_unreadable`。"
patterns-established:
  - "Canonical family proofs: 顶层 doctor 不再新增 one-off proof object，而是统一落到 family surface。"
  - "Compatibility without drift: strict gate 继续消费旧 alias，但 truth 与 JSON surface 都来自同一份 family state。"
requirements-completed: [ENTRY-03]
duration: 1h
completed: 2026-04-22
---

# Phase 2 Plan 01 Summary

**doctor 现在以 `familyProofs` 作为 canonical proof surface，同时继续用 `websiteQaLoop` 兼容 strict gate，且 unreadable proof rails 会对两条 proven family 一起 fail closed**

## Accomplishments

- `src/shared-home/doctor.ts` 现在把 website QA 的 `proofFamilies` 明确标成 `website_qa`，让 Phase 2 的 family aggregation 与 trace/acquisition matching 对齐。
- `tests/shared-home/doctor.test.ts` 明确锁住 `result.websiteQaLoop === result.familyProofs.website_qa`，并验证 JSON surface 里的 alias 也只是 compatibility view。
- `tests/cli/lifecycle-cli.test.ts` 继续证明 strict consumer 不需要迁移字段路径，`websiteQaLoop` 仍能代表 QA hero lane 的 strict gate truth。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs --run tests/shared-home/doctor.test.ts`
- `npm_execpath=/private/tmp/skills-broker-fake-npm-cli.js /Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs --run tests/cli/lifecycle-cli.test.ts`

## Deviations

- 当前 shell 没有可用 `npm`，而 Codex 内置 Node 又会被 Rollup 原生依赖签名拦住；验证阶段改用 workspace Node，并通过临时 `npm_execpath` shim 跑 `lifecycle-cli` 里的 build-dependent 用例。

## Next Readiness

- Phase 2 后续 semantic metadata 和 operator truth 都可以依赖同一套 `familyProofs` surface，而不用再在 default-entry lane 外额外造 top-level proof 字段。
