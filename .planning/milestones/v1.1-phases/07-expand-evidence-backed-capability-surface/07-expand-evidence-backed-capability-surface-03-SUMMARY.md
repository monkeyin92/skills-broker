---
phase: 07-expand-evidence-backed-capability-surface
plan: 03
subsystem: registry-ready-mcp-explainability
tags: [mcp, registry, explainability, metadata, advisory-precedence]
requires:
  - phase: 07-expand-evidence-backed-capability-surface
    plan: 01
    provides: broader proven-family surface without hierarchy drift
  - phase: 07-expand-evidence-backed-capability-surface
    plan: 02
    provides: second broker-owned workflow and maintained-lane discipline
provides:
  - Validated MCP registry metadata on broker candidates
  - MCP-specific explanation strings with transport and query-coverage evidence
  - Repo/docs truth that now describes MCP discovery as registry-ready but still advisory
affects: [phase-8, release-narrative, doctor-trust-surface]
tech-stack:
  added: []
  patterns: [validated-registry-candidate-shaping, source-metadata-explainability, fail-closed-mcp-fixtures]
key-files:
  created:
    - .planning/phases/07-expand-evidence-backed-capability-surface/07-expand-evidence-backed-capability-surface-03-SUMMARY.md
  modified:
    - src/sources/mcp-registry.ts
    - src/broker/explain.ts
    - tests/sources/mcp-registry.test.ts
    - tests/broker/rank.test.ts
    - tests/integration/broker-flow.test.ts
    - README.md
    - README.zh-CN.md
    - STATUS.md
    - TODOS.md
key-decisions:
  - "MCP registry entry 缺少 `version`、`remotes` 或 usable endpoint 时直接 fail closed，不再把 demo-like entry 当成正常 candidate。"
  - "registry-ready metadata 通过 `sourceMetadata` 挂到 candidate 上，再由 `explainDecision` 复用，而不是为 MCP 单独发明第二套 explain surface。"
  - "registry metadata 只增强 explainability，不改变 host/local/workflow 对 advisory MCP 的既有优先级。"
patterns-established:
  - "discovery source 想升级为 operator-trustable surface，必须同时给出 validation verdict、transport truth、endpoint count 与 query coverage。"
  - "explainability 优先走已有 runtime surface 扩展，不额外制造 MCP-only trace channel。"
requirements-completed: [CAP-03]
duration: 1 session
completed: 2026-04-23
---

# Phase 7 Plan 03 Summary

**MCP discovery 现在已经不是只靠 `name/title/description` 做模糊匹配的 demo seed 了；candidate 会带 validated 的 registry metadata、query coverage 和 transport evidence，broker explanation 也能直接说清“为什么是这个 MCP”，同时仍然保持 advisory precedence。**

## Accomplishments

- `src/sources/mcp-registry.ts` 现在会对 MCP registry entry 做 fail-closed 校验：没有 `version`、没有 `remotes`、或者 remote 没有 usable endpoint 的 entry 直接被过滤掉，不再进入正常候选集。
- MCP candidate 的 `sourceMetadata` 现在会携带 `registryVersion`、`registryTransport`、`registryTransportTypes`、`registryEndpointCount`、`registryValidation`、`registryQueryCoverage`，把 registry-ready truth 直接挂到 broker 已有的 candidate shape 上。
- `src/broker/explain.ts` 现在会在 MCP winner 上输出 registry evidence，包括 validated 状态、transport、endpoint count 和 query coverage，而不是继续给出“generic skill-style explanation”。
- `tests/sources/mcp-registry.test.ts`、`tests/broker/rank.test.ts`、`tests/integration/broker-flow.test.ts` 共同锁住了 source validation、explainability 和 end-to-end broker survival proof；integration 里的 MCP fixture 也一起升级成了合法 registry shape。
- `README.md`、`README.zh-CN.md`、`STATUS.md`、`TODOS.md` 已同步承认 MCP discovery source 现在是 registry-ready metadata source，但它依然是 advisory source，不会压过 installed/local winners。

## Verification

- `node ./node_modules/vitest/vitest.mjs --run tests/sources/mcp-registry.test.ts tests/broker/rank.test.ts tests/integration/broker-flow.test.ts`
- `rg -n "registryValidation|registryQueryCoverage|transport|version|remotes|validated MCP|query coverage" src/sources/mcp-registry.ts src/broker/explain.ts tests/sources/mcp-registry.test.ts tests/broker/rank.test.ts tests/integration/broker-flow.test.ts config/mcp-registry.seed.json README.md README.zh-CN.md STATUS.md TODOS.md`

## Deviations

- `config/mcp-registry.seed.json` 本身已经具备 registry-ready 的 `version` + `remotes` 结构，所以这次没有为了“命中文件列表”而硬改 seed 内容；修正重点落在 runtime parser、tests 和 explainability。
- query coverage 没有新建 trace field，而是先挂进 candidate `sourceMetadata` 并复用 `explainDecision`，保持 runtime surface 收敛。

## Next Readiness

- Phase 8 现在可以把 CI trust guardrails 接到更真实的 surface：hero lane、three proven families、second broker-owned workflow、registry-ready MCP explainability。
- 后续如果接 live registry，这次的 validation / explainability shape 可以直接作为更强 source 的 contract，而不用再改 broker-facing candidate model。
