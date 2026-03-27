import { describe, expect, it } from "vitest";
import { runLifecycleCli } from "../../src/bin/skills-broker";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { mkdtemp, rm, symlink, chmod } from "node:fs/promises";
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

  it("runs when the published bin is executed via symlink", async () => {
    const distBin = resolve("dist/bin/skills-broker.js");
    await execFileAsync("npm", ["run", "build"], {
      env: process.env,
      encoding: "utf8"
    });

    const binDir = await mkdtemp(resolve(tmpdir(), "skills-broker-bin-"));
    const symlinkPath = resolve(binDir, "skills-broker");

    await chmod(distBin, 0o755);
    await symlink(distBin, symlinkPath);
    await chmod(symlinkPath, 0o755);

    try {
      const { stdout } = await execFileAsync(symlinkPath, [
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
