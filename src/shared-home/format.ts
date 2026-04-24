import type {
  DoctorLifecycleResult,
  DoctorFamilyLoopSignal,
  DoctorFamilyProofSummary,
  DoctorProofFamily
} from "./doctor.js";
import {
  formatFamilyLoopProofSurfaceLine,
  formatPostQaNextLoopLine,
  formatQaFirstFamilyLoopLine
} from "../core/operator-truth.js";
import type { RemoveLifecycleResult } from "./remove.js";
import type { UpdateLifecycleResult } from "./update.js";

const FAMILY_FORMAT_CONFIG: Record<
  DoctorProofFamily,
  {
    label: string;
    requestLabel: string;
    verifySegmentLabel: string;
    verifySuccessLabel: string;
    verifyPendingLabel: string;
    verifyProofSuccessLabel: string;
    verifyProofPendingLabel: string;
  }
> = {
  website_qa: {
    label: "Website QA",
    requestLabel: "website QA",
    verifySegmentLabel: "rerun",
    verifySuccessLabel: "successful rerun",
    verifyPendingLabel: "successful website QA rerun",
    verifyProofSuccessLabel: "successful rerun",
    verifyProofPendingLabel: "successful rerun"
  },
  web_content_to_markdown: {
    label: "Web Markdown",
    requestLabel: "web markdown",
    verifySegmentLabel: "verify",
    verifySuccessLabel: "successful route",
    verifyPendingLabel: "successful web markdown verification",
    verifyProofSuccessLabel: "successful verification",
    verifyProofPendingLabel: "successful verification"
  },
  social_post_to_markdown: {
    label: "Social Markdown",
    requestLabel: "social markdown",
    verifySegmentLabel: "verify",
    verifySuccessLabel: "successful route",
    verifyPendingLabel: "successful social markdown verification",
    verifyProofSuccessLabel: "successful verification",
    verifyProofPendingLabel: "successful verification"
  }
};

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

function formatAdoptionHealthNextActionLine(
  adoptionHealth: DoctorLifecycleResult["adoptionHealth"] | UpdateLifecycleResult["adoptionHealth"]
): string | undefined {
  if (adoptionHealth.nextAction === undefined) {
    return undefined;
  }

  return `Adoption health next action: ${adoptionHealth.nextAction}`;
}

function formatSharedHomeExistsLine(result: DoctorLifecycleResult): string {
  if (result.sharedHome.exists) {
    return "Shared home exists: yes";
  }

  if ((result.sharedHome.missingPaths?.length ?? 0) === 0) {
    return "Shared home exists: no";
  }

  return `Shared home exists: no (missing ${result.sharedHome.missingPaths
    ?.map((pathname) => pathname.replace(`${result.sharedHome.path}/`, ""))
    .join(", ")})`;
}

function formatFamilyLoopLine(
  family: DoctorProofFamily,
  proof: DoctorFamilyProofSummary
): string {
  const config = FAMILY_FORMAT_CONFIG[family];
  const installRequired =
    proof.installRequiredTraces > 0
      ? `observed (${proof.installRequiredTraces} install_required trace${proof.installRequiredTraces === 1 ? "" : "s"})`
      : `pending (no ${config.requestLabel} install_required trace recorded yet)`;
  const verify =
    proof.acquisitionMemoryState === "unreadable"
      ? "unknown (acquisition memory unreadable)"
      : proof.rerunSuccessfulRoutes > 0
        ? `confirmed (${proof.rerunSuccessfulRoutes} ${config.verifySuccessLabel}${proof.rerunSuccessfulRoutes === 1 ? "" : "s"})`
        : `pending (no ${config.verifyPendingLabel} recorded yet)`;
  const reuse =
    proof.acquisitionMemoryState === "unreadable"
      ? "unknown (acquisition memory unreadable)"
      : proof.reuseRecorded > 0
        ? `confirmed (${proof.reuseRecorded} first reuse event${proof.reuseRecorded === 1 ? "" : "s"})`
        : `pending (no ${config.requestLabel} reuse recorded yet)`;
  const replay =
    proof.verifiedDownstreamState === "unreadable"
      ? "unknown (verified downstream manifests unreadable)"
      : proof.downstreamReplayManifests > 0
        ? `ready (${proof.downstreamReplayManifests} verified downstream manifest${proof.downstreamReplayManifests === 1 ? "" : "s"})`
        : `pending (no ${config.requestLabel} verified downstream manifest yet)`;

  return `${config.label} loop: install_required=${installRequired}; ${config.verifySegmentLabel}=${verify}; reuse=${reuse}; replay=${replay}`;
}

function formatFamilyNextActionLine(
  family: DoctorProofFamily,
  proof: DoctorFamilyProofSummary
): string {
  return `${FAMILY_FORMAT_CONFIG[family].label} next action: ${proof.nextAction}`;
}

function formatFamilyVerifyProofLine(
  family: DoctorProofFamily,
  proof: DoctorFamilyProofSummary
): string {
  const config = FAMILY_FORMAT_CONFIG[family];
  const label = config.label;
  if (proof.verifyState === "unknown") {
    return `${label} verify proof: unknown (acquisition memory unreadable)`;
  }

  if (proof.verifyState === "confirmed") {
    return `${label} verify proof: confirmed (${config.verifyProofSuccessLabel} evidence recorded)`;
  }

  return `${label} verify proof: pending (no ${config.verifyProofPendingLabel} evidence recorded yet)`;
}

function formatFamilyCrossHostReuseProofLine(
  family: DoctorProofFamily,
  proof: DoctorFamilyProofSummary
): string {
  const label = FAMILY_FORMAT_CONFIG[family].label;
  if (proof.crossHostReuseState === "unknown") {
    return `${label} cross-host reuse proof: unknown (acquisition memory unreadable)`;
  }

  if (proof.crossHostReuseState === "confirmed") {
    return `${label} cross-host reuse proof: confirmed (first reuse across hosts recorded)`;
  }

  return `${label} cross-host reuse proof: pending (first reuse across hosts not recorded yet)`;
}

function formatFamilyLoopHostList(hosts: readonly string[]): string {
  return hosts.length === 0 ? "none" : hosts.join(",");
}

function formatFamilyLoopFreshnessSummaryLine(
  result: DoctorLifecycleResult
): string {
  const websiteQa = result.familyLoopSignals.website_qa;
  const webMarkdown = result.familyLoopSignals.web_content_to_markdown;
  const socialMarkdown = result.familyLoopSignals.social_post_to_markdown;

  return `QA-first family freshness (last ${websiteQa.windowDays}d): website QA=${websiteQa.status}, web markdown=${webMarkdown.status}, social markdown=${socialMarkdown.status}`;
}

function formatFamilyLoopSignalLine(signal: DoctorFamilyLoopSignal): string {
  return `${signal.label} freshness (last ${signal.windowDays}d): ${signal.status}, verify=${signal.proofs.verifyState}, repeat_usage=${signal.proofs.repeatUsageState}, cross_host_reuse=${signal.proofs.crossHostReuseState}, verified_hosts=${formatFamilyLoopHostList(signal.reuse.verifiedHosts)}, replay_hosts=${signal.reuse.activeHosts}/${signal.reuse.supportedHosts}`;
}

function formatFamilyLoopLatestLine(signal: DoctorFamilyLoopSignal): string {
  if (signal.latest.activityAt === undefined) {
    return `${signal.label} freshness latest: no family-loop activity recorded yet`;
  }

  const details = [
    `activity=${signal.latest.activityAt}`,
    signal.latest.verifiedAt === undefined
      ? undefined
      : `verify=${signal.latest.verifiedAt}`,
    signal.latest.firstReuseAt === undefined
      ? undefined
      : `first_reuse=${signal.latest.firstReuseAt}`,
    signal.latest.verifiedManifestAt === undefined
      ? undefined
      : `replay=${signal.latest.verifiedManifestAt}`
  ].filter((entry) => entry !== undefined);

  return `${signal.label} freshness latest: ${details.join(", ")}`;
}

function formatFamilyLoopHostLines(signal: DoctorFamilyLoopSignal): string[] {
  return signal.hosts.map((host) => {
    const details = [
      `historical_verified=${host.historicalVerified ? "yes" : "no"}`,
      host.lastVerifiedManifestAt === undefined
        ? undefined
        : `last_replay=${host.lastVerifiedManifestAt}`
    ].filter((entry) => entry !== undefined);

    return `${signal.label} freshness host ${host.name}: ${host.status}, ${details.join(", ")}`;
  });
}

function formatFamilyLoopNextActionLine(signal: DoctorFamilyLoopSignal): string {
  return `${signal.label} freshness next action: ${signal.nextAction}`;
}

function formatCapabilityGrowthHealthSummaryLine(
  result: DoctorLifecycleResult
): string {
  const health = result.capabilityGrowthHealth;

  return `Capability growth health (last ${health.windowDays}d): ${health.status}, opportunities=${health.totals.opportunities}, recent_demand=${health.totals.recentDemand}, proven=${health.totals.provenDemand}, speculative=${health.totals.speculativeAdvisory}, blocked=${health.totals.blockedAcquisition}, stale=${health.totals.staleMetadata}, ready=${health.totals.readyForPromotion}, satisfied=${health.totals.satisfiedLocalWinners}, next_action=${health.nextAction}`;
}

function formatCapabilityGrowthOpportunityLines(
  result: DoctorLifecycleResult
): string[] {
  if (result.capabilityGrowthHealth.opportunities.length === 0) {
    return ["Capability growth opportunity: none recorded yet"];
  }

  return result.capabilityGrowthHealth.opportunities.slice(0, 5).map((opportunity) => {
    const hosts = opportunity.hosts.length === 0 ? "none" : opportunity.hosts.join(",");
    const evidence = opportunity.evidence.length === 0 ? "none" : opportunity.evidence.join(",");
    const latest = opportunity.latestDemandAt === undefined ? "none" : opportunity.latestDemandAt;

    return `Capability growth opportunity ${opportunity.label}: state=${opportunity.state}, next_action=${opportunity.nextAction}, recent_demand=${opportunity.recentDemand}, total_demand=${opportunity.totalDemand}, install_required=${opportunity.installRequired}, no_candidate=${opportunity.noCandidate}, successful_routes=${opportunity.successfulRoutes}, repeat_usage=${opportunity.repeatUsages}, cross_host_reuse=${opportunity.crossHostReuses}, latest=${latest}, hosts=${hosts}, evidence=${evidence}`;
  });
}

function formatFamilyRepeatUsageProofLine(
  family: DoctorProofFamily,
  proof: DoctorFamilyProofSummary
): string {
  const label = FAMILY_FORMAT_CONFIG[family].label;

  if (proof.repeatUsageState === "unknown") {
    return `${label} repeat-usage proof: unknown (acquisition memory unreadable)`;
  }

  if (proof.repeatUsageState === "confirmed") {
    return `${label} repeat-usage proof: confirmed (at least one repeated successful route recorded)`;
  }

  return `${label} repeat-usage proof: pending (no repeated successful route recorded yet)`;
}

function formatAdoptionHealthProofLine(
  result: DoctorLifecycleResult
): string | undefined {
  if (result.adoptionHealth.status !== "green") {
    return undefined;
  }

  const websiteQaProof = result.familyProofs.website_qa;
  const hasWebsiteQaEvidence =
    websiteQaProof.installRequiredTraces > 0 ||
    websiteQaProof.rerunSuccessfulRoutes > 0 ||
    websiteQaProof.reuseRecorded > 0;

  if (!hasWebsiteQaEvidence) {
    return undefined;
  }

  return `Adoption health proof: website QA verify=${websiteQaProof.verifyState}; repeat-usage=${websiteQaProof.repeatUsageState}; cross-host reuse=${websiteQaProof.crossHostReuseState}`;
}

function formatWebsiteQaVerdictLine(result: DoctorLifecycleResult): string {
  return `Website QA verdict: ${result.websiteQaLoop.verdict} (phase=${result.websiteQaLoop.phase})`;
}

function formatWebsiteQaNextActionLine(result: DoctorLifecycleResult): string {
  return `Website QA next action: ${result.websiteQaLoop.nextAction}`;
}

function formatWebsiteQaAdoptionLine(result: DoctorLifecycleResult): string {
  const signal = result.websiteQaAdoption;

  return `Website QA adoption (last ${signal.windowDays}d): ${signal.status}, observed=${signal.recent.observed}, hit=${signal.recent.hits}, misroute=${signal.recent.misroutes}, fallback=${signal.recent.fallbacks}, host_skips=${signal.recent.hostSkips}, hosts=${signal.recent.hostsCovered}/${signal.recent.supportedHosts}, verify=${signal.proofs.verifyState}, repeat_usage=${signal.proofs.repeatUsageState}, cross_host_reuse=${signal.proofs.crossHostReuseState}`;
}

function formatWebsiteQaAdoptionLatestLine(
  result: DoctorLifecycleResult
): string {
  const latest = result.websiteQaAdoption.latest;

  if (latest.activityAt === undefined) {
    return "Website QA adoption latest: no adoption activity recorded yet";
  }

  const details = [
    `activity=${latest.activityAt}`,
    latest.traceAt === undefined ? undefined : `trace=${latest.traceAt}`,
    latest.verifiedAt === undefined ? undefined : `verify=${latest.verifiedAt}`,
    latest.firstReuseAt === undefined
      ? undefined
      : `first_reuse=${latest.firstReuseAt}`,
    latest.verifiedManifestAt === undefined
      ? undefined
      : `replay=${latest.verifiedManifestAt}`
  ].filter((entry) => entry !== undefined);

  return `Website QA adoption latest: ${details.join(", ")}`;
}

function formatWebsiteQaAdoptionHostLines(
  result: DoctorLifecycleResult
): string[] {
  return result.websiteQaAdoption.hosts.map((host) => {
    const details = [
      `observed=${host.observed}`,
      `hit=${host.hits}`,
      `misroute=${host.misroutes}`,
      `fallback=${host.fallbacks}`,
      `host_skips=${host.hostSkips}`,
      `historical_verified=${host.historicalVerified ? "yes" : "no"}`,
      host.lastTraceAt === undefined ? undefined : `last_trace=${host.lastTraceAt}`,
      host.lastVerifiedManifestAt === undefined
        ? undefined
        : `last_replay=${host.lastVerifiedManifestAt}`
    ].filter((entry) => entry !== undefined);

    return `Website QA adoption host ${host.name}: ${host.status}, ${details.join(", ")}`;
  });
}

function formatWebsiteQaAdoptionNextActionLine(
  result: DoctorLifecycleResult
): string {
  return `Website QA adoption next action: ${result.websiteQaAdoption.nextAction}`;
}

function formatWebsiteQaRoutingLine(result: DoctorLifecycleResult): string {
  const summary = result.websiteQaRouting;

  if (summary.observed === 0 && summary.syntheticHostSkips === 0) {
    return `Website QA routing (last ${summary.windowDays}d): no website QA traces recorded yet`;
  }

  return `Website QA routing (last ${summary.windowDays}d): observed=${summary.observed}, host_skips=${summary.syntheticHostSkips}, hit=${summary.hitRate.toFixed(2)}, misroute=${summary.misrouteRate.toFixed(2)}, fallback=${summary.fallbackRate.toFixed(2)}`;
}

function formatWebsiteQaRoutingHostLines(
  result: DoctorLifecycleResult
): string[] {
  return result.websiteQaRouting.hosts.map(
    (host) =>
      `Website QA routing host ${host.name}: observed=${host.observed}, host_skips=${host.syntheticHostSkips}, hit=${host.hitRate.toFixed(2)}, misroute=${host.misrouteRate.toFixed(2)}, fallback=${host.fallbackRate.toFixed(2)}`
  );
}

function formatWebsiteQaRoutingNextActionLine(
  result: DoctorLifecycleResult
): string {
  return `Website QA routing next action: ${result.websiteQaRouting.nextAction}`;
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
      formatSharedHomeExistsLine(result),
      formatAdoptionHealthLine(result.adoptionHealth)
    ];
    const adoptionHealthProofLine = formatAdoptionHealthProofLine(result);
    const adoptionHealthNextActionLine = formatAdoptionHealthNextActionLine(
      result.adoptionHealth
    );

    if (adoptionHealthProofLine !== undefined) {
      lines.push(adoptionHealthProofLine);
    }
    if (adoptionHealthNextActionLine !== undefined) {
      lines.push(adoptionHealthNextActionLine);
    }

    lines.push(formatWebsiteQaAdoptionLine(result));
    lines.push(formatWebsiteQaAdoptionLatestLine(result));
    lines.push(...formatWebsiteQaAdoptionHostLines(result));
    lines.push(formatWebsiteQaAdoptionNextActionLine(result));
    lines.push(formatWebsiteQaVerdictLine(result));
    lines.push(formatWebsiteQaNextActionLine(result));
    lines.push(formatQaFirstFamilyLoopLine());
    lines.push(formatPostQaNextLoopLine());
    lines.push(formatFamilyLoopProofSurfaceLine());
    lines.push(formatFamilyLoopFreshnessSummaryLine(result));
    for (const family of [
      "web_content_to_markdown",
      "social_post_to_markdown"
    ] as const satisfies DoctorProofFamily[]) {
      const signal = result.familyLoopSignals[family];
      lines.push(formatFamilyLoopSignalLine(signal));
      lines.push(formatFamilyLoopLatestLine(signal));
      lines.push(...formatFamilyLoopHostLines(signal));
      lines.push(formatFamilyLoopNextActionLine(signal));
    }

    if (
      result.routingMetrics.observed === 0 &&
      result.routingMetrics.syntheticHostSkips === 0
    ) {
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

      lines.push(formatWebsiteQaRoutingLine(result));
      lines.push(...formatWebsiteQaRoutingHostLines(result));
      lines.push(formatWebsiteQaRoutingNextActionLine(result));
    }
    lines.push(
      `Acquisition memory: ${result.acquisitionMemory.state}, entries=${result.acquisitionMemory.entries}, successful_routes=${result.acquisitionMemory.successfulRoutes}, verification_successes=${result.acquisitionMemory.verificationSuccesses}, first_reuse_after_install=${result.acquisitionMemory.firstReuseRecorded}, repeat_usage=${result.acquisitionMemory.repeatUsages}, cross_host_reuse=${result.acquisitionMemory.crossHostReuse}, degraded=${result.acquisitionMemory.degradedAcquisitions}, failed=${result.acquisitionMemory.failedAcquisitions}, next_action=${result.acquisitionMemory.nextAction}, website_qa_successful_reruns=${result.acquisitionMemory.qualityAssuranceSuccessfulRoutes}, website_qa_repeat_usage=${result.acquisitionMemory.qualityAssuranceFirstReuseRecorded}`
    );
    lines.push(formatCapabilityGrowthHealthSummaryLine(result));
    lines.push(...formatCapabilityGrowthOpportunityLines(result));
    lines.push(
      `Website QA acquisition proof: repeat_usage=${result.acquisitionMemory.qualityAssuranceFirstReuseRecorded}, cross_host_reuse=${result.acquisitionMemory.qualityAssuranceCrossHostReuse}`
    );
    lines.push(
      `Verified downstream manifests: ${result.verifiedDownstreamManifests.state}, total=${result.verifiedDownstreamManifests.manifests}, website_qa=${result.verifiedDownstreamManifests.qualityAssuranceManifests}, ${result.verifiedDownstreamManifests.hosts
        .map((host) => `${host.name}=${host.manifests}`)
        .join(", ")}`
    );
    for (const family of [
      "website_qa",
      "web_content_to_markdown",
      "social_post_to_markdown"
    ] as const satisfies DoctorProofFamily[]) {
      const proof = result.familyProofs[family];
      lines.push(formatFamilyLoopLine(family, proof));
      lines.push(formatFamilyVerifyProofLine(family, proof));
      lines.push(formatFamilyRepeatUsageProofLine(family, proof));
      lines.push(formatFamilyCrossHostReuseProofLine(family, proof));
      lines.push(formatFamilyNextActionLine(family, proof));
    }

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
          `Host ${host.name} manual recovery: markerId=${host.manualRecovery.markerId}, failurePhase=${host.manualRecovery.failurePhase}, rollbackStatus=${host.manualRecovery.rollbackStatus}`
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
  const adoptionHealthNextActionLine = formatAdoptionHealthNextActionLine(
    result.adoptionHealth
  );

  if (adoptionHealthNextActionLine !== undefined) {
    lines.push(adoptionHealthNextActionLine);
  }

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
        `Host ${host.name} manual recovery: markerId=${host.manualRecovery.markerId}, failurePhase=${host.manualRecovery.failurePhase}, rollbackStatus=${host.manualRecovery.rollbackStatus}`
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
