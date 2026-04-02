#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { doctorSharedBrokerHome } from "../shared-home/doctor.js";
import { formatLifecycleResult } from "../shared-home/format.js";
import { resolveLifecyclePaths } from "../shared-home/paths.js";
import { removeSharedBrokerHome } from "../shared-home/remove.js";
import { updateSharedBrokerHome } from "../shared-home/update.js";

const validCommands = ["update", "doctor", "remove"] as const;
type ValidCommand = (typeof validCommands)[number];

function resolvePackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function readFlagValue(argv: string[], index: number, flagName: string): string {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith("-")) {
    throw new Error(`Missing value for ${flagName}`);
  }

  return value;
}

export type LifecycleCliResult = {
  command: ValidCommand;
  dryRun: boolean;
  purgeSharedHome: boolean;
  repairHostSurface: boolean;
  refreshRemote: boolean;
  strict: boolean;
  outputMode: "text" | "json";
  brokerHomeOverride?: string;
  claudeDirOverride?: string;
  codexDirOverride?: string;
  repoRootOverride?: string;
  shipRefOverride?: string;
};

export async function runLifecycleCli(argv: string[]): Promise<LifecycleCliResult> {
  let commandInput: string | undefined;
  let dryRun = false;
  let purgeSharedHome = false;
  let repairHostSurface = false;
  let refreshRemote = false;
  let strict = false;
  let outputMode: LifecycleCliResult["outputMode"] = "text";
  let brokerHomeOverride: string | undefined;
  let claudeDirOverride: string | undefined;
  let codexDirOverride: string | undefined;
  let repoRootOverride: string | undefined;
  let shipRefOverride: string | undefined;
  const seenFlags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      seenFlags.add(arg);
      continue;
    }

    if (arg === "--json") {
      outputMode = "json";
      seenFlags.add(arg);
      continue;
    }

    if (arg === "--purge" || arg === "--all") {
      purgeSharedHome = true;
      seenFlags.add(arg);
      continue;
    }

    if (arg === "--repair-host-surface") {
      repairHostSurface = true;
      seenFlags.add(arg);
      continue;
    }

    if (arg === "--refresh-remote") {
      refreshRemote = true;
      seenFlags.add(arg);
      continue;
    }

    if (arg === "--strict") {
      strict = true;
      seenFlags.add(arg);
      continue;
    }

    if (arg === "--broker-home") {
      brokerHomeOverride = readFlagValue(argv, index, "--broker-home");
      seenFlags.add(arg);
      index += 1;
      continue;
    }

    if (arg === "--claude-dir") {
      claudeDirOverride = readFlagValue(argv, index, "--claude-dir");
      seenFlags.add(arg);
      index += 1;
      continue;
    }

    if (arg === "--codex-dir") {
      codexDirOverride = readFlagValue(argv, index, "--codex-dir");
      seenFlags.add(arg);
      index += 1;
      continue;
    }

    if (arg === "--repo-root") {
      repoRootOverride = readFlagValue(argv, index, "--repo-root");
      seenFlags.add(arg);
      index += 1;
      continue;
    }

    if (arg === "--ship-ref") {
      shipRefOverride = readFlagValue(argv, index, "--ship-ref");
      seenFlags.add(arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    if (!commandInput) {
      commandInput = arg;
      continue;
    }

    throw new Error(`Unexpected positional argument: ${arg}`);
  }

  const candidate = (commandInput ?? "update") as ValidCommand;
  if (!validCommands.includes(candidate)) {
    throw new Error(`Unknown command: ${candidate}`);
  }

  const allowedFlagsByCommand: Record<ValidCommand, Set<string>> = {
    update: new Set([
      "--dry-run",
      "--json",
      "--broker-home",
      "--claude-dir",
      "--codex-dir",
      "--repair-host-surface"
    ]),
    doctor: new Set([
      "--dry-run",
      "--json",
      "--broker-home",
      "--claude-dir",
      "--codex-dir",
      "--refresh-remote",
      "--strict",
      "--repo-root",
      "--ship-ref"
    ]),
    remove: new Set([
      "--json",
      "--broker-home",
      "--claude-dir",
      "--codex-dir",
      "--purge",
      "--all"
    ])
  };

  for (const seenFlag of seenFlags) {
    if (!allowedFlagsByCommand[candidate].has(seenFlag)) {
      throw new Error(`Flag ${seenFlag} is not valid for ${candidate}`);
    }
  }

  return {
    command: candidate,
    dryRun,
    purgeSharedHome,
    repairHostSurface,
    refreshRemote,
    strict,
    outputMode,
    brokerHomeOverride,
    claudeDirOverride,
    codexDirOverride,
    repoRootOverride,
    shipRefOverride
  };
}

async function main(argv = process.argv.slice(2)) {
  const result = await runLifecycleCli(argv);

  const paths = resolveLifecyclePaths({
    brokerHomeOverride: result.brokerHomeOverride,
    claudeDirOverride: result.claudeDirOverride,
    codexDirOverride: result.codexDirOverride
  });

  if (result.command === "update") {
    const lifecycleResult = await updateSharedBrokerHome({
      brokerHomeDirectory: paths.brokerHomeDirectory,
      claudeCodeInstallDirectory:
        result.claudeDirOverride === undefined
          ? undefined
          : paths.claudeCodeInstallDirectory,
      codexInstallDirectory:
        result.codexDirOverride === undefined
          ? undefined
          : paths.codexInstallDirectory,
      dryRun: result.dryRun,
      repairHostSurface: result.repairHostSurface,
      projectRoot: resolvePackageRoot()
    });

    process.stdout.write(`${formatLifecycleResult(lifecycleResult, result.outputMode)}\n`);
    return lifecycleResult;
  }

  if (result.command === "doctor") {
    const lifecycleResult = await doctorSharedBrokerHome({
      brokerHomeDirectory: paths.brokerHomeDirectory,
      cwd: process.cwd(),
      claudeCodeInstallDirectory:
        result.claudeDirOverride === undefined
          ? undefined
          : paths.claudeCodeInstallDirectory,
      codexInstallDirectory:
        result.codexDirOverride === undefined
          ? undefined
          : paths.codexInstallDirectory,
      refreshRemote: result.refreshRemote,
      repoRootOverride: result.repoRootOverride,
      shipRefOverride: result.shipRefOverride
    });

    process.stdout.write(`${formatLifecycleResult(lifecycleResult, result.outputMode)}\n`);
    if (result.strict && lifecycleResult.status.hasStrictIssues) {
      process.exitCode = 1;
    }
    return lifecycleResult;
  }

  if (result.command === "remove") {
    const lifecycleResult = await removeSharedBrokerHome({
      brokerHomeDirectory: paths.brokerHomeDirectory,
      claudeCodeInstallDirectory:
        result.claudeDirOverride === undefined
          ? undefined
          : paths.claudeCodeInstallDirectory,
      codexInstallDirectory:
        result.codexDirOverride === undefined
          ? undefined
          : paths.codexInstallDirectory,
      purgeSharedHome: result.purgeSharedHome
    });

    process.stdout.write(`${formatLifecycleResult(lifecycleResult, result.outputMode)}\n`);
    return lifecycleResult;
  }

  if (result.outputMode === "json") {
    console.log(JSON.stringify(result));
  } else {
    const pieces = [`command=${result.command}`, "output=text"];
    if (result.dryRun) {
      pieces.push("dry-run");
    }
    if (result.purgeSharedHome) {
      pieces.push("purge");
    }
    if (result.repairHostSurface) {
      pieces.push("repair-host-surface");
    }
    console.log(pieces.join("; "));
  }

  return result;
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
