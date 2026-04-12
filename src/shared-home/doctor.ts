import { access, readdir, stat } from "node:fs/promises";
import { readBrokerRoutingTraces, routingTraceLogFilePath } from "../broker/trace-store.js";
import { summarizeBrokerRoutingTraces } from "../broker/trace.js";
import {
  BROKER_HOSTS,
  brokerHostKnownShellEntries,
  type BrokerHost
} from "../core/types.js";
import {
  evaluateBrokerFirstGate,
  type BrokerFirstGateDiagnosticResult
} from "./broker-first-gate.js";
import {
  resolveAdoptionHealth,
  type AdoptionHealthResult
} from "./adoption-health.js";
import { resolveSharedBrokerHomeLayout } from "./install.js";
import { readManagedShellManifest } from "./ownership.js";
import { detectWritableDirectory } from "./detect.js";
import {
  competingPeerSkillsWarning,
  inspectManagedPeerSurface
} from "./host-surface.js";
import {
  detectLifecycleHostTargets,
  lifecycleHostTarget
} from "./paths.js";
import { evaluateStatusBoard, type DoctorStatusResult } from "./status.js";
import type { PeerSurfaceIntegrityIssue } from "./peer-surface-audit.js";
import type { PeerSurfaceManualRecoveryMarker } from "./peer-surface-audit.js";

export type DoctorLifecycleResult = {
  command: "doctor";
  sharedHome: {
    path: string;
    exists: boolean;
  };
  routingMetrics: {
    windowDays: number;
    observed: number;
    syntheticHostSkips: number;
    contracts: ReturnType<typeof summarizeBrokerRoutingTraces>["contracts"];
    surfaces: ReturnType<typeof summarizeBrokerRoutingTraces>["surfaces"];
  };
  hosts: Array<{
    name: BrokerHost;
    status: "detected" | "not_detected" | "not_writable" | "conflict";
    reason?: string;
    competingPeerSkills?: string[];
    integrityIssues?: PeerSurfaceIntegrityIssue[];
    manualRecovery?: PeerSurfaceManualRecoveryMarker & {
      path: string;
      clearCommand: string;
    };
    remediation?: {
      action: "hide_competing_peer_skills";
      targetDirectory: string;
      peerSkills: string[];
      message: string;
    };
  }>;
  brokerFirstGate: BrokerFirstGateDiagnosticResult;
  status: DoctorStatusResult;
  adoptionHealth: AdoptionHealthResult;
  warnings: string[];
};

export type DoctorSharedBrokerHomeOptions = {
  brokerHomeDirectory: string;
  cwd?: string;
  homeDirectory?: string;
  claudeCodeInstallDirectory?: string;
  codexInstallDirectory?: string;
  refreshRemote?: boolean;
  repoRootOverride?: string;
  shipRefOverride?: string;
  now?: Date;
};

type DoctorHostEntry = DoctorLifecycleResult["hosts"][number];

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function conflictReason(
  state: Awaited<ReturnType<typeof readManagedShellManifest>>
): string {
  switch (state.status) {
    case "foreign":
      return "foreign ownership manifest";
    case "invalid-json":
      return "invalid ownership manifest json";
    case "invalid-manifest":
      return "invalid ownership manifest";
    case "unreadable":
      return `unreadable ownership manifest: ${state.error.message}`;
    default:
      return "conflicting host shell state";
  }
}

async function detectUnmanagedHostConflict(
  name: BrokerHost,
  installDirectory: string
): Promise<string | undefined> {
  try {
    const directoryStat = await stat(installDirectory);

    if (!directoryStat.isDirectory()) {
      return "existing unmanaged host path is not a directory";
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }

  const entries = await readdir(installDirectory);
  if (entries.length === 0) {
    return undefined;
  }

  if (
    entries.some((entry) => brokerHostKnownShellEntries(name).includes(entry)) ||
    entries.length > 0
  ) {
    return "existing unmanaged host directory";
  }

  return undefined;
}

async function doctorHost(
  name: BrokerHost,
  installDirectory: string | undefined,
  notDetectedReason: string | undefined,
  brokerHomeDirectory: string,
  warnings: string[]
): Promise<DoctorHostEntry> {
  if (installDirectory === undefined) {
    return {
      name,
      status: "not_detected",
      reason: notDetectedReason
    };
  }

  const manifestState = await readManagedShellManifest(installDirectory);
  if (manifestState.status === "managed") {
    const peerSurface = await inspectManagedPeerSurface(
      name,
      installDirectory,
      brokerHomeDirectory
    );

    warnings.push(
      ...peerSurface.integrityIssues.map(
        (issue) => `${name}: ${issue.code}: ${issue.message}`
      )
    );

    if (peerSurface.competingPeerSkills.length > 0) {
      warnings.push(
        competingPeerSkillsWarning(name, peerSurface.competingPeerSkills)
      );
    }

    if (peerSurface.manualRecovery !== undefined) {
      warnings.push(
        `${name}: manual recovery required (${peerSurface.manualRecovery.markerId})`
      );
    }

    return {
      name,
      status: "detected",
      reason: "managed by skills-broker",
      ...(peerSurface.competingPeerSkills.length > 0
        ? {
            competingPeerSkills: peerSurface.competingPeerSkills,
            remediation: peerSurface.remediation
          }
        : {}),
      ...(peerSurface.integrityIssues.length === 0
        ? {}
        : { integrityIssues: peerSurface.integrityIssues }),
      ...(peerSurface.manualRecovery === undefined
        ? {}
        : { manualRecovery: peerSurface.manualRecovery })
    };
  }

  if (
    manifestState.status === "foreign" ||
    manifestState.status === "invalid-json" ||
    manifestState.status === "invalid-manifest" ||
    manifestState.status === "unreadable"
  ) {
    const reason = conflictReason(manifestState);
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "conflict",
      reason
    };
  }

  const writableState = await detectWritableDirectory(installDirectory);
  if (writableState.status === "not-writable") {
    const reason =
      writableState.reason === "not-a-directory"
        ? `host path is blocked by a file at ${writableState.blockingPath}`
        : `host path is not writable: ${writableState.blockingPath}`;
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "not_writable",
      reason
    };
  }

  const unmanagedConflictReason = await detectUnmanagedHostConflict(name, installDirectory);
  if (unmanagedConflictReason !== undefined) {
    warnings.push(`${name}: ${unmanagedConflictReason}`);
    return {
      name,
      status: "conflict",
      reason: unmanagedConflictReason
    };
  }

  const reason = writableState.targetExists
    ? "host shell is missing ownership manifest"
    : "host shell directory is missing";

  return {
    name,
    status: "not_detected",
    reason
  };
}

export async function doctorSharedBrokerHome(
  options: DoctorSharedBrokerHomeOptions
): Promise<DoctorLifecycleResult> {
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const sharedHomeExists = await pathExists(sharedHomeLayout.packageJsonPath);
  const hostTargets = await detectLifecycleHostTargets({
    homeDirectory: options.homeDirectory,
    brokerHomeOverride: options.brokerHomeDirectory,
    claudeDirOverride: options.claudeCodeInstallDirectory,
    codexDirOverride: options.codexInstallDirectory
  });
  const warnings: string[] = [];
  const routingWindowDays = 7;
  const routingSummary = summarizeBrokerRoutingTraces(
    await readBrokerRoutingTraces(
      routingTraceLogFilePath(options.brokerHomeDirectory)
    ),
    {
      since: new Date(
        (options.now ?? new Date()).getTime() -
          routingWindowDays * 24 * 60 * 60 * 1000
      )
    }
  );
  const hosts = [
    ...(
      await Promise.all(
        BROKER_HOSTS.map((host) => {
          const target = lifecycleHostTarget(hostTargets, host);
          return doctorHost(
            host,
            target.installDirectory,
            target.reason,
            options.brokerHomeDirectory,
            warnings
          );
        })
      )
    )
  ];
  const brokerFirstGate = await evaluateBrokerFirstGate({
    brokerHomeDirectory: options.brokerHomeDirectory,
    refresh: options.refreshRemote,
    now: options.now
  });
  const status = await evaluateStatusBoard({
    cwd: options.cwd,
    refreshRemote: options.refreshRemote,
    repoRootOverride: options.repoRootOverride,
    shipRefOverride: options.shipRefOverride,
    allowMissingRepoTarget: options.repoRootOverride === undefined
  });

  return {
    command: "doctor",
    sharedHome: {
      path: options.brokerHomeDirectory,
      exists: sharedHomeExists
    },
    routingMetrics: {
      windowDays: routingWindowDays,
      observed: routingSummary.observed,
      syntheticHostSkips: routingSummary.syntheticHostSkips,
      contracts: routingSummary.contracts,
      surfaces: routingSummary.surfaces
    },
    hosts,
    brokerFirstGate,
    status,
    adoptionHealth: resolveAdoptionHealth({
      sharedHomeExists,
      hosts,
      brokerFirstGate,
      statusBoard: status
    }),
    warnings
  };
}
