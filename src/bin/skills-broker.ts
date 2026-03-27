#!/usr/bin/env node

export type LifecycleCliResult = {
  command: "update" | "doctor" | "remove";
  dryRun: boolean;
  outputMode: "text" | "json";
};

export async function runLifecycleCli(argv: string[]): Promise<LifecycleCliResult> {
  const outputMode = argv.includes("--json") ? "json" : "text";
  const dryRun = argv.includes("--dry-run");
  const command = (argv[0] ?? "update") as LifecycleCliResult["command"];

  return { command, dryRun, outputMode };
}

async function main(argv = process.argv.slice(2)): Promise<LifecycleCliResult> {
  const result = await runLifecycleCli(argv);
  console.log(JSON.stringify(result));
  return result;
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
