import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { installCodexHostShell } from "../../src/hosts/codex/install";
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
        codexInstallDirectory
      });

      expect(result.command).toBe("remove");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "preserved"
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
        codexInstallDirectory
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
        purgeSharedHome: true
      });

      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        status: "purged"
      });
      await expect(access(brokerHomeDirectory)).rejects.toThrow();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
