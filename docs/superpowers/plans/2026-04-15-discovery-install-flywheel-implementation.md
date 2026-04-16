<!-- /autoplan restore point: /Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/main-autoplan-restore-20260415-213734.md -->
# Discovery/Install Flywheel Implementation Plan

Generated for `/autoplan` on 2026-04-15
Branch: `main`
Status: DRAFT

## Problem Statement

`skills-broker` 已经能把 discovery/install 请求识别进 `capability_discovery_or_install` 这条 lane，也已经有 shared home、cross-host cache reuse、package/leaf 两层 identity、package availability probe、routing trace、doctor 汇总。

但它现在还没有真正形成 acquisition loop。

今天真实存在的是：

- query compiler 能把显式找能力/装能力的请求编译进 discovery lane，见 [src/broker/query-compiler.ts](/Users/monkeyin/projects/skills-broker/src/broker/query-compiler.ts:531)
- retrieval 能从 host catalog 和 MCP registry 找 candidate，并按 leaf capability 去重，见 [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:321) 和 [src/broker/discover.ts](/Users/monkeyin/projects/skills-broker/src/broker/discover.ts:3)
- availability probe 能把 `available` 升级成真实 `installed`，但前提是本地已经有 manifest，不会帮你完成安装，见 [src/broker/package-availability.ts](/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts:118)
- 当最佳 leaf 所属 package 未安装时，broker 只会返回 `NO_CANDIDATE` + `offer_capability_discovery`，见 [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:197)
- `PackageAcquisitionHint` 现在只有 `reason + package + leafCapability`，没有 install method、verify contract、post-install memory semantics，见 [src/core/types.ts](/Users/monkeyin/projects/skills-broker/src/core/types.ts:167)
- shared-home `doctor` 目前只汇总 hit / misroute / fallback，没有 acquisition conversion / post-install reuse 指标，见 [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:20) 和 [src/broker/trace.ts](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts:12)

更麻烦的是，catalog 里已经有一个名义上的 `capability-discovery` broker-native candidate，但它目前还不是一条真实闭环 workflow，只是一个 broker-native placeholder handoff，见 [config/host-skills.seed.json](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json:105)。

所以当前状态不是“没有 discovery/install”，而是：

- broker 能发现增长机会
- broker 还不能把增长机会稳稳变成下一次更容易命中的能力记忆

这就是这次要补的东西。

## What Makes This Cool

这件事一旦做对，`skills-broker` 的价值就不再只是“帮用户选当前机器上已经有的能力”。

它会开始变成：

- 用户说任务
- broker 找到最接近的 package + leaf
- broker 给出可信 install path
- 安装后 broker 验证并记住
- 下次 Claude Code 和 Codex 都直接复用这次结果

从产品上看，这就是 moat 开始长出来的地方。

不是 marketplace。不是 catalog UI。是 capability surface 会自己变厚，而且厚度可以跨 host 继承。

## Constraints

- 不重开 query-native 或 package-vs-leaf migration。那两条尾巴刚收完，这一包不能把旧债再拉回来。
- 不先接 OpenCode。第三宿主是 P2，不是这次的关键路径。
- 不扩更多 lane。飞轮要服务已有 lane 的 acquisition，不是借机把任务面继续摊大。
- 不承诺“任意第三方自动安装”。当前 repo 没有安全、权限、供应链、交互确认这些前提，这会把湖煮成海。
- 继续保持 host thin shell。安装、记忆、验证语义都放 broker/shared-home，不放回 Claude Code 或 Codex adapter。
- operator truth 仍然要通过 shared-home lifecycle、doctor、trace、repo docs 读出来，而不是藏在 prompt 里。

## Premises

1. 当前最大未完成价值，不是再接一个新宿主，而是让 acquisition loop 开始复利。
2. 第一版 flywheel 应该先解决“发现 -> install plan -> verify -> reuse memory”，而不是直接做任意外部自动安装。
3. retrieval 仍然发生在 leaf capability 层，install / lifecycle / persistence 仍然发生在 package 层。
4. `NO_CANDIDATE` 不该只是死路，它应该成为 growth event，并且能被后续 trace / doctor 看见。
5. shared home 才是 flywheel 的落点。没有 shared home persistence，就没有 cross-host compounding。
6. catalog 里现有的 `capability-discovery` placeholder 要么被做成真实 contract，要么就会持续制造“看起来有这个能力，其实没有完整闭环”的产品债。

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Discovery/install requests route into the broker
  Candidates come from host catalog + MCP registry
  Package availability can be probed from local manifests
  Uninstalled winners downgrade to NO_CANDIDATE + install hint
  Success memory only really compounds on already-installed winners

THIS PLAN
  Add stronger acquisition-oriented discovery sources
  Return a structured install plan instead of a thin install hint
  Verify post-install readiness explicitly
  Persist acquisition success and reuse it across hosts
  Expose acquisition conversion in doctor / traces / docs

12-MONTH IDEAL
  Broker misses become install wins, not dead ends
  Shared home remembers what package solved which family
  Claude Code and Codex inherit the same acquisition memory
  Capability surface compounds without users memorizing package names
  Discovery/install becomes a real flywheel, not a fallback sentence
```

## Approaches Considered

### Approach A: Package-aware acquisition contract on top of existing NO_CANDIDATE flow

Summary: 保持现有 broker outcome shape，不强行引入新宿主或大 workflow 重写。把 `package_not_installed` 这条路径从一个薄 hint 扩成真正的 install-plan + verification + persistence loop。

Effort: L
Risk: Medium
Pros:

- 正对当前 backlog 的三块依赖：discovery sources、install flow、post-install persistence
- 最大复用现有 `runBroker -> hydratePackageAvailability -> rank -> NO_CANDIDATE/acquisition` 骨架
- 不要求这次就解决 arbitrary remote install 的安全问题
- 最容易保持 thin host shells

Cons:

- 用户体验第一版仍然需要 operator 或 host 执行安装动作，不是全自动
- `capability-discovery` placeholder 仍需要重新定义，不然叙事会重复
- acquisition 仍然是显式结构化返回，不是完整 broker-native stage machine

Reuses:

- [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:321)
- [src/broker/package-availability.ts](/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts:118)
- [src/broker/rank.ts](/Users/monkeyin/projects/skills-broker/src/broker/rank.ts:72)
- [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:20)
- [src/broker/workflow-runtime.ts](/Users/monkeyin/projects/skills-broker/src/broker/workflow-runtime.ts:293)

### Approach B: 把 capability-discovery 直接做成完整 broker-owned acquisition workflow

Summary: 让 discovery/install 从入口就进入 broker-owned workflow，阶段化地做 recommendation、install、verify、handoff、memory write。

Effort: XL
Risk: High
Pros:

- 叙事完整，产品感更强
- 更接近最终“broker manages acquisition”理想形态
- 可以直接复用现有 workflow resume / block / artifact 语义

Cons:

- 当前 workflow stage type 只有 `capability` 和 `host_native`，没有 broker-native acquisition stage，会牵动 runtime contract
- 需要同时定义 install 执行权、artifact contract、resume UX、host cooperation
- 很容易把这次湖煮成海

Reuses:

- [src/core/workflow.ts](/Users/monkeyin/projects/skills-broker/src/core/workflow.ts:22)
- [src/broker/workflow-runtime.ts](/Users/monkeyin/projects/skills-broker/src/broker/workflow-runtime.ts:346)
- [config/host-skills.seed.json](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json:242)

### Approach C: 先接 OpenCode 或先扩更多 lane，再回头补 acquisition

Summary: 先做对外更显眼的 surface，再把 flywheel 留到后面。

Effort: M
Risk: High
Pros:

- 展示面强
- 看起来更像“项目持续在长”

Cons:

- 直接绕过当前 backlog 的最高优先级
- 新宿主和新 lane 都会复刻 acquisition 缺口
- 会让 shared-home 的 compounding 叙事继续停留在口号

## Recommended Approach

Approach A。

这次应该先把 acquisition contract 做实，而不是假装已经准备好做一个全自动 workflow 操作系统。

最合理的第一版是：

- 强化 discovery source
- 把 install hint 提升成结构化 install plan
- 明确 post-install verify 和 persistence contract
- 让 `doctor` 看得到 acquisition conversion

先把这四件事做真。之后如果要把 capability-discovery 收进完整 workflow，已经是顺水推舟，而不是再返工核心 contract。

## Success Criteria

- 显式 discovery/install 请求仍然 broker-first，不掉回 host native path。
- 对于未安装但强匹配的 candidate，broker 返回的不是模糊建议，而是结构化 install plan。
- 安装完成后，broker 能显式验证 package + leaf readiness，而不是只看目录名。
- 同一类请求在后续 Claude Code / Codex 会话里可以复用 acquisition memory，而不是再次从零 discovery。
- `doctor` 或 trace summary 能回答两个问题：
  - 最近有多少 `NO_CANDIDATE` / `package_not_installed` 最终转成可复用命中
  - 哪些 package/leaf 正在成为稳定赢家
- README / TODOS / STATUS 对当前 phase 的说法保持一致，不再把 placeholder 说成完整能力。

## Non-goals

- 任意 npm / pip / git remote 自动安装
- marketplace UI
- OpenCode host shell
- 新 task family 扩张
- 重写 workflow runtime
- 删除现有 decline contract

## Implementation Slices

### Slice 0: Acquisition Contract Alignment

目标: 先把“安装提示”升级成真正的 contract，并把“真没候选”和“匹配到了但未安装”这两种事件拆开。

- 扩展 [src/core/types.ts](/Users/monkeyin/projects/skills-broker/src/core/types.ts:124)，让 `CapabilityPackageRef` / `PackageAcquisitionHint` / broker decline shape 能表达：
  - acquisition source/type
  - install surface 或 install method
  - verification requirements
  - post-install persistence clue
  - acquisition outcome kind / subreason
- 对齐 [src/core/capability-card.ts](/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts:217) 的默认 package metadata，避免不同 source 对 install 语义说不同的话。
- 重新定义 catalog 里的 `capability-discovery` entry，决定它在第一版里到底是：
  - 显式 discovery helper leaf
  - 还是需要延后到真正 workflow 才启用
- 把 [src/broker/result.ts](/Users/monkeyin/projects/skills-broker/src/broker/result.ts:104) 与 [src/broker/trace.ts](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts:163) 一起纳入 contract 对齐范围，避免 host/doctor 继续把两类 miss 混成一个 `NO_CANDIDATE` 事件。

完成定义:

- `package_not_installed` 不再只带一个薄 hint，而是带一个可以直接驱动 UX 的 install plan contract。
- 真正没有候选的 miss 和“有候选但需要安装”的 miss，在 trace / metrics / decline payload 上有诚实区分。

### Slice 1: Stronger Discovery Sources

目标: 让 acquisition retrieval 不只依赖“当前 seed + 当前 MCP response”。

- 在现有 host catalog + MCP registry 之前或之中，引入 acquisition-oriented source：
  - shared-home acquisition memory
  - 最近成功安装并复用过的 package/leaf 对
  - broker-managed downstream root 的 verified manifests
- 保持 leaf-level retrieval，不把 ranking 退化成“先猜 package，再猜 subskill”。
- 在 [src/broker/discover.ts](/Users/monkeyin/projects/skills-broker/src/broker/discover.ts:3) 和 [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:321) 里明确 source precedence 和 dedupe semantics。

完成定义:

- retrieval 能把“以前装过且后来有效”的能力当成第一等信号，而不只是 seed fixture。

### Slice 2: Install Flow Refinement

目标: 把 miss 变成可以执行的安装决策，而不是一句 host 文案。

- 在 [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:697) 扩充 `createPackageInstallRequiredResult`，返回结构化 install plan。
- 对齐 [src/broker/rank.ts](/Users/monkeyin/projects/skills-broker/src/broker/rank.ts:72)，让显式 acquisition query 更稳定地区分：
  - query-specific uninstalled winner
  - generic capability-discovery fallback
- 把 [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:185) 、adapter 序列化 contract、CLI 输出一起纳入同一个 slice，允许 host 在不变厚的前提下，用同一个 structured result 提示安装、继续、或恢复。
- 对齐 [src/broker/workflow-runtime.ts](/Users/monkeyin/projects/skills-broker/src/broker/workflow-runtime.ts:293) 的 `install_required` block，避免 workflow path 和 one-shot broker path 生成两套 install contract。
- 在 [src/core/types.ts](/Users/monkeyin/projects/skills-broker/src/core/types.ts:96) 明确 install-specific host action 或等价 first-class outcome/subreason，不再要求 adapter 读 payload 猜“下一步是安装，不是 discovery”。
- decline 外壳可以保持兼容，但必须新增明确 acquisition subreason：
  - `NO_CANDIDATE` 只保留“没有匹配候选”这一层 truth，或者至少通过显式子类型与 install-required 分开
  - hostAction 仍可维持 `offer_capability_discovery`，但 host/CLI 看到的 payload 不能再是旧的扁平文案

完成定义:

- 用户能看到“该装哪个 package、为什么、怎么验证、装完后下一步是什么”。
- host、CLI、workflow blocked stage 看到的是同一份 install contract，而不是三套近似文案。

### Slice 3: Post-install Verification And Memory

目标: 安装完成后要真的被 broker 记住。

- 新增 shared-home acquisition memory store，记录：
  - schema version
  - canonical key
  - request query identity / family
  - package id
  - leaf capability id
  - host
  - verification provenance
  - produced artifacts
  - confidence / decay / ttl
  - installed_at / verified_at
  - first_reuse_at
- 在 [src/broker/package-availability.ts](/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts:118) 的 verified manifest basis 上，明确“什么时候算安装成功”。
- 在 [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:379) 附近把 acquisition success 写入 shared home，而不是只写 winner cache。
- 明确 fail-open 语义：如果 memory 丢了、坏了、旧 schema 读不动了，broker 仍然回退到 catalog + probe，不会坏。
- 显式定义并发写、去重、卸载后 stale entry、schema migration 语义，不让 acquisition memory 变成新的 trust bypass。
- 补一个范围受限的 reset / migrate 口，只清 acquisition memory，不逼用户整套 `remove --purge`。

完成定义:

- 这次安装过的能力会在下一次同类请求里成为更强信号，而且这种信号可以跨 host 复用。
- 这种复用永远只是 advisory ranking signal，不会绕过 manifest-based verification。

### Slice 4: Operator Proof And DX Closure

目标: operator 和开发者都能看见飞轮是否真的在转。

- 扩展 [src/broker/trace.ts](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts:1) 与 [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:20)，补 acquisition metrics：
  - true no-candidate count
  - candidate-matched-but-uninstalled count
  - install plan issued count
  - verified post-install successes
  - first reuse after install
- 扩展 [src/shared-home/format.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts:42) 与 CLI contract tests，确保 text/json/operator 输出也说真话。
- 在 metrics / README / TODOS / STATUS 之前，先跑通至少一条 `published_package` 和一条 `mcp_bundle` 的真实 install -> verify -> reuse 链路，再让 product phase 叙事跟 runtime truth 对齐。
- 明确 DX bar：
  - supported-host truth 不模糊
  - install-required failure 给出 problem + cause + fix
  - operator 能在一个命令里看到 flywheel 是否在产生复用

完成定义:

- 不打开代码也能回答“这个 acquisition loop 到底有没有把 miss 变成复用”。

## Concrete File Targets

- [src/core/types.ts](/Users/monkeyin/projects/skills-broker/src/core/types.ts:124)
- [src/core/capability-card.ts](/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts:217)
- [src/broker/result.ts](/Users/monkeyin/projects/skills-broker/src/broker/result.ts:1)
- [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:321)
- [src/broker/discover.ts](/Users/monkeyin/projects/skills-broker/src/broker/discover.ts:3)
- [src/broker/rank.ts](/Users/monkeyin/projects/skills-broker/src/broker/rank.ts:72)
- [src/broker/workflow-runtime.ts](/Users/monkeyin/projects/skills-broker/src/broker/workflow-runtime.ts:293)
- [src/broker/package-availability.ts](/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts:118)
- [src/broker/trace.ts](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts:1)
- [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:185)
- [src/cli.ts](/Users/monkeyin/projects/skills-broker/src/cli.ts:1)
- [src/bin/skills-broker.ts](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts:12)
- [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:20)
- [src/shared-home/format.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts:42)
- [config/host-skills.seed.json](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json:105)
- [config/mcp-registry.seed.json](/Users/monkeyin/projects/skills-broker/config/mcp-registry.seed.json:47)

## Required Proof

- `tests/broker/discover.test.ts`
- `tests/broker/rank.test.ts`
- `tests/broker/package-availability.test.ts`
- `tests/integration/broker-flow.test.ts`
- `tests/shared-home/doctor.test.ts`
- `tests/cli/cli-contract.test.ts`
- `tests/hosts/host-decline-contract.test.ts`
- `tests/broker/workflow-runtime.test.ts`
- `tests/e2e/shared-home-smoke.test.ts`
- `tests/e2e/host-auto-routing-smoke.test.ts`

Likely new tests:

- `tests/broker/acquisition-memory.test.ts`
- `tests/shared-home/acquisition-metrics.test.ts`
- `tests/shared-home/doctor-acquisition-format.test.ts`

## Risks

### Risk: install contract 说得太满，但 repo 实际无法安全执行第三方安装

Mitigation:

- 第一版只承诺 structured install plan + verify semantics
- 不承诺 arbitrary remote auto-install
- 保持 operator confirm / host-mediated execution

### Risk: capability-discovery placeholder 继续制造“好像已经有完整 workflow”的错觉

Mitigation:

- 在 Slice 0 明确它的身份
- README / catalog / tests 同步修正

### Risk: acquisition memory 变成新的错误 cache

Mitigation:

- memory 只提升 ranking，不直接跳过 verification
- package availability 仍然由 manifest-based probe 兜底

### Risk: host 重新变厚

Mitigation:

- host 只消费 structured result
- 不把 package choice 或 install ranking 放回 host adapter

## Initial Test Strategy

1. 先用 unit tests 锁定 acquisition contract shape、memory schema/fail-open 行为、source precedence。
2. 再用 integration tests 验证：
   - query-specific uninstalled winner 与 true no-candidate 被诚实区分
   - uninstalled winner returns structured install plan to broker + workflow + host consumers
   - post-install verification flips readiness
   - same query reuses acquisition memory without unsafe cache collision
   - stale / corrupt / old-schema memory never bypasses probe
3. 再跑一条 `published_package` 与一条 `mcp_bundle` 的端到端 proof，确认 install -> verify -> reuse 真能转起来。
4. 最后用 shared-home doctor + CLI + host contract tests 锁定 operator-facing metrics 与 docs wording。

## Implementation Sequencing

不要按“先做所有基础设施，再让用户第一次看到结果”这种顺序推进。

推荐顺序:

1. 先打通最小垂直切片：
   - true miss vs install-required split
   - structured install plan
   - host / CLI / workflow 同步消费
   - 一条 smoke proof
2. 再接 acquisition memory：
   - versioned store
   - advisory ranking
   - fail-open / stale / migration semantics
3. 最后补 operator proof：
   - doctor / format
   - walkthrough 样例
   - README / TODOS / STATUS 对齐

这样第一批用户能先看到真实收益，而不是先看到一堆内部 plumbing。

## Not In Scope Yet

- 把 capability discovery 做成全新的多阶段 broker-native workflow runtime
- 自动下载并执行不受控第三方安装脚本
- OpenCode shell
- lane expansion

## Next Step

先审两个问题：

1. 这次 flywheel 的第一版，是否接受“structured install plan + verify + memory”，而不是一步到位的全自动安装。
2. catalog 里的 `capability-discovery` placeholder，应该在这次被做实，还是先降级成更诚实的 helper contract。

---

## /autoplan Phase 1 — CEO Review

### System Audit

- Base branch: `main`
- UI scope: no
- DX scope: yes
- Relevant recent shipped packets on `main`:
  - query-native request migration tail
  - package-vs-leaf identity migration tail
  - adoption health + doctor/operator proof
- Highest-churn files in the last 30 days that this packet is likely to touch:
  - `tests/cli/lifecycle-cli.test.ts`
  - `tests/integration/broker-flow.test.ts`
  - `src/broker/run.ts`
  - `src/shared-home/update.ts`
  - `src/shared-home/doctor.ts`
  - `src/shared-home/format.ts`
- Existing stash found: `stash@{0}: On codex/broker-auto-router: wip/release-bump-0.1.2`
  - not in this packet's scope, but it confirms this repo has old router-era leftovers and is another reason not to silently widen scope
- Relevant prior learnings applied:
  - `do_not_move_identity_dedupe_to_raw_candidate_without_normalization`
  - `review_first_phase_stack`
  - `repo-vendored-gstack-root`

System-audit verdict:

- This packet is a feature enhancement on a live, recently stabilized broker core, not a greenfield invention.
- The highest regression risk is not ranking logic alone. It is contract truth across broker results, CLI output, shared-home metrics, and repo docs.
- The most dangerous temptation is to widen this into a new workflow runtime or arbitrary auto-install system. That would re-open multiple packets at once.

### 0A. Premise Challenge

1. Premise: “当前最大未完成价值，不是再接一个新宿主，而是让 acquisition loop 开始复利。”
Assessment: 成立。
Why:
- `README.md` 已经把当前 product phase 写成 “turning discovery/install into a stronger reuse flywheel”，见 [README.md](/Users/monkeyin/projects/skills-broker/README.md:131)
- `TODOS.md` 里它是当前最高优先级未完成项，OpenCode 明确还是 P2，见 [TODOS.md](/Users/monkeyin/projects/skills-broker/TODOS.md:5) 和 [TODOS.md](/Users/monkeyin/projects/skills-broker/TODOS.md:19)
- 最近几轮主提交都在收 query-native、package/leaf、adoption-proof 真相面，这说明地基已经够硬，可以开始补 acquisition

2. Premise: “第一版 flywheel 应该先解决 structured install plan + verify + memory，而不是直接做 arbitrary auto-install。”
Assessment: 成立，而且应该被锁死成这次 packet 的边界。
Why:
- 当前 repo 没有一个受控、安全、可审计的第三方 package installer surface
- shared-home `update` 管的是 broker home 和 host shell，不是外部 capability package install manager，见 [src/shared-home/update.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts:1)
- 现在的 `PackageAcquisitionHint` 太薄，先把 contract 做实比直接执行安装更重要，见 [src/core/types.ts](/Users/monkeyin/projects/skills-broker/src/core/types.ts:167)

3. Premise: “retrieval 在 leaf 层，install/lifecycle 在 package 层。”
Assessment: 强成立。
Why:
- 这是 repo 当前最稳定也最值钱的架构判断
- `CapabilityCard`、selection、handoff、package availability 都已经在围绕这条线工作，见 [src/core/capability-card.ts](/Users/monkeyin/projects/skills-broker/src/core/capability-card.ts:18)、[src/broker/selection.ts](/Users/monkeyin/projects/skills-broker/src/broker/selection.ts:14)、[src/broker/package-availability.ts](/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts:118)

4. Premise: “`NO_CANDIDATE` 应该成为 growth event，不该只是 decline。”
Assessment: 成立，但当前 plan 还没把 operator proof 讲够。
Why:
- trace 里 `NO_CANDIDATE` 现在只会落成 retrieval fallback，doctor 也只会汇总 fallback/misroute/hit，见 [src/broker/trace.ts](/Users/monkeyin/projects/skills-broker/src/broker/trace.ts:12)
- 如果这次不把 acquisition conversion 做成指标，飞轮会继续停留在口号

5. Premise: “`capability-discovery` placeholder 必须在这次被重新定义。”
Assessment: 成立。
Why:
- catalog 已经把它建成一个 `broker_workflow` implementation，但 repo 里没有对应 workflow recipe，也没有完整 acquisition runtime
- 这会持续制造“看起来已经有完整 discovery/install 能力”的错觉，见 [config/host-skills.seed.json](/Users/monkeyin/projects/skills-broker/config/host-skills.seed.json:105)

If we do nothing:

- broker 仍然能识别 acquisition request
- broker 仍然不能把 miss 稳定转成跨 host 的复用记忆
- OpenCode 或新 lane 一来，会把同样缺口复制一遍

Verdict:

- 这不是 proxy problem。它是当前 backlog 和 product phase 真正对齐的下一步。

### 0B. Existing Code Leverage Map

| Sub-problem | Existing code | Reuse decision |
|---|---|---|
| compile explicit discovery/install asks | [src/broker/query-compiler.ts](/Users/monkeyin/projects/skills-broker/src/broker/query-compiler.ts:531), [tests/core/request-normalization.test.ts](/Users/monkeyin/projects/skills-broker/tests/core/request-normalization.test.ts:72) | reuse directly, do not invent a second compiler |
| retrieve host + MCP candidates | [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:321), [src/sources/host-skill-catalog.ts](/Users/monkeyin/projects/skills-broker/src/sources/host-skill-catalog.ts:1), [src/sources/mcp-registry.ts](/Users/monkeyin/projects/skills-broker/src/sources/mcp-registry.ts:1) | extend, do not replace |
| dedupe and preserve source order | [src/broker/discover.ts](/Users/monkeyin/projects/skills-broker/src/broker/discover.ts:3) | reuse with care, prior learning says do identity normalization before dedupe changes |
| verify package install state | [src/broker/package-availability.ts](/Users/monkeyin/projects/skills-broker/src/broker/package-availability.ts:118), [tests/broker/package-availability.test.ts](/Users/monkeyin/projects/skills-broker/tests/broker/package-availability.test.ts:1) | strong reuse, this is the verification backbone |
| rank query-specific uninstalled winners | [src/broker/rank.ts](/Users/monkeyin/projects/skills-broker/src/broker/rank.ts:72), [tests/broker/rank.test.ts](/Users/monkeyin/projects/skills-broker/tests/broker/rank.test.ts:1) | extend scoring, keep explicit-over-clever |
| return package-aware acquisition fallback | [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:197), [src/core/types.ts](/Users/monkeyin/projects/skills-broker/src/core/types.ts:167) | extend existing result shape, avoid new top-level outcome unless forced |
| block and resume install-dependent workflow stages | [src/broker/workflow-runtime.ts](/Users/monkeyin/projects/skills-broker/src/broker/workflow-runtime.ts:452), [tests/broker/workflow-runtime.test.ts](/Users/monkeyin/projects/skills-broker/tests/broker/workflow-runtime.test.ts:424) | reuse semantics as a reference pattern, but do not widen runtime lightly |
| persist cross-host truth | winner cache in [src/broker/run.ts](/Users/monkeyin/projects/skills-broker/src/broker/run.ts:379), traces in [src/broker/trace-store.ts](/Users/monkeyin/projects/skills-broker/src/broker/trace-store.ts:1), doctor rollups in [src/shared-home/doctor.ts](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts:20) | add acquisition memory beside these, not a parallel truth system |
| expose host-facing contract | [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:154), [tests/hosts/host-decline-contract.test.ts](/Users/monkeyin/projects/skills-broker/tests/hosts/host-decline-contract.test.ts:1) | keep hosts thin, only enrich payload |

Rebuild smells to avoid:

- 不要重新发明 identity normalization。Prior learning already says raw candidate dedupe is the wrong layer.
- 不要再造一个与 trace/doctor 平行的 acquisition truth board。shared home 已经是现成落点。

### 0C. Dream State Mapping

```text
CURRENT STATE
  Discovery/install requests reach the broker
  Best uninstalled candidates degrade to NO_CANDIDATE
  Install help is thin and mostly advisory
  Post-install success is not first-class shared memory

THIS PLAN
  Best uninstalled candidates return a structured install plan
  Install completion is explicitly verified, not inferred from a folder name
  Acquisition success is persisted in shared home
  Doctor can report whether misses are turning into reusable wins

12-MONTH IDEAL
  Broker turns misses into durable package knowledge
  Shared home compounds capability reach across Claude Code and Codex
  Install guidance is specific, trusted, and low-friction
  New hosts inherit the same acquisition memory without bespoke glue
```

Dream-state delta:

- This packet does not deliver fully autonomous installs.
- It does deliver the contract and memory layer that a later autonomous install path would need.

### 0C-bis. Implementation Alternatives Review

#### Approach A: Package-aware acquisition contract on top of current `NO_CANDIDATE`

- Effort: L
- Risk: Medium
- Pros:
  - smallest lake that still closes the real loop
  - reuses existing broker result, probe, trace, and doctor surfaces
  - keeps host shells thin
- Cons:
  - install action still needs host/operator cooperation
  - `capability-discovery` placeholder needs explicit cleanup

#### Approach B: capability-discovery as full broker-owned workflow now

- Effort: XL
- Risk: High
- Pros:
  - stronger product story
  - more unified multi-stage UX if it lands cleanly
- Cons:
  - current workflow runtime lacks a broker-native acquisition-stage model
  - drags runtime, host, and artifact semantics into the same packet

#### Approach C: OpenCode or more lanes first, acquisition later

- Effort: M
- Risk: High
- Pros:
  - more visible externally
- Cons:
  - compounds the missing flywheel instead of fixing it
  - directly contradicts current backlog order

Recommendation:

- Choose Approach A because it is the highest-completeness lake that does not reopen host/runtime architecture debt.

### 0D. Mode-Specific Analysis

Mode: `SELECTIVE_EXPANSION`

Why:

- this is an enhancement packet on top of a recently stabilized core
- the scope is real and worthwhile, but the easiest mistake is over-expansion

Complexity check:

- this plan will likely touch more than 8 files and introduce at least one new shared-home persistence surface
- that is acceptable only if we keep the core packet bounded to acquisition contract, memory, verification, and operator proof

Minimum set of changes that achieves the goal:

1. make `package_not_installed` return a structured install plan
2. add acquisition memory + post-install verification semantics
3. teach ranking/discovery to reuse that memory safely
4. expose conversion truth in doctor/trace

Expansion scan:

- 10x version: fully broker-managed install workflow with auto-resume after install
- platform potential: acquisition memory could become the broker's reusable “what package solved this job family before” substrate
- delight opportunities:
  - install plan includes exact verify step
  - doctor shows first-reuse-after-install count
  - host can offer “retry now that package is installed”
  - README quickstart includes a real acquisition success path
  - acquisition hints explain package-vs-leaf in plain language

Auto-decisions under SELECTIVE_EXPANSION:

| Proposal | Decision | Reason |
|---|---|---|
| full autonomous third-party install | deferred | outside current security and contract lake |
| broker-native acquisition workflow runtime generalization | deferred | too much new runtime surface for this packet |
| stronger operator proof in doctor | accepted | without proof, flywheel is invisible |
| acquisition memory store in shared home | accepted | this is the compounding core |
| OpenCode shell | deferred | explicit P2 backlog item |

### 0E. Temporal Interrogation

`HOUR 1` foundations, human: ~1h / CC+gstack: ~5-10 min

- The implementer must know whether `PackageAcquisitionHint` evolves in place or a parallel contract is added.
- They must know where acquisition memory lives and what its canonical key is.

`HOUR 2-3` core logic, human: ~2-3h / CC+gstack: ~10-20 min

- Ambiguity 1: when a query-specific uninstalled MCP exists, should it outrank the generic `capability-discovery` helper every time? The answer should be yes if query match is stronger.
- Ambiguity 2: should acquisition memory affect ranking only, or can it short-circuit retrieval? It should affect ranking only.

`HOUR 4-5` integration, human: ~2h / CC+gstack: ~10-15 min

- Surprise 1: shared-home `doctor` and host adapters are part of the contract whether we like it or not.
- Surprise 2: the `capability-discovery` placeholder cannot stay vague once install plans become structured.

`HOUR 6+` polish/tests, human: ~1-2h / CC+stack: ~10-15 min

- The implementer will wish the plan had already decided stale-memory semantics, docs wording, and what counts as a verified post-install success.

Decisions that should be resolved now, not during coding:

1. acquisition memory is advisory ranking input, not a trust-bypass
2. post-install success requires manifest-based verification, not directory presence
3. `capability-discovery` placeholder resolution is part of this packet, not future cleanup

### 0F. Mode Selection

Auto-selected mode: `SELECTIVE_EXPANSION`

Why:

- repo is mid-flight but not greenfield
- scope should stay fixed, but meaningful adjacent expansions still exist
- `SELECTIVE_EXPANSION` is the right posture for “hold the packet, cherry-pick only what makes the packet more real”

Chosen implementation approach under this mode:

- Approach A

Current CEO verdict before premise gate:

- Problem selection: correct
- Packet boundary: mostly correct
- Biggest remaining ambiguity: whether this packet is allowed to stop at structured install plans, or whether it must go all the way to autonomous install

Premise gate result:

- User selected `A`: accept first version as `structured install plan + verify + memory`, not arbitrary autonomous install.

### 0.5 Dual Voices

#### CODEX SAYS (CEO — strategy challenge) `[unavailable]`

- Attempted a read-only `codex exec` outside-voice review against this plan and repository context.
- The session read repo artifacts but did not return a stable final review within the allotted timeout.
- Per `/autoplan` degradation rules, Codex CEO voice is treated as unavailable for this phase and is not used as a decision source.

#### CLAUDE SUBAGENT (CEO — strategic independence) `[subagent-only]`

1. **High | 把安装需处理状态从 `NO_CANDIDATE` 里拆出来**
   - 问题：当前实现把“真没候选”和“匹配到了但未安装”都落成 `NO_CANDIDATE`，会污染 trace、doctor、memory、conversion 指标。
   - 修正：新增 acquisition outcome / trace subreason，让 `NO_CANDIDATE` 只代表真没候选，或至少在 host-visible contract 中把 install-required 显式分层。
2. **High | 结构化 install plan 没有绑定真实消费端**
   - 问题：如果只扩 `PackageAcquisitionHint`，host/CLI 还是旧 decline 口径，飞轮会停在更漂亮的 JSON。
   - 修正：把 host adapter、CLI、workflow block 的消费协议一起纳入这一包。
3. **Medium | acquisition memory key 设计太粗**
   - 问题：只记 family/package/leaf/host/time 容易把偶然成功放大成全局规则。
   - 修正：memory 要带 verification provenance、artifact 集合、置信度、TTL/衰减，只能 advisory，不得跳过 probe。
4. **Medium | sequencing 先做观测再做真实 install proof，容易把假成功固化**
   - 问题：如果先把 doctor/README 做漂亮，再跑链路，很容易在 seed fixture 上“看起来成立”。
   - 修正：先跑至少一条 `published_package` 和一条 `mcp_bundle` 的 install -> verify -> reuse proof，再补指标与文档。
5. **Medium | moat 叙事写得太薄**
   - 问题：单纯“发现 + 安装 + marketplace”很容易被复制，真正难抄的是 provenance、跨 host 历史、失败学习与导出能力。
   - 修正：把 provenance、host-agnostic memory schema、exportability、trust boundary 写成硬要求。

CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   Mostly   N/A    Not confirmed, one voice says semantics still too loose
  2. Right problem to solve?           Yes      N/A    No contradiction observed, but single-model only
  3. Scope calibration correct?        No       N/A    Flagged, host/CLI + workflow consumer must join scope
  4. Alternatives sufficiently explored?Partial N/A    Flagged, helper-vs-workflow identity must be fixed now
  5. Competitive/market risks covered? No       N/A    Flagged, provenance/exportability absent
  6. 6-month trajectory sound?         Mixed    N/A    Flagged, metrics-before-proof would age badly
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. DISAGREE = models differ. This phase ran in `[subagent-only]` mode, so no item is CONFIRMED. High-severity single-model findings are still binding review signals.

### Section 1: Architecture Review

Verdict:

- The core architecture direction is right.
- The current plan under-specifies the contract boundary. That is the real architecture risk.

Auto-decided issues:

1. **Install-required must become a first-class branch, not an overstuffed `NO_CANDIDATE`.**
   - Decision: accept.
   - Why: product truth, routing truth, and operator truth all depend on this split.
2. **Host / CLI / workflow block are mandatory consumers in the same slice.**
   - Decision: accept.
   - Why: a contract that only broker internals understand is not a product surface.
3. **Acquisition memory must sit beside trace/winner-cache as advisory shared-home state, not a second router.**
   - Decision: accept.
   - Why: reuse the existing home/state boundary without creating a parallel truth system.

Required ASCII diagram, target architecture:

```text
REQUEST
  |
  v
normalizeRequest
  |
  v
discoverCapabilityCards
  |------------------------------\
  |                               \
  v                                v
host catalog + workflows         MCP registry
  \                               /
   \----> discoverCandidates ----/
                |
                v
     hydratePackageAvailability
                |
                v
        rankCapabilities
                |
        +-------+------------------------------+
        |                                      |
        v                                      v
 installed winner                         matched but uninstalled
        |                                      |
        v                                      v
 HANDOFF_READY / WORKFLOW_*         acquisition-required result
        |                                      |
        |                              host/CLI/workflow consumer
        |                                      |
        v                                      v
   winner cache write               operator install + retry/ resume
                                                 |
                                                 v
                                  manifest/probe verification
                                                 |
                                                 v
                                     acquisition memory write
                                                 |
                                                 v
                                       later request ranks higher
```

Before / after coupling:

```text
CURRENT
run.ts -> result.ts -> host skill markdown
run.ts -> trace.ts -> doctor.ts
run.ts -> workflow-runtime.ts

TARGET
run.ts/result.ts/trace.ts define shared acquisition semantics
            |                |                |
            v                v                v
       host/CLI        doctor/format     workflow-runtime
            \                |                /
             \---------------+---------------/
                     acquisition memory
```

State machine for the new durable object:

```text
candidate_matched_uninstalled
  -> install_plan_issued
  -> verification_pending
  -> verified_installed
  -> first_reuse_recorded
  -> decayed_or_expired

Forbidden:
- candidate_matched_uninstalled -> verified_installed without probe success
- install_plan_issued -> first_reuse_recorded without a later routed hit
```

Scaling / SPOF / rollback:

- 10x load risk: repeated filesystem probe and shared-home memory reads if verification is naively duplicated.
- 100x load risk: unbounded trace scans in doctor and unbounded memory growth.
- Single points of failure: shared-home acquisition-memory file and host contract drift.
- Rollback posture: keep new decline fields additive or versioned so broker can revert without breaking existing installed shells.

### Section 2: Error & Rescue Map

Verdict:

- The plan names the happy path well.
- The rescue path is still too hand-wavy unless the contract explicitly names fail-open behavior.

Auto-decided issues:

1. **Memory corruption must fail open.**
   - Decision: accept.
   - Why: a broken memory file should cost reuse, not routing correctness.
2. **Unsupported install surface must degrade to explicit operator guidance, not a silent generic message.**
   - Decision: accept.
3. **Verification failure needs a visible next step.**
   - Decision: accept.

Error & Rescue Registry:

| METHOD/CODEPATH | WHAT CAN GO WRONG | EXCEPTION / FAILURE CLASS | RESCUED? | RESCUE ACTION | USER SEES |
|---|---|---|---|---|---|
| `runBroker` acquisition branch | no candidate really exists | `NO_CANDIDATE_TRUE_MISS` | Y | return true-miss decline | “No matching capability found” |
| `runBroker` acquisition branch | candidate matched but package absent | `INSTALL_REQUIRED` | Y | return structured install plan | package + verify + retry instructions |
| acquisition memory read | file missing / corrupt / old schema | `ACQ_MEMORY_UNREADABLE` | Y | ignore memory and continue catalog + probe | no regression, maybe lower-quality ranking |
| acquisition memory write | concurrent write / partial write | `ACQ_MEMORY_WRITE_FAILED` | Y | log structured warning, continue | install still works, memory may not compound |
| package verification | manifest not found after claimed install | `VERIFY_FAILED` | Y | keep install-required state, explain verify failure | “Install not verified yet” |
| host/CLI renderer | acquisition method unsupported | `UNSUPPORTED_INSTALL_SURFACE` | Y | render generic safe CTA + docs pointer | clear fallback, no silent dead-end |
| workflow resume after install | stale stage or stale run | existing `STALE_STAGE` / `UNKNOWN_RUN` | Y | preserve workflow failure semantics | retry or restart guidance |

Critical gaps that were missing before this review:

- no explicit fail-open rule for corrupt memory
- no explicit host/CLI fallback when install surface is unknown
- no explicit verify-failed user message

### Section 3: Security & Threat Model

Verdict:

- This is not a classic auth surface expansion.
- It is still a trust-boundary packet.

Threat table:

| Threat | Likelihood | Impact | Mitigation decision |
|---|---|---|---|
| install plan metadata becomes shell-execution vector | Medium | High | install plan is descriptive, never auto-executes arbitrary commands in v1 |
| acquisition memory poisons ranking | Medium | High | memory is advisory only; probe still decides install truth |
| stale shared-home data leaks into another host as false confidence | Medium | Medium | add schema version, provenance, TTL, confidence, decay |
| absolute paths / local env details leak into shared-home export | Low | Medium | store package ids, host, timestamps, verification basis, not sensitive host internals |
| generic discovery candidate recursively outranks concrete winner | Medium | Medium | lock helper identity in Slice 0 and add ranking regression tests |

Auto-decided issues:

1. **Do not introduce any auto-install execution right in this packet.**
   - Decision: accept.
2. **Treat acquisition memory as untrusted advisory input.**
   - Decision: accept.
3. **Schema must be exportable and host-agnostic.**
   - Decision: accept.

### Section 4: Data Flow & Interaction Edge Cases

Data flow diagram:

```text
INPUT -> VALIDATION -> DISCOVERY -> AVAILABILITY PROBE -> RANK -> OUTCOME
  |         |             |               |                |         |
  |         |             |               |                |         +--> HANDOFF_READY
  |         |             |               |                |         +--> INSTALL_REQUIRED
  |         |             |               |                |         +--> TRUE_NO_CANDIDATE
  |         |             |               |                |
  |         |             |               |                +--> stale memory? ignore
  |         |             |               +--> probe fail? explain verify failure
  |         |             +--> source fail? partial discovery still allowed
  |         +--> ambiguous? ask clarify
  +--> unsupported? continue normally
```

Interaction edge cases:

| INTERACTION | EDGE CASE | HANDLED? | Decision |
|---|---|---|---|
| install-required decline | user retries before install completes | not yet | keep same install-required contract, do not advance memory |
| install-required decline | install succeeds at package root but wrong leaf still missing | not yet | verify package + leaf, not just package |
| acquisition memory reuse | stale entry points to removed package | partially | decay + fail-open to probe |
| discovery ranking | generic helper and specific uninstalled winner both match | partially | specific winner must outrank helper |
| workflow resume | run blocked on install, user resumes wrong run/stage | yes mostly | reuse existing workflow failure semantics |
| doctor metrics | mixed old/new traces during rollout | not yet | version fields and tolerate missing data |

Verdict:

- The dangerous edge cases are all around mixed truth during rollout, not the happy path.

### Section 5: Code Quality Review

Verdict:

- The repo already has the right primitives.
- The plan will get messy fast if it duplicates them instead of centralizing semantics.

Auto-decided issues:

1. **Do not duplicate install-hint builders.**
   - Decision: centralize acquisition contract generation for `run.ts` and `workflow-runtime.ts`.
2. **Do not create a parallel memory-aware discoverer.**
   - Decision: keep memory as one ranked source feeding existing discover/rank path.
3. **Naming must become honest.**
   - Decision: introduce explicit acquisition outcome naming rather than burying everything under `reason: package_not_installed`.

Specific code-quality guardrails:

- extend `src/core/types.ts`, `src/broker/result.ts`, `src/broker/trace.ts` first, then let `run.ts`, `workflow-runtime.ts`, host/CLI consume that shared shape
- reuse `hydratePackageAvailability` as the verification backbone
- keep `discoverCandidates` dedupe untouched unless normalized identity changes are proven safe

### Section 6: Test Review

Test diagram:

```text
NEW UX FLOWS
- broker returns install-required instead of generic miss
- host/CLI renders package + verify + next-step CTA
- operator reruns after install and sees handoff succeed

NEW DATA FLOWS
- acquisition memory read before ranking
- acquisition memory write after verified install success
- doctor/format summarize acquisition conversion

NEW CODEPATHS
- true no-candidate vs install-required split
- helper-vs-query-specific ranking rule
- corrupt/old-schema memory fail-open
- verify-failed after claimed install

NEW ERROR/RESCUE PATHS
- unreadable memory
- unsupported install surface
- stale workflow resume after install
- mixed old/new trace payloads
```

Coverage decisions:

| Codepath / behavior | Test type | Existing anchor | Gap decision |
|---|---|---|---|
| true no-candidate vs install-required split | integration | `tests/integration/broker-flow.test.ts` | add |
| host keeps structured decline intact | host contract | `tests/hosts/host-decline-contract.test.ts` | add |
| CLI / text-json output says true contract | CLI contract | `tests/cli/cli-contract.test.ts` + `src/shared-home/format.ts` | add |
| workflow `install_required` uses same payload | integration/unit | `tests/broker/workflow-runtime.test.ts` | add |
| acquisition memory schema / corruption / stale entries | unit | new `tests/broker/acquisition-memory.test.ts` | add |
| doctor acquisition metrics formatting | unit | `tests/shared-home/doctor.test.ts` | add |
| end-to-end `published_package` proof | e2e | `tests/e2e/shared-home-smoke.test.ts` | add |
| end-to-end `mcp_bundle` proof | e2e/integration | `tests/integration/broker-flow.test.ts` + smoke | add |

Shipping-confidence tests:

- the Friday 2am test: install-required result from broker is rendered identically by host, CLI, and workflow block
- hostile QA test: memory file is corrupt, helper candidate exists, concrete uninstalled candidate also exists, and broker still chooses the concrete winner without crashing
- chaos test: old traces + new traces + stale memory entry coexist, doctor still renders truthful metrics

### Section 7: Performance Review

Verdict:

- No obvious p99 disaster if the packet stays additive.
- The two easy mistakes are duplicate probes and unbounded shared-home state.

Auto-decided issues:

1. **Memory lookup must be O(1)-ish and bounded.**
   - Decision: accept, cap record count and TTL.
2. **Do not re-run filesystem probes twice in the same request.**
   - Decision: accept, reuse hydrated availability result for verify decisions when possible.
3. **Doctor must summarize bounded windows, not scan forever.**
   - Decision: accept.

Estimated slow paths:

- `hydratePackageAvailability` across many candidates, already present, remains top filesystem cost
- doctor summarization if acquisition events become unbounded
- end-to-end verify retry loops if host keeps asking too early

### Section 8: Observability & Debuggability Review

Verdict:

- This packet is only real if operators can see it.

Auto-decided issues:

1. **Trace schema must record acquisition truth, not infer it later.**
   - Decision: accept.
2. **Doctor output must show conversion, not just fallback count.**
   - Decision: accept.
3. **Logs need package/family/host context at every acquisition event.**
   - Decision: accept.

Operational dashboard / log requirements:

- acquisition outcome kind
- package id + leaf id
- host
- install plan issued count
- verify success / verify failure count
- first reuse after install
- stale memory prunes

Runbook minimum:

- “install required but verify keeps failing”
- “memory file corrupt”
- “doctor says candidate-matched-uninstalled is rising”

### Section 9: Deployment & Rollout Review

Verdict:

- The deployment risk is contract skew, not migrations.

Required deployment sequence:

```text
1. Land broker contract/types/result/trace changes
2. Land workflow-runtime consumer update
3. Land host skill markdown + adapter/CLI serialization updates
4. Land doctor/format changes
5. Run contract + smoke suites
6. Update README/TODOS/STATUS wording
```

Rollback flow:

```text
ship breaks
  -> revert broker + host/CLI contract together
  -> keep shared-home memory file ignored if newer schema
  -> restore old doctor wording
  -> rerun smoke + doctor
```

Auto-decided issues:

1. **Avoid a breaking top-level outcome-code change unless hosts ship in lockstep.**
   - Decision: accept.
2. **Treat shared-home memory schema as forward-compatible junk-tolerant state.**
   - Decision: accept.

### Section 10: Long-Term Trajectory Review

Verdict:

- This packet can become the compounding substrate.
- It becomes embarrassing in 6 months if it ships as metrics theater.

Auto-decided issues:

1. **Provenance/exportability belongs in v1 of the memory schema.**
   - Decision: accept.
2. **OpenCode and lane expansion stay deferred until this packet proves two real acquisition wins.**
   - Decision: accept.

Reversibility: `4/5`

Debt items:

- contract-version drift across broker / workflow / host / CLI
- acquisition memory schema migration
- placeholder helper identity if left undecided

What comes after this ships:

1. one live `published_package` proof
2. one live `mcp_bundle` proof
3. then OpenCode shell on top of the same contract
4. then lane expansion on top of proven memory and metrics

### Section 11: Design & UX Review

Skipped.

Reason:

- no UI scope was detected in this packet
- DX review is still required because the user-facing surface is CLI / host guidance / operator diagnostics

### NOT in scope

- full arbitrary third-party auto-install, deferred because it reopens security and execution-right questions
- broker-native acquisition stage-machine generalization, deferred because this packet should not widen workflow runtime
- OpenCode shell, deferred because it is still the explicit P2 backlog item
- lane expansion, deferred because acquisition flywheel should first strengthen maintained families already in scope
- marketplace / catalog UI, deferred because the moat here is shared truth, not browse chrome
- background remote refresh of acquisition state, deferred because v1 can stay retry-driven

### What already exists

| Sub-problem | Existing code | Reuse decision |
|---|---|---|
| explicit acquisition intent compilation | `src/broker/query-compiler.ts` | reuse |
| candidate discovery across host + MCP | `src/broker/run.ts`, `src/broker/discover.ts` | extend |
| manifest-based install verification | `src/broker/package-availability.ts` | reuse as backbone |
| ranking with explicit query family bias | `src/broker/rank.ts` | extend |
| workflow install blocking | `src/broker/workflow-runtime.ts` | align with same contract |
| routing trace + doctor rollup | `src/broker/trace.ts`, `src/shared-home/doctor.ts`, `src/shared-home/format.ts` | extend |
| host decline preservation | `tests/hosts/host-decline-contract.test.ts` | reuse as contract lock |

### Dream state delta

- This plan still stops short of autonomous installs.
- It does make install-required a first-class reusable contract instead of a fallback sentence.
- It creates the durable memory substrate a later autonomous path would need.
- It leaves marketplace/UI questions untouched on purpose.

### Failure Modes Registry

| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES? | LOGGED? |
|---|---|---|---|---|---|
| acquisition ranking | helper outranks concrete uninstalled winner | N -> GAP | N -> GAP | wrong recommendation | should be |
| memory read | corrupt/old schema file | Y (planned) | N -> GAP | graceful fallback | should be |
| verify after install | package root exists but leaf still absent | Y (planned) | N -> GAP | verify-failed guidance | should be |
| host renderer | ignores structured install plan | N -> GAP | N -> GAP | old generic message | maybe |
| workflow resume | install-required path diverges from one-shot path | N -> GAP | N -> GAP | inconsistent next step | maybe |
| doctor summary | mixed old/new traces miscount conversion | Y (planned) | N -> GAP | misleading metrics | should be |

Rows currently marked `N -> GAP` are the high-confidence failure modes this packet must close before implementation is considered review-clean.

### Completion Summary

```text
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SELECTIVE EXPANSION                         |
  | System Audit         | live broker core, highest risk is contract truth |
  | Step 0               | Approach A locked, premise gate passed via A |
  | Section 1  (Arch)    | 3 issues found                              |
  | Section 2  (Errors)  | 7 paths mapped, 3 GAPS                      |
  | Section 3  (Security)| 3 issues found, 1 High severity             |
  | Section 4  (Data/UX) | 6 edge cases mapped, 4 partially handled    |
  | Section 5  (Quality) | 3 issues found                              |
  | Section 6  (Tests)   | Diagram produced, 8 major gaps              |
  | Section 7  (Perf)    | 3 issues found                              |
  | Section 8  (Observ)  | 3 gaps found                                |
  | Section 9  (Deploy)  | 2 risks flagged                             |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 3           |
  | Section 11 (Design)  | SKIPPED (no UI scope)                       |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (6 items)                           |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 7 methods, 3 CRITICAL GAPS                  |
  | Failure modes        | 6 total, 4 CRITICAL GAPS                    |
  | TODOS.md updates     | 0 items proposed yet                        |
  | Scope proposals      | 7 proposed, 4 accepted                      |
  | CEO plan             | written                                     |
  | Outside voice        | ran (claude subagent only; codex unavailable) |
  | Lake Score           | 6/6 recommendations chose complete option   |
  | Diagrams produced    | 5 (system, state, data flow, deploy, rollback) |
  | Stale diagrams found | 0                                           |
  | Unresolved decisions | 0                                           |
  +====================================================================+
```

> **Phase 1 complete.** Codex: unavailable. Claude subagent: 5 issues.
> Consensus: 0/6 confirmed, 0 disagreements, 6 single-model dimensions surfaced due `[subagent-only]`.
> Passing to Phase 2.

### Phase 2: Design Review

Skipped.

Reason:

- no UI scope was detected in Phase 0
- this packet still needs DX review because it changes host/CLI/operator experience

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|----------|
| 1 | CEO | Keep the unfinished-feature focus on discovery/install flywheel instead of OpenCode | auto-decided | P6 | matches backlog truth and current product phase | OpenCode first |
| 2 | CEO | Lock first version to structured install plan + verify + memory | user-confirmed | P6 | user selected A at the premise gate | arbitrary auto-install |
| 3 | CEO | Stay in SELECTIVE_EXPANSION mode | auto-decided | P2 | keep the packet bounded while still fixing real adjacent debt | HOLD / EXPANSION |
| 4 | CEO | Use Approach A as the implementation baseline | auto-decided | P1 + P5 | highest completeness lake without reopening runtime architecture | workflow rewrite / OpenCode first |
| 5 | CEO | Split true no-candidate from matched-but-uninstalled semantics | auto-decided | P1 | metrics and product truth must stay honest | keep both under plain `NO_CANDIDATE` |
| 6 | CEO | Pull host/CLI/workflow consumers into the same contract slice | auto-decided | P1 | otherwise structured install plan is broker-internal only | broker-only payload upgrade |
| 7 | CEO | Make acquisition memory advisory-only with provenance, TTL, and fail-open behavior | auto-decided | P5 | preserves correctness and trust boundaries | memory as trust-bypass cache |
| 8 | CEO | Require real `published_package` and `mcp_bundle` proofs before docs/metrics polish | auto-decided | P1 | prevents metrics theater on top of seed fixtures | docs/doctor first |
| 9 | CEO | Keep design review skipped | auto-decided | P6 | no UI scope detected | force UI review |
| 10 | CEO | Reorder implementation around a visible vertical slice before memory/metrics polish | auto-decided | P5 | first user-visible win should come early | infra-first sequencing |
| 11 | Eng | Treat `src/broker/result.ts` as the contract hub for broker + workflow + host + CLI | auto-decided | P5 | one shared shape beats parallel partial schemas | scattered contract builders |
| 12 | Eng | Keep `workflow-runtime.ts` in the same packet | auto-decided | P1 | hidden consumer would otherwise fork install semantics | leave workflow path for later |
| 13 | Eng | Use versioned acquisition-memory store with narrow reset/migrate path | auto-decided | P1 + P5 | safer recovery and cleaner migration story | ad-hoc file + full purge only |
| 14 | Eng | Mark host/CLI/workflow parity tests as ship-blocking | auto-decided | P1 | contract drift is the main implementation risk | treat them as optional follow-up |
| 15 | DX | Promote a smoke-first vertical slice to the front of implementation order | auto-decided | P5 | TTHW and first visible win are currently too weak | memory/metrics first |
| 16 | DX | Add install-specific host action or equivalent first-class outcome metadata | auto-decided | P1 | adapters should not infer intent from payload heuristics | keep generic discovery wording |
| 17 | DX | Add walkthrough + sample output for miss -> plan -> verify -> reuse | auto-decided | P1 | docs must teach the new path explicitly | wording-only doc refresh |
| 18 | DX | Add scoped acquisition-memory reset/migrate flow | auto-decided | P5 | ranking-store recovery should not require whole-home purge | `remove --purge` only |
| 19 | Final Gate | Approve the reviewed plan as-is | user-confirmed | P6 | user selected A at the final approval gate | overrides / restart |

## Phase 3: Eng Review

### Step 0: Scope Challenge

Scope verdict:

- Scope stays accepted.
- Complexity check is triggered, but the right fix is sequencing, not scope reduction.

Actual code map reviewed:

| Sub-problem | Existing code | Scope decision |
|---|---|---|
| decline/result contract | `src/core/types.ts`, `src/broker/result.ts`, `src/broker/run.ts` | must expand |
| workflow parity | `src/broker/workflow-runtime.ts` | must expand |
| host/CLI consumer path | `src/hosts/skill-markdown.ts`, `src/cli.ts`, `src/bin/skills-broker.ts` | must expand |
| memory + ranking | `src/broker/discover.ts`, `src/broker/rank.ts`, `src/broker/package-availability.ts` | extend, not rewrite |
| operator proof | `src/broker/trace.ts`, `src/shared-home/doctor.ts`, `src/shared-home/format.ts` | extend |

Complexity check:

- touched files: definitely 10+ across runtime, host, shared-home, and tests
- new state surface: at least one versioned acquisition-memory store
- conclusion: keep the packet, but force a three-step implementation sequence

### Step 0.5: Dual Voices

#### CODEX SAYS (eng — architecture challenge) `[unavailable]`

- Codex outside voice was not available in a stable form during this `/autoplan` run.
- Eng phase proceeds in `[subagent-only]` mode.

#### CLAUDE SUBAGENT (eng — independent review) `[subagent-only]`

1. **High | Host contract 没有被纳入这次变更**
   - 当前计划升级 install payload，但 host skill markdown、CLI、result shape 还停在旧 decline contract。
   - 修正：把 host adapter / CLI serialization / contract tests 一起纳入 scope。
2. **Medium | Workflow runtime 是未声明消费者**
   - `PackageAcquisitionHint` 也走 `WORKFLOW_BLOCKED.install_required`，若不同步会分叉。
   - 修正：同步 `workflow-runtime` 与 resume tests。
3. **High | acquisition memory 作为信任边界定义得太模糊**
   - 缺 canonical key、schema version、淘汰、损坏处理、并发写策略。
   - 修正：versioned advisory store，读失败永远 fail-open 回 probe。
4. **Medium | `capability-discovery` placeholder 身份未定**
   - generic helper 会和 query-specific uninstalled winner 竞争。
   - 修正：先定 helper/workflow 身份，再加 ranking regression test。
5. **Medium | 测试矩阵漏了新存储与新格式化边界**
   - missing corrupt/empty file, old schema, stale entry collision, doctor text/json contract coverage。
   - 修正：补 memory failure matrix 和 doctor/CLI contract tests。

ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               Mixed    N/A    Flagged, hidden consumers missing from scope
  2. Test coverage sufficient?         No       N/A    Flagged, several critical gaps remain
  3. Performance risks addressed?      Partial  N/A    Not confirmed, bounded-state rules needed
  4. Security threats covered?         Partial  N/A    Not confirmed, trust-boundary rules need tightening
  5. Error paths handled?              No       N/A    Flagged, read/write/verify failures too weak
  6. Deployment risk manageable?       Mixed    N/A    Flagged, contract skew is the main rollout risk
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. This phase ran in `[subagent-only]` mode, so no row is CONFIRMED.

### Section 1: Architecture

Verdict:

- The plan reuses the right modules.
- The hidden-coupling map was too small before this review.

Required ASCII dependency graph:

```text
core/types + broker/result + broker/trace
              |
              v
         broker/run
      /      |       \
     v       v        v
discover  workflow   package-availability
  |         |                |
  v         v                v
rank    workflow block   verify truth
  \         |                /
   \        v               /
    \--> host/CLI consumers <--- shared-home doctor/format
                 |
                 v
         acquisition memory store
```

Auto-decided issues:

1. **`src/broker/result.ts` becomes the contract hub.**
   - Decision: accept.
   - Why: one shared shape must feed broker failure, workflow block, CLI, and host consumers.
2. **`workflow-runtime.ts` is in-scope, not an optional tail.**
   - Decision: accept.
3. **`capability-discovery` helper identity must be fixed before new sources land.**
   - Decision: accept.

Files that should get inline ASCII comments after implementation:

- `src/broker/run.ts`
- `src/broker/workflow-runtime.ts`
- `src/broker/acquisition-memory.ts` if introduced
- `src/shared-home/format.ts`

### Section 2: Code Quality

Verdict:

- The plan is correct only if it stays explicit.

Auto-decided issues:

1. **Reuse `BrokerFailureResult.failure` / reason-code style for acquisition failures.**
   - Decision: accept.
   - Why: do not invent a second opaque error vocabulary.
2. **Introduce a versioned store rather than ad-hoc JSON blobs.**
   - Decision: accept.
3. **Add a narrow reset / migrate path for acquisition memory.**
   - Decision: accept.

Quality guardrails:

- no duplicate install-plan renderers
- no new direct host-specific install heuristics
- no memory lookup that bypasses `hydratePackageAvailability`

### Section 3: Test Review

Test diagram mapping codepaths to coverage:

| New flow / codepath | Test type | Coverage target |
|---|---|---|
| true miss vs install-required split | integration | `tests/integration/broker-flow.test.ts` |
| explicit install host action / outcome metadata | unit + host/CLI contract | `tests/hosts/host-decline-contract.test.ts`, `tests/cli/cli-contract.test.ts` |
| workflow `install_required` parity | integration/unit | `tests/broker/workflow-runtime.test.ts` |
| corrupt / stale / old-schema acquisition memory | unit | `tests/broker/acquisition-memory.test.ts` |
| doctor text/json contract for acquisition metrics | unit | `tests/shared-home/doctor.test.ts`, `tests/shared-home/acquisition-metrics.test.ts` |
| one `published_package` end-to-end proof | e2e | `tests/e2e/shared-home-smoke.test.ts` |
| one `mcp_bundle` end-to-end proof | e2e/integration | `tests/e2e/host-auto-routing-smoke.test.ts` or `broker-flow` |

Test plan artifact:

- `/Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/monkeyin-main-test-plan-20260415-220038.md`

Critical gap verdict:

- If host/CLI/workflow parity tests do not exist, this packet is not implementation-ready.
- If corrupt/stale memory tests do not exist, this packet is not implementation-ready.

### Section 4: Performance

Verdict:

- Main risk is not CPU.
- Main risk is repeated probe work and unbounded state.

Auto-decided issues:

1. cap acquisition-memory size and TTL
2. reuse probe results inside a request
3. keep doctor summarization window-bounded

### NOT in scope (Eng)

- bespoke admin UI for acquisition memory, deferred because this packet can stay file-backed
- database-backed acquisition store, deferred because shared-home local truth is enough for v1
- background daemon for verification, deferred because retry-driven verification is enough for first packet

### What already exists (Eng)

| Need | Existing code | Reuse decision |
|---|---|---|
| shared decline carrier | `BrokerFailureResult` | extend |
| install block + resume semantics | `workflow-runtime.ts` | extend |
| CLI JSON output path | `src/cli.ts` | extend |
| lifecycle command surface | `src/bin/skills-broker.ts` | extend or document, not replace |
| host decline pass-through tests | `tests/hosts/host-decline-contract.test.ts` | reuse |

### Failure modes (Eng)

| Codepath | Failure mode | Test? | Error handling? | User sees? | Critical gap? |
|---|---|---|---|---|---|
| result/host contract | install-required is serialized like old generic miss | N | N | misleading next step | YES |
| workflow block | blocked stage payload diverges from one-shot broker result | N | N | inconsistent retry story | YES |
| acquisition memory read | old schema silently ranks stale winner | N | N | wrong install recommendation | YES |
| acquisition memory reset | only full purge exists | N | partial | excessive recovery blast radius | no |
| doctor formatter | JSON/text drift on new metrics | N | N | operator confusion | YES |

### Worktree Parallelization Strategy

Dependency table:

| Step | Modules touched | Depends on |
|------|----------------|------------|
| A. Contract hub | `src/core/`, `src/broker/result.ts`, `src/broker/trace.ts` | — |
| B. Broker routing + ranking | `src/broker/` | A |
| C. Workflow parity | `src/broker/workflow-runtime.ts`, `tests/broker/` | A |
| D. Host + CLI consumer update | `src/hosts/`, `src/cli.ts`, `src/bin/` | A |
| E. Memory store | `src/broker/`, `src/shared-home/` | A, B |
| F. Doctor / format / docs | `src/shared-home/`, docs | A, E |

Parallel lanes:

- Lane A: A -> B -> E (shared broker modules, sequential)
- Lane B: A -> C (depends on contract hub, then independent enough)
- Lane C: A -> D (depends on contract hub, then mostly independent)
- Lane D: F (waits for E)

Execution order:

- Land A first.
- Then launch B + C + D in parallel worktrees.
- Merge those.
- Then run E.
- Then finish with F.

Conflict flags:

- Lanes A and C both touch `src/broker/`; do not parallelize until contract hub lands.
- Lanes A and D both touch contract types; do not start D before A merges.

### Completion Summary (Eng)

- Step 0: Scope Challenge — scope accepted as-is, sequencing tightened
- Architecture Review: 3 issues found
- Code Quality Review: 3 issues found
- Test Review: diagram produced, 7 gaps identified
- Performance Review: 3 issues found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 0 items proposed
- Failure modes: 4 critical gaps flagged
- Outside voice: ran (claude subagent only)
- Parallelization: 4 lanes, 2 parallel launch groups / 2 sequential tails
- Lake Score: 5/5 recommendations chose complete option

> **Phase 3 complete.** Codex: unavailable. Claude subagent: 5 issues.
> Consensus: 0/6 confirmed, 0 disagreements, 6 single-model dimensions surfaced due `[subagent-only]`.
> Passing to Phase 3.5 (DX Review).

## Phase 3.5: DX Review

### Step 0: DX Scope Assessment

DX scope verdict:

- detected, yes
- product type: developer-facing broker/CLI + host-shell integration layer
- inferred primary persona: already-technical builder who hits a capability miss and wants the broker to tell them exactly what to install, how to verify it, and how to retry
- initial DX completeness: `4/10`
- current TTHW for this feature packet: about `12 min`
- target TTHW after plan fixes: `5 min`

Competitive reference benchmark:

| Tool | TTHW | Notable DX choice | Source |
|---|---|---|---|
| Stripe | 0.5 min | copy-paste hello world with visible result | reference benchmark |
| Vercel | 2 min | immediate deploy magic | reference benchmark |
| Firebase | 3 min | guided onboarding + sample app | reference benchmark |
| Docker | 5 min | one command, obvious payoff | reference benchmark |
| This plan today | ~12 min | no direct hello-world path for acquisition flow | current plan |

Auto-decisions:

- mode: `DX POLISH`
- benchmark tier: competitive tier (`2-5 min`)
- magical moment delivery vehicle: copy-paste demo command / smoke proof

### Step 0.5: Dual Voices

#### CODEX SAYS (DX — developer experience challenge) `[unavailable]`

- Codex outside voice remained unavailable in this `/autoplan` session.

#### CLAUDE SUBAGENT (DX — independent review) `[subagent-only]`

1. **Medium | 首个可见收益放得太晚**
   - plan 把第一个用户可见收益放在 contract、discovery、ranking、memory 都改完以后。
   - 修正：先做一个垂直切片，只把 miss 升级成 structured install plan，再补 smoke/doctor proof。
2. **High | 安装型 miss 仍被命名成 discovery**
   - `BrokerHostAction` 没有 install 专用动作，adapter 只能靠 payload 猜下一步。
   - 修正：加 install-specific host action 或等价 first-class outcome。
3. **High | acquisition 失败定义太弱**
   - corrupt/stale/schema mismatch 缺显式 reason code。
   - 修正：版本化 store + read/write/verify reason codes。
4. **Medium | 文档还不会教人怎么用新流程**
   - 只有 doctor/README wording 不够，需要 miss -> plan -> verify -> reuse walkthrough 和输出样例。
   - 修正：加 walkthrough、output sample，并把 placeholder contract 讲清楚。
5. **Medium | acquisition memory 缺少受限 reset/migrate 口**
   - 现在只有整套 `remove --purge`，恢复粒度太粗。
   - 修正：加只清 acquisition memory 的 reset/migrate 路径。

DX DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Getting started < 5 min?          No       N/A    Flagged, current first win arrives too late
  2. API/CLI naming guessable?         No       N/A    Flagged, install miss still reads as discovery
  3. Error messages actionable?        Partial  N/A    Flagged, acquisition reason codes too weak
  4. Docs findable & complete?         No       N/A    Flagged, missing walkthrough and output sample
  5. Upgrade path safe?                Partial  N/A    Flagged, no scoped reset/migrate path
  6. Dev environment friction-free?    Mixed    N/A    Not confirmed, no direct smoke-first path
═══════════════════════════════════════════════════════════════
CONFIRMED = both agree. This phase ran in `[subagent-only]` mode.

### Developer Journey Map

| Stage | Developer does | Friction today | Planned fix |
|---|---|---|---|
| 1. Discover | sees broker can help with capability misses | unclear whether miss means discover or install | split true miss vs install-required |
| 2. Trigger miss | runs a broker-first request | no visible hello-world acquisition path | add small smoke walkthrough |
| 3. Read result | inspects decline / CLI output | generic discovery wording | install-specific action / subreason |
| 4. Install | follows package guidance | install surface may be underspecified | structured install plan with verify step |
| 5. Verify | reruns or checks doctor | verify rules not obvious | explicit verify contract and sample output |
| 6. Retry | re-run request | unclear whether same run / same host / same CLI works | align broker + workflow + host payload |
| 7. Reuse | repeats a similar request later | memory semantics invisible | doctor shows first reuse after install |
| 8. Recover | something goes wrong | only blunt purge path | scoped acquisition-memory reset/migrate |
| 9. Upgrade | mixed old/new traces exist | no documented migration story | versioned store + tolerant formatter |

### Developer Empathy Narrative

> 我是第一次碰这个 acquisition flow 的开发者。  
> 我能看出 broker 觉得“你缺一个能力”，但它到底是在让我去发现工具，还是已经替我选好了该装哪个 package，不够清楚。  
> 如果我真装完了，我还不知道该看哪里确认“现在 broker 真的认得它了”。  
> 如果 memory 文件坏了，我也不想为了一个 ranking store 把整套 shared home 都 purge 掉。  
> 这条路应该像 Docker 的 hello-world 一样短，失败了也知道下一步，不该像读内部 plumbing。

### DX Passes

#### Pass 1: Getting Started Experience

- Score: `3/10 -> 7/10`
- Fix to 10:
  - add one direct miss -> plan -> verify -> reuse smoke walkthrough
  - make the first visible result appear before memory/metrics work

#### Pass 2: API/CLI/SDK Design

- Score: `4/10 -> 7/10`
- Fix to 10:
  - install-required must not be named discovery
  - expose install-specific host action or equivalent first-class outcome metadata

#### Pass 3: Error Messages & Debugging

- Score: `4/10 -> 7/10`
- Fix to 10:
  - read / write / verify failures need explicit reason codes
  - every failure must say problem + cause + fix

#### Pass 4: Documentation & Learning

- Score: `4/10 -> 7/10`
- Fix to 10:
  - walkthrough
  - output sample
  - helper placeholder explained honestly

#### Pass 5: Upgrade & Migration

- Score: `5/10 -> 7/10`
- Fix to 10:
  - versioned store
  - reset / migrate story for acquisition memory

#### Pass 6: Developer Environment & Tooling

- Score: `6/10 -> 7/10`
- Fix to 10:
  - smoke path callable from one visible command
  - debug / trace sample for local verification

#### Pass 7: Community & Ecosystem

- Score: `5/10 -> 7/10`
- Fix to 10:
  - document exactly what this packet covers and what it does not
  - keep generic discovery helper from pretending to be a full workflow

#### Pass 8: Measurement & Feedback Loops

- Score: `6/10 -> 8/10`
- Fix to 10:
  - add acquisition conversion metrics
  - explicitly track TTHW and first visible win

### DX Scorecard

| Dimension | Initial | After review fixes | Notes |
|---|---:|---:|---|
| Getting Started | 3 | 7 | needs vertical slice smoke path |
| API / CLI Design | 4 | 7 | install miss must stop reading as discovery |
| Errors & Debugging | 4 | 7 | reason codes + actionable guidance |
| Docs & Learning | 4 | 7 | walkthrough + sample output |
| Upgrade & Migration | 5 | 7 | versioned store + scoped reset |
| Dev Environment & Tooling | 6 | 7 | smoke path + debug sample |
| Community & Ecosystem | 5 | 7 | honest positioning of placeholder/helper |
| Measurement & Feedback | 6 | 8 | conversion metrics + TTHW target |

Overall:

- initial score: `4/10`
- after plan fixes: `7/10`
- TTHW: `12 min -> 5 min`

### DX Implementation Checklist

- [ ] add install-specific action/outcome metadata
- [ ] add one direct smoke walkthrough for miss -> plan -> verify -> reuse
- [ ] add explicit acquisition read/write/verify reason codes
- [ ] add example output for host/CLI/doctor
- [ ] add scoped acquisition-memory reset/migrate path
- [ ] document helper placeholder truth in README and plan

> **Phase 3.5 complete.** DX overall: 7/10. TTHW: 12 min -> 5 min.
> Codex: unavailable. Claude subagent: 5 issues.
> Consensus: 0/6 confirmed, 0 disagreements, 6 single-model dimensions surfaced due `[subagent-only]`.
> Passing to Phase 4 (Final Gate).

## Cross-Phase Themes

**Theme: contract truth must be honest end-to-end** — flagged in CEO, Eng, and DX. The same install-required fact must read the same way in broker results, workflow blocks, host/CLI output, and doctor metrics.

**Theme: first visible win must come before metrics polish** — flagged in CEO and DX. A vertical slice smoke proof has to land before memory/metrics/docs theater.

**Theme: acquisition memory is advisory shared-home state, not a trust bypass** — flagged in CEO, Eng, and DX. It needs versioning, provenance, TTL, fail-open semantics, and a scoped reset path.

**Theme: generic discovery helper must not steal concrete package installs** — flagged in CEO and Eng. Placeholder identity must be locked before new sources/ranking are added.

## Phase 4: Final Approval

Final gate result:

- User selected `A`
- Approved as-is
- No overrides
- No user challenges were raised

Implementation consequence:

- this plan is now the approved execution baseline for the discovery/install flywheel packet
- the next step is implementation, not another planning loop
- `/ship` is only relevant after code lands and the implementation proof is green

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open (via `/autoplan`) | mode: `SELECTIVE_EXPANSION`, `4` critical gaps |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open (via `/autoplan`) | `16` issues, `4` critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 1 | clean (via `/autoplan`) | score: `4/10 -> 7/10`, TTHW: `12 min -> 5 min` |

**UNRESOLVED:** `0`

**VERDICT:** CEO + Eng + DX reviews completed via `/autoplan`. Plan approved as-is. Implementation can start, but code is not ready for `/ship` until the approved packet is built and verified.
