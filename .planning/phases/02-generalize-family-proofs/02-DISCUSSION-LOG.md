# Phase 2: Generalize Family Proofs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 02-generalize-family-proofs
**Areas discussed:** proof surface, second proven family scope, semantic matching policy, operator narrative

---

## Proof Surface

| Option | Description | Selected |
|--------|-------------|----------|
| `familyProofs` canonical + keep `websiteQaLoop` as compatibility alias | New family work lands in reusable proof summaries, while strict gate and Phase 1 surfaces stay stable | Yes |
| Keep hard-coded `websiteQaLoop` as the primary abstraction and bolt web markdown beside it | Faster short term, but duplicates the next family and blocks reusable proof growth | No |
| Remove `websiteQaLoop` immediately | Cleaner abstraction, but too much cleanup risk for a brownfield phase that should stay scope-tight | No |

**Decision:** 推荐第一种。用户确认继续推进，没有提出要重开 alias cleanup。

## Second Proven Family Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Web markdown only | 只把 `web_content_to_markdown` 做成第二条 proven family，避免 scope 爆炸 | Yes |
| Web markdown + social-post markdown | 一次做两条 family，范围更大，验证面更重 | No |
| Generic all maintained families | 会把产品承诺偷渡成“通用能力搜索”，超出当前 phase | No |

**Decision:** 推荐只做 web markdown。它已经有 seed metadata、semantic resolver、integration proof 骨架，是最小且真实的第二条 proven loop。

## Semantic Matching Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Broker-owned deterministic resolver + fail-closed thresholds | 延续 explainable / auditable 产品方向，clarify / unsupported 继续有明确边界 | Yes |
| 继续扩 regex compiler | 能短期加规则，但不能证明 family-proof growth architecture | No |
| 交给 host 或模型自由解释 | 会破坏 cross-host 一致性、doctor truth 和 deterministic product shape | No |

**Decision:** 推荐 deterministic resolver。现有 spec 和代码都已经沿这个方向铺好，不应该在 Phase 2 改哲学。

## Operator Narrative

| Option | Description | Selected |
|--------|-------------|----------|
| Website QA remains sole first move; web markdown is second proven family | 保持 Phase 1 的 hero lane 不被冲淡，同时让产品开始像“能扩的 broker” | Yes |
| QA 和 web markdown 平铺成多个 first move | 会削弱默认入口叙事，破坏 Phase 1 刚锁住的 truth | No |
| 只在代码里做 family growth，不对 operator surface 讲第二条 proven family | 会让 ENTRY-03 和 Phase 2 的 operator truth 价值打折 | No |

**Decision:** 推荐 “one hero lane, two proven loops”。产品叙事进一层，但不重置首页心智。

## Folded Todo

| Item | Reason | Selected |
|------|--------|----------|
| Generalize maintained-family semantic contract after QA default-entry proof is hard | Phase 1 已完成，这个 backlog item 正好就是 Phase 2 的增长锚点 | Yes |

## Deferred Ideas

- `social_post_to_markdown` 作为第三条 proven family
- open-domain capability search / embeddings / model classifier
- 第三个 thin host shell（OpenCode）
- 借机大拆 `doctor.ts` / `run.ts` 的 oversized module

## Notes

- 本次 discuss 采用建议优先的 builder 默认值：基于 roadmap、Phase 1 context、semantic resolver 设计文档和当前代码现状先收敛 recommended defaults。
- 用户确认继续推进，没有对推荐默认值提出反对，因此这些建议被锁进 `02-CONTEXT.md`，供后续 plan/research 使用。
