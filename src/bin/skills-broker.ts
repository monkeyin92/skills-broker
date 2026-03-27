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
