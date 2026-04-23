# Phase 3: Harden Runtime And Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22T17:05:00+08:00
**Phase:** 03-harden-runtime-and-verification
**Areas discussed:** Runner path handling, Failure exposure, Hardening strategy, Contributor verification reliability

---

## Runner path handling

| Option | Description | Selected |
|--------|-------------|----------|
| Runtime-derived path resolution | Runner 在执行时从脚本位置或 manifest 推导 broker-home/runtime 路径，避免把原始绝对路径直接拼进 shell source | ✓ |
| Centralized shell escaping only | 继续嵌入绝对路径，但统一做 shell escaping 与 quoting hardening | |
| Keep current behavior | 维持现状，只补普通路径 smoke | |

**User's choice:** Auto-selected recommended default via `$gsd-next`: runtime-derived path resolution
**Notes:** 这条路最符合 `HARD-01`，也最能降低 spaces、quotes、`$` 等 awkward path 带来的 script fragility；escaping 仍可作为补充保护，但不应是主策略。

---

## Failure exposure

| Option | Description | Selected |
|--------|-------------|----------|
| Structured degraded outcomes/warnings | routing 可继续成功，但 advisory persistence failure 必须暴露成 operator 可见信号 | ✓ |
| Silent best-effort persistence | 继续吞掉 advisory persistence failure，只在后续 doctor 里间接暴露 | |
| Hard-fail every persistence miss | 任何 trace/memory/manifest 写失败都直接阻断主 routing | |

**User's choice:** Auto-selected recommended default via `$gsd-next`: structured degraded outcomes/warnings
**Notes:** 既不破坏当前主路由的成功率，也不再允许 proof/reuse truth silently disappear；strict path 和 doctor 仍保持 fail-closed。

---

## Hardening strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted high-blast-radius hardening first | 先补 awkward path、rollback、repair、proof-rail、strict-path 这些最危险分支的 tests 和最小 seam extraction | ✓ |
| Broad lifecycle refactor first | 先大规模拆分 `run.ts` / `update.ts` / `doctor.ts`，再补 hardening | |
| Docs-only debt recording | 先把问题写进 docs/backlog，暂不补行为与测试 | |

**User's choice:** Auto-selected recommended default via `$gsd-next`: targeted high-blast-radius hardening first
**Notes:** 当前 phase 的 success criteria 明确要求真实可验证的 runtime hardening；全面重构风险高、回报慢，不适合作为当前默认路线。

---

## Contributor verification reliability

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic preflight + repair guidance | 在主测试前检查 Node/npm/Rollup/Vitest 健康，并给出明确修复路径 | ✓ |
| Keep current README guidance only | 继续依赖现有 README / 口头经验解决本地工具链问题 | |
| CI-only truth | 本地不保证稳定，默认让贡献者只相信 CI 结果 | |

**User's choice:** Auto-selected recommended default via `$gsd-next`: deterministic preflight + repair guidance
**Notes:** 这条路直接对应 `HARD-04`，也和当前已观察到的 Rollup optional native dependency fragility 完全对齐。

---

## the agent's Discretion

- runtime-derived path resolution 的具体实现位置
- degraded signal 的具体载体
- verification preflight 的脚本/CLI 形态

## Deferred Ideas

- 更大规模的 lifecycle/runtime 模块拆分
- coverage budget / blind-spot reporting
- bilingual/operator docs parity automation
- 第三个 thin host shell 扩展
