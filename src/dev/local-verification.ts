import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const EXPECTED_NODE_MAJOR = 22;

export type LocalVerificationHealth = {
  nodeVersionOk: boolean;
  npmCliResolved: boolean;
  rollupNativeHealthy: boolean;
  vitestEntryHealthy: boolean;
  repairSteps: string[];
};

export type LocalVerificationMode = "full" | "check-only" | "repair";

export type LocalVerificationReport = LocalVerificationHealth & {
  healthy: boolean;
  nodeVersion: string;
  nodeMajor: number | null;
  expectedNodeMajor: number;
  npmCliPath: string;
  vitestEntryPath: string;
};

type LocalVerificationProbeOptions = {
  cwd?: string;
  nodePath?: string;
  nodeVersion?: string;
  env?: NodeJS.ProcessEnv;
  fileExists?: (pathname: string) => Promise<boolean>;
  loadRollupNative?: (cwd: string) => Promise<void>;
};

type LocalVerificationCliOptions = LocalVerificationProbeOptions & {
  args?: string[];
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  runCommand?: (
    nodePath: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv }
  ) => Promise<number>;
};

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function parseNodeMajor(nodeVersion: string): number | null {
  const match = /^v?(\d+)/.exec(nodeVersion);
  if (match === null) {
    return null;
  }

  return Number(match[1]);
}

function buildRepairSteps(input: {
  nodeVersionOk: boolean;
  npmCliResolved: boolean;
  rollupNativeHealthy: boolean;
  vitestEntryHealthy: boolean;
}): string[] {
  const steps: string[] = [];

  if (!input.nodeVersionOk) {
    steps.push("Use Node 22.x for local verification.");
  }

  if (!input.npmCliResolved) {
    steps.push(
      "Use a Node runtime that bundles npm, or export npm_execpath to a usable npm CLI path."
    );
  }

  if (!input.rollupNativeHealthy || !input.vitestEntryHealthy) {
    steps.push(
      "Run npm ci from the repo root to reinstall Vitest, Rollup, and their optional native dependencies."
    );
  }

  if (steps.length > 0) {
    steps.push(
      "Rerun npm run verify:local -- --check-only before npm run build and npm test."
    );
  }

  return steps;
}

async function defaultLoadRollupNative(cwd: string): Promise<void> {
  const requireFromRepo = createRequire(join(cwd, "package.json"));
  requireFromRepo(join(cwd, "node_modules", "rollup", "dist", "native.js"));
}

async function spawnNodeCommand(
  nodePath: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<number> {
  return await new Promise((resolve) => {
    const child = spawn(nodePath, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: "inherit"
    });

    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function statusLabel(value: boolean): string {
  return value ? "ok" : "broken";
}

export function resolveNpmCliPath(
  nodePath = process.execPath,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (typeof env.npm_execpath === "string" && env.npm_execpath.length > 0) {
    return env.npm_execpath;
  }

  return join(dirname(dirname(nodePath)), "lib", "node_modules", "npm", "bin", "npm-cli.js");
}

export function parseLocalVerificationMode(args: string[]): LocalVerificationMode {
  let mode: LocalVerificationMode = "full";

  for (const arg of args) {
    if (arg === "--check-only") {
      mode = "check-only";
      continue;
    }

    if (arg === "--repair") {
      mode = "repair";
      continue;
    }

    throw new Error(`unknown local verification flag: ${arg}`);
  }

  return mode;
}

export async function inspectLocalVerificationHealth(
  options: LocalVerificationProbeOptions = {}
): Promise<LocalVerificationReport> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const nodePath = options.nodePath ?? process.execPath;
  const nodeVersion = options.nodeVersion ?? process.version;
  const fileExists = options.fileExists ?? pathExists;
  const loadRollupNative = options.loadRollupNative ?? defaultLoadRollupNative;
  const nodeMajor = parseNodeMajor(nodeVersion);
  const npmCliPath = resolveNpmCliPath(nodePath, env);
  const vitestEntryPath = join(cwd, "node_modules", "vitest", "vitest.mjs");
  const nodeVersionOk = nodeMajor === EXPECTED_NODE_MAJOR;
  const npmCliResolved = await fileExists(npmCliPath);
  const vitestEntryHealthy = await fileExists(vitestEntryPath);

  let rollupNativeHealthy = false;
  try {
    await loadRollupNative(cwd);
    rollupNativeHealthy = true;
  } catch {
    rollupNativeHealthy = false;
  }

  const repairSteps = buildRepairSteps({
    nodeVersionOk,
    npmCliResolved,
    rollupNativeHealthy,
    vitestEntryHealthy
  });

  return {
    nodeVersionOk,
    npmCliResolved,
    rollupNativeHealthy,
    vitestEntryHealthy,
    repairSteps,
    healthy:
      nodeVersionOk &&
      npmCliResolved &&
      rollupNativeHealthy &&
      vitestEntryHealthy,
    nodeVersion,
    nodeMajor,
    expectedNodeMajor: EXPECTED_NODE_MAJOR,
    npmCliPath,
    vitestEntryPath
  };
}

export function shouldRunLocalVerificationSuite(
  mode: LocalVerificationMode,
  health: LocalVerificationHealth
): boolean {
  return (
    mode === "full" &&
    health.nodeVersionOk &&
    health.npmCliResolved &&
    health.rollupNativeHealthy &&
    health.vitestEntryHealthy
  );
}

export function renderLocalVerificationReport(
  report: LocalVerificationReport,
  mode: LocalVerificationMode
): string {
  const lines = [
    "skills-broker local verification",
    `Mode: ${mode}`,
    `Node 22: ${statusLabel(report.nodeVersionOk)} (${report.nodeVersion})`,
    `npm CLI: ${statusLabel(report.npmCliResolved)} (${report.npmCliPath})`,
    `Rollup native: ${statusLabel(report.rollupNativeHealthy)}`,
    `Vitest entry: ${statusLabel(report.vitestEntryHealthy)} (${report.vitestEntryPath})`
  ];

  if (report.repairSteps.length > 0) {
    lines.push("", "Repair steps:");
    for (const step of report.repairSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join("\n");
}

export async function runLocalVerificationCli(
  options: LocalVerificationCliOptions = {}
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const args = options.args ?? process.argv.slice(2);
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const nodePath = options.nodePath ?? process.execPath;

  let mode: LocalVerificationMode;
  try {
    mode = parseLocalVerificationMode(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`${message}\n`);
    return 1;
  }

  const report = await inspectLocalVerificationHealth({
    ...options,
    cwd,
    env,
    nodePath
  });

  stdout.write(`${renderLocalVerificationReport(report, mode)}\n`);

  if (!report.healthy || mode !== "full") {
    return report.healthy ? 0 : 1;
  }

  const runCommand = options.runCommand ?? spawnNodeCommand;

  stdout.write("\nRunning npm run build\n");
  const buildExitCode = await runCommand(
    nodePath,
    [report.npmCliPath, "run", "build"],
    { cwd, env }
  );
  if (buildExitCode !== 0) {
    return buildExitCode;
  }

  stdout.write("\nRunning npm test\n");
  return await runCommand(nodePath, [report.npmCliPath, "test"], {
    cwd,
    env
  });
}
