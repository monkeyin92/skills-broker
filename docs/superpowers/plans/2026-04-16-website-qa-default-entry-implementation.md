<!-- /autoplan restore point: /Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/main-autoplan-restore-20260416-215839.md -->
# Website QA Default-Entry Implementation Plan

Generated for `/autoplan` on 2026-04-16
Branch: `main`
Status: DRAFT

## Problem Statement

`skills-broker` 的 runtime truth 基本已经齐了。

- discovery/install flywheel 已经 shipped，`INSTALL_REQUIRED`、verify、reuse、cross-host memory 都是真实 contract，见 [README.md](/Users/monkeyin/projects/skills-broker/README.md:254) 和 [STATUS.md](/Users/monkeyin/projects/skills-broker/STATUS.md:11)
- 当前小湖已经明确覆盖 markdown、requirements、website QA、investigation，见 [README.md](/Users/monkeyin/projects/skills-broker/README.md:90)
- OpenCode 仍然明确 deferred，当前 supported hosts 还是 Claude Code + Codex，见 [TODOS.md](/Users/monkeyin/projects/skills-broker/TODOS.md:7)

但产品入口还没有收口。

今天 README、README.zh-CN、host shell 文案都还在讲“几条 maintained family 的小湖”，没有把其中一条变成默认入口心智。结果是：

- 用户能看懂系统有能力
- 用户还不容易形成“这类事我先找 broker”的习惯

上一轮 `/office-hours` 已经把方向定死了：`v1` 要定义成默认入口产品，不是再讲架构，也不是讲第三宿主。第一条要打穿的垂直切片是 `website QA`，第一魔法时刻是 `install-required -> verify -> reuse`，设计文档见 [monkeyin-main-design-20260416-160500.md](/Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/monkeyin-main-design-20260416-160500.md)。

这次实现包要做的，不是重写 runtime，而是把已经 shipped 的 truth 收成一个更清楚的入口面。

## What Makes This Cool

用户不需要知道 `gstack.qa`、`qa-only`、manifest name 或 package id。

他们看到的应该是一个更简单的产品句子：

> 想知道网站现在够不够好，先找 broker。

而且这个句子不是空话。

- 第一次 ask，broker 能命中 website QA family
- 没装就返回 `INSTALL_REQUIRED`
- 装完再跑，broker verify 成功
- 下次换到另一个 host，还能直接 reuse

这不是“换了个 README 标题”。
这是把已经发货的 runtime 价值，变成第一次就能感知的产品体验。

## Constraints

- 不重开 query-native migration、package-vs-leaf migration、host expansion
- 不把这次变成大规模 runtime packet
- 不假装 broad coverage 已经成立，README 仍然要诚实地说这是小湖
- 不让 requirements / investigation 消失，它们保持 supported maintained lanes
- 保持 Claude Code + Codex 为当前 support matrix
- 改动优先落在产品叙事、host shell first impression、proof 对齐

## Premises

1. `v1` 应该被定义成一个默认入口产品 packet，而不是更多技术尾巴。
2. 第一用户是 Claude Code / Codex 重度用户，他们知道想要结果，但不想记 skill 名。
3. 第一个 hero family 应该是 `website QA`，不是 `requirements`，也不是 `investigation`。
4. 第一魔法时刻应该明确写成 `install-required -> verify -> reuse`。
5. 这次先做一个窄而完整的入口面对齐包，优先改用户第一次看到和第一次复用到的地方。

## Current State -> This Plan -> 12-Month Ideal

```text
CURRENT STATE
  Runtime truth is real
  Website QA is already a maintained broker-first family
  README and host shell copy still present the product as a general small lake
  The user sees capability breadth before they see default-entry habit

THIS PLAN
  Make website QA the clear hero path in README and README.zh-CN
  Make host shell broker-first examples visibly lead with website QA
  Add light proof that installed shell copy still teaches the QA-first entry
  Keep requirements and investigation as supported, but not coequal hero flows

12-MONTH IDEAL
  skills-broker owns a recognizable default-entry habit
  Users start with broker for a few obvious repeated families
  New hosts amplify an existing habit instead of masking its absence
  More families can be added without weakening the core product sentence
```

## Approaches Considered

### Approach A: Docs + Host Entry Alignment Around Website QA

Summary: 以最小 blast radius 改掉产品第一印象。让 README、README.zh-CN、host shell installed skill copy 都先讲 website QA 这条 hero flow，并补一层 smoke proof 把这个表述锁住。

Effort: M
Risk: Low
Pros:

- 直接命中默认入口产品问题
- 最大复用已有 runtime truth
- 风险低，回报快
- 可以当成后续更深 packet 的第一落点

Cons:

- 不会单靠这一包就创造真实 usage
- 更像“入口产品化”而不是“能力扩展”

### Approach B: 直接做 requirements / QA / investigation 三条等权 hero lane

Summary: 同时重写 docs 和 host shell copy，让三条 maintained lane 都变得更突出。

Effort: M
Risk: Medium
Pros:

- 产品看起来更完整
- 不会有人质疑“为什么只挑 QA”

Cons:

- 入口记忆变弱
- 更像功能列表，不像默认入口

### Approach C: 先接 OpenCode，再回来做入口产品

Summary: 先扩大 supported host matrix，再回头整理 hero flow。

Effort: L
Risk: High
Pros:

- 看起来更像在扩张

Cons:

- 直接绕过当前真正缺的东西
- 新宿主会放大“没有默认入口心智”的问题

## Recommended Approach

Approach A。

这次实现包应该很明确：

- `website QA` 成为 README 和 host shell 的 hero flow
- `install-required -> verify -> reuse` 成为最先被看到的 loop
- `requirements` 和 `investigation` 留在 supported lanes，不再跟 QA 抢第一句话

## Success Criteria

- [README.md](/Users/monkeyin/projects/skills-broker/README.md) 首屏附近能读出 `website QA` 是默认入口产品，不只是 maintained lane 之一
- [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md) 与英文版讲同一件事
- [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts) 的 broker-first examples 和 runner examples 明显先给 QA 心智
- 已有 smoke tests 能证明 installed host shell 仍包含 QA-first contract，而不是只断言 `# Skills Broker`
- 文案仍然诚实保留“小湖、非 broad coverage、OpenCode deferred”的 repo truth

## Non-goals

- 新 runtime outcome
- 新 host shell
- 新 maintained family
- workflow runtime 重构
- 新 registry source
- release / version bump

## What Already Exists

| Sub-problem | Existing code / docs | Reuse decision |
| --- | --- | --- |
| 小湖和当前 phase 叙事 | [README.md](/Users/monkeyin/projects/skills-broker/README.md:90) | 直接改，不新建第二套叙事 |
| 中文镜像文档 | [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md:96) | 同步改，保持 truth 对齐 |
| Host shell coarse boundary 文案生成 | [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:10) | 复用生成点，不在 install 脚本里硬编码 |
| Installed shell smoke | [tests/e2e/claude-code-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts:50), [tests/e2e/shared-home-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts:108) | 在现有 smoke 上补 entry-copy proof |

## NOT in Scope

- 把 website QA 做成新的 runtime lane，理由：它已经是 maintained family
- 改 `doctor` 的 metrics shape，理由：当前 packet 解决的是入口叙事，不是 telemetry contract
- 改 `STATUS.md` shipped state，理由：这次不是一个新的 shipped runtime slice
- 接 OpenCode，理由：P2，且会模糊当前 packet 的问题定义

## Implementation Slices

### Slice 0: README Hero Flow Alignment

目标: 让英文和中文 README 在最前面的产品叙事里先讲 website QA 的默认入口价值。

涉及文件:

- [README.md](/Users/monkeyin/projects/skills-broker/README.md)
- [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)

要做的事:

- 在 scope / product phase / quickstart 附近把 `website QA` 提到第一 hero position
- 在 install-required walkthrough 里用 QA 作为 canonical first example
- 保留 requirements / investigation 作为 supported maintained families，但不与 QA 等权抢入口
- 保留 current limits / roadmap / production-ready truth，不做虚胖

### Slice 1: Host Shell First-Impression Alignment

目标: 让安装后的 `SKILL.md` 在用户第一次读 host boundary 文案时，优先建立 QA-first 心智。

涉及文件:

- [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts)

要做的事:

- 调整 `BROKER_FIRST_EXAMPLES` 顺序，让 website QA 示例更靠前、更集中
- 检查 runner debug example 是否继续用 QA，避免入口例子互相打架
- 不破坏 coarse boundary 原则，不让 host 直接判断 `qa` vs `investigation`

### Slice 2: Proof Rail Lock

目标: 给这次入口表述变更补一层低成本 proof，避免下次文案回退时没人发现。

涉及文件:

- [tests/e2e/claude-code-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts)
- [tests/e2e/shared-home-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts)

要做的事:

- 断言 installed shell copy 里包含 website QA 相关 example / phrasing
- 只锁住 hero entry truth，不把整段 copy snapshot 化

## Affected Files

```text
docs/superpowers/plans/2026-04-16-website-qa-default-entry-implementation.md
README.md
README.zh-CN.md
src/hosts/skill-markdown.ts
tests/e2e/claude-code-smoke.test.ts
tests/e2e/shared-home-smoke.test.ts
```

## Architecture Sketch

```text
office-hours design
  -> implementation plan
  -> README / README.zh-CN hero flow
  -> installed host shell wording
  -> smoke assertions on installed wording
  -> clearer default-entry product surface
```

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Premises accepted without reopening problem framing | mechanical | P6 Bias toward action | The user already approved following the recommended office-hours direction, and the repo evidence still supports it | Re-asking premise confirmation |
| 2 | CEO | Keep this packet as the first v1 entry-alignment slice, not “the whole v1” | mechanical | P3 Pragmatic | This avoids overclaiming and keeps the packet honest to shipped runtime truth | Marketing it as full product completion |
| 3 | CEO | Hold scope to README, README.zh-CN, host shell wording, and smoke proof | mechanical | P2 Boil lakes | This is the full blast radius for the default-entry problem without reopening runtime migrations | OpenCode, new lane work, runtime outcome changes |
| 4 | CEO | Skip video/GIF walkthrough expansion for now | taste | P3 Pragmatic | It could help conversion, but it is outside the narrow packet and not required to prove the entry sentence | Adding media assets in this packet |
| 5 | Eng | Reuse `buildHostShellSkillMarkdown()` as the only host-copy source of truth | mechanical | P4 DRY | The generator already feeds both host installers, so fixing the wording there removes drift cheaply | Hardcoding host copy in install surfaces |
| 6 | Eng | Add narrow smoke assertions for QA-first wording, not full copy snapshots | mechanical | P5 Explicit over clever | Presence checks lock the contract without creating brittle paragraph snapshots | Snapshotting full generated markdown |
| 7 | Eng | Keep README verification manual instead of adding docs snapshot tests | taste | P3 Pragmatic | README copy should be reviewed in diff, but automating full prose checks would create noise for little protection | README snapshot tests |
| 8 | DX | Infer primary developer as heavy Claude Code / Codex user who wants outcome-first routing | mechanical | P6 Bias toward action | README, package description, and the design doc all point at the same technical builder persona | Reframing to novice or enterprise-only persona |
| 9 | DX | Target competitive TTHW under 5 minutes, not champion-tier hosted sandbox | mechanical | P3 Pragmatic | The current product surface is CLI + host shells, and the repo already sets `<5 min` as the active DX bar | Building a hosted playground first |
| 10 | DX | Use a copy-paste QA request as the magical moment delivery vehicle | mechanical | P5 Explicit over clever | It matches the actual product surface and reuses the installed host path the repo already supports | Interactive playground or video-first onboarding |

## AUTOPLAN REVIEW

Base branch: `main`
Design doc: [monkeyin-main-design-20260416-160500.md](/Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/monkeyin-main-design-20260416-160500.md)
UI scope: no
DX scope: yes
Outside voice: `codex exec` unavailable, usage limit hit on 2026-04-16. Continuing in single-reviewer mode.

## Phase 1: CEO Review

### 0A. Premise Challenge

- **Is this the right problem to solve?** Yes. Repo truth says the runtime contract is already unusually complete for a v0, but the product still reads like a broad small lake instead of a default entry. If we do nothing, `skills-broker` stays “interesting infra” instead of becoming a habit.
- **Actual user outcome:** a heavy Claude Code / Codex user should know what to try first without learning skill names. For this packet, the outcome is: “I need QA on this website, broker first.”
- **What if we do nothing?** The README keeps describing breadth, the installed host shell keeps treating families as a flat list, and the first-use path stays cognitively heavier than it needs to be.

Premises accepted.
Reason: they match the active design doc, [README.md](/Users/monkeyin/projects/skills-broker/README.md:90), [README.md](/Users/monkeyin/projects/skills-broker/README.md:134), and [TODOS.md](/Users/monkeyin/projects/skills-broker/TODOS.md:7).

### 0B. Existing Code Leverage

| Sub-problem | Existing code | Reuse decision |
| --- | --- | --- |
| Hero product narrative | [README.md](/Users/monkeyin/projects/skills-broker/README.md:86), [README.zh-CN.md](/Users/monkeyin/projects/skills-broker/README.zh-CN.md:92) | Rewrite in place, do not add a second product doc |
| Installed shell first impression | [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:10) | Reuse the generator as the single wording source |
| Proof that installed shells still work | [tests/e2e/claude-code-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/claude-code-smoke.test.ts:50), [tests/e2e/shared-home-smoke.test.ts](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts:108) | Extend existing smoke tests, do not add a new test harness |
| Maintained QA family truth | [config/maintained-broker-first-families.json](/Users/monkeyin/projects/skills-broker/config/maintained-broker-first-families.json:15) | Reuse as proof that QA is already a real family, not a docs invention |

No rebuild detected. This plan reuses the right seams.

### 0C. Dream State Mapping

```text
CURRENT STATE                  THIS PLAN                         12-MONTH IDEAL
runtime truth is real   ->    QA becomes the first              broker owns a few
but first-use product         product sentence in docs          repeated default-entry
memory is weak                and installed host copy           habits across hosts
```

### 0C-bis. Implementation Alternatives

APPROACH A: Docs + host-entry alignment
  Summary: Reframe README surfaces and installed shell wording around website QA, then lock the new entry truth with smoke assertions.
  Effort:  M
  Risk:    Low
  Pros:    fixes the actual first-impression problem, reuses shipped runtime truth, stays within 6-file smell budget
  Cons:    does not by itself create adoption, relies on honest wording discipline
  Reuses:  README surfaces, host-shell generator, existing smoke tests

APPROACH B: Three equal hero lanes
  Summary: Rewrite docs and installed shell copy to hero requirements, QA, and investigation together.
  Effort:  M
  Risk:    Medium
  Pros:    broader-looking product surface, fewer “why QA?” objections
  Cons:    weaker memory, blurs the default-entry sentence, looks more complete than it feels
  Reuses:  same files as A

APPROACH C: Host expansion first
  Summary: Add OpenCode and revisit product entry after widening the matrix.
  Effort:  L
  Risk:    High
  Pros:    larger support story
  Cons:    magnifies the current product-entry weakness, directly conflicts with active repo priorities
  Reuses:  host-shell infrastructure only

**Recommendation:** Choose Approach A because it is the complete fix for the current blast radius without reopening adjacent oceans.

### 0D. Mode-Specific Analysis

Mode: `SELECTIVE EXPANSION`

- Complexity check: 6 touched files plus the plan file, no new classes or services. Under the smell threshold.
- Minimum set of changes: README, README.zh-CN, host shell generator, two smoke tests.
- Expansion scan:
  - Add a GIF/video walkthrough: skipped, outside the narrow packet.
  - Add a hosted playground: skipped, wrong product surface for this repo today.
  - Add explicit QA-first `doctor` copy examples in README: accepted, this belongs inside the existing README walkthrough.

### 0E. Temporal Interrogation

```text
HOUR 1 (foundations):     tighten the product sentence without overstating scope
HOUR 2-3 (core logic):    align the generated host-shell examples through one source
HOUR 4-5 (integration):   make smoke proof assert the new QA-first contract
HOUR 6+ (polish/tests):   keep English/Chinese docs mirrored and avoid brittle copy tests
```

### 0F. Mode Selection

Held at `SELECTIVE EXPANSION`, auto-confirmed.
Reason: this is an iteration packet on an existing system, not a greenfield feature, and the user explicitly asked to follow recommendations without more questions.

### CODEX SAYS (CEO — strategy challenge)

Unavailable. `codex exec` hit a usage limit on 2026-04-16 before producing a review.

### CEO DUAL VOICES — CONSENSUS TABLE

Because Codex was unavailable and subagents are disabled in this session, the table records primary-review findings plus missing external confirmation.

```text
CEO DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Premises valid?                   pass    N/A     N/A
  2. Right problem to solve?           pass    N/A     N/A
  3. Scope calibration correct?        pass    N/A     N/A
  4. Alternatives sufficiently explored?pass   N/A     N/A
  5. Competitive/market risks covered? warn    N/A     N/A
  6. 6-month trajectory sound?         warn    N/A     N/A
═══════════════════════════════════════════════════════════════
```

The two warnings are the same theme:
- if this packet presents itself as “the v1” instead of “the first v1 entry slice”, it will look inflated in 6 months
- if docs say QA-first but proof rails do not hold the installed-shell contract, the product sentence will drift

### Section 1: Architecture Review

No architecture issue found.

This plan stays on existing seams. It edits the two public README surfaces, one host-shell markdown generator, and two installed-shell smoke tests. It introduces no new runtime path, no new package identity contract, and no host-specific special case outside the existing generator.

Required system architecture diagram:

```text
README / README.zh-CN
          \
           -> website QA hero flow ----------------------\
                                                         -> user's first-use mental model
src/hosts/skill-markdown.ts -> installed SKILL.md ------/
                                   \
                                    -> smoke assertions keep the entry contract honest
```

### Section 2: Error & Rescue Map

Error & Rescue Registry:

| Method / Codepath | What can go wrong | Exception / failure class | Rescued? | Rescue action | User sees |
| --- | --- | --- | --- | --- | --- |
| README hero-flow rewrite | QA-first wording overclaims broad coverage | product-positioning drift | Y | keep “small first lake” and support-matrix limits intact | sharper entry story without fake breadth |
| README.zh-CN mirror | Chinese and English copy drift | mirror drift | Y | same structural edits in both files | bilingual consistency |
| `buildHostShellSkillMarkdown()` | QA-first examples regress or reorder silently | host-copy drift | Y | smoke assertions on generated `SKILL.md` | installed shell still teaches the right entry |
| smoke assertions | tests snapshot too much prose and become noisy | brittle docs proof | Y | assert narrow QA-first phrases only | stable proof, not noisy snapshots |

No unrescued error class found. This packet's real failure mode is drift, not exceptions.

### Section 3: Security & Threat Model

No security issue found.

This packet does not add endpoints, credentials, execution surfaces, or data mutation paths. The only security-adjacent risk is misleading users about supported scope, which is handled by preserving the explicit support-matrix and small-lake language.

### Section 4: Data Flow & Interaction Edge Cases

Data flow diagram:

```text
INPUT (design + repo truth)
  -> README / README.zh-CN wording
  -> installed host-shell wording
  -> smoke proof

SHADOW PATHS
  nil:   README changes but host-shell wording stays old
  empty: host-shell wording changes but no proof checks it
  error: docs imply broad coverage and user tries unsupported asks
```

Interaction edge cases handled by the plan:

| Interaction | Edge case | Handled? | How |
| --- | --- | --- | --- |
| First README read | user wants one concrete thing to try first | Y | QA becomes the hero family |
| README walkthrough | generic maintained-family wording hides the first move | Y | explicit QA example inside install-required loop |
| Installed shell read | host copy stays generic after docs sharpen | Y | generator update + smoke proof |
| Ongoing maintenance | copy snapshots become brittle and get deleted | Y | targeted contains assertions only |

### Section 5: Code Quality Review

No code-quality issue found.

The plan reuses the one correct host wording seam and explicitly avoids adding new abstractions or hardcoded host copies. The only intentional duplication is English and Chinese documentation, which is a product requirement, not accidental logic duplication.

### Section 6: Test Review

Current test ambition is right once Slice 2 lands: code-level proof for installed shell wording, manual review for README prose.

Failure Modes Registry:

| Codepath | Failure mode | Rescued? | Test? | User sees? | Logged? |
| --- | --- | --- | --- | --- | --- |
| generated host shell copy | QA example disappears | Y | planned | vague installed first impression | N/A |
| generated host shell copy | QA example exists but debug request no longer maps to `website-qa` | Y | existing + planned | broken product sentence | existing |
| README copy | English/Chinese hero flow diverges | partial | manual review | inconsistent story by language | N/A |
| README walkthrough | generic family wording survives in the key loop | Y | manual review | weaker first-use path | N/A |

No critical gap. The only non-automated area is README prose review, which is acceptable for this packet.

### Section 7: Performance Review

No performance issue found.

There is no new hot path, cache path, or runtime branch. The only cost added is marginal test assertion time in existing smoke suites.

### Section 8: Observability & Debuggability Review

No observability gap found inside this packet.

The existing proof rails already expose the underlying QA route through installed-shell smoke and debug QA requests. This packet should reuse those rails instead of inventing new metrics.

### Section 9: Deployment & Rollout Review

No deployment risk found.

This is a docs plus generated-copy packet. Rollback is a normal git revert. The only rollout check that matters is running the smoke tests that cover installed shell generation and QA debug routing.

### Section 10: Long-Term Trajectory Review

Two trajectory checks matter:

1. This packet is good if it is clearly framed as an entry-alignment slice.
2. This packet is bad if later readers mistake it for proof that adoption is already solved.

Reversibility: `5/5`
Debt introduced: low, as long as the proof rail is kept.

### Section 11: Design & UX Review

Skipped. No UI scope detected.

### Dream State Delta

After this packet, `skills-broker` will still be a small routed lake.

What changes is the first sentence the user learns. They stop learning “there are a few routed families” and start learning “website QA is a clean first thing to try.” The 12-month ideal still requires repeated default-entry families and real usage proof, but this packet gets the first one into shape.

### Completion Summary

```text
+====================================================================+
|            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
+====================================================================+
| Mode selected        | SELECTIVE EXPANSION                         |
| System Audit         | runtime truth already shipped, entry story weak |
| Step 0               | scope held to docs + host copy + smoke proof |
| Section 1  (Arch)    | 0 issues found                              |
| Section 2  (Errors)  | 4 drift paths mapped, 0 critical gaps       |
| Section 3  (Security)| 0 issues found                              |
| Section 4  (Data/UX) | 4 edge cases mapped, 0 unhandled            |
| Section 5  (Quality) | 0 issues found                              |
| Section 6  (Tests)   | Diagram produced, 0 critical gaps           |
| Section 7  (Perf)    | 0 issues found                              |
| Section 8  (Observ)  | 0 gaps found                                |
| Section 9  (Deploy)  | 0 risks flagged                             |
| Section 10 (Future)  | Reversibility: 5/5, debt items: 1           |
| Section 11 (Design)  | SKIPPED (no UI scope)                       |
+--------------------------------------------------------------------+
| NOT in scope         | written (4 items)                           |
| What already exists  | written                                     |
| Dream state delta    | written                                     |
| Error/rescue registry| 4 methods, 0 critical gaps                 |
| Failure modes        | 4 total, 0 critical gaps                   |
| TODOS.md updates     | 0 items proposed                           |
| Scope proposals      | 1 accepted, 2 skipped                      |
| CEO plan             | skipped, autoplan review attached inline   |
| Outside voice        | skipped, codex unavailable                 |
| Lake Score           | 10/10 recommendations chose complete option|
| Diagrams produced    | 3 (system, data flow, failure modes)      |
| Stale diagrams found | 0                                          |
| Unresolved decisions | 0                                          |
+====================================================================+
```

**Phase 1 complete.** Codex: unavailable. Primary review: 2 warnings, both about overclaim risk and proof drift. Consensus: unavailable. Passing to Phase 2.

## Phase 2: Design Review

Skipped. No UI scope detected in the plan or touched files.

## Phase 3: Eng Review

### Step 0: Scope Challenge

- Existing code already solves every non-doc sub-problem. The only meaningful implementation seam is [src/hosts/skill-markdown.ts](/Users/monkeyin/projects/skills-broker/src/hosts/skill-markdown.ts:10).
- Minimum viable change set is still the right one: `README.md`, `README.zh-CN.md`, `src/hosts/skill-markdown.ts`, and two smoke tests.
- Complexity check does not trigger. This packet touches fewer than 8 files and introduces no new classes.
- Search check: not needed. The plan does not introduce new infrastructure or concurrency patterns.
- Distribution check: not applicable. No new artifact type is being added.

### CODEX SAYS (eng — architecture challenge)

Unavailable. `codex exec` hit a usage limit before returning output.

### ENG DUAL VOICES — CONSENSUS TABLE

```text
ENG DUAL VOICES — CONSENSUS TABLE:
═══════════════════════════════════════════════════════════════
  Dimension                           Claude  Codex  Consensus
  ──────────────────────────────────── ─────── ─────── ─────────
  1. Architecture sound?               pass    N/A     N/A
  2. Test coverage sufficient?         warn    N/A     N/A
  3. Performance risks addressed?      pass    N/A     N/A
  4. Security threats covered?         pass    N/A     N/A
  5. Error paths handled?              pass    N/A     N/A
  6. Deployment risk manageable?       pass    N/A     N/A
═══════════════════════════════════════════════════════════════
```

The one warning is intentional: docs copy stays manual-review-only, while installed-shell wording gets automated proof.

### 1. Architecture Review

No architecture issue found.

ASCII dependency graph:

```text
README.md ------------------------------\
README.zh-CN.md -------------------------+--> default-entry product surface
src/hosts/skill-markdown.ts ------------/
          |
          +--> tests/e2e/claude-code-smoke.test.ts
          \--> tests/e2e/shared-home-smoke.test.ts
```

Realistic production failure scenario:
- A future refactor reorders or removes the QA example from generated `SKILL.md`.
- The plan accounts for it by extending installed-shell smoke tests rather than trusting manual review.

### 2. Code Quality Review

No code-quality issue found.

The main engineering preference here is DRY. The plan routes all host wording changes through the generator instead of creating Claude-only or Codex-only drift. It also avoids a false abstraction like “marketing message builder” because the existing generator already owns the right responsibility.

### 3. Test Review

Coverage diagram:

```text
CODE PATH COVERAGE
===========================
[+] src/hosts/skill-markdown.ts
    │
    └── buildHostShellSkillMarkdown()
        ├── [GAP]         QA-first examples remain present in generated copy
        └── [★★  TESTED]  Debug QA runner example still points at website QA flow

USER FLOW COVERAGE
===========================
[+] Installed Claude Code shell
    └── [GAP] [→SMOKE] generated SKILL.md contains QA-first wording

[+] Installed shared Codex shell
    └── [GAP] [→SMOKE] generated SKILL.md contains QA-first wording

[+] README / README.zh-CN hero flow
    ├── [MANUAL] English wording reviewed in diff
    └── [MANUAL] Chinese mirror reviewed in diff

─────────────────────────────────
COVERAGE AFTER PLAN: code proof on generated shell copy,
manual review on README prose, existing debug QA route preserved.
─────────────────────────────────
```

Test plan artifact written to:
[monkeyin-main-eng-review-test-plan-20260416-220143.md](/Users/monkeyin/.gstack/projects/monkeyin92-skills-broker/monkeyin-main-eng-review-test-plan-20260416-220143.md)

Why no README automation:
- Full prose snapshots would be brittle.
- The value of this packet is the entry sentence, not paragraph-perfect formatting.
- Manual diff review is the cleaner tool for README prose.

### 4. Performance Review

No performance issue found.

The packet adds no runtime work. The only measurable cost is a couple of string assertions inside smoke tests.

### Failure Modes

| Codepath | Failure mode | Test covers it? | Error handling exists? | User sees clear failure? |
| --- | --- | --- | --- | --- |
| generated shell copy | QA-first example removed | yes, planned smoke | yes | yes, test fails |
| debug QA route | wording changes but route still broken | yes, existing smoke path | yes | yes, test fails |
| README copy | EN/ZH mismatch | no automation | manual review | yes, diff review |
| README copy | overclaiming broad coverage | no automation | manual review | yes, diff review |

No silent failure mode with zero test and zero rescue.

### Worktree Parallelization Strategy

| Step | Modules touched | Depends on |
|------|-----------------|------------|
| Rewrite product narrative | `README.md`, `README.zh-CN.md` | — |
| Align installed shell wording | `src/hosts/` | — |
| Extend smoke proof | `tests/e2e/` | Align installed shell wording |

Parallel lanes:
- Lane A: rewrite README surfaces
- Lane B: `src/hosts/skill-markdown.ts` -> smoke assertions

Execution order:
- Launch Lane A and Lane B in parallel.
- Merge Lane B first if test text changes need to inform final wording.

Conflict flags:
- none at the module level

### Eng Completion Summary

- Step 0: scope accepted as-is
- Architecture Review: 0 issues found
- Code Quality Review: 0 issues found
- Test Review: diagram produced, 2 automation gaps filled by smoke assertions
- Performance Review: 0 issues found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 0 items proposed
- Failure modes: 0 critical gaps flagged
- Outside voice: unavailable
- Parallelization: 2 lanes, 1 parallel pair / 1 sequential follow-up
- Lake Score: 4/4 recommendations chose the complete option

**Phase 3 complete.** Codex: unavailable. Primary review: 1 warning about manual README review being intentional. Consensus: unavailable. Passing to Phase 3.5.

## Phase 3.5: DX Review

Mode: `DX POLISH`
Product type: developer tool for Claude Code / Codex hosts

### Developer Persona Card

```text
TARGET DEVELOPER PERSONA
========================
Who:       already-technical Claude Code / Codex heavy user
Context:   trying to get one repeated external-capability workflow working fast
Tolerance: under 5 minutes, under 3-4 obvious steps, no catalog browsing
Expects:   one concrete example to try first, clear install/verify loop, honest support matrix
```

### Developer Empathy Narrative

I open the README because I want to know whether this is real or another routing idea that sounds smart but takes 30 minutes to try. The top of the page tells me this is a broker for Claude Code and Codex. Good. I keep reading and hit the current scope section. It tells me there is a small lake with markdown, requirements, QA, investigation, and an `idea-to-ship` workflow. That is honest, but it still leaves me doing work. I now have to decide which of these I should try first. I scroll to Quick Start. The install command is clear. The `doctor` command is clear. Then I hit the install-required loop, and the docs still tell me to send “a maintained family such as requirements analysis, website QA, or investigation.” That is where the hesitation shows up. I do not want three equally plausible first moves. I want one. If the docs instead said “try website QA first,” I would know exactly what to paste into Claude Code or Codex and whether the product worked. If that same sentence also showed up in the installed host shell, I would trust the system more. That is the missing DX move.

### Competitive DX Benchmark

Search unavailable. Using reference benchmarks.

| Tool | TTHW | Notable DX Choice | Source |
| --- | --- | --- | --- |
| Stripe | ~30s | copy-paste API call with immediate real output | reference benchmark |
| Vercel | ~2 min | deploy magic front and center | reference benchmark |
| Firebase | ~3 min | guided quick start + SDK docs | reference benchmark |
| Docker hello-world | ~5 min | one command, visible success | reference benchmark |
| skills-broker (current target) | <5 min | install host shell, then paste one QA request | current repo DX bar |

### Magical Moment Specification

Chosen delivery vehicle: copy-paste demo request.

For this product, the magical moment is not a hosted playground. It is:

1. run `npx skills-broker update`
2. paste one website QA request into Claude Code or Codex
3. either see `INSTALL_REQUIRED` with a real next step, or see the QA route hand off
4. rerun after install and watch reuse become visible

### Developer Journey Map

| Stage | Developer does | Friction points | Status |
| --- | --- | --- | --- |
| Discover | reads README | too many equal first examples | fixed by QA-first hero flow |
| Install | runs `npx skills-broker update` | low | ok |
| Hello World | chooses first broker request | previously ambiguous | fixed by QA-first example |
| Real Usage | retries after install | needs clear verify expectation | fixed by README loop wording |
| Debug | reads installed shell wording | wording could drift from README | fixed by generator + smoke proof |
| Upgrade | reruns update / doctor later | no new upgrade work in this packet | ok |

### First-Time Developer Confusion Report

```text
FIRST-TIME DEVELOPER REPORT
============================
Persona: heavy Claude Code / Codex user
Attempting: skills-broker getting started

CONFUSION LOG:
T+0:00  I open the README and understand the concept.
T+0:45  I see several maintained families and do not know which one is the best first attempt.
T+1:30  I can run update, but I still need a canonical request to paste into my host.
T+2:30  If I pick the wrong example, I may leave thinking the product is vague rather than focused.
T+3:30  With a QA-first example, I know exactly what to try next.
```

### Pass 1: Getting Started Experience

Score: `8/10`

Why not 10 yet:
- the product still depends on host setup and broker-first wording discipline
- there is no hosted try-it-now surface

Why this packet helps:
- it collapses the first “what do I try?” branch into one clear QA example
- it aligns README and installed shell copy with the same first move

### Pass 2: API/CLI/SDK Design

Score: `8/10`

The CLI surface is already simple: `update`, `doctor`, `remove`. This packet does not change commands. The DX gain is that the example request inside the host now maps more directly to the intended mental model.

### Pass 3: Error Messages & Debugging

Score: `8/10`

This packet benefits from already-shipped operator truth: problem, cause, and fix are exposed through `INSTALL_REQUIRED`, `doctor`, and strict health checks. The docs change should lean into that explicit loop instead of hiding it behind generic family wording.

### Pass 4: Documentation & Learning

Score: `9/10`

This is the pass with the biggest gain. The docs already explain the lifecycle well. They were just slightly too even-handed about which request to try first.

### Pass 5: Upgrade & Migration Path

Score: `7/10`

No new upgrade work is needed for this packet. It inherits the repo's existing lifecycle commands and support-matrix honesty.

### Pass 6: Developer Environment & Tooling

Score: `8/10`

The packet works with the existing local dev path and smoke suites. No new environment burden.

### Pass 7: Community & Ecosystem

Score: `6/10`

This packet does not move community or ecosystem depth. That is okay because it is not trying to.

### Pass 8: DX Measurement & Feedback Loops

Score: `7/10`

The packet reuses existing smoke proof and `doctor` visibility. It does not add new instrumentation, which is acceptable for a narrow DX-polish slice.

### DX Scorecard

```text
+====================================================================+
|              DX PLAN REVIEW — SCORECARD                            |
+====================================================================+
| Dimension            | Score  | Prior  | Trend                     |
|----------------------|--------|--------|---------------------------|
| Getting Started      | 8/10   | —      | ↑                         |
| API/CLI/SDK          | 8/10   | —      | →                         |
| Error Messages       | 8/10   | —      | →                         |
| Documentation        | 9/10   | —      | ↑                         |
| Upgrade Path         | 7/10   | —      | →                         |
| Dev Environment      | 8/10   | —      | →                         |
| Community            | 6/10   | —      | →                         |
| DX Measurement       | 7/10   | —      | →                         |
+--------------------------------------------------------------------+
| TTHW                 | <5 min | —      | target held               |
| Competitive Rank     | Competitive                                   |
| Magical Moment       | designed via copy-paste QA request            |
| Product Type         | developer tool / Claude Code skill surface    |
| Mode                 | POLISH                                        |
| Overall DX           | 8/10                                         |
+====================================================================+
| DX PRINCIPLE COVERAGE                                               |
| Zero Friction      | improved                                       |
| Learn by Doing     | improved                                       |
| Fight Uncertainty  | covered                                        |
| Opinionated + Escape Hatches | covered                              |
| Code in Context    | covered                                        |
| Magical Moments    | improved                                       |
+====================================================================+
```

### DX Implementation Checklist

```text
DX IMPLEMENTATION CHECKLIST
============================
[x] Time to hello world < 5 min
[x] Installation is one command
[x] First run produces meaningful output
[x] Magical moment delivered via copy-paste QA request
[x] Every error message has: problem + cause + fix + docs link
[x] API/CLI naming is guessable without docs
[x] Every parameter has a sensible default
[x] Docs have copy-paste examples that actually work
[ ] Examples show real use cases, not just hello world
[x] Upgrade path documented with migration guide
[x] Breaking changes have deprecation warnings + codemods
[ ] TypeScript types included (if applicable)
[x] Works in CI/CD without special configuration
[ ] Free tier available, no credit card required
[ ] Changelog exists and is maintained
[ ] Search works in documentation
[ ] Community channel exists and is monitored
```

Unchecked items are outside this packet's scope.

**Phase 3.5 complete.** DX overall: 8/10. TTHW: under 5 minutes. Codex: unavailable. Consensus: unavailable. Passing to final implementation.

## Cross-Phase Themes

1. **Do not overclaim breadth.** Flagged in CEO and DX. High-confidence signal.
2. **Use existing proof rails instead of inventing new runtime.** Flagged in CEO and Eng. High-confidence signal.
3. **Make the first move obvious.** Flagged in CEO and DX. High-confidence signal.
