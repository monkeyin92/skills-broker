import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { installClaudeCodeHostShell } from "../../src/hosts/claude-code/install";
import { installCodexHostShell } from "../../src/hosts/codex/install";

describe("host shell installers", () => {
  it("resolve relative shared-home paths before writing host runners", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-host-shell-"));
    const claudeShellDirectory = join(runtimeDirectory, "claude-code-plugin");
    const codexShellDirectory = join(runtimeDirectory, "codex-skill");
    const relativeBrokerHomeDirectory = "relative-broker-home";

    try {
      const claudeResult = await installClaudeCodeHostShell({
        installDirectory: claudeShellDirectory,
        brokerHomeDirectory: relativeBrokerHomeDirectory
      });
      const codexResult = await installCodexHostShell({
        installDirectory: codexShellDirectory,
        brokerHomeDirectory: relativeBrokerHomeDirectory
      });

      const claudeRunner = await readFile(claudeResult.runnerPath, "utf8");
      const codexRunner = await readFile(codexResult.runnerPath, "utf8");
      const claudeManifest = JSON.parse(
        await readFile(join(claudeResult.installDirectory, ".skills-broker.json"), "utf8")
      ) as { managedBy?: string };

      expect(claudeRunner).toContain(resolve(relativeBrokerHomeDirectory));
      expect(codexRunner).toContain(resolve(relativeBrokerHomeDirectory));
      expect(claudeManifest.managedBy).toBe("skills-broker");

      const codexManifest = JSON.parse(
        await readFile(join(codexResult.installDirectory, ".skills-broker.json"), "utf8")
      ) as { managedBy?: string };

      expect(codexManifest.managedBy).toBe("skills-broker");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
});
