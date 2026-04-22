---
phase: 01-prove-the-qa-hero-loop
plan: 01
subsystem: docs
tags: [website-qa, readme, host-shell, smoke-tests]
requires: []
provides:
  - QA-first repo docs aligned with installed host-shell wording
  - Stable host-shell hero/secondary/clarify sections for website QA
  - Smoke coverage for INSTALL_REQUIRED -> rerun -> HANDOFF_READY wording
affects: [phase-02-routing, phase-04-operator-truth]
tech-stack:
  added: []
  patterns: [qa-default-entry-wording, host-shell-single-source]
key-files:
  created: []
  modified:
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
    - src/hosts/skill-markdown.ts
    - tests/hosts/host-shell-install.test.ts
    - tests/e2e/shared-home-smoke.test.ts
    - tests/e2e/claude-code-smoke.test.ts
key-decisions:
  - "把 website QA 固定为 README 和 installed shell 的唯一 first move。"
  - "requirements analysis / investigation 保留为 maintained lanes，但明确降到 secondary。"
  - "host shell 继续只表达 coarse broker-first boundary，不在入口层选择具体赢家。"
patterns-established:
  - "Docs and shell parity: operator-facing wording 同步更新 README、STATUS、TODOS 与宿主生成文案。"
  - "Hero lane before secondary lanes: website QA 永远先于其他 maintained examples 出现。"
requirements-completed: [ENTRY-01, ENTRY-02]
duration: 1h
completed: 2026-04-22
---

# Phase 1 Plan 01 Summary

**双语 README 与安装后宿主壳现在都把 website QA 作为唯一 first move，并锁定 INSTALL_REQUIRED -> install -> rerun -> doctor 的默认教学路径**

## Accomplishments

- README / README.zh-CN 明确把 website QA 写成 QA default-entry loop 和最快看到 doctor truth 的路径。
- `src/hosts/skill-markdown.ts` 继续作为唯一生成点，增加更明确的 hero lane / secondary lane 叙事。
- smoke 与 host-shell layout 测试锁住 `INSTALL_REQUIRED`、`HANDOFF_READY`、`clarify_before_broker` 与排序契约。

## Verification

- `rg -n "If you only try one published path|Try the website QA install-required -> verify -> reuse loop|先跑一遍 website QA 的 install-required -> verify -> reuse 闭环|not the first thing this README should make you try|不该和 QA 一起抢 README 里的第一步|doctor truth|QA default-entry|website QA default-entry" README.md README.zh-CN.md TODOS.md STATUS.md`
- `rg -n "### Hero lane: website QA|### Secondary maintained lanes|## Clarify Before Broker \\(`clarify_before_broker`\\)|INSTALL_REQUIRED.*rerun the same request|HANDOFF_READY" src/hosts/skill-markdown.ts tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts tests/e2e/claude-code-smoke.test.ts`
- `PATH=/Users/monkeyin/.nvm/versions/node/v25.0.0/bin:$PATH npm test -- --run tests/hosts/host-shell-install.test.ts tests/e2e/claude-code-smoke.test.ts tests/e2e/shared-home-smoke.test.ts`

## Deviations

- 无产品范围偏移。执行时改用本机 `nvm` 的 Node 跑 smoke tests，以绕过 Codex 自带签名 Node 的原生依赖限制。

## Next Readiness

- Phase 1 的 docs truth 与 installed-shell truth 已对齐，可继续依赖同一套 wording 验证 routing / doctor 闭环。
