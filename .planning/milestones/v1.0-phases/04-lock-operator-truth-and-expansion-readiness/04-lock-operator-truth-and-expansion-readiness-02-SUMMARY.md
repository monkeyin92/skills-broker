---
phase: 04-lock-operator-truth-and-expansion-readiness
plan: 02
subsystem: host-shell
tags: [host-shell, codex, claude-code, coarse-boundary, shared-home]
requires: [01]
provides:
  - Installed host shell copy that reuses canonical operator truth for support and hierarchy wording
  - Regression coverage proving installed shells stay at the coarse broker-first boundary
  - Shared-home smoke proof that current hosts still reuse one shared broker home without overclaiming future host support
affects: [04-03, installed-shells, shared-home]
tech-stack:
  added: []
  patterns: [host-shell-truth-reuse, coarse-boundary-lock, installed-shell-smoke]
key-files:
  created: []
  modified:
    - src/hosts/skill-markdown.ts
    - tests/hosts/host-shell-install.test.ts
    - tests/e2e/shared-home-smoke.test.ts
    - src/core/operator-truth.ts
key-decisions:
  - "installed host shell 不再独立维护支持矩阵与 hierarchy 文案，而是直接复用 canonical operator truth helpers。"
  - "future-host readiness 只能通过 contract reuse 体现，不能通过把宿主入口改成 family chooser 体现。"
  - "shared-home smoke 继续覆盖真实安装产物，而不是退回 snapshot-only 检查。"
patterns-established:
  - "Thin host shells stay thin: support matrix 与 readiness truth 可见，但 package / skill / MCP 选择仍然只属于 broker。"
  - "Host-shell truth reuse: Claude Code / Codex 安装产物与 repo docs 共用同一套 operator truth 文案。"
requirements-completed: []
duration: 1 session
completed: 2026-04-22
---

# Phase 4 Plan 02 Summary

**installed host shell 现在复用 canonical operator truth，同时继续把宿主入口锁在 coarse broker-first boundary 上**

## Accomplishments

- `src/hosts/skill-markdown.ts` 现在会渲染 `Supported Host Truth` 段落，复用 canonical support matrix、published lifecycle commands 和 third-host readiness wording，而不是手写另一套宿主 copy。
- `tests/hosts/host-shell-install.test.ts` 明确锁住 Support Truth -> Broker-First -> Hero lane -> Secondary maintained lanes 的顺序，并继续断言宿主只能决定 `broker_first` / `handle_normally` / `clarify_before_broker`。
- `tests/e2e/shared-home-smoke.test.ts` 继续证明真实安装出来的 Codex shell 与 shared-home 运行时保持同一套 hierarchy、boundary 与 manifest-derived runner contract。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/typescript/bin/tsc -p tsconfig.build.json`
- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts`
- `rg -n "broker_first|handle_normally|clarify_before_broker|Hero lane: website QA|Secondary maintained lanes|Supported now: Claude Code, Codex|Deferred but planned: OpenCode thin host shell" src/hosts/skill-markdown.ts tests/hosts/host-shell-install.test.ts tests/e2e/shared-home-smoke.test.ts`

## Deviations

- 额外 spot-check 的 `tests/e2e/claude-code-smoke.test.ts` 在当前 desktop runtime 下因为 `npm` PATH 指向缺失的 Codex app npm-cli 而失败；这不是 Phase 4 代码逻辑回归。本 plan 的 gating proof 仍由 `tests/hosts/host-shell-install.test.ts` 与 `tests/e2e/shared-home-smoke.test.ts` 提供。
- 当前 worktree 已有大量无关修改与未跟踪文件，因此没有为本 plan 单独生成原子 commit。

## Next Readiness

- installed shell 现在已经能承载 future third-host readiness truth，而不会把未来宿主扩展误导成“宿主入口负责选下游能力”。
