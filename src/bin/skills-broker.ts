#!/usr/bin/env node

const validCommands = ["update", "doctor", "remove"] as const;
type ValidCommand = (typeof validCommands)[number];

export type LifecycleCliResult = {
  command: ValidCommand;
  dryRun: boolean;
  outputMode: "text" | "json";
};

export async function runLifecycleCli(argv: string[]): Promise<LifecycleCliResult> {
  let commandInput: string | undefined;
  let dryRun = false;
  let outputMode: LifecycleCliResult["outputMode"] = "text";

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--json") {
      outputMode = "json";
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
    outputMode
  };
}

async function main(argv = process.argv.slice(2)): Promise<LifecycleCliResult> {
  const result = await runLifecycleCli(argv);

  if (result.outputMode === "json") {
    console.log(JSON.stringify(result));
    return result;
  }

  const pieces = [`command=${result.command}`, "output=text"];
  if (result.dryRun) {
    pieces.push("dry-run");
  }
  console.log(pieces.join("; "));

  return result;
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
