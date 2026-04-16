import type { DoctorLifecycleResult } from "./doctor.js";
import type { RemoveLifecycleResult } from "./remove.js";
import type { UpdateLifecycleResult } from "./update.js";

function formatAdoptionHealthLine(
  adoptionHealth: DoctorLifecycleResult["adoptionHealth"] | UpdateLifecycleResult["adoptionHealth"]
): string {
  if (adoptionHealth.status === "green") {
    return "Adoption health: green";
  }

  if (adoptionHealth.status === "inactive") {
    return `Adoption health: inactive (${adoptionHealth.reasons[0]?.message ?? "no managed host is installed yet"})`;
  }

  const blockerCodes = adoptionHealth.reasons
    .slice(0, 3)
    .map((reason) => reason.code)
    .join(", ");
  const overflow =
    adoptionHealth.reasons.length > 3
      ? `, +${adoptionHealth.reasons.length - 3} more`
      : "";

  return `Adoption health: blocked (${blockerCodes}${overflow})`;
}

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
      `Shared home exists: ${result.sharedHome.exists ? "yes" : "no"}`,
      formatAdoptionHealthLine(result.adoptionHealth)
    ];

    if (result.routingMetrics.observed === 0) {
      lines.push(
        `Routing metrics (last ${result.routingMetrics.windowDays}d): no traces recorded yet`
      );
    } else {
      lines.push(
        `Routing metrics (last ${result.routingMetrics.windowDays}d): ${result.routingMetrics.observed} traces, ${result.routingMetrics.syntheticHostSkips} host skips`
      );
      lines.push(
        `Acquisition routing: true_no_candidate=${result.routingMetrics.acquisition.trueNoCandidate}, install_required=${result.routingMetrics.acquisition.installRequired}`
      );

      for (const contract of result.routingMetrics.contracts) {
        lines.push(
          `Routing contract ${contract.requestContract}: observed=${contract.observed}, hit=${contract.hitRate.toFixed(2)}, misroute=${contract.misrouteRate.toFixed(2)}, fallback=${contract.fallbackRate.toFixed(2)}`
        );
      }

      for (const surface of result.routingMetrics.surfaces) {
        lines.push(
          `Routing ${surface.requestSurface}: observed=${surface.observed}, hit=${surface.hitRate.toFixed(2)}, misroute=${surface.misrouteRate.toFixed(2)}, fallback=${surface.fallbackRate.toFixed(2)}`
        );
      }
    }
    lines.push(
      `Acquisition memory: ${result.acquisitionMemory.exists ? "present" : "missing"}, entries=${result.acquisitionMemory.entries}, successful_routes=${result.acquisitionMemory.successfulRoutes}, first_reuse_after_install=${result.acquisitionMemory.firstReuseRecorded}, cross_host_reuse=${result.acquisitionMemory.crossHostReuse}`
    );
    lines.push(
      `Verified downstream manifests: total=${result.verifiedDownstreamManifests.manifests}, ${result.verifiedDownstreamManifests.hosts
        .map((host) => `${host.name}=${host.manifests}`)
        .join(", ")}`
    );

    lines.push("");
    if (result.brokerFirstGate.skipped) {
      lines.push(
        `Broker-first gate: skipped (${result.brokerFirstGate.skipReason ?? "unavailable"})`
      );
      lines.push("Broker-first gate families: unavailable");
      lines.push("Broker-first gate issues: none");
    } else {
      lines.push(`Broker-first gate: ${result.brokerFirstGate.artifactPath}`);
      lines.push(
        `Broker-first gate freshness: ${result.brokerFirstGate.freshness.state} (${result.brokerFirstGate.freshness.detail})`
      );

      if (result.brokerFirstGate.maintainedFamilies.length === 0) {
        lines.push("Broker-first gate families: unavailable");
      } else {
        for (const family of result.brokerFirstGate.maintainedFamilies) {
          lines.push(
            `Broker-first gate ${family.family}: status=${family.status}, proofs=phase2Boundary:${family.proofs.phase2Boundary}, phase3Eval:${family.proofs.phase3Eval}, peerConflict:${family.proofs.peerConflict}`
          );
        }
      }

      const familyIssues = result.brokerFirstGate.maintainedFamilies.flatMap(
        (family) =>
          family.issues.map((issue) => ({
            family: family.family,
            issue
          }))
      );

      if (result.brokerFirstGate.issues.length === 0 && familyIssues.length === 0) {
        lines.push("Broker-first gate issues: none");
      } else {
        for (const issue of result.brokerFirstGate.issues) {
          lines.push(
            `Broker-first gate issue ${issue.code}: ${issue.message} [scope=${issue.scope}]`
          );
        }

        for (const familyIssue of familyIssues) {
          lines.push(
            `Broker-first gate issue ${familyIssue.issue.code}: ${familyIssue.issue.message} [scope=${familyIssue.issue.scope}, family=${familyIssue.family}${
              familyIssue.issue.proofKey === undefined
                ? ""
                : `, proof=${familyIssue.issue.proofKey}`
            }]`
          );
        }
      }
    }

    lines.push("");
    if (result.status.skipped) {
      lines.push(
        `Status board: skipped (${result.status.skipReason ?? "no repo-scoped status board available"})`
      );
      lines.push("Status items: unavailable");
      lines.push("Status issues: none");
    } else {
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
    }

    for (const host of result.hosts) {
      const suffix = host.reason ? ` (${host.reason})` : "";
      lines.push(`Host ${host.name}: ${host.status}${suffix}`);
      if ((host.integrityIssues?.length ?? 0) > 0) {
        for (const issue of host.integrityIssues ?? []) {
          lines.push(`Host ${host.name} integrity issue ${issue.code}: ${issue.message}`);
        }
      }
      if (host.manualRecovery) {
        lines.push(
          `Host ${host.name} manual recovery: marker=${host.manualRecovery.markerId}, failurePhase=${host.manualRecovery.failurePhase}`
        );
        lines.push(`Host ${host.name} clear command: ${host.manualRecovery.clearCommand}`);
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

  if (result.command === "remove") {
    const lines = [
      "skills-broker removed",
      "",
      `Shared home: ${result.sharedHome.path}`,
      `Shared home status: ${result.sharedHome.status}`,
      `Acquisition memory: ${result.sharedHome.acquisitionMemory}`
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
    `Shared home status: ${result.sharedHome.status}`,
    formatAdoptionHealthLine(result.adoptionHealth)
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
    if ((host.integrityIssues?.length ?? 0) > 0) {
      for (const issue of host.integrityIssues ?? []) {
        lines.push(`Host ${host.name} integrity issue ${issue.code}: ${issue.message}`);
      }
    }
    if (host.manualRecovery) {
      lines.push(
        `Host ${host.name} manual recovery: marker=${host.manualRecovery.markerId}, failurePhase=${host.manualRecovery.failurePhase}`
      );
      lines.push(`Host ${host.name} clear command: ${host.manualRecovery.clearCommand}`);
    }
    if (host.clearedManualRecovery) {
      lines.push(
        `Host ${host.name} cleared manual recovery: ${host.clearedManualRecovery.markerId}`
      );
    }
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
