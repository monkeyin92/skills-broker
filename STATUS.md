# STATUS

This file is the repo-native execution board for `skills-broker`.

- `shipped_remote` means the proof set is valid on `HEAD` and on the shipping ref.
- `shipped_local` means the proof set is valid on `HEAD` but not yet on the shipping ref.
- `delayed`, `blocked`, and `in_progress` still require proof. Claims without proof are treated as red.

## Human Summary

- Compatibility-intent routing metrics are shipped on `origin/main`.
- The coarse broker-first host boundary tightening is now shipped on the active shipping ref.
- The Phase 2 / Phase 3 broker-first compiler, gate, and recovery slice is now shipped on `origin/main`.

<!-- skills-broker-status:start -->
```json
{
  "schemaVersion": 1,
  "items": [
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
    }
  ]
}
```
<!-- skills-broker-status:end -->
