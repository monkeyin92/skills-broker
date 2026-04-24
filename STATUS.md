# STATUS

This file is the repo-native execution board for `skills-broker`.

- `shipped_remote` means the proof set is valid on `HEAD` and on the shipping ref.
- `shipped_local` means the proof set is valid on `HEAD` but not yet on the shipping ref.
- `delayed`, `blocked`, and `in_progress` still require proof. Claims without proof are treated as red.

## Human Summary

- The discovery/install flywheel packet is now shipped on the active shipping ref: install-required is a first-class outcome, acquisition memory and verified downstream manifests both compound reuse, and `doctor` / repo docs now tell the same operator truth.
- Phase 1 QA default-entry proof is now shipped on `origin/main`: website QA stays the single first move across repo docs and installed shells, and doctor truth keeps that operator-facing loop honest.
- The Phase 2 family-proof packet is now shipped on the active shipping ref: website QA remains the only hero lane, web markdown is the second proven family, and doctor JSON/text, installed shells, and repo docs now mirror that same operator truth.
- The Phase 7 social-markdown family packet is now shipped locally on `HEAD`: website QA remains the hero lane, web markdown remains the second proven family, social markdown is now the next proven family, and the new loop is proven through the same install -> verify -> cross-host reuse rails.
- The Phase 7 investigation workflow packet is now shipped locally on `HEAD`: `investigation-to-fix` is the second broker-owned workflow, start/resume parity now holds across Claude Code, Codex, and OpenCode, and website QA remains a separate maintained lane instead of being swallowed by the workflow.
- The Phase 7 MCP registry explainability packet is now shipped locally on `HEAD`: MCP candidates now carry validated version / transport / endpoint / query-coverage metadata, broker explanations surface that registry evidence, and advisory MCP suggestions still stay behind installed/local winners.
- The Phase 8 CI trust guardrail packet is now shipped on the active shipping ref: Supported now: Claude Code, Codex, OpenCode. Claude Code, Codex, and OpenCode now share full published lifecycle and proof/reuse parity. Published lifecycle commands: npx skills-broker update / npx skills-broker doctor / npx skills-broker remove. website QA remains the hero lane. web markdown remains the second proven family. social markdown is now the next proven family. `npm run ci:blind-spot` now budgets the repo's high-risk surfaces, `npm run test:ci:narrative-parity` explicitly guards docs plus installed shell truth, and `verify:local` remains the local preflight instead of pretending to be CI truth.
- The Phase 9 canonical release gate packet is now shipped on the active shipping ref: `npm run release:gate` collapses the blind-spot report, focused narrative parity suite, and strict repo-scoped doctor gate into one repo-local release verdict with failing rail, shipping ref, and remote freshness, while `verify:local` stays local-only.
- The Phase 10 repo-owned proof promotion packet is now shipped on the active shipping ref: `npm run release:promote` re-evaluates canonical `STATUS.md` truth against the shipping ref, upgrades only eligible `shipped_local` items to `shipped_remote`, and fails closed on ship-ref, refresh, proof, or mismatch blockers.
- The Phase 11 publish-flow closure packet is now shipped on the active shipping ref: `.github/workflows/publish-npm.yml` now runs `release:gate` before publish, `release:promote` after publish, pushes promoted `STATUS.md` truth back to the default branch, and closes out on the same canonical release gate.
- The Phase 12 website-QA routing-confidence packet is now shipped on the active shipping ref: clear website QA asks cross the coarse broker-first boundary more reliably, nearby page-level phrasing stays fail-closed, and `doctor` now surfaces website QA routing evidence directly.
- The Phase 13 website-QA repeat-usage packet is now shipped on the active shipping ref: the website QA loop now proves repeat usage and cross-host reuse on the three-host shared-home surface, and `doctor` now distinguishes the two states.
- The v1.4 website-QA adoption-signal packet is now shipped on the active shipping ref: `doctor` now exposes a website QA adoption packet with recent routing evidence, freshness, per-host coverage, and refresh guidance; adoption health follows that packet instead of historical proof alone; and STATUS / CI trust now mirror the same packet fail-closed.
- The v1.5 QA-first family-loop packet is now shipped on the active shipping ref: QA-first family loop: website QA first, web markdown second, social markdown third. After a successful website QA proof, the next proven loop to run is web markdown. After web markdown, social markdown is the next proven loop. `doctor` now exposes a QA-first family-loop packet: website QA adoption plus web markdown/social markdown freshness, reuse, and sequence-aware next actions.
- Hosts choose only `broker_first`, `handle_normally`, or `clarify_before_broker`; the broker still chooses the concrete QA winner.
- `doctor` now exposes a website QA adoption packet: recent routing evidence, freshness, and separate repeat-usage / cross-host reuse proof states.
- `doctor` now exposes a QA-first family-loop packet: website QA adoption plus web markdown/social markdown freshness, reuse, and sequence-aware next actions.
- Compatibility-intent routing metrics are shipped on `origin/main`.
- The query-native request migration tail is now shipped on the active shipping ref: top-level public requests stay `capabilityQuery`-native, and legacy cache/session records migrate forward without hiding compatibility-assisted routing.
- The package-vs-leaf identity migration tail is now shipped on the active shipping ref: discovery, workflow stages, managed host seeds, and legacy workflow sessions all keep package-plus-leaf identity explicit and treat `implementation.id` as execution metadata only.
- The coarse broker-first host boundary tightening is now shipped on the active shipping ref.
- The Phase 2 / Phase 3 broker-first compiler, gate, and recovery slice is now shipped on `origin/main`.
- The web-markdown downstream hardening packet is now shipped on the active shipping ref: broker-selected local skills hand off by file path, broken downstream retries stay in-lane, stale cross-lane cache winners are ignored, and shared-home update auto-repairs the broker-managed `baoyu-fetch` runtime.
- The OpenCode three-host lifecycle/proof packet is now shipped on the active shipping ref: Supported now: Claude Code, Codex, OpenCode. Claude Code, Codex, and OpenCode now share full published lifecycle and proof/reuse parity. Published lifecycle commands stay pinned to `npx skills-broker update`, `npx skills-broker doctor`, and `npx skills-broker remove`. website QA remains the hero lane. web markdown remains the second proven family. social markdown is now the next proven family. All supported hosts now share the same shared broker home, thin host shell, proof/reuse state, and published lifecycle contract.
- The Phase 4 operator-truth packet remains the readiness baseline that locked the support-matrix seam, hero lane, second proven family, and third-host parity checklist before the Phase 5 support flip landed.

<!-- skills-broker-status:start -->
```json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "discovery-install-flywheel",
      "title": "Discovery/install flywheel packet",
      "summary": "Install-required is now a first-class broker outcome, acquisition memory and verified downstream manifests compound reuse across hosts, and doctor plus repo docs expose that truth end to end.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "README.md",
          "label": "quickstart and operator truth"
        },
        {
          "type": "file",
          "path": "TODOS.md",
          "label": "backlog truth mirrored"
        },
        {
          "type": "file",
          "path": "src/broker/run.ts",
          "label": "install-required and downstream-manifest retrieval contract"
        },
        {
          "type": "file",
          "path": "src/broker/acquisition-memory.ts",
          "label": "shared-home acquisition memory store"
        },
        {
          "type": "file",
          "path": "src/broker/downstream-manifest-source.ts",
          "label": "verified downstream manifest source"
        },
        {
          "type": "test",
          "path": "tests/integration/broker-flow.test.ts",
          "label": "install, verify, reuse, and cross-host manifest replay coverage"
        },
        {
          "type": "test",
          "path": "tests/broker/acquisition-memory.test.ts",
          "label": "acquisition memory schema and replay coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor acquisition and downstream-manifest coverage"
        },
        {
          "type": "test",
          "path": "tests/cli/lifecycle-cli.test.ts",
          "label": "CLI lifecycle and doctor contract coverage"
        }
      ]
    },
    {
      "id": "adoption-proof",
      "title": "Phase 1 QA default-entry proof",
      "summary": "Shared-home lifecycle commands now surface an explicit adoption health verdict, while website QA remains the QA default-entry lane and doctor truth is mirrored across installed-shell smoke plus repo docs.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "16d549b",
          "label": "broker-first gate and recovery baseline"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "operator lifecycle wording"
        },
        {
          "type": "file",
          "path": "TODOS.md",
          "label": "phase outcome mirrored in repo backlog"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor adoption health coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/update-lifecycle.test.ts",
          "label": "update adoption health coverage"
        },
        {
          "type": "test",
          "path": "tests/cli/lifecycle-cli.test.ts",
          "label": "CLI adoption health and strict-path coverage"
        },
        {
          "type": "test",
          "path": "tests/e2e/host-auto-routing-smoke.test.ts",
          "label": "installed-shell confidence smoke"
        },
        {
          "type": "test",
          "path": "tests/e2e/shared-home-smoke.test.ts",
          "label": "shared-home doctor confidence smoke"
        }
      ]
    },
    {
      "id": "phase2-family-proofs",
      "title": "Phase 2 family-proof packet",
      "summary": "Canonical family proofs now keep website QA as the single hero lane while web markdown becomes the second proven family across doctor, installed shells, integration proof, and repo docs.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/shared-home/doctor.ts",
          "label": "canonical familyProofs plus websiteQaLoop compatibility alias"
        },
        {
          "type": "file",
          "path": "src/hosts/skill-markdown.ts",
          "label": "installed-shell hero-lane versus second-proven-family wording"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english operator-facing second-proven-family wording"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese operator-facing second-proven-family wording"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor family-proof coverage"
        },
        {
          "type": "test",
          "path": "tests/integration/broker-flow.test.ts",
          "label": "web markdown install, verify, and cross-host reuse proof"
        },
        {
          "type": "test",
          "path": "tests/hosts/host-shell-install.test.ts",
          "label": "installed-shell wording hierarchy coverage"
        }
      ]
    },
    {
      "id": "phase4-operator-truth-readiness",
      "title": "Phase 4 operator-truth and third-host readiness packet",
      "summary": "Phase 4 locked the support-matrix seam, lifecycle wording, hero lane, second proven family, and third-host parity checklist before the Phase 5 support flip landed.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/core/operator-truth.ts",
          "label": "canonical operator truth contract"
        },
        {
          "type": "file",
          "path": "src/hosts/skill-markdown.ts",
          "label": "installed host shell reuses canonical truth"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english operator truth and lifecycle wording"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese operator truth and lifecycle wording"
        },
        {
          "type": "file",
          "path": "TODOS.md",
          "label": "backlog readiness contract mirrored"
        },
        {
          "type": "file",
          "path": "docs/superpowers/specs/2026-04-22-third-host-thin-shell-readiness.md",
          "label": "third-host readiness checklist"
        },
        {
          "type": "test",
          "path": "tests/shared-home/operator-truth-parity.test.ts",
          "label": "cross-surface operator-truth parity coverage"
        },
        {
          "type": "test",
          "path": "tests/hosts/host-shell-install.test.ts",
          "label": "installed-shell truth and boundary coverage"
        },
        {
          "type": "test",
          "path": "tests/e2e/shared-home-smoke.test.ts",
          "label": "shared-home smoke for installed-shell truth reuse"
        }
      ]
    },
    {
      "id": "phase5-opencode-thin-host-shell",
      "title": "Phase 5 OpenCode thin-host shipping packet",
      "summary": "Supported now: Claude Code, Codex, OpenCode. Claude Code, Codex, and OpenCode now share full published lifecycle and proof/reuse parity. website QA remains the hero lane. web markdown remains the second proven family. social markdown is now the next proven family. All supported hosts now share the same shared broker home, thin host shell, proof/reuse state, and published lifecycle contract.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/core/operator-truth.ts",
          "label": "canonical supported-host and full-parity contract"
        },
        {
          "type": "file",
          "path": "src/hosts/opencode/install.ts",
          "label": "OpenCode thin host shell installer"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english three-host support matrix"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese three-host support matrix"
        },
        {
          "type": "file",
          "path": "TODOS.md",
          "label": "post-parity backlog truth"
        },
        {
          "type": "test",
          "path": "tests/shared-home/operator-truth-parity.test.ts",
          "label": "operator-truth parity coverage"
        },
        {
          "type": "test",
          "path": "tests/e2e/shared-home-smoke.test.ts",
          "label": "three-host shared-home smoke"
        },
        {
          "type": "test",
          "path": "tests/e2e/host-auto-routing-smoke.test.ts",
          "label": "OpenCode installed-shell routing smoke"
        }
      ]
    },
    {
      "id": "phase8-ci-trust-guardrails",
      "title": "Phase 8 CI trust guardrail packet",
      "summary": "Supported now: Claude Code, Codex, OpenCode. Claude Code, Codex, and OpenCode now share full published lifecycle and proof/reuse parity. Published lifecycle commands: npx skills-broker update / npx skills-broker doctor / npx skills-broker remove. website QA remains the hero lane. web markdown remains the second proven family. social markdown is now the next proven family. CI now runs a blind-spot report plus a focused narrative parity suite before broader build/test/status jobs, while verify:local stays local-only.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/dev/ci-trust.ts",
          "label": "dynamic CI blind-spot report"
        },
        {
          "type": "file",
          "path": ".github/workflows/ci.yml",
          "label": "trust job wiring"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english local-vs-ci trust explanation"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese local-vs-ci trust explanation"
        },
        {
          "type": "test",
          "path": "tests/dev/ci-trust.test.ts",
          "label": "blind-spot and workflow wiring coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/operator-truth-parity.test.ts",
          "label": "focused narrative parity coverage"
        },
        {
          "type": "test",
          "path": "tests/hosts/host-shell-install.test.ts",
          "label": "installed-shell narrative parity coverage"
        }
      ]
    },
    {
      "id": "phase9-release-gate-verdicts",
      "title": "Phase 9 canonical release gate packet",
      "summary": "`npm run release:gate` now turns the CI blind-spot report, focused narrative parity suite, and strict repo-scoped doctor gate into one canonical repo-local release verdict with failing rail, shipping ref, and remote freshness diagnostics.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/dev/release-truth.ts",
          "label": "repo-owned release gate orchestration"
        },
        {
          "type": "file",
          "path": "scripts/release-truth.mjs",
          "label": "release truth CLI entrypoint"
        },
        {
          "type": "file",
          "path": "package.json",
          "label": "release gate npm script surface"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english release gate wording"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese release gate wording"
        },
        {
          "type": "test",
          "path": "tests/dev/release-truth.test.ts",
          "label": "release gate verdict coverage"
        }
      ]
    },
    {
      "id": "phase10-proof-promotion-flow",
      "title": "Phase 10 repo-owned proof promotion packet",
      "summary": "`npm run release:promote` now re-evaluates canonical `STATUS.md` truth against the shipping ref, upgrades only eligible `shipped_local` items to `shipped_remote`, and leaves `STATUS.md` untouched when ship-ref, refresh, proof, or mismatch blockers exist.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/dev/release-truth.ts",
          "label": "repo-owned proof promotion flow"
        },
        {
          "type": "file",
          "path": "package.json",
          "label": "release promotion npm script surface"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english proof promotion wording"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese proof promotion wording"
        },
        {
          "type": "test",
          "path": "tests/dev/release-truth.test.ts",
          "label": "proof promotion rewrite and fail-closed coverage"
        }
      ]
    },
    {
      "id": "phase11-publish-flow-closure",
      "title": "Phase 11 canonical publish closure packet",
      "summary": "The npm publish workflow now reuses canonical release truth end to end: pre-publish `release:gate`, post-publish `release:promote`, pushback of promoted `STATUS.md`, and final closeout on the same repo-owned release gate.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": ".github/workflows/publish-npm.yml",
          "label": "publish flow reuses canonical release truth"
        },
        {
          "type": "file",
          "path": "README.md",
          "label": "english publish closure wording"
        },
        {
          "type": "file",
          "path": "README.zh-CN.md",
          "label": "chinese publish closure wording"
        },
        {
          "type": "file",
          "path": "TODOS.md",
          "label": "backlog truth mirrors publish closure"
        },
        {
          "type": "test",
          "path": "tests/dev/release-truth.test.ts",
          "label": "publish workflow release truth wiring coverage"
        }
      ]
    },
    {
      "id": "compatibility-intent-routing-metrics",
      "title": "Compatibility-intent routing metrics",
      "summary": "doctor can roll up hit, misroute, and fallback by request surface from persisted traces.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "001090d",
          "label": "feat: add compatibility-intent routing metrics"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor routing metrics coverage"
        }
      ]
    },
    {
      "id": "query-native-request-tail",
      "title": "Query-native request migration tail",
      "summary": "Modern broker requests now stay query-native end to end, while legacy cache and workflow/session records dual-read once and rewrite forward with explicit compatibility-assisted trace semantics.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "94805e0",
          "label": "feat: finish query-native broker request migration"
        },
        {
          "type": "file",
          "path": "src/broker/resolved-request.ts",
          "label": "resolved-request compatibility seam"
        },
        {
          "type": "test",
          "path": "tests/broker/resolved-request.test.ts",
          "label": "canonical query identity coverage"
        },
        {
          "type": "test",
          "path": "tests/integration/broker-flow.test.ts",
          "label": "legacy cache rewrite and compatibility-assisted routing coverage"
        },
        {
          "type": "test",
          "path": "tests/broker/workflow-session-store.test.ts",
          "label": "legacy workflow session migration coverage"
        }
      ]
    },
    {
      "id": "package-leaf-identity-tail",
      "title": "Package-vs-leaf identity migration tail",
      "summary": "Discovery, workflow stages, managed host seeds, and legacy workflow sessions now keep package-plus-leaf identity explicit and treat implementation ids as execution metadata only.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/core/capability-card.ts",
          "label": "explicit package-plus-leaf identity wins over implementation metadata"
        },
        {
          "type": "test",
          "path": "tests/broker/discover.test.ts",
          "label": "discovery dedupe canonical leaf coverage"
        },
        {
          "type": "test",
          "path": "tests/broker/workflow-runtime.test.ts",
          "label": "workflow stage identity coverage"
        },
        {
          "type": "test",
          "path": "tests/broker/workflow-session-store.test.ts",
          "label": "legacy session write-forward coverage"
        }
      ]
    },
    {
      "id": "coarse-broker-first-boundary",
      "title": "Coarse broker-first host boundary tightening",
      "summary": "Hosts stay at the coarse broker-first boundary instead of trying to decide subskills at the entry surface.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "61d642d",
          "label": "feat: tighten coarse broker-first host boundary"
        }
      ]
    },
    {
      "id": "phase12-website-qa-routing-confidence",
      "title": "Phase 12 website QA routing confidence packet",
      "summary": "Clear website QA asks now cross the coarse broker-first boundary more reliably, nearby page-level phrasing stays fail-closed, and doctor surfaces website QA routing evidence directly.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/broker/query-compiler.ts",
          "label": "website QA normalization and QA discovery/install-help routing"
        },
        {
          "type": "file",
          "path": "src/shared-home/doctor.ts",
          "label": "website QA routing summary"
        },
        {
          "type": "test",
          "path": "tests/e2e/phase2-coarse-boundary-eval.test.ts",
          "label": "three-host coarse-boundary parity coverage"
        },
        {
          "type": "test",
          "path": "tests/e2e/host-auto-routing-smoke.test.ts",
          "label": "installed-shell website QA routing smoke"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor website QA routing evidence coverage"
        }
      ]
    },
    {
      "id": "phase13-website-qa-repeat-usage-loop",
      "title": "Phase 13 website QA repeat-usage loop",
      "summary": "The website QA proof loop now reaches repeat-usage and cross-host reuse on the three-host shared-home surface, and doctor surfaces those proof states separately.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/shared-home/doctor.ts",
          "label": "repeat-usage versus cross-host reuse proof states"
        },
        {
          "type": "file",
          "path": "src/shared-home/format.ts",
          "label": "operator-facing doctor wording for repeat usage and cross-host reuse"
        },
        {
          "type": "test",
          "path": "tests/integration/broker-flow.test.ts",
          "label": "website QA install -> verify -> repeat-usage -> cross-host proof"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor repeat-usage and cross-host reuse coverage"
        },
        {
          "type": "test",
          "path": "tests/cli/lifecycle-cli.test.ts",
          "label": "CLI doctor proof-shape coverage"
        }
      ]
    },
    {
      "id": "phase15-website-qa-adoption-signals",
      "title": "Phase 15 website QA adoption signals",
      "summary": "`doctor` now exposes a website QA adoption packet with recent routing evidence, freshness, per-host coverage, and refresh guidance instead of leaving maintainers to reconstruct the current signal from raw traces.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/shared-home/doctor.ts",
          "label": "website QA adoption packet aggregation"
        },
        {
          "type": "file",
          "path": "src/shared-home/format.ts",
          "label": "operator-facing adoption packet output"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor adoption packet active versus stale coverage"
        }
      ]
    },
    {
      "id": "phase16-website-qa-freshness-health",
      "title": "Phase 16 website QA freshness health",
      "summary": "`adoptionHealth` now follows the website QA adoption packet, blocking on missing / stale / incomplete QA-first signal and proving stale-to-fresh refresh transitions on the shared-home surface.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/shared-home/adoption-health.ts",
          "label": "website QA freshness-aware adoption health"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "stale-to-fresh adoption health transitions"
        },
        {
          "type": "test",
          "path": "tests/e2e/shared-home-smoke.test.ts",
          "label": "three-host shared-home smoke with current QA signal"
        },
        {
          "type": "test",
          "path": "tests/e2e/status-doctor-git.test.ts",
          "label": "strict doctor stays green only when QA signal is current"
        }
      ]
    },
    {
      "id": "phase17-adoption-signal-audit-truth",
      "title": "Phase 17 adoption-signal audit truth",
      "summary": "Operator docs, canonical `STATUS.md`, and CI trust now mirror the same website QA adoption packet wording so adoption-signal freshness drift fails closed instead of decaying into narrative-only truth.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/core/operator-truth.ts",
          "label": "canonical adoption-packet wording"
        },
        {
          "type": "file",
          "path": "src/dev/ci-trust.ts",
          "label": "CI trust adoption-packet checks"
        },
        {
          "type": "test",
          "path": "tests/shared-home/operator-truth-parity.test.ts",
          "label": "operator truth and STATUS adoption-packet parity"
        },
        {
          "type": "test",
          "path": "tests/dev/ci-trust.test.ts",
          "label": "CI trust report stays green on the live adoption-packet surfaces"
        }
      ]
    },
    {
      "id": "phase18-qa-first-family-hierarchy",
      "title": "Phase 18 QA-first family hierarchy",
      "summary": "QA-first family loop: website QA first, web markdown second, social markdown third. After a successful website QA proof, the next proven loop to run is web markdown. After web markdown, social markdown is the next proven loop.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/core/operator-truth.ts",
          "label": "canonical hierarchy and next-loop wording"
        },
        {
          "type": "file",
          "path": "src/hosts/skill-markdown.ts",
          "label": "installed-shell hierarchy guidance"
        },
        {
          "type": "test",
          "path": "tests/shared-home/operator-truth-parity.test.ts",
          "label": "docs and status hierarchy parity"
        },
        {
          "type": "test",
          "path": "tests/hosts/host-shell-install.test.ts",
          "label": "installed-shell hierarchy coverage"
        }
      ]
    },
    {
      "id": "phase19-family-loop-freshness-reuse",
      "title": "Phase 19 family-loop freshness and reuse",
      "summary": "`doctor` now exposes `familyLoopSignals`, surfacing web markdown and social markdown freshness, reuse, host coverage, and sequence-aware refresh guidance next to website QA adoption.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/shared-home/doctor.ts",
          "label": "familyLoopSignals packet aggregation"
        },
        {
          "type": "file",
          "path": "src/shared-home/format.ts",
          "label": "doctor family-loop packet text output"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "family-loop packet active/stale/missing coverage"
        },
        {
          "type": "test",
          "path": "tests/e2e/shared-home-smoke.test.ts",
          "label": "shared-home smoke for family-loop packet reuse visibility"
        }
      ]
    },
    {
      "id": "phase20-family-loop-truth-rails",
      "title": "Phase 20 family-loop truth rails",
      "summary": "`doctor` now exposes a QA-first family-loop packet: website QA adoption plus web markdown/social markdown freshness, reuse, and sequence-aware next actions. Docs, installed shells, STATUS, TODOS, and CI trust now fail closed on that shared wording.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/core/operator-truth.ts",
          "label": "canonical family-loop packet wording"
        },
        {
          "type": "file",
          "path": "src/dev/ci-trust.ts",
          "label": "CI trust family-loop packet checks"
        },
        {
          "type": "test",
          "path": "tests/shared-home/operator-truth-parity.test.ts",
          "label": "docs and status family-loop packet parity"
        },
        {
          "type": "test",
          "path": "tests/hosts/host-shell-install.test.ts",
          "label": "installed-shell family-loop packet coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/doctor.test.ts",
          "label": "doctor family-loop packet wording coverage"
        },
        {
          "type": "test",
          "path": "tests/dev/ci-trust.test.ts",
          "label": "live repo CI trust stays green on family-loop truth rails"
        }
      ]
    },
    {
      "id": "phase2-phase3-query-compiler-migration",
      "title": "Phase 2 / Phase 3 broker-first compiler and recovery slice",
      "summary": "Broker-owned query compilation, maintained-family gate diagnostics, and peer-surface recovery are shipped on the active shipping ref.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "commit",
          "ref": "16d549b",
          "label": "feat: add maintained broker-first compiler contract"
        },
        {
          "type": "commit",
          "ref": "46ff8b6",
          "label": "feat: harden shared-home broker-first recovery"
        },
        {
          "type": "test",
          "path": "tests/broker/query-compiler.test.ts",
          "label": "query compiler contract coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/broker-first-gate.test.ts",
          "label": "maintained-family gate coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/update-lifecycle.test.ts",
          "label": "peer-surface recovery lifecycle coverage"
        },
        {
          "type": "test",
          "path": "tests/cli/lifecycle-cli.test.ts",
          "label": "clear-manual-recovery keeps doctor strict green"
        }
      ]
    },
    {
      "id": "web-markdown-downstream-hardening",
      "title": "Web-markdown downstream hardening packet",
      "summary": "Broker-selected local skills now hand off by file path, broken downstream retries rerank only within the active compatibility lane, stale cross-lane cache winners are ignored, and shared-home update auto-repairs the broker-managed baoyu-fetch runtime used by web-markdown downstream skills.",
      "status": "shipped_remote",
      "proofs": [
        {
          "type": "file",
          "path": "src/broker/local-skill-handoff.ts",
          "label": "local-skill handoff source resolution"
        },
        {
          "type": "file",
          "path": "src/broker/handoff.ts",
          "label": "handoff envelope carries broker-resolved local-skill source"
        },
        {
          "type": "file",
          "path": "src/broker/run.ts",
          "label": "in-lane recovery reranking, stale-cache guard, and placeholder-seed filtering"
        },
        {
          "type": "file",
          "path": "src/shared-home/downstream-runtime-repair.ts",
          "label": "baoyu-fetch runtime auto-repair"
        },
        {
          "type": "file",
          "path": "src/shared-home/update.ts",
          "label": "shared-home update invokes downstream runtime repair"
        },
        {
          "type": "test",
          "path": "tests/integration/broker-flow.test.ts",
          "label": "routing, retry, and stale-cache recovery coverage"
        },
        {
          "type": "test",
          "path": "tests/broker/local-skill-handoff.test.ts",
          "label": "local-skill handoff resolution coverage"
        },
        {
          "type": "test",
          "path": "tests/shared-home/update-lifecycle.test.ts",
          "label": "downstream runtime repair lifecycle coverage"
        }
      ]
    }
  ]
}
```
<!-- skills-broker-status:end -->
