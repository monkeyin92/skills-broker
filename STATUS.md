# STATUS

This file is the repo-native execution board for `skills-broker`.

- `shipped_remote` means the proof set is valid on `HEAD` and on the shipping ref.
- `shipped_local` means the proof set is valid on `HEAD` but not yet on the shipping ref.
- `delayed`, `blocked`, and `in_progress` still require proof. Claims without proof are treated as red.

## Human Summary

- The discovery/install flywheel packet is now shipped on the active shipping ref: install-required is a first-class outcome, acquisition memory and verified downstream manifests both compound reuse, and `doctor` / repo docs now tell the same operator truth.
- Phase 1 QA default-entry proof is now shipped on `origin/main`: website QA stays the single first move across repo docs and installed shells, and doctor truth keeps that operator-facing loop honest.
- The Phase 2 family-proof packet is now shipped locally on `HEAD`: website QA remains the only hero lane, web markdown is the second proven family, and doctor JSON/text, installed shells, and repo docs now mirror that same operator truth.
- Compatibility-intent routing metrics are shipped on `origin/main`.
- The query-native request migration tail is now shipped on the active shipping ref: top-level public requests stay `capabilityQuery`-native, and legacy cache/session records migrate forward without hiding compatibility-assisted routing.
- The package-vs-leaf identity migration tail is now shipped on the active shipping ref: discovery, workflow stages, managed host seeds, and legacy workflow sessions all keep package-plus-leaf identity explicit and treat `implementation.id` as execution metadata only.
- The coarse broker-first host boundary tightening is now shipped on the active shipping ref.
- The Phase 2 / Phase 3 broker-first compiler, gate, and recovery slice is now shipped on `origin/main`.
- The web-markdown downstream hardening packet is now shipped on the active shipping ref: broker-selected local skills hand off by file path, broken downstream retries stay in-lane, stale cross-lane cache winners are ignored, and shared-home update auto-repairs the broker-managed `baoyu-fetch` runtime.
- The Phase 4 operator-truth packet is now shipped locally on `HEAD`: Supported now: Claude Code, Codex. Deferred but planned: OpenCode thin host shell. Published lifecycle commands stay pinned to `npx skills-broker update`, `npx skills-broker doctor`, and `npx skills-broker remove`. website QA remains the hero lane. web markdown remains the second proven family. Third-host readiness stays gated on the same shared broker home, thin host shell, proof/reuse state, and published lifecycle parity.

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
      "status": "shipped_local",
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
      "summary": "Supported now: Claude Code, Codex. Deferred but planned: OpenCode thin host shell. website QA remains the hero lane. web markdown remains the second proven family. Third-host readiness stays gated on the same shared broker home, thin host shell, proof/reuse state, and published lifecycle parity.",
      "status": "shipped_local",
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
