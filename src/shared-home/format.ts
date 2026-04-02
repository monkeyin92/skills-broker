import type { DoctorLifecycleResult } from "./doctor.js";
import type { RemoveLifecycleResult } from "./remove.js";
import type { UpdateLifecycleResult } from "./update.js";

export function formatLifecycleResult(
  result: UpdateLifecycleResult | DoctorLifecycleResult | RemoveLifecycleResult,
  outputMode: "text" | "json"
): string {
  if (outputMode === "json") {
    return JSON.stringify(result);
  }

  if (result.command === "doctor") {
    const lines = [
      "skills-broker doctor",
      "",
      `Shared home: ${result.sharedHome.path}`,
      `Shared home exists: ${result.sharedHome.exists ? "yes" : "no"}`
    ];

    if (result.routingMetrics.observed === 0) {
      lines.push(
        `Routing metrics (last ${result.routingMetrics.windowDays}d): no traces recorded yet`
      );
    } else {
      lines.push(
        `Routing metrics (last ${result.routingMetrics.windowDays}d): ${result.routingMetrics.observed} traces, ${result.routingMetrics.syntheticHostSkips} host skips`
      );

      for (const surface of result.routingMetrics.surfaces) {
        lines.push(
          `Routing ${surface.requestSurface}: observed=${surface.observed}, hit=${surface.hitRate.toFixed(2)}, misroute=${surface.misrouteRate.toFixed(2)}, fallback=${surface.fallbackRate.toFixed(2)}`
        );
      }
    }

    lines.push("");
    lines.push(`Status board: ${result.status.boardPath}`);
    if (result.status.repoTarget) {
      lines.push(`Status repo target: ${result.status.repoTarget}`);
    }
    lines.push(
      `Status remote freshness: ${result.status.remoteFreshness.state} (${result.status.remoteFreshness.detail})`
    );
    if (result.status.shippingRef) {
      lines.push(`Status shipping ref: ${result.status.shippingRef}`);
    }

    if (result.status.items.length === 0) {
      lines.push("Status items: unavailable");
    } else {
      for (const item of result.status.items) {
        lines.push(
          `Status ${item.id}: declared=${item.declaredStatus}, evaluated=${item.evaluatedStatus}`
        );
      }
    }

    if (result.status.issues.length === 0) {
      lines.push("Status issues: none");
    } else {
      for (const issue of result.status.issues) {
        lines.push(
          `Status issue ${issue.code}: ${issue.message}${
            issue.strict ? " (strict)" : ""
          }`
        );
      }
    }

    for (const host of result.hosts) {
      const suffix = host.reason ? ` (${host.reason})` : "";
      lines.push(`Host ${host.name}: ${host.status}${suffix}`);
      if ((host.competingPeerSkills?.length ?? 0) > 0) {
        lines.push(
          `Host ${host.name} competing peers: ${host.competingPeerSkills?.join(", ")}`
        );
        if (host.remediation) {
          lines.push(`Host ${host.name} remediation: ${host.remediation.message}`);
        }
      }
    }

    for (const warning of result.warnings) {
      lines.push(`Warning: ${warning}`);
    }

    return lines.join("\n");
  }

  if (result.command === "remove") {
    const lines = [
      "skills-broker removed",
      "",
      `Shared home: ${result.sharedHome.path}`,
      `Shared home status: ${result.sharedHome.status}`
    ];

    for (const host of result.hosts) {
      const suffix = host.reason ? ` (${host.reason})` : "";
      lines.push(`Host ${host.name}: ${host.status}${suffix}`);
    }

    for (const warning of result.warnings) {
      lines.push(`Warning: ${warning}`);
    }

    return lines.join("\n");
  }

  const lines = [
    "skills-broker updated",
    "",
    `Shared home: ${result.sharedHome.path}`,
    `Shared home status: ${result.sharedHome.status}`
  ];

  if (result.sharedHome.reason) {
    lines.push(`Shared home reason: ${result.sharedHome.reason}`);
  }

  if (result.dryRun) {
    lines.push("Mode: dry-run");
  }

  for (const host of result.hosts) {
    const suffix = host.reason ? ` (${host.reason})` : "";
    lines.push(`Host ${host.name}: ${host.status}${suffix}`);
    if ((host.migratedPeerSkills?.length ?? 0) > 0) {
      lines.push(
        `Host ${host.name} migrated peers: ${host.migratedPeerSkills?.join(", ")}`
      );
    }
    if ((host.competingPeerSkills?.length ?? 0) > 0) {
      lines.push(
        `Host ${host.name} competing peers: ${host.competingPeerSkills?.join(", ")}`
      );
      if (host.remediation) {
        lines.push(`Host ${host.name} remediation: ${host.remediation.message}`);
      }
    }
  }

  for (const warning of result.warnings) {
    lines.push(`Warning: ${warning}`);
  }

  return lines.join("\n");
}
