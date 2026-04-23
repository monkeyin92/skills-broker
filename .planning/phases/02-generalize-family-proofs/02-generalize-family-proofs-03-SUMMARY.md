---
phase: 02-generalize-family-proofs
plan: 03
subsystem: operator-truth
tags: [web-markdown, host-shell, readme, todos, status, second-proven-family]
requires: [01, 02]
provides:
  - Canonical web-markdown install -> verify -> cross-host reuse proof with semantic trace evidence
  - Installed-shell wording that keeps website QA first and web markdown second
  - Repo-native README / TODOS / STATUS truth aligned to one hero lane, two proven loops
affects: [phase-03-runtime-hardening, phase-04-operator-truth]
tech-stack:
  added: []
  patterns: [one-hero-lane-two-proven-loops, second-proven-family-doc-parity]
key-files:
  created: []
  modified:
    - tests/integration/broker-flow.test.ts
    - src/hosts/skill-markdown.ts
    - tests/hosts/host-shell-install.test.ts
    - README.md
    - README.zh-CN.md
    - TODOS.md
    - STATUS.md
key-decisions:
  - "web markdown 作为第二条 proven family 进入 operator truth，但不能和 website QA 并列竞争 first move。"
  - "installed shell 把 web markdown 放进 secondary maintained lanes，而不是继续藏在泛化的 other broker-first examples 里。"
  - "STATUS 用 `shipped_local` 反映当前 HEAD 的 Phase 2 truth，TODOS 不再把 family-proof generalization 留在未完成 backlog。"
patterns-established:
  - "Integration proof backs docs: README / STATUS 里的 second-proven-family 说法必须由 install -> verify -> cross-host reuse integration test 支撑。"
  - "Operator truth parity: host shell、双语 README、TODOS、STATUS 讲同一个层级故事。"
requirements-completed: [ENTRY-03, ROUTE-04, GROW-01]
duration: 1h
completed: 2026-04-22
---

# Phase 2 Plan 03 Summary

**web markdown 现在以“第二条 proven family”的身份被正式发布：integration proof、installed shell、双语 README、TODOS 和 STATUS 都在讲同一个 one hero lane, two proven loops 故事**

## Accomplishments

- `tests/integration/broker-flow.test.ts` 现在把 web-markdown canonical proof test 锁成同一句请求、同一 package/leaf identity、同一组 `semanticMatch*` trace 字段贯穿 `INSTALL_REQUIRED -> HANDOFF_READY -> cross-host reuse`。
- `src/hosts/skill-markdown.ts` 把 web markdown 提升到 `### Secondary maintained lanes`，同时继续把 website QA 固定成唯一 hero lane。
- `README.md` / `README.zh-CN.md` 在产品叙事前段就明确写出 web markdown 是第二条 proven family。
- `TODOS.md` 把 family-proof generalization 从 active backlog 挪到 Completed，`STATUS.md` 新增 `phase2-family-proofs` 的 `shipped_local` proof board item。

## Verification

- `/Users/monkeyin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs --run tests/integration/broker-flow.test.ts tests/hosts/host-shell-install.test.ts`
- `rg -n "second proven family|第二条已经证明|### Hero lane: website QA|### Secondary maintained lanes|website_qa|web_content_to_markdown|semanticMatchProofFamily" README.md README.zh-CN.md src/hosts/skill-markdown.ts tests/hosts/host-shell-install.test.ts TODOS.md STATUS.md tests/integration/broker-flow.test.ts`

## Deviations

- README 双语 quick start 已经存在第二 proven lane 的核心表述，本次执行主要补“前段叙事更显式”和多表面 parity，而不是重写使用说明。

## Next Readiness

- Phase 2 的 operator truth 已经闭环，Phase 3 可以转向 shared-home / runner / contributor verification 的高 blast radius 风险，而不用再回头争论 hero lane 与 second proven family 的层级。
