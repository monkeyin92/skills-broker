import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquisitionMemoryFilePath } from "../../src/broker/acquisition-memory";
import { installCodexHostShell } from "../../src/hosts/codex/install";
import { installOpenCodeHostShell } from "../../src/hosts/opencode/install";
import { installSharedBrokerHome } from "../../src/shared-home/install";
import { removeSharedBrokerHome } from "../../src/shared-home/remove";

describe("remove shared broker home", () => {
  it("removes managed codex shell but preserves shared broker home by default", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-remove-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.command).toBe("remove");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved",
        acquisitionMemory: "preserved"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "removed"
      });
      await expect(access(join(codexInstallDirectory, "SKILL.md"))).rejects.toThrow();
      await expect(access(brokerHomeDirectory)).resolves.toBeUndefined();
      await expect(readFile(join(brokerHomeDirectory, "package.json"), "utf8")).resolves.toContain(
        "skills-broker"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("skips unrelated conflicting directories", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-remove-conflict-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeFile(join(codexInstallDirectory, ".skills-broker.json"), "{}", "utf8");

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "skipped_conflict",
        reason: "foreign ownership manifest"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("removes a managed OpenCode shell discovered from the default root", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-remove-opencode-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const opencodeInstallDirectory = join(
      runtimeDirectory,
      ".config",
      "opencode",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installOpenCodeHostShell({
        installDirectory: opencodeInstallDirectory,
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.command).toBe("remove");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved",
        acquisitionMemory: "preserved"
      });
      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "removed"
      });
      await expect(access(join(opencodeInstallDirectory, "SKILL.md"))).rejects.toThrow();
      await expect(access(brokerHomeDirectory)).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("purges shared broker home when explicitly requested", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-remove-purge-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory,
        purgeSharedHome: true
      });

      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "purged",
        acquisitionMemory: "already_absent"
      });
      await expect(access(brokerHomeDirectory)).rejects.toThrow();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("clears acquisition memory without removing host shells or shared home", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-remove-memory-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const memoryPath = acquisitionMemoryFilePath(brokerHomeDirectory);

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installCodexHostShell({
        installDirectory: codexInstallDirectory,
        brokerHomeDirectory
      });
      await writeFile(
        memoryPath,
        JSON.stringify({
          version: "2026-04-16",
          entries: []
        }),
        "utf8"
      );

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        codexInstallDirectory,
        homeDirectory: runtimeDirectory,
        resetAcquisitionMemory: true
      });

      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved",
        acquisitionMemory: "cleared"
      });
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "preserved"
      });
      await expect(access(memoryPath)).rejects.toThrow();
      await expect(access(join(codexInstallDirectory, "SKILL.md"))).resolves.toBeUndefined();
      await expect(access(brokerHomeDirectory)).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("clears acquisition memory while preserving a managed OpenCode shell", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-remove-opencode-memory-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const opencodeInstallDirectory = join(
      runtimeDirectory,
      ".config",
      "opencode",
      "skills",
      "skills-broker"
    );
    const memoryPath = acquisitionMemoryFilePath(brokerHomeDirectory);

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await installOpenCodeHostShell({
        installDirectory: opencodeInstallDirectory,
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFile(
        memoryPath,
        JSON.stringify({
          version: "2026-04-16",
          entries: []
        }),
        "utf8"
      );

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        resetAcquisitionMemory: true
      });

      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved",
        acquisitionMemory: "cleared"
      });
      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "preserved"
      });
      await expect(access(memoryPath)).rejects.toThrow();
      await expect(access(join(opencodeInstallDirectory, "SKILL.md"))).resolves.toBeUndefined();
      await expect(access(brokerHomeDirectory)).resolves.toBeUndefined();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("skips conflicting OpenCode directories discovered from the default root", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-remove-opencode-conflict-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const opencodeInstallDirectory = join(
      runtimeDirectory,
      ".config",
      "opencode",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(opencodeInstallDirectory, { recursive: true });
      await writeFile(join(opencodeInstallDirectory, ".skills-broker.json"), "{}", "utf8");

      const result = await removeSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory
      });

      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "skipped_conflict",
        reason: "foreign ownership manifest"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
