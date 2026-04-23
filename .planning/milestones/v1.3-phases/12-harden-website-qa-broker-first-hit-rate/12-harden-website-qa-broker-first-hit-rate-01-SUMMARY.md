---
phase: 12-harden-website-qa-broker-first-hit-rate
plan: 01
subsystem: qa-entry-normalization-and-boundary-parity
tags: [website-qa, routing, normalization, host-boundary]
requires:
  - phase: 11-close-publish-flow-on-canonical-release-truth
    plan: 02
    provides: canonical operator truth and three-host thin-shell baseline
provides:
  - Stronger website QA broker-first normalization for obvious asks
  - QA capability-discovery routing for Chinese and mixed-language install-help phrasing
  - Three-host coarse-boundary parity coverage for QA hero-lane examples and near misses
affects: [phase-12, routing, host-boundary, eval]
tech-stack:
  added: []
  patterns: [qa-install-help-normalization, page-near-miss-fail-closed, three-host-boundary-parity]
key-files:
  created:
    - .planning/milestones/v1.3-phases/12-harden-website-qa-broker-first-hit-rate/12-harden-website-qa-broker-first-hit-rate-01-SUMMARY.md
  modified:
    - src/broker/query-compiler.ts
    - tests/broker/query-compiler.test.ts
    - tests/core/request-normalization.test.ts
    - tests/fixtures/phase2-coarse-boundary-eval.json
    - tests/e2e/phase2-coarse-boundary-eval.test.ts
    - tests/e2e/host-auto-routing-smoke.test.ts
key-decisions:
  - "明显 website QA paraphrase 与 QA install-help 话术继续留在 coarse broker-first boundary 内，但 broker 内部会区分 direct QA 与 capability discovery。"
  - "`test this page` / `check this page` 一类 page-level 近邻表达继续 fail closed，不因为附带 URL 就被误吞进 website QA hero lane。"
  - "Phase 2 coarse-boundary parity fixture 扩到 OpenCode，避免 QA-first 证据只停在 Claude Code / Codex 双宿主。"
patterns-established:
  - "当用户在找‘做 website QA 的 skill/MCP’时，宿主仍然只做 `broker_first` 判断，具体落到 discovery 还是 direct QA 由 broker 归一化层决定。"
requirements-completed: [ROUTE-01, ROUTE-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 12 Plan 01 Summary

**Phase 12 的第一部分把 `website QA` 默认入口的“命中率”问题先收硬了。明显的 QA 请求更稳定地进入 broker-first，中文/中英混合的找 skill/install-help 话术也会进 discovery lane；与此同时，page-level 近邻表达继续 fail closed。**

## Accomplishments

- `src/broker/query-compiler.ts` 现在能把 `有没有现成 skill 能做这个网站 QA` 一类中文/混合安装帮助话术归一化到 capability-discovery lane，而不是误判成 direct QA handoff。
- `tests/broker/query-compiler.test.ts` 与 `tests/core/request-normalization.test.ts` 补上了明显 QA、QA install-help、page-level near miss 三类边界覆盖。
- `tests/fixtures/phase2-coarse-boundary-eval.json` 与 `tests/e2e/phase2-coarse-boundary-eval.test.ts` 扩到了三宿主表面，加入 mixed-language QA discovery 和 page inspection near miss case。
- `tests/e2e/host-auto-routing-smoke.test.ts` 补了 installed host shell 对 QA discovery 与 page inspection decline 的 smoke coverage。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/broker/query-compiler.test.ts tests/core/request-normalization.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/e2e/phase2-coarse-boundary-eval.test.ts tests/e2e/host-auto-routing-smoke.test.ts`

## Deviations

- 没有额外修改 host shell 文案；这一层会在 Phase 14 跟 README / STATUS / TODOS 一起统一锁定。

## Next Readiness

- coarse boundary 已经能更稳地把 obvious QA 送进 broker，下一步需要把 route evidence 直接 surfaced 到 trace / doctor 上。
