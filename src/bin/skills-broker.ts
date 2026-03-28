#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { doctorSharedBrokerHome } from "../shared-home/doctor.js";
import { formatLifecycleResult } from "../shared-home/format.js";
import { resolveLifecyclePaths } from "../shared-home/paths.js";
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
  outputMode: "text" | "json";
  brokerHomeOverride?: string;
  claudeDirOverride?: string;
  codexDirOverride?: string;
};

export async function runLifecycleCli(argv: string[]): Promise<LifecycleCliResult> {
  let commandInput: string | undefined;
  let dryRun = false;
  let outputMode: LifecycleCliResult["outputMode"] = "text";
  let brokerHomeOverride: string | undefined;
  let claudeDirOverride: string | undefined;
  let codexDirOverride: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--json") {
      outputMode = "json";
      continue;
    }

    if (arg === "--broker-home") {
      brokerHomeOverride = readFlagValue(argv, index, "--broker-home");
      index += 1;
      continue;
    }

    if (arg === "--claude-dir") {
      claudeDirOverride = readFlagValue(argv, index, "--claude-dir");
      index += 1;
      continue;
    }

    if (arg === "--codex-dir") {
      codexDirOverride = readFlagValue(argv, index, "--codex-dir");
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      continue;
    }

    if (!commandInput) {
      commandInput = arg;
    }
  }

  const candidate = (commandInput ?? "update") as ValidCommand;
  if (!validCommands.includes(candidate)) {
    throw new Error(`Unknown command: ${candidate}`);
  }

  return {
    command: candidate,
    dryRun,
    outputMode,
    brokerHomeOverride,
    claudeDirOverride,
    codexDirOverride
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
      projectRoot: resolvePackageRoot()
    });

    process.stdout.write(`${formatLifecycleResult(lifecycleResult, result.outputMode)}\n`);
    return lifecycleResult;
  }

  if (result.command === "doctor") {
    const lifecycleResult = await doctorSharedBrokerHome({
      brokerHomeDirectory: paths.brokerHomeDirectory,
      claudeCodeInstallDirectory: paths.claudeCodeInstallDirectory,
      codexInstallDirectory: paths.codexInstallDirectory
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
