# State

**Initialized:** 2026-04-22
**Status:** active

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-22)

**Core value:** 用户只需要描述想达成的结果，broker 就能在当前宿主里找到、准备并复用合适的能力，而不用让用户记住工具名、重新发现赢家、或自己判断安装路径。
**Current focus:** Phase 1 - Prove The QA Hero Loop

## Current Phase

- **Phase 1:** Prove The QA Hero Loop
- **Goal:** 把 `website QA` 从默认入口文案推进成 operator-visible 的产品闭环
- **Status:** planned / ready to execute
- **Primary requirements:** `ENTRY-01`, `ENTRY-02`, `ROUTE-01`, `ROUTE-02`, `ROUTE-03`
- **Plan count:** 3
- **Wave count:** 1

## Phase Status

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Prove The QA Hero Loop | Planned | 3 个计划已通过 plan-checker，下一步执行 |
| 2 | Generalize Family Proofs | Pending | 在不重开已完成迁移的前提下扩 family proof |
| 3 | Harden Runtime And Verification | Pending | 降低 shared-home / runner / verification 高 blast radius 风险 |
| 4 | Lock Operator Truth And Expansion Readiness | Pending | 保持多文档 truth 一致，并为第三宿主壳保留接入面 |

## Known Context

- Repo 已完成 brownfield 代码地图，见 `.planning/codebase/`
- 共享 broker home、Claude Code / Codex thin host shell、discovery/install flywheel、query-native request tail、package-vs-leaf identity tail、adoption proof 等基础能力已经 shipped
- 当前最明确的 active packet 是把 `website QA` 默认入口从 docs truth 提升为 operator-visible truth，并把同一套 proof family 继续推广到 `web_content_to_markdown`
- 关键工程风险集中在 oversized lifecycle/runtime modules、doc parity drift、awkward path runner safety、rollback branch coverage 与 contributor dependency health

## Session History

- 2026-04-22: Phase 1 context gathered — resume from `.planning/phases/01-prove-the-qa-hero-loop/01-CONTEXT.md`
- 2026-04-22: Phase 1 planned — execute from `.planning/phases/01-prove-the-qa-hero-loop/01-01-PLAN.md`, `01-02-PLAN.md`, `01-03-PLAN.md`

## Workflow Settings

- `mode`: `interactive`
- `granularity`: `coarse`
- `parallelization`: `true`
- `commit_docs`: `true`
- `model_profile`: `balanced`
- `workflow.research`: `false`
- `workflow.plan_check`: `true`
- `workflow.verifier`: `true`

## Next Up

`$gsd-execute-phase 1`

Also available:
- `cat .planning/phases/01-prove-the-qa-hero-loop/*-PLAN.md`
- `$gsd-review --phase 1 --all`

---
*State initialized: 2026-04-22*
