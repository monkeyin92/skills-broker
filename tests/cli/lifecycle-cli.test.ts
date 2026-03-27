import { describe, expect, it } from "vitest";
import { runLifecycleCli } from "../../src/bin/skills-broker";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

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

  it("prints lifecycle result when executed as CLI", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const { stdout } = await execFileAsync("node", [
      "--loader",
      "ts-node/esm",
      scriptPath,
      "update",
      "--dry-run",
      "--json",
      "--broker-home",
      "/tmp/test-home"
    ], {
      env: process.env,
      encoding: "utf8"
    });

    const result = JSON.parse(stdout.trim());
    expect(result.command).toBe("update");
    expect(result.dryRun).toBe(true);
    expect(result.outputMode).toBe("json");
  });

  it("runs when the bin file is symlinked (npm .bin scenario)", async () => {
    const scriptPath = resolve("src/bin/skills-broker.ts");
    const binDir = await mkdtemp(resolve(tmpdir(), "skills-broker-bin-"));
    const symlinkPath = resolve(binDir, "skills-broker");

    await symlink(scriptPath, symlinkPath);

    try {
      const { stdout } = await execFileAsync("node", [
        "--loader",
        "ts-node/esm",
        symlinkPath,
        "update",
        "--dry-run",
        "--json",
        "--broker-home",
        "/tmp/test-home"
      ], {
        env: process.env,
        encoding: "utf8"
      });

      const result = JSON.parse(stdout.trim());
      expect(result.command).toBe("update");
      expect(result.dryRun).toBe(true);
      expect(result.outputMode).toBe("json");
    } finally {
      await rm(binDir, { recursive: true, force: true });
    }
  });
});
