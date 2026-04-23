---
phase: 07-expand-evidence-backed-capability-surface
plan: 02
subsystem: broker-owned-investigation-workflow
tags: [investigation, workflow, maintained-lanes, host-smoke, resume-contract]
requires:
  - phase: 07-expand-evidence-backed-capability-surface
    plan: 01
    provides: third proven family and hierarchy-preserving operator truth
provides:
  - `investigation-to-fix` as the second shipped broker-owned workflow
  - Runtime and installed-host proof for workflow start -> resume -> host-native stage parity
  - Narrowed investigation query surface that preserves website QA as its own maintained lane
affects: [07-03, phase-8, release-narrative]
tech-stack:
  added: []
  patterns: [entry-lane-query-surface, staged-workflow-routing, cross-host-workflow-parity]
key-files:
  created:
    - .planning/phases/07-expand-evidence-backed-capability-surface/07-expand-evidence-backed-capability-surface-02-SUMMARY.md
  modified:
    - config/host-skills.seed.json
    - config/maintained-broker-first-families.json
    - tests/sources/host-skill-catalog.test.ts
    - tests/broker/workflow-runtime.test.ts
    - tests/integration/broker-flow.test.ts
    - tests/cli/cli-contract.test.ts
    - tests/e2e/workflow-host-smoke.test.ts
    - tests/e2e/host-auto-routing-smoke.test.ts
    - tests/fixtures/phase2-coarse-boundary-eval.json
    - tests/e2e/phase2-coarse-boundary-eval.test.ts
key-decisions:
  - "investigation lane 的 maintained winner 升格为 `investigation-to-fix` workflow，但 workflow 顶层 query metadata 只描述 investigation 入口，不把 review/qa artifact 也暴露成入口 surface。"
  - "workflow 升格继续复用现有 capability stage、host-native stage、resume artifact gate 与 trace fields，不引入第二套 runtime primitive。"
  - "三宿主 parity 直接在 installed host smoke 上验证，让 Claude Code、Codex、OpenCode 共用同一个 start/resume contract。"
patterns-established:
  - "broker-owned workflow 的 query metadata 必须描述 entry lane，而不是整个 stage graph 的最终 artifact 闭包。"
  - "maintained lane 升格成 workflow 后，要同时锁 catalog truth、runtime truth、CLI truth、installed-shell truth 和 coarse-boundary eval。"
requirements-completed: [CAP-02]
duration: 1 session
completed: 2026-04-23
---

# Phase 7 Plan 02 Summary

**`investigation` 现在不再只是一次性下游 handoff，而是正式升格成第二条 broker-owned workflow；同时 workflow 入口 query 被收窄到 investigation surface，避免它错误吞掉原本应该命中 `website-qa` 的请求。**

## Accomplishments

- `config/host-skills.seed.json` 新增并发货 `investigation-to-fix` workflow，stage graph 复用已有 `investigate -> implement-fix -> review-fix -> qa-fix -> ship-fix` seams，没有引入新的 workflow engine API。
- `config/maintained-broker-first-families.json` 把 `investigation` maintained winner 切到 `investigation-to-fix`，让 host boundary 继续只认 maintained family，但 broker 内部落到 workflow recipe。
- `tests/broker/workflow-runtime.test.ts` 现在证明 investigation request 会启动 workflow，并且 resume 后会进入 host-native `implement-fix` stage，锁住 stage/resume truth。
- `tests/integration/broker-flow.test.ts`、`tests/cli/cli-contract.test.ts`、`tests/e2e/workflow-host-smoke.test.ts`、`tests/e2e/host-auto-routing-smoke.test.ts` 一起把 raw request、CLI、Claude Code/Codex/OpenCode installed shell 都翻成 `WORKFLOW_STAGE_READY` contract。
- `tests/fixtures/phase2-coarse-boundary-eval.json` 与 `tests/e2e/phase2-coarse-boundary-eval.test.ts` 已同步更新，证明 maintained coarse-boundary eval 现在把 investigation lane 视作 workflow winner，而 website QA 仍然维持自己的独立 maintained winner。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/core/maintained-broker-first.test.ts tests/sources/host-skill-catalog.test.ts tests/broker/workflow-runtime.test.ts tests/integration/broker-flow.test.ts tests/cli/cli-contract.test.ts tests/e2e/workflow-host-smoke.test.ts tests/e2e/host-auto-routing-smoke.test.ts tests/e2e/phase2-coarse-boundary-eval.test.ts`

## Deviations

- 07-02 过程中没有新增 runtime 代码路径；真实问题是 workflow query metadata 过宽，导致 `website-qa` 与 `investigation-to-fix` 在 ranking 上打平后被 workflow 误赢，所以修正落在 catalog truth 而不是 engine。
- CLI investigation fixture 也同步收窄到 investigation-only query surface，防止测试夹具继续编码旧的宽入口假设。

## Next Readiness

- `07-03` 现在可以专注做 MCP registry-ready metadata 和 explainability，因为第二条 workflow 已经被证明不会挤压掉既有 maintained lanes。
- Phase 8 的 CI trust guardrails 也有了更清晰的保护对象：proven family、second broker-owned workflow、registry-ready MCP source。
