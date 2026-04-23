---
phase: 07-expand-evidence-backed-capability-surface
status: passed
verified: 2026-04-23
requirements:
  - CAP-01
  - CAP-02
  - CAP-03
evidence:
  - 07-expand-evidence-backed-capability-surface-01-SUMMARY.md
  - 07-expand-evidence-backed-capability-surface-02-SUMMARY.md
  - 07-expand-evidence-backed-capability-surface-03-SUMMARY.md
---

# Phase 7 Verification

## Result

`passed`

## Goal Check

Phase goal: 在不稀释 deterministic、metadata-driven、可解释 routing 的前提下，继续增加 proven family、broker-owned workflow 与 registry-ready MCP discovery。

Verdict: 达成。Phase 7 现在已经把 `social_post_to_markdown` 升格成第三条 proven family，把 `investigation` 升格成第二条 broker-owned workflow，并把 MCP discovery source 提升成带 validated registry metadata 与 explainability 的 advisory source；同时 website QA 仍然保持 hero lane，web markdown 仍然保持 second proven family，local/installed winner precedence 也没有被 registry source 打破。

## Requirement Traceability

- `CAP-01`: `src/shared-home/doctor.ts`、`src/shared-home/format.ts`、`src/core/operator-truth.ts`、`src/hosts/skill-markdown.ts`、`tests/shared-home/doctor.test.ts`、`tests/integration/broker-flow.test.ts`、`tests/e2e/shared-home-smoke.test.ts`、`tests/shared-home/operator-truth-parity.test.ts`、`tests/hosts/host-shell-install.test.ts`、`README.md`、`README.zh-CN.md`、`TODOS.md`、`STATUS.md` 共同证明 social markdown 已经进入 canonical proven-family truth。
- `CAP-02`: `config/host-skills.seed.json`、`config/maintained-broker-first-families.json`、`tests/sources/host-skill-catalog.test.ts`、`tests/broker/workflow-runtime.test.ts`、`tests/integration/broker-flow.test.ts`、`tests/cli/cli-contract.test.ts`、`tests/e2e/workflow-host-smoke.test.ts`、`tests/e2e/host-auto-routing-smoke.test.ts`、`tests/e2e/phase2-coarse-boundary-eval.test.ts` 共同证明 `investigation-to-fix` 已经是第二条 broker-owned workflow，而且没有吞掉 website QA maintained lane。
- `CAP-03`: `src/sources/mcp-registry.ts`、`src/broker/explain.ts`、`tests/sources/mcp-registry.test.ts`、`tests/broker/rank.test.ts`、`tests/integration/broker-flow.test.ts`、`README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md` 共同证明 MCP discovery source 已经带 validated registry metadata 与 query coverage evidence，并能进入 broker-facing explanation。

## Automated Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts tests/shared-home/doctor.test.ts tests/integration/broker-flow.test.ts tests/e2e/shared-home-smoke.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/core/maintained-broker-first.test.ts tests/sources/host-skill-catalog.test.ts tests/broker/workflow-runtime.test.ts tests/integration/broker-flow.test.ts tests/cli/cli-contract.test.ts tests/e2e/workflow-host-smoke.test.ts tests/e2e/host-auto-routing-smoke.test.ts tests/e2e/phase2-coarse-boundary-eval.test.ts`
- `node ./node_modules/vitest/vitest.mjs --run tests/sources/mcp-registry.test.ts tests/broker/rank.test.ts tests/integration/broker-flow.test.ts`
- `rg -n "social_post_to_markdown|social markdown|thirdProvenFamily|familyProofs" src/shared-home/doctor.ts src/shared-home/format.ts src/core/operator-truth.ts src/hosts/skill-markdown.ts tests/shared-home/doctor.test.ts tests/integration/broker-flow.test.ts tests/e2e/shared-home-smoke.test.ts tests/shared-home/operator-truth-parity.test.ts tests/hosts/host-shell-install.test.ts README.md README.zh-CN.md TODOS.md STATUS.md`
- `rg -n "investigation|workflow|WORKFLOW_STAGE_READY|resume" config/host-skills.seed.json config/maintained-broker-first-families.json tests/sources/host-skill-catalog.test.ts tests/broker/workflow-runtime.test.ts tests/integration/broker-flow.test.ts tests/cli/cli-contract.test.ts tests/e2e/workflow-host-smoke.test.ts tests/e2e/host-auto-routing-smoke.test.ts`
- `rg -n "registryValidation|registryQueryCoverage|transport|version|remotes|validated MCP|query coverage" src/sources/mcp-registry.ts src/broker/explain.ts tests/sources/mcp-registry.test.ts tests/broker/rank.test.ts tests/integration/broker-flow.test.ts config/mcp-registry.seed.json README.md README.zh-CN.md STATUS.md TODOS.md`

## Must-Haves

- 新增至少一条 proven family，并有 install -> verify -> cross-host reuse 证据: passed
- 除 `idea-to-ship` 外至少一条 broker-owned workflow 成为正式 shipped path，并保持清晰 stage / handoff truth: passed
- MCP discovery source 拿到可验证元数据与解释面: passed
- 新 surface 扩张没有迫使 broker 重写 routing core 或打破 advisory precedence: passed

## Gaps

无。

## Verification Notes

- 07-02 暴露出一个真实回归：如果 workflow 顶层 query metadata 描述的是整个 stage graph，而不是 entry lane，`investigation-to-fix` 会和 `website-qa` 打平后误赢；最终修正证明 catalog truth 本身也是需要被验证的 runtime surface。
- 07-03 的 MCP explainability 没有新增 MCP-only trace 字段，而是复用 candidate `sourceMetadata` + `explainDecision`；这保持了 broker-facing shape 的收敛性，符合本 phase “增强 explainability 但不改 core precedence”的目标。
