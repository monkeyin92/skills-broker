import type { CapabilityCard } from "../core/capability-card.js";
import type {
  CapabilityPackageAcquisition,
  CapabilityPackageProbe,
  LeafCapabilityProbe,
  PackageAcquisitionHint,
  PackageInstallMethod,
  PackageInstallRetryMode
} from "../core/types.js";

type BuildPackageAcquisitionHintOptions = {
  retryMode: PackageInstallRetryMode;
  runId?: string;
  stageId?: string;
};

function installMethodForAcquisition(
  acquisition: CapabilityPackageAcquisition
): PackageInstallMethod {
  switch (acquisition) {
    case "published_package":
      return "package_manager";
    case "mcp_bundle":
      return "mcp_registry";
    case "local_skill_bundle":
      return "local_bundle";
    case "broker_native":
      return "manual_followup";
  }
}

function probeChecks(
  probe: CapabilityPackageProbe | LeafCapabilityProbe | undefined,
  label: string
): string[] {
  if (probe === undefined) {
    return [];
  }

  const checks: string[] = [];

  if ((probe.manifestNames?.length ?? 0) > 0) {
    checks.push(`${label} manifest name(s): ${probe.manifestNames!.join(", ")}`);
  }

  if ((probe.manifestFiles?.length ?? 0) > 0) {
    checks.push(`${label} manifest file(s): ${probe.manifestFiles!.join(", ")}`);
  }

  if ((probe.aliases?.length ?? 0) > 0) {
    checks.push(`${label} alias(es): ${probe.aliases!.join(", ")}`);
  }

  return checks;
}

function installInstructions(card: CapabilityCard, method: PackageInstallMethod): string {
  switch (method) {
    case "package_manager":
      return `Install package "${card.package.packageId}" with the host's normal package-manager flow, then expose it to the broker-visible package roots.`;
    case "mcp_registry":
      return `Install or configure MCP bundle "${card.package.packageId}" through the host's MCP setup flow so the broker can resolve it locally.`;
    case "local_bundle":
      return `Install or link local bundle "${card.package.packageId}" into a broker-visible skills directory before retrying.`;
    case "manual_followup":
      return `Complete the required manual setup for "${card.package.packageId}" before retrying the broker request.`;
  }
}

function retryInstructions(
  options: BuildPackageAcquisitionHintOptions
): string {
  if (options.retryMode === "resume_workflow_stage") {
    const runId = options.runId ?? "current run";
    const stageId = options.stageId ?? "current stage";

    return `After verification succeeds, resume workflow run "${runId}" at stage "${stageId}".`;
  }

  return "After verification succeeds, rerun the same broker request.";
}

export function buildPackageAcquisitionHint(
  card: CapabilityCard,
  options: BuildPackageAcquisitionHintOptions
): PackageAcquisitionHint {
  const method = installMethodForAcquisition(card.package.acquisition);
  const checks = [
    ...probeChecks(card.package.probe, "Package"),
    ...probeChecks(card.leaf.probe, "Leaf")
  ];

  if (checks.length === 0) {
    checks.push(
      `Verify package "${card.package.packageId}" and leaf "${card.leaf.capabilityId}" are both visible to broker package probing.`
    );
  }

  return {
    reason: "package_not_installed",
    package: card.package,
    leafCapability: card.leaf,
    installPlan: {
      method,
      summary: `Install package "${card.package.packageId}" to unlock "${card.leaf.subskillId}", verify the leaf is visible, then retry.`,
      steps: [
        {
          id: "install",
          title: "Install package",
          instructions: installInstructions(card, method)
        },
        {
          id: "verify",
          title: "Verify package and leaf",
          instructions:
            checks.length === 1
              ? checks[0]
              : `Verify all of the following before retrying: ${checks.join("; ")}`
        },
        {
          id: "retry",
          title:
            options.retryMode === "resume_workflow_stage"
              ? "Resume workflow stage"
              : "Retry broker request",
          instructions: retryInstructions(options)
        }
      ],
      verification: {
        checks,
        packageProbe: card.package.probe,
        leafProbe: card.leaf.probe
      },
      retry: {
        mode: options.retryMode,
        runId: options.runId,
        stageId: options.stageId
      }
    }
  };
}
