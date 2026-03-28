import { chmod, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatLifecycleResult } from "../../src/shared-home/format";
import { doctorSharedBrokerHome } from "../../src/shared-home/doctor";

describe("doctor shared broker home", () => {
  it("explains why codex was not detected", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-missing-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const missingCodexDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        codexInstallDirectory: missingCodexDirectory
      });

      expect(result.command).toBe("doctor");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false
      });
      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("missing")
        })
      );
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "not_detected",
        reason: expect.stringContaining("--claude-dir")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports a host as not writable when the target directory cannot be created", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-readonly-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const parentDirectory = join(runtimeDirectory, "readonly");
    const codexInstallDirectory = join(parentDirectory, "child");

    try {
      await mkdir(parentDirectory, { recursive: true });
      await chmod(parentDirectory, 0o555);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_writable"
        })
      );
      expect(result.hosts[1]?.reason ?? "").toMatch(/not writable|permission/i);
    } finally {
      await chmod(parentDirectory, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("formats doctor results as JSON", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-json-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory
      });

      const rendered = formatLifecycleResult(result, "json");
      const parsed = JSON.parse(rendered) as typeof result;

      expect(parsed.command).toBe("doctor");
      expect(parsed.sharedHome.exists).toBe(false);
      expect(parsed.hosts).toEqual([
        {
          name: "claude-code",
          status: "not_detected",
          reason: expect.stringContaining("--claude-dir")
        },
        {
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("--codex-dir")
        }
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
