# Phase 3: Harden Runtime And Verification - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

在不改变 `skills-broker` 当前产品叙事与 routing behavior 的前提下，降低 shared-home、host runner 与本地验证链路的高 blast radius 风险。这个 phase 只硬化 awkward path safety、rollback / repair / proof-rail / advisory persistence 等失败路径，以及 contributor verification reliability；不新增 capability family、不扩宿主矩阵，也不把这一 phase 变成大规模架构重写。

</domain>

<decisions>
## Implementation Decisions

### Runner path handling
- **D-01:** Phase 3 优先把 generated runner 的 broker-home / runtime path 解析改成 runtime-derived 或 manifest-derived 方案，而不是继续把原始绝对路径直接插进 shell source 里。
- **D-02:** 即使仍保留少量嵌入式路径，所有 shell path interpolation 也必须集中 escape，并且用 spaces、quotes、`$`、command-substitution 风格字符的安装路径测试锁住 Claude Code、Codex 和 shared-home 三条安装链路。

### Failure exposure and proof integrity
- **D-03:** routing 成功但 advisory persistence 失败（trace、acquisition memory、verified downstream manifest）仍然允许主流程继续，但必须暴露成结构化 degraded signal，不能再 silent swallow。
- **D-04:** proof rail unreadable、repair/rollback failure、manual recovery blocker 继续保持 fail-closed；strict doctor、adoption health 和 operator-facing truth 宁可报阻塞，也不能继续“看起来是绿的”。

### Hardening strategy
- **D-05:** Phase 3 先关闭 highest-blast-radius 的 skipped rollback / recovery branches，并补上 shared-home update / doctor / lifecycle strict-path 的 targeted regression coverage，而不是把整个 phase 扩成全面模块拆分。
- **D-06:** 可以做最小必要的 seam extraction 来让 awkward-path、rollback 和 degraded outcome 变得可测试，但“大文件太大所以系统性重构”不是本 phase 的完成标准。

### Contributor verification reliability
- **D-07:** 本地验证链路需要一个 deterministic preflight/repair path，在测试真正启动前就能识别 Node/npm/Rollup/Vitest dependency health，并输出明确修复步骤。
- **D-08:** 贡献者 guidance 要和 CI baseline 对齐：Node 22 + `npm ci` 是 canonical path；当前已知的 Rollup optional native dependency 失效要被 codify 成明确诊断与修复文案，而不是继续依赖口口相传。

### the agent's Discretion
- 具体把 runtime-derived path 落在 runner 自解析、sidecar manifest 还是 ownership metadata 复用上，由 the agent 根据现有 install architecture 选择最小改动方案。
- degraded signal 的具体承载方式（trace field、CLI warning、doctor surface、typed result code 扩展）由 the agent 选择，只要满足 operator 可见且不会误绿。
- preflight 是做成单独脚本、CLI 子路径、还是 npm script wrapper，由 the agent 决定，只要 contributor 能在失败时拿到 deterministic repair steps。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and active requirements
- `.planning/PROJECT.md` — brownfield 产品边界、thin-host contract、shared-home 价值与 sequencing
- `.planning/REQUIREMENTS.md` — Phase 3 对应的 `HARD-01`、`HARD-02`、`HARD-04`
- `.planning/ROADMAP.md` — Phase 3 goal、success criteria 与 phase sequencing
- `.planning/STATE.md` — 当前 active phase、session history 与 workflow settings

### Prior decisions that must not regress
- `.planning/phases/01-prove-the-qa-hero-loop/01-CONTEXT.md` — website QA hero lane、verdict-first doctor、fail-closed proof rails
- `.planning/phases/01-prove-the-qa-hero-loop/01-VERIFICATION.md` — Phase 1 的 default-entry proof bar
- `.planning/phases/02-generalize-family-proofs/02-CONTEXT.md` — `familyProofs` canonical surface、web markdown second proven family、deterministic semantic boundary
- `.planning/phases/02-generalize-family-proofs/02-VERIFICATION.md` — Phase 2 的 operator truth 与 family-proof verification

### Codebase risk maps
- `.planning/codebase/ARCHITECTURE.md` — thin-host + shared-home + centralized broker runtime 的系统边界
- `.planning/codebase/CONCERNS.md` — awkward path injection risk、silent advisory failures、rollback gap、local test fragility 的现状
- `.planning/codebase/TESTING.md` — 当前 test topology、CI path、无 coverage gate 的现状
- `.planning/codebase/CONVENTIONS.md` — CLI entrypoint、module boundary、error handling 与 JSON contract 约定
- `.planning/codebase/STACK.md` — Node 22/npm/ts/vitest baseline，以及 publish/CI/runtime 工具链
- `.planning/codebase/STRUCTURE.md` — 相关模块与测试所在目录，便于 planner 锁定 write scope

### Runtime and lifecycle surfaces
- `src/shared-home/install.ts` — shared-home install layout 与 generated runner 写入
- `src/shared-home/update.ts` — shared-home update、repair、rollback、peer-surface mutation orchestration
- `src/shared-home/doctor.ts` — proof rails、adoption health、strict doctor truth
- `src/shared-home/status.ts` — repo status proof 与 strict shipped-local/shipped-remote evaluation
- `src/hosts/claude-code/install.ts` — Claude Code runner/script generation
- `src/hosts/codex/install.ts` — Codex runner/script generation
- `src/bin/skills-broker.ts` — lifecycle CLI strict-path、exit code 与 text/json output boundary
- `src/broker/run.ts` — advisory persistence、degraded failure swallowing 与 routing trace writes
- `src/broker/trace-store.ts` — routing trace persistence contract
- `src/broker/acquisition-memory.ts` — acquisition memory persistence contract
- `src/broker/downstream-manifest-source.ts` — verified downstream manifest persistence/read contract
- `tests/helpers/npm.ts` — 当前 npm CLI path 解析与本地验证入口的脆弱点

### Existing hardening and smoke coverage
- `tests/shared-home/update-lifecycle.test.ts` — update/repair/rollback lifecycle coverage，含目前 skipped 的高风险 branch
- `tests/shared-home/doctor.test.ts` — proof rail unreadable、doctor truth、strict gate coverage
- `tests/cli/lifecycle-cli.test.ts` — lifecycle CLI build/run/strict-path coverage
- `tests/e2e/shared-home-smoke.test.ts` — installed shared-home / host-shell smoke coverage
- `tests/hosts/host-shell-install.test.ts` — generated host-shell wording/layout regression
- `.github/workflows/ci.yml` — canonical CI build/test/strict doctor baseline

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared-home/install.ts`, `src/hosts/claude-code/install.ts`, `src/hosts/codex/install.ts`: 已经集中生成 runner/script，是 awkward-path hardening 的主切点。
- `src/shared-home/update.ts`, `src/shared-home/doctor.ts`, `src/bin/skills-broker.ts`: 已有 lifecycle strict-path 与 operator truth surface，可以直接承接 degraded signal 与 repair/rollback hardening。
- `tests/shared-home/update-lifecycle.test.ts`, `tests/shared-home/doctor.test.ts`, `tests/cli/lifecycle-cli.test.ts`: 已经覆盖大量 happy/degraded 路径，是补 Phase 3 regression bar 的最佳现成基础。
- `tests/helpers/npm.ts`: 当前本地验证入口依赖 npm CLI 推导逻辑，是 contributor verification fragility 的直接切点。

### Established Patterns
- 代码库偏向真实文件系统 / temp dir / child-process 测试，而不是重 mock；Phase 3 应延续这一模式去验证 awkward path 与 degraded outcomes。
- CLI entrypoint 保持 thin，具体业务逻辑下沉到 `src/shared-home/*` 与 `src/broker/*`；新的 hardening 也应沿这个边界落地。
- `doctor` 与 strict gate 的产品语义已经是 fail-closed；Phase 3 只能强化这点，不能为了“少报错”而弱化 truth。
- 当前没有 coverage gate，且本地验证依赖健康没有 deterministic 预检；这正是 Phase 3 的一部分，而不是规划外噪音。

### Integration Points
- Runner path hardening: `src/shared-home/install.ts`, `src/hosts/claude-code/install.ts`, `src/hosts/codex/install.ts`, `tests/e2e/shared-home-smoke.test.ts`
- Degraded outcome / advisory persistence: `src/broker/run.ts`, `src/broker/trace-store.ts`, `src/broker/acquisition-memory.ts`, `src/broker/downstream-manifest-source.ts`, `src/shared-home/doctor.ts`
- Rollback / repair hardening: `src/shared-home/update.ts`, `src/shared-home/peer-surface-audit.ts`, `tests/shared-home/update-lifecycle.test.ts`
- Contributor verification reliability: `package.json`, `tests/helpers/npm.ts`, `.github/workflows/ci.yml`, lifecycle / smoke test commands

</code_context>

<specifics>
## Specific Ideas

- “No silent greens.” routing 可以成功，但如果 proof/reuse state 丢了，operator 必须看得见，不允许再靠沉默维持假绿。
- “Bad-path proof beats broad refactor.” 先把 awkward path、rollback、repair 和 dependency-health 的真实坏路径证明清楚，再决定是否值得做更大模块拆分。
- “CI truth should be locally reachable.” 贡献者要么能跑出和 CI 一致的验证链路，要么在第一步就拿到明确修复指引。
- “Phase 3 hardens runtime contracts, not product scope.” website QA hero lane、web markdown second proven family、thin-host boundary 都是本 phase 的保护对象，不是讨论对象。

</specifics>

<deferred>
## Deferred Ideas

- 面向可维护性的系统性大模块拆分，如果 targeted seam extraction 仍不足以降低 blast radius，可在后续独立 hardening work 里展开
- coverage budget / blind-spot reporting 的 CI 级治理 — 更接近 v2 `QUAL-01`
- narrative docs parity automation — 更接近 Phase 4 `HARD-03`
- 第三个 thin host shell（OpenCode）与更广 capability growth — 仍留在后续 phase

</deferred>

---
*Phase: 03-harden-runtime-and-verification*
*Context gathered: 2026-04-22*
