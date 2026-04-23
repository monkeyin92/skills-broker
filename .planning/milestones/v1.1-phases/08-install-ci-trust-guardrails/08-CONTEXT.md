# Phase 8: Install CI Trust Guardrails - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 已经把三宿主 full lifecycle parity、三条 proven family、两条 broker-owned workflow，以及 registry-ready MCP explainability 都做成了 repo/native runtime truth。这个 phase 的边界不再是“还能扩什么能力”，而是把这些已经存在的 truth 接进 CI，让 ship 前的关键回归不再只靠 phase 末尾人工 spot-check。

</domain>

<decisions>
## Implementation Decisions

### QUAL-01: Blind-Spot Reporting
- **D-01:** blind-spot report 必须直接基于 repo 当前产品 inventory 生成，而不是手写一份很快过期的静态 checklist；支持宿主、maintained family、proven family、broker-owned workflow 至少要从现有 typed config / source 里动态读出来。
- **D-02:** 质量门要检查的是“关键 surface 有没有对应 proof / parity / CI hook”，不是把 CI 变成真实宿主环境仿真器；因此这份 report 应该验证 coverage budget、proof layer 与 CI wiring，而不是尝试在 GitHub runner 上复刻三宿主本地安装。
- **D-03:** 新增宿主、新增 family、新增 workflow 时，CI 必须 fail closed 暴露 blind spot；不能因为 report 是静态白名单而自动放过新增 surface。

### QUAL-02: Narrative Parity Gate
- **D-04:** README、README.zh-CN、STATUS、TODOS、installed shell 的 narrative truth 不能只“顺便被 npm test 覆盖”；它需要一条显式、易读、快速失败的 CI gate。
- **D-05:** narrative parity gate 不能再造一套新的 operator truth；它应该继续复用 `src/core/operator-truth.ts`、现有 parity tests 和 installed-shell contract。
- **D-06:** CI wiring 本身也要被 repo-native tests 守住，否则 workflow 改掉之后 gate 可能直接消失；至少要有测试显式断言 `.github/workflows/ci.yml` 仍然运行 trust-report 与 narrative parity commands。

### the agent's Discretion
- blind-spot report 采用单独脚本还是扩现有 local verification，由 the agent 决定；前提是 `verify:local` 与 CI trust gate 的职责边界要更清楚，而不是更混。
- coverage budget 的 layer 命名、报告文本与 JSON shape 由 the agent 设计；前提是能清晰指出哪一类 surface 缺 proof。
- CI 采用单独 `trust` job 还是并入现有 job，由 the agent 决定；前提是 logs 足够显式，而且 narrative/proof drift 能在 CI 中 fail closed。

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci.yml` 已经在跑 `npm ci`、`npm run build`、`npm test`，并且在 `status` job 里运行 `doctor --strict`；说明 CI 已有基础，只缺 focused trust gates 和可读的 blind-spot 输出。
- `src/dev/local-verification.ts` 已经把“本地环境是否健康到足以跑 build/test”抽成了独立 CLI；这给 Phase 8 一个明确边界：CI trust gate 不该复用成同一套 operator experience。
- `tests/shared-home/operator-truth-parity.test.ts` 已经覆盖 README / README.zh-CN / TODOS / STATUS 的 canonical wording；`tests/hosts/host-shell-install.test.ts` 已经覆盖 installed shell truth。
- `src/core/types.ts`、`src/core/maintained-broker-first.ts`、`src/sources/host-skill-catalog.ts` 提供了动态 inventory 来源，可用于生成 blind-spot budget。
- `tests/shared-home/status.test.ts`、`tests/cli/lifecycle-cli.test.ts`、`tests/e2e/status-doctor-git.test.ts` 已经证明 repo-scoped status / strict doctor 是 CI-friendly proof surface。

### Established Patterns
- repo-facing verification CLI 通常放在 `src/dev/*.ts` + `scripts/*.mjs`，并通过 `node --import ./scripts/register-ts-node.mjs ...` 暴露给 npm scripts。
- operator truth 必须由 typed contract 驱动，再由 docs、tests、installed shell 复用；不能让每个 surface 自己维护一份 copy。
- CI contract 如果重要，应该由 repo 内 tests 反向检查 workflow wiring，避免 workflow 文件悄悄漂移导致 gate 消失。

### Integration Points
- blind-spot report: `src/dev/local-verification.ts`, `src/core/types.ts`, `src/core/maintained-broker-first.ts`, `src/sources/host-skill-catalog.ts`, `.github/workflows/ci.yml`, `package.json`
- narrative parity gate: `tests/shared-home/operator-truth-parity.test.ts`, `tests/hosts/host-shell-install.test.ts`, `.github/workflows/ci.yml`, `README.md`, `README.zh-CN.md`, `STATUS.md`, `TODOS.md`
- repo proof/strict CI surface: `src/shared-home/status.ts`, `src/bin/skills-broker.ts`, `tests/shared-home/status.test.ts`, `tests/cli/lifecycle-cli.test.ts`, `tests/e2e/status-doctor-git.test.ts`

</code_context>

<specifics>
## Specific Ideas

- “Budget the truth you already claim.” 既然 repo 已经公开声称支持三宿主、三条 proven family、两条 workflow，就让 CI 动态读取这些 surface 并要求对应 proof layer。
- “Fast-fail narrative drift.” docs 与 installed shell 的 truth 需要一条 focused suite，避免 bury 在全量 `npm test` 输出里。
- “Keep `verify:local` local.” 本地 verify 继续回答“我的 Node/npm/vitest 环境能不能跑”，CI guardrails 回答“repo 真相是不是还和产品声明一致”。

</specifics>

<deferred>
## Deferred Ideas

- 用 GitHub summary / artifact 渲染更花的 HTML/Markdown 报告
- 直接把 CI 结果反馈进发布流水线与 ship 命令
- 真实联网宿主 / registry smoke

</deferred>

---
*Phase: 08-install-ci-trust-guardrails*
*Context gathered: 2026-04-23*
