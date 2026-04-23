---
phase: 08-install-ci-trust-guardrails
plan: 01
subsystem: ci-blind-spot-budget
tags: [ci, trust, coverage-budget, blind-spot, fail-closed]
requires:
  - phase: 07-expand-evidence-backed-capability-surface
    plan: 01
    provides: three proven families worth protecting
  - phase: 07-expand-evidence-backed-capability-surface
    plan: 02
    provides: two broker-owned workflows worth budgeting
  - phase: 07-expand-evidence-backed-capability-surface
    plan: 03
    provides: registry-ready advisory source worth preserving
provides:
  - Dynamic inventory-driven CI blind-spot report
  - Fail-closed proof-layer budgeting for hosts, maintained families, proven families, workflows, and repo proof gates
  - Explicit CI workflow wiring for blind-spot reporting
affects: [phase-8, ci, release-trust]
tech-stack:
  added: [src/dev/ci-trust.ts]
  patterns: [inventory-driven-budgeting, snippet-backed-proof-layer-checks, repo-native-ci-wiring-assertions]
key-files:
  created:
    - .planning/phases/08-install-ci-trust-guardrails/08-install-ci-trust-guardrails-01-SUMMARY.md
    - src/dev/ci-trust.ts
    - scripts/ci-trust-report.mjs
    - tests/dev/ci-trust.test.ts
  modified:
    - package.json
    - .github/workflows/ci.yml
    - config/host-skills.seed.json
    - tests/cli/cli-contract.test.ts
key-decisions:
  - "blind-spot report 直接从 `BROKER_HOSTS`、maintained-family contract 与 real host catalog 读取 inventory，而不是维护一份会过期的静态名单。"
  - "proof budget 不是只检查文件存在，而是要求关键 proof 文件显式提到对应 host/family/workflow snippets，这样新增 surface 没有真实 proof 时会 fail closed。"
  - "Phase 8 的 blind-spot report 暴露出两个真实缺口：`social_post_to_markdown` 在 real host seed 缺少 `proofFamily`，`idea-to-ship` 缺少 CLI-level proof；两者都在本 plan 内补齐。"
patterns-established:
  - "当 repo 已经公开声明某个 surface 存在时，CI 应该动态读取这份声明并预算它的 proof layers。"
  - "CI wiring 本身也应该被 repo-native tests 反向守住，避免 workflow 文件改动后 guardrail 直接消失。"
requirements-completed: [QUAL-01]
duration: 1 session
completed: 2026-04-23
---

# Phase 8 Plan 01 Summary

**CI 现在会输出一份真正基于 live repo inventory 的 blind-spot report，而不是只给一盏“测试全绿”的总灯。支持宿主、maintained family、proven family、workflow、repo proof gate 与 MCP explainability 都被预算成显式 proof layers；新增 surface 没有对应证据时，会直接 fail closed。**

## Accomplishments

- 新增 `src/dev/ci-trust.ts` 和 `scripts/ci-trust-report.mjs`，把 blind-spot / coverage budget 做成独立的 repo-native CLI。它会动态读取 `BROKER_HOSTS`、`config/maintained-broker-first-families.json`、`config/host-skills.seed.json`，然后为 host / family / workflow / source / narrative / repo-proof surface 生成 proof budget。
- 这份 report 不只是检查“文件在不在”，而是要求关键 proof 文件显式提到对应 surface 的 snippets；因此新增宿主、新增 family、新增 workflow 而没有真正的测试或 narrative mention 时，会变成明确 blind spot。
- `tests/dev/ci-trust.test.ts` 锁住了 current repo green path、dynamic workflow surface 生成，以及 proof snippet 消失时的 fail-closed 行为。
- `.github/workflows/ci.yml` 现在新增 `trust` job，并在 build/test/status 之前先运行 blind-spot report。
- blind-spot report 在第一次运行时抓出了两个真实缺口：`social-post-to-markdown` 在 real host seed 里还没挂 `proofFamily`，以及 `idea-to-ship` 缺少 CLI-level proof。`config/host-skills.seed.json` 和 `tests/cli/cli-contract.test.ts` 已一起补上。

## Verification

- `node --import ./scripts/register-ts-node.mjs ./scripts/ci-trust-report.mjs`
- `node ./node_modules/vitest/vitest.mjs --run tests/dev/ci-trust.test.ts tests/cli/cli-contract.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/sources/host-skill-catalog.test.ts tests/core/maintained-broker-first.test.ts`

## Deviations

- 没有把 blind-spot report 并进 `verify:local`。本 plan 刻意保持它是 CI trust gate，而不是本地环境预检的一部分。
- 没有试图在 GitHub runner 里模拟真实三宿主安装；budget 检查的是 repo truth、proof layers 与 CI wiring，而不是宿主环境仿真。

## Next Readiness

- Narrative parity 现在可以被提升成 focused CI suite，而不是继续埋在全量 `npm test` 输出里。
- release/ship 流程下一步可以直接消费这份 blind-spot report，而不是等 milestone 末尾再人工盘点。
