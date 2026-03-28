import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { detectWritableDirectory } from "../../src/shared-home/detect";
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

  it("treats a missing target directory with a writable parent as creatable", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-detect-writable-")
    );
    const targetDirectory = join(runtimeDirectory, "nested", "target");
    const parentDirectory = join(runtimeDirectory, "nested");

    try {
      await mkdir(parentDirectory, { recursive: true });

      const state = await detectWritableDirectory(targetDirectory);

      expect(state.status).toBe("writable");
      expect(state.nearestExistingDirectory).toBe(parentDirectory);
      expect(state.checkedDirectory).toBe(parentDirectory);
      expect(state.targetExists).toBe(false);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("returns not-writable when an ancestor component is a file", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-detect-blocked-")
    );
    const blockedDirectory = join(runtimeDirectory, "blocked");
    const targetDirectory = join(blockedDirectory, "child");

    try {
      await writeFile(blockedDirectory, "blocked", "utf8");

      const state = await detectWritableDirectory(targetDirectory);

      expect(state.status).toBe("not-writable");
      expect(state.reason).toBe("not-a-directory");
      expect(state.blockingPath).toBe(blockedDirectory);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
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

      expect(manifest.status).toBe("managed");
      expect(manifest.manifest).toMatchObject({
        managedBy: "skills-broker",
        host: "codex",
        brokerHome: brokerHomeDirectory
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes a foreign ownership manifest", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-foreign-manifest-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".codex",
      "skills",
      "webpage-to-markdown"
    );

    try {
      await mkdir(codexShellDirectory, { recursive: true });

      await writeFile(
        join(codexShellDirectory, ".skills-broker.json"),
        `${JSON.stringify({ managedBy: "other-tool", host: "codex" }, null, 2)}\n`,
        "utf8"
      );

      const manifest = await readManagedShellManifest(codexShellDirectory);

      expect(manifest.status).toBe("foreign");
      expect(manifest.manifest.managedBy).toBe("other-tool");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes a damaged ownership manifest", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-invalid-manifest-")
    );
    const codexShellDirectory = join(
      runtimeDirectory,
      ".codex",
      "skills",
      "webpage-to-markdown"
    );

    try {
      await mkdir(codexShellDirectory, { recursive: true });

      await writeFile(join(codexShellDirectory, ".skills-broker.json"), "{", "utf8");

      const manifest = await readManagedShellManifest(codexShellDirectory);

      expect(manifest.status).toBe("invalid-json");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
