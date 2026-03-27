import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { resolveLifecyclePaths } from "../../src/shared-home/paths";
import { readManagedShellManifest } from "../../src/shared-home/ownership";

describe("shared-home lifecycle paths", () => {
  it("prefers overrides but falls back to ~/.skills-broker and default host dirs", () => {
    const paths = resolveLifecyclePaths({
      brokerHomeOverride: undefined,
      claudeDirOverride: undefined,
      codexDirOverride: undefined,
      homeDirectory: "/tmp/home"
    });

    expect(paths.brokerHomeDirectory).toBe("/tmp/home/.skills-broker");
    expect(paths.claudeCodeInstallDirectory).toBe("/tmp/home/.claude-code-plugin");
    expect(paths.codexInstallDirectory).toBe(
      "/tmp/home/.codex/skills/webpage-to-markdown"
    );
  });

  it("writes an ownership manifest for managed host shells", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-owned-shell-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".codex",
      "skills",
      "webpage-to-markdown"
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory
      });

      const manifest = JSON.parse(
        await readFile(join(result.installDirectory, ".skills-broker.json"), "utf8")
      ) as { managedBy?: string };

      expect(manifest.managedBy).toBe("skills-broker");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reads a managed shell manifest from the shell directory", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-detect-shell-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".codex",
      "skills",
      "webpage-to-markdown"
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory
      });

      const manifest = await readManagedShellManifest(codexShellDirectory);

      expect(manifest).toMatchObject({
        managedBy: "skills-broker",
        host: "codex",
        brokerHome: brokerHomeDirectory
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
