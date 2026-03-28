# Npx Install Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a published `npx skills-broker` lifecycle CLI that can initialize/update/diagnose/remove a shared broker home and attach Claude Code + Codex thin shells without cloning the repository.

**Architecture:** Keep [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts) as the broker-runtime entrypoint consumed by host runners, and add a separate public npm bin entrypoint for lifecycle commands. Split lifecycle logic into path resolution, host detection, ownership-aware host shell management, and text/JSON serializers so `update`, `update --dry-run`, `doctor`, and `remove` all reuse one planning model while host-specific behavior stays at the edges.

**Tech Stack:** Node.js, TypeScript, npm package `bin`, `fs/promises`, `child_process`, Vitest

---

## File Structure

### Existing files to modify

- [`package.json`](/Users/monkeyin/projects/skills-broker/package.json)
  - remove `private`, add publishable metadata, `bin`, `files`, and lifecycle-friendly scripts
- [`src/shared-home/install.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/install.ts)
  - keep shared home install logic focused on shared runtime assets only
- [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
  - convert from repo-local helper into lifecycle command orchestrator
- [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
  - add ownership manifest write/read support and default install path handling
- [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
  - add ownership manifest write/read support and default install path handling
- [`tests/e2e/shared-home-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts)
  - stop relying on repo-local shell script and exercise the publishable CLI contract
- [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)
  - assert ownership metadata and absolute broker-home wiring
- [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
  - replace repo-local install path with `npx` lifecycle flow
- [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
  - sync Chinese install docs with the published lifecycle flow

### New files to create

- [`src/bin/skills-broker.ts`](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts)
  - public npm executable entrypoint
- [`src/shared-home/paths.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/paths.ts)
  - default `~/.skills-broker`, Claude Code, and Codex path resolution plus CLI overrides
- [`src/shared-home/detect.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/detect.ts)
  - host detection and writability checks
- [`src/shared-home/ownership.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/ownership.ts)
  - ownership manifest schema, read/write helpers, conflict detection
- [`src/shared-home/format.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts)
  - text + JSON serializers for lifecycle results
- [`src/shared-home/doctor.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts)
  - read-only environment diagnosis
- [`src/shared-home/remove.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/remove.ts)
  - managed-shell removal and optional destructive shared-home cleanup
- [`tests/cli/lifecycle-cli.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/lifecycle-cli.test.ts)
  - CLI parsing, subcommand dispatch, and `--json` contract
- [`tests/shared-home/update-lifecycle.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/update-lifecycle.test.ts)
  - `update` / `update --dry-run` behavior and conflict handling
- [`tests/shared-home/doctor.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/doctor.test.ts)
  - diagnosis output and missing-host scenarios
- [`tests/shared-home/remove.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/remove.test.ts)
  - remove behavior, managed-only deletion, explicit purge flag

### Files intentionally left alone

- [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts)
  - remains the broker-runtime entry used by host runner scripts
- [`scripts/update-shared-home.sh`](/Users/monkeyin/projects/skills-broker/scripts/update-shared-home.sh)
  - keep temporarily as a repo-local compatibility wrapper until the npm bin is proven; remove or reduce later

## Task 1: Publish A Real npm CLI Entry

**Files:**
- Modify: [`package.json`](/Users/monkeyin/projects/skills-broker/package.json)
- Create: [`src/bin/skills-broker.ts`](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts)
- Test: [`tests/cli/lifecycle-cli.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/lifecycle-cli.test.ts)

- [ ] **Step 1: Write the failing CLI contract test**

```ts
import { describe, expect, it } from "vitest";
import { runLifecycleCli } from "../../src/bin/skills-broker";

describe("lifecycle cli", () => {
  it("dispatches update --dry-run --json", async () => {
    const result = await runLifecycleCli([
      "update",
      "--dry-run",
      "--json",
      "--broker-home",
      "/tmp/test-home"
    ]);

    expect(result.command).toBe("update");
    expect(result.dryRun).toBe(true);
    expect(result.outputMode).toBe("json");
  });
});
```

- [ ] **Step 2: Run the targeted test and verify the missing entrypoint failure**

Run: `npx vitest run tests/cli/lifecycle-cli.test.ts`

Expected: FAIL with module-not-found or missing export for `runLifecycleCli`

- [ ] **Step 3: Add the public CLI entrypoint and package metadata**

```ts
// src/bin/skills-broker.ts
export type LifecycleCliResult = {
  command: "update" | "doctor" | "remove";
  dryRun: boolean;
  outputMode: "text" | "json";
};

export async function runLifecycleCli(argv: string[]): Promise<LifecycleCliResult> {
  const outputMode = argv.includes("--json") ? "json" : "text";
  const dryRun = argv.includes("--dry-run");
  const command = (argv[0] ?? "update") as LifecycleCliResult["command"];

  return { command, dryRun, outputMode };
}
```

```json
{
  "name": "skills-broker",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "skills-broker": "./dist/bin/skills-broker.js"
  },
  "files": [
    "dist",
    "README.md",
    "README.zh-CN.md",
    "LICENSE"
  ]
}
```

- [ ] **Step 4: Re-run the targeted CLI test**

Run: `npx vitest run tests/cli/lifecycle-cli.test.ts`

Expected: PASS

- [ ] **Step 5: Run the build to verify the bin compiles into `dist/bin`**

Run: `npm run build`

Expected: PASS and `dist/bin/skills-broker.js` exists

- [ ] **Step 6: Commit**

```bash
git add package.json src/bin/skills-broker.ts tests/cli/lifecycle-cli.test.ts
git commit -m "feat: add published lifecycle cli entrypoint"
```

## Task 2: Add Shared-Home Paths, Detection, And Ownership Primitives

**Files:**
- Create: [`src/shared-home/paths.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/paths.ts)
- Create: [`src/shared-home/detect.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/detect.ts)
- Create: [`src/shared-home/ownership.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/ownership.ts)
- Modify: [`src/hosts/claude-code/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/claude-code/install.ts)
- Modify: [`src/hosts/codex/install.ts`](/Users/monkeyin/projects/skills-broker/src/hosts/codex/install.ts)
- Test: [`tests/shared-home/update-lifecycle.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/update-lifecycle.test.ts)
- Test: [`tests/hosts/host-shell-install.test.ts`](/Users/monkeyin/projects/skills-broker/tests/hosts/host-shell-install.test.ts)

- [ ] **Step 1: Write failing tests for default paths, detection, and ownership**

```ts
it("prefers overrides but falls back to ~/.skills-broker and default host dirs", () => {
  const paths = resolveLifecyclePaths({
    brokerHomeOverride: undefined,
    claudeDirOverride: undefined,
    codexDirOverride: undefined,
    homeDirectory: "/tmp/home"
  });

  expect(paths.brokerHomeDirectory).toBe("/tmp/home/.skills-broker");
  expect(paths.codexInstallDirectory).toBe("/tmp/home/.codex/skills/webpage-to-markdown");
});

it("writes an ownership manifest for managed host shells", async () => {
  const result = await installCodexHostShell({
    installDirectory: codexShellDirectory,
    brokerHomeDirectory: brokerHomeDirectory
  });

  const manifest = JSON.parse(await readFile(join(result.installDirectory, ".skills-broker.json"), "utf8"));
  expect(manifest.managedBy).toBe("skills-broker");
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npx vitest run tests/shared-home/update-lifecycle.test.ts tests/hosts/host-shell-install.test.ts`

Expected: FAIL because path resolution helpers and ownership manifest do not exist yet

- [ ] **Step 3: Implement path resolution, detection, and ownership manifest helpers**

```ts
// src/shared-home/ownership.ts
export type ManagedShellManifest = {
  managedBy: "skills-broker";
  host: "claude-code" | "codex";
  version: string;
  brokerHome: string;
};

export const OWNERSHIP_FILE = ".skills-broker.json";

export async function readManagedShellManifest(shellDirectory: string) {
  // return parsed manifest or undefined
}
```

```ts
// src/shared-home/paths.ts
export function resolveLifecyclePaths(input: {
  homeDirectory?: string;
  brokerHomeOverride?: string;
  claudeDirOverride?: string;
  codexDirOverride?: string;
}) {
  // resolve ~/.skills-broker, ~/.codex/skills/webpage-to-markdown, and Claude default dir
}
```

- [ ] **Step 4: Update host installers to write ownership manifests next to the thin shell**

```ts
await writeManagedShellManifest(options.installDirectory, {
  managedBy: "skills-broker",
  host: "codex",
  version: DEFAULT_VERSION,
  brokerHome: brokerHomeDirectory
});
```

- [ ] **Step 5: Re-run the focused tests**

Run: `npx vitest run tests/shared-home/update-lifecycle.test.ts tests/hosts/host-shell-install.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared-home/paths.ts src/shared-home/detect.ts src/shared-home/ownership.ts src/hosts/claude-code/install.ts src/hosts/codex/install.ts tests/shared-home/update-lifecycle.test.ts tests/hosts/host-shell-install.test.ts
git commit -m "feat: add lifecycle path detection and ownership manifests"
```

## Task 3: Implement `update` And `update --dry-run`

**Files:**
- Modify: [`src/shared-home/install.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/install.ts)
- Modify: [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts)
- Create: [`src/shared-home/format.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts)
- Modify: [`src/bin/skills-broker.ts`](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts)
- Test: [`tests/shared-home/update-lifecycle.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/update-lifecycle.test.ts)
- Test: [`tests/cli/lifecycle-cli.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/lifecycle-cli.test.ts)

- [ ] **Step 1: Extend the failing tests to cover `update`, `--dry-run`, partial success, and `--json`**

```ts
it("dry-run reports planned installs without writing files", async () => {
  const result = await updateSharedBrokerHome({
    brokerHomeDirectory,
    codexInstallDirectory,
    dryRun: true
  });

  expect(result.command).toBe("update");
  expect(result.dryRun).toBe(true);
  expect(result.hosts[0].status).toBe("planned_install");
  await expect(access(join(codexInstallDirectory, "SKILL.md"))).rejects.toThrow();
});

it("continues when one host conflicts and the other installs", async () => {
  expect(result.status).toBe("degraded_success");
});
```

- [ ] **Step 2: Run the update-focused tests and capture the failures**

Run: `npx vitest run tests/shared-home/update-lifecycle.test.ts tests/cli/lifecycle-cli.test.ts`

Expected: FAIL because `updateSharedBrokerHome` does not support planning, dry-run, or JSON-ready result shapes

- [ ] **Step 3: Refactor `updateSharedBrokerHome` to return a structured lifecycle result**

```ts
export type HostLifecycleStatus =
  | "installed"
  | "updated"
  | "up_to_date"
  | "planned_install"
  | "skipped_not_detected"
  | "skipped_conflict"
  | "failed";

export type UpdateLifecycleResult = {
  command: "update";
  status: "success" | "degraded_success" | "failed";
  dryRun: boolean;
  sharedHome: { path: string; status: "installed" | "updated" | "planned" };
  hosts: Array<{ name: "claude-code" | "codex"; status: HostLifecycleStatus; reason?: string }>;
  warnings: string[];
};
```

- [ ] **Step 4: Add text and JSON serializers and wire them into the public CLI**

```ts
export function formatLifecycleResult(result: UpdateLifecycleResult, outputMode: "text" | "json") {
  if (outputMode === "json") {
    return JSON.stringify(result);
  }

  return [
    "skills-broker updated",
    "",
    `Shared home: ${result.sharedHome.path}`
  ].join("\n");
}
```

- [ ] **Step 5: Re-run the targeted lifecycle tests**

Run: `npx vitest run tests/shared-home/update-lifecycle.test.ts tests/cli/lifecycle-cli.test.ts`

Expected: PASS

- [ ] **Step 6: Run the full build and test suite before committing**

Run: `npm run build && npx vitest run`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared-home/install.ts src/shared-home/update.ts src/shared-home/format.ts src/bin/skills-broker.ts tests/shared-home/update-lifecycle.test.ts tests/cli/lifecycle-cli.test.ts
git commit -m "feat: add update and dry-run lifecycle flow"
```

## Task 4: Implement `doctor`

**Files:**
- Create: [`src/shared-home/doctor.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/doctor.ts)
- Modify: [`src/shared-home/format.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts)
- Modify: [`src/bin/skills-broker.ts`](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts)
- Test: [`tests/shared-home/doctor.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/doctor.test.ts)
- Test: [`tests/cli/lifecycle-cli.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/lifecycle-cli.test.ts)

- [ ] **Step 1: Write failing `doctor` tests for missing host, unwritable host, and JSON output**

```ts
it("explains why codex was not detected", async () => {
  const result = await doctorSharedBrokerHome({
    brokerHomeDirectory,
    codexInstallDirectory: missingCodexDir
  });

  expect(result.command).toBe("doctor");
  expect(result.hosts).toContainEqual(
    expect.objectContaining({
      name: "codex",
      status: "not_detected",
      reason: expect.stringContaining("missing")
    })
  );
});
```

- [ ] **Step 2: Run the targeted `doctor` tests and verify they fail**

Run: `npx vitest run tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts`

Expected: FAIL because `doctorSharedBrokerHome` does not exist

- [ ] **Step 3: Implement `doctorSharedBrokerHome` as a read-only report**

```ts
export type DoctorLifecycleResult = {
  command: "doctor";
  sharedHome: { path: string; exists: boolean };
  hosts: Array<{ name: "claude-code" | "codex"; status: "detected" | "not_detected" | "not_writable" | "conflict"; reason?: string }>;
  warnings: string[];
};
```

- [ ] **Step 4: Wire `doctor` into the CLI and serializers**

```ts
if (command === "doctor") {
  const result = await doctorSharedBrokerHome(options);
  process.stdout.write(formatLifecycleResult(result, outputMode));
  return result;
}
```

- [ ] **Step 5: Re-run the targeted tests**

Run: `npx vitest run tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared-home/doctor.ts src/shared-home/format.ts src/bin/skills-broker.ts tests/shared-home/doctor.test.ts tests/cli/lifecycle-cli.test.ts
git commit -m "feat: add doctor lifecycle command"
```

## Task 5: Implement `remove`

**Files:**
- Create: [`src/shared-home/remove.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/remove.ts)
- Modify: [`src/shared-home/format.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/format.ts)
- Modify: [`src/bin/skills-broker.ts`](/Users/monkeyin/projects/skills-broker/src/bin/skills-broker.ts)
- Test: [`tests/shared-home/remove.test.ts`](/Users/monkeyin/projects/skills-broker/tests/shared-home/remove.test.ts)
- Test: [`tests/cli/lifecycle-cli.test.ts`](/Users/monkeyin/projects/skills-broker/tests/cli/lifecycle-cli.test.ts)

- [ ] **Step 1: Write failing tests for managed-only removal and explicit purge**

```ts
it("removes managed codex shell but preserves shared broker home by default", async () => {
  const result = await removeSharedBrokerHome({
    brokerHomeDirectory,
    codexInstallDirectory
  });

  expect(result.command).toBe("remove");
  expect(result.sharedHome.status).toBe("preserved");
  await expect(access(join(codexInstallDirectory, "SKILL.md"))).rejects.toThrow();
  await expect(access(brokerHomeDirectory)).resolves.toBeUndefined();
});

it("skips unrelated conflicting directories", async () => {
  expect(result.hosts[0].status).toBe("skipped_conflict");
});
```

- [ ] **Step 2: Run the remove-focused tests and verify they fail**

Run: `npx vitest run tests/shared-home/remove.test.ts tests/cli/lifecycle-cli.test.ts`

Expected: FAIL because `removeSharedBrokerHome` does not exist

- [ ] **Step 3: Implement removal with explicit destructive flag support**

```ts
export type RemoveLifecycleResult = {
  command: "remove";
  sharedHome: { path: string; status: "preserved" | "purged" };
  hosts: Array<{ name: "claude-code" | "codex"; status: "removed" | "already_absent" | "skipped_conflict"; reason?: string }>;
  warnings: string[];
};
```

- [ ] **Step 4: Add CLI flag parsing for full cleanup without making it the default**

```ts
const purgeSharedHome = argv.includes("--purge") || argv.includes("--all");
```

- [ ] **Step 5: Re-run the targeted tests**

Run: `npx vitest run tests/shared-home/remove.test.ts tests/cli/lifecycle-cli.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared-home/remove.ts src/shared-home/format.ts src/bin/skills-broker.ts tests/shared-home/remove.test.ts tests/cli/lifecycle-cli.test.ts
git commit -m "feat: add remove lifecycle command"
```

## Task 6: Replace Repo-Local Smoke Coverage With Publishable CLI Coverage

**Files:**
- Modify: [`tests/e2e/shared-home-smoke.test.ts`](/Users/monkeyin/projects/skills-broker/tests/e2e/shared-home-smoke.test.ts)
- Modify: [`scripts/update-shared-home.sh`](/Users/monkeyin/projects/skills-broker/scripts/update-shared-home.sh)
- Modify: [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
- Modify: [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)

- [ ] **Step 1: Rewrite the smoke test to call the built npm bin entrypoint instead of the repo-local wrapper**

```ts
await execFileAsync("node", [
  join(process.cwd(), "dist", "bin", "skills-broker.js"),
  "update",
  "--broker-home",
  brokerHomeDirectory,
  "--claude-dir",
  claudeShellDirectory,
  "--codex-dir",
  codexShellDirectory
]);
```

- [ ] **Step 2: Run the e2e smoke test and verify the old script dependency breaks**

Run: `npx vitest run tests/e2e/shared-home-smoke.test.ts`

Expected: FAIL until the smoke path switches away from `scripts/update-shared-home.sh`

- [ ] **Step 3: Update the wrapper script to delegate to the built npm bin for local dev only**

```bash
node "${PROJECT_ROOT}/dist/bin/skills-broker.js" update \
  --broker-home "${BROKER_HOME_DIR}" \
  --claude-dir "${CLAUDE_SHELL_DIR}" \
  --codex-dir "${CODEX_SHELL_DIR}"
```

- [ ] **Step 4: Update both READMEs to make `npx skills-broker update` the official path**

```md
## Quick Start

Run `npx skills-broker update`.

Use `npx skills-broker doctor` to inspect the environment and `npx skills-broker remove` to detach managed host shells.
```

- [ ] **Step 5: Run end-to-end verification**

Run: `npm run build && npx vitest run tests/e2e/shared-home-smoke.test.ts && npx vitest run`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/shared-home-smoke.test.ts scripts/update-shared-home.sh README.md README.zh-CN.md
git commit -m "docs: switch install flow to published lifecycle cli"
```

## Task 7: Final Release Readiness Pass

**Files:**
- Modify: [`package.json`](/Users/monkeyin/projects/skills-broker/package.json)
- Modify: [`README.md`](/Users/monkeyin/projects/skills-broker/README.md)
- Modify: [`README.zh-CN.md`](/Users/monkeyin/projects/skills-broker/README.zh-CN.md)
- Modify: [`docs/superpowers/specs/2026-03-27-npx-install-design.md`](/Users/monkeyin/projects/skills-broker/docs/superpowers/specs/2026-03-27-npx-install-design.md)

- [ ] **Step 1: Verify the public command surface matches the spec exactly**

Checklist:

- `update`
- `update --dry-run`
- `doctor`
- `remove`
- `--json`
- `--broker-home`
- `--claude-dir`
- `--codex-dir`

- [ ] **Step 2: Run the full regression suite**

Run: `npm run build && npx vitest run`

Expected: PASS

- [ ] **Step 3: Manually smoke the built bin with no hosts detected**

Run: `node dist/bin/skills-broker.js update --broker-home /tmp/skills-broker-empty-home`

Expected: PASS with a success summary that reports the shared home initialized and hosts skipped/not detected

- [ ] **Step 4: Commit final alignment fixes**

```bash
git add package.json README.md README.zh-CN.md docs/superpowers/specs/2026-03-27-npx-install-design.md
git commit -m "chore: align lifecycle cli release surface"
```

## Implementation Notes

- Prefer small helpers over growing [`src/shared-home/update.ts`](/Users/monkeyin/projects/skills-broker/src/shared-home/update.ts) into a single giant file.
- Do not fold the public lifecycle CLI into [`src/cli.ts`](/Users/monkeyin/projects/skills-broker/src/cli.ts); host runners already depend on that file remaining a broker-runtime entrypoint.
- Keep ownership manifests host-local and small. The shared broker home should not need to inspect host-private files beyond the one manifest it owns.
- Keep `scripts/update-shared-home.sh` only as a local compatibility wrapper. The product contract is the npm bin, not the shell script.
- Preserve current shared cache behavior. The lifecycle work should not accidentally fork or rename the broker cache format unless a dedicated migration is added.

## Manual Review Checklist

- Does the CLI have one obvious public entrypoint?
- Can a user preview (`--dry-run`) before writes?
- Can a user diagnose (`doctor`) without writes?
- Can a user remove managed shells without losing shared history?
- Are conflicts explicit and non-destructive?
- Are all lifecycle commands machine-readable with `--json`?
- Does the smoke test prove the built bin, not just repo-local helpers?

## Execution Handoff

Plan complete and saved to [`docs/superpowers/plans/2026-03-28-npx-install-lifecycle.md`](/Users/monkeyin/projects/skills-broker/docs/superpowers/plans/2026-03-28-npx-install-lifecycle.md).

Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh worker per task, review between tasks, faster iteration

**2. Inline Execution** - execute tasks in this session using `executing-plans`, batching related steps with checkpoints
