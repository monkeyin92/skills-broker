import type { UpdateLifecycleResult } from "./update.js";

export function formatLifecycleResult(
  result: UpdateLifecycleResult,
  outputMode: "text" | "json"
): string {
  if (outputMode === "json") {
    return JSON.stringify(result);
  }

  const lines = ["skills-broker updated", "", `Shared home: ${result.sharedHome.path}`];

  if (result.dryRun) {
    lines.push("Mode: dry-run");
  }

  for (const host of result.hosts) {
    const suffix = host.reason ? ` (${host.reason})` : "";
    lines.push(`Host ${host.name}: ${host.status}${suffix}`);
  }

  return lines.join("\n");
}
