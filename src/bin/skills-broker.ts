#!/usr/bin/env node

import { formatLifecycleResult } from "../shared-home/format.js";
import { resolveLifecyclePaths } from "../shared-home/paths.js";
import { updateSharedBrokerHome } from "../shared-home/update.js";

const validCommands = ["update", "doctor", "remove"] as const;
type ValidCommand = (typeof validCommands)[number];

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
      brokerHomeOverride = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--claude-dir") {
      claudeDirOverride = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--codex-dir") {
      codexDirOverride = argv[index + 1];
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

async function main(argv = process.argv.slice(2)): Promise<LifecycleCliResult> {
  const result = await runLifecycleCli(argv);

  if (result.command === "update") {
    const paths = resolveLifecyclePaths({
      brokerHomeOverride: result.brokerHomeOverride,
      claudeDirOverride: result.claudeDirOverride,
      codexDirOverride: result.codexDirOverride
    });

    const lifecycleResult = await updateSharedBrokerHome({
      brokerHomeDirectory: paths.brokerHomeDirectory,
      claudeCodeInstallDirectory: paths.claudeCodeInstallDirectory,
      codexInstallDirectory: paths.codexInstallDirectory,
      dryRun: result.dryRun
    });

    console.log(formatLifecycleResult(lifecycleResult, result.outputMode));
    return result;
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
