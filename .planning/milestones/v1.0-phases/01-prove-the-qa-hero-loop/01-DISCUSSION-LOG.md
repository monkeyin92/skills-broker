# Phase 1: Prove The QA Hero Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-prove-the-qa-hero-loop
**Areas discussed:** doctor truth surface, entry narrative strength, QA boundary strictness, proof completion bar

---

## Doctor truth surface

| Option | Description | Selected |
|--------|-------------|----------|
| Keep QA-specific proof surface for Phase 1 | Continue using `websiteQaLoop`, strengthen verdict-first operator truth, defer family abstraction | ✓ |
| Generalize to `familyProofs` now | Rebuild the proof surface so QA and web markdown share one generic structure immediately | |
| Keep only generic counters | Avoid lane-specific verdicts and rely on traces / counts for diagnosis | |

**User's choice:** Keep the Phase 1 doctor surface QA-specific and verdict-first.
**Notes:** User accepted the recommendation that Phase 1 should harden the already-shipped QA truth instead of pulling Phase 2’s family-proof abstraction forward.

---

## Entry narrative strength

| Option | Description | Selected |
|--------|-------------|----------|
| One hero path | README and installed shell teach website QA as the first move; other lanes remain secondary | ✓ |
| Equal-weight maintained lanes | Keep QA, requirements, investigation, markdown at roughly the same narrative priority | |
| QA-only framing | Present the product as if website QA were effectively the only lane that matters | |

**User's choice:** One hero path.
**Notes:** The user agreed that Phase 1 should teach one obvious first move without pretending the product has only one capability.

---

## QA boundary strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Precision-first | Explicit website QA intent goes `broker_first`; vague page-analysis asks go to `clarify_before_broker` | ✓ |
| Broad catch-all | Route most page/site inspection language into QA to maximize hero-lane hits | |
| Relax now, tighten later | Allow some ambiguous routing during Phase 1 and fix edge cases afterward | |

**User's choice:** Precision-first.
**Notes:** The user agreed that Phase 1 should protect QA-lane trust even if that means lower apparent hit rate for vague asks.

---

## Proof completion bar

| Option | Description | Selected |
|--------|-------------|----------|
| Full QA loop with cross-host reuse | Require `INSTALL_REQUIRED -> install -> HANDOFF_READY -> cross-host reuse`, plus doctor truth for that lane | ✓ |
| Same-host only | Accept `INSTALL_REQUIRED -> install -> rerun` on one host as enough for Phase 1 | |
| Include family-proof generalization too | Treat Phase 1 as incomplete unless QA and web markdown already share one generalized proof surface | |

**User's choice:** Full QA loop with cross-host reuse, but no family-proof generalization yet.
**Notes:** The user accepted that cross-host reuse is already part of the phase’s real trust bar, while family-proof abstraction belongs in Phase 2.

---

## the agent's Discretion

- Exact copy edits in README / README.zh-CN / installed shell, provided they preserve hero-lane priority
- Test helper extraction, fixture naming, and assertion organization
- Exact field naming / formatting details for QA-specific verdict output, provided the surface remains verdict-first and fail-closed

## Deferred Ideas

- Generalize QA-specific proof state into reusable `familyProofs`
- Promote `web_content_to_markdown` as the second fully proven lane
- Add more default-entry families after QA-first trust is earned
- Add OpenCode as the third thin host shell
