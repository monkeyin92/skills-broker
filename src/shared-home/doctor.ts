import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  AcquisitionMemoryStore,
  acquisitionMemoryFilePath,
  type AcquisitionMemoryEntry
} from "../broker/acquisition-memory.js";
import { readBrokerRoutingTraces, routingTraceLogFilePath } from "../broker/trace-store.js";
import {
  summarizeBrokerRoutingTraces,
  type BrokerRoutingTrace
} from "../broker/trace.js";
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

export type DoctorProofRailState = "present" | "missing" | "unreadable";
export type WebsiteQaLoopPhase =
  | "install_required_pending"
  | "verify_pending"
  | "verify_confirmed"
  | "cross_host_reuse_pending"
  | "cross_host_reuse_confirmed"
  | "proof_unreadable";
export type WebsiteQaLoopVerdict = "blocked" | "in_progress" | "proven";

export type DoctorLifecycleResult = {
  command: "doctor";
  sharedHome: {
    path: string;
    exists: boolean;
    missingPaths?: string[];
  };
  acquisitionMemory: {
    path: string;
    exists: boolean;
    state: DoctorProofRailState;
    entries: number;
    successfulRoutes: number;
    firstReuseRecorded: number;
    crossHostReuse: number;
    qualityAssuranceSuccessfulRoutes: number;
    qualityAssuranceFirstReuseRecorded: number;
  };
  verifiedDownstreamManifests: {
    rootPath: string;
    state: DoctorProofRailState;
    manifests: number;
    qualityAssuranceManifests: number;
    hosts: Array<{
      name: BrokerHost;
      state: DoctorProofRailState;
      manifests: number;
    }>;
  };
  websiteQaLoop: {
    installRequiredTraces: number;
    rerunSuccessfulRoutes: number;
    reuseRecorded: number;
    downstreamReplayManifests: number;
    acquisitionMemoryState: DoctorProofRailState;
    verifiedDownstreamState: DoctorProofRailState;
    verdict: WebsiteQaLoopVerdict;
    phase: WebsiteQaLoopPhase;
    proofs: {
      installRequiredObserved: boolean;
      verifyConfirmed: boolean;
      crossHostReuseConfirmed: boolean;
      replayReady: boolean;
    };
    verifyState: "confirmed" | "pending" | "unknown";
    crossHostReuseState: "confirmed" | "pending" | "unknown";
    nextAction: string;
  };
  routingMetrics: {
    windowDays: number;
    observed: number;
    syntheticHostSkips: number;
    acquisition: ReturnType<typeof summarizeBrokerRoutingTraces>["acquisition"];
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

type DoctorVerifiedDownstreamHostSummary =
  DoctorLifecycleResult["verifiedDownstreamManifests"]["hosts"][number];

type DoctorVerifiedDownstreamHostScan = DoctorVerifiedDownstreamHostSummary & {
  qualityAssuranceManifests: number;
  unreadableReason?: string;
};

type DoctorSharedHomeSummary = DoctorLifecycleResult["sharedHome"];

const WEBSITE_QA_WINNER_ID = "website-qa";
const WEBSITE_QA_CAPABILITY_ID = "gstack.qa";
const WEBSITE_QA_SUBSKILL_ID = "qa";
const VERIFIED_MANIFEST_FILE = ".skills-broker.json";

function websiteQaNextAction(input: {
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  downstreamReplayManifests: number;
  acquisitionMemoryState: DoctorProofRailState;
  verifiedDownstreamState: DoctorProofRailState;
}): string {
  if (input.installRequiredTraces === 0) {
    return "Trigger one website QA request until the broker returns INSTALL_REQUIRED.";
  }

  if (input.acquisitionMemoryState === "unreadable") {
    return "Repair acquisition memory so doctor can prove the install-required and rerun steps.";
  }

  if (input.rerunSuccessfulRoutes === 0) {
    return "Install the suggested website QA package, verify it, then rerun the same request.";
  }

  if (input.verifiedDownstreamState === "unreadable") {
    return "Repair verified downstream manifests so doctor can prove replay and reuse readiness.";
  }

  if (input.reuseRecorded === 0) {
    return "Repeat the same website QA request from another host to record the first proven reuse.";
  }

  if (input.downstreamReplayManifests === 0) {
    return "Verify one successful website QA handoff so the downstream replay manifest is recorded.";
  }

  return "Website QA loop is proven; keep this request path as the default-entry demo.";
}

function websiteQaVerifyState(input: {
  rerunSuccessfulRoutes: number;
  acquisitionMemoryState: DoctorProofRailState;
}): "confirmed" | "pending" | "unknown" {
  if (input.acquisitionMemoryState === "unreadable") {
    return "unknown";
  }

  return input.rerunSuccessfulRoutes > 0 ? "confirmed" : "pending";
}

function websiteQaCrossHostReuseState(input: {
  reuseRecorded: number;
  acquisitionMemoryState: DoctorProofRailState;
}): "confirmed" | "pending" | "unknown" {
  if (input.acquisitionMemoryState === "unreadable") {
    return "unknown";
  }

  return input.reuseRecorded > 0 ? "confirmed" : "pending";
}

function websiteQaLoopProofs(input: {
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  downstreamReplayManifests: number;
}): {
  installRequiredObserved: boolean;
  verifyConfirmed: boolean;
  crossHostReuseConfirmed: boolean;
  replayReady: boolean;
} {
  return {
    installRequiredObserved: input.installRequiredTraces > 0,
    verifyConfirmed: input.rerunSuccessfulRoutes > 0,
    crossHostReuseConfirmed: input.reuseRecorded > 0,
    replayReady: input.downstreamReplayManifests > 0
  };
}

function websiteQaLoopPhase(input: {
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  acquisitionMemoryState: DoctorProofRailState;
  verifiedDownstreamState: DoctorProofRailState;
}): WebsiteQaLoopPhase {
  if (
    input.acquisitionMemoryState === "unreadable" ||
    input.verifiedDownstreamState === "unreadable"
  ) {
    return "proof_unreadable";
  }

  if (input.installRequiredTraces === 0) {
    return "install_required_pending";
  }

  if (input.rerunSuccessfulRoutes === 0) {
    return "verify_pending";
  }

  if (input.reuseRecorded === 0) {
    return "cross_host_reuse_pending";
  }

  return "cross_host_reuse_confirmed";
}

function websiteQaLoopVerdict(phase: WebsiteQaLoopPhase): WebsiteQaLoopVerdict {
  if (phase === "proof_unreadable") {
    return "blocked";
  }

  if (phase === "cross_host_reuse_confirmed") {
    return "proven";
  }

  return "in_progress";
}

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function summarizeDoctorSharedHome(
  brokerHomeDirectory: string,
  warnings: string[]
): Promise<DoctorSharedHomeSummary> {
  const layout = resolveSharedBrokerHomeLayout(brokerHomeDirectory);
  const requiredPaths = [
    layout.packageJsonPath,
    layout.hostCatalogPath,
    layout.maintainedFamiliesPath,
    layout.mcpRegistryPath,
    layout.distPath,
    layout.runnerPath
  ];
  const missingPaths: string[] = [];

  for (const pathname of requiredPaths) {
    if (!(await pathExists(pathname))) {
      missingPaths.push(pathname);
    }
  }

  if (missingPaths.length > 0 && missingPaths.length < requiredPaths.length) {
    warnings.push(
      `shared-home: incomplete install proof (${missingPaths
        .map((pathname) => pathname.replace(`${brokerHomeDirectory}/`, ""))
        .join(", ")})`
    );
  }

  return {
    path: brokerHomeDirectory,
    exists: missingPaths.length === 0,
    ...(missingPaths.length === 0 ? {} : { missingPaths })
  };
}

function isWebsiteQaAcquisitionEntry(entry: AcquisitionMemoryEntry): boolean {
  return (
    entry.leafCapabilityId === WEBSITE_QA_CAPABILITY_ID ||
    entry.candidateId === WEBSITE_QA_CAPABILITY_ID ||
    entry.canonicalKey.includes("families:quality_assurance")
  );
}

function isWebsiteQaTrace(trace: BrokerRoutingTrace): boolean {
  return (
    trace.winnerId === WEBSITE_QA_WINNER_ID ||
    trace.selectedCapabilityId === WEBSITE_QA_CAPABILITY_ID ||
    trace.selectedLeafCapabilityId === WEBSITE_QA_SUBSKILL_ID
  );
}

async function summarizeDoctorAcquisitionMemory(
  brokerHomeDirectory: string,
  warnings: string[]
): Promise<DoctorLifecycleResult["acquisitionMemory"]> {
  const filePath = acquisitionMemoryFilePath(brokerHomeDirectory);
  const exists = await pathExists(filePath);

  if (!exists) {
    return {
      path: filePath,
      exists,
      state: "missing",
      entries: 0,
      successfulRoutes: 0,
      firstReuseRecorded: 0,
      crossHostReuse: 0,
      qualityAssuranceSuccessfulRoutes: 0,
      qualityAssuranceFirstReuseRecorded: 0
    };
  }

  try {
    const memory = await new AcquisitionMemoryStore(filePath).read();
    const websiteQaEntries = memory.entries.filter(isWebsiteQaAcquisitionEntry);

    return {
      path: filePath,
      exists,
      state: "present",
      entries: memory.entries.length,
      successfulRoutes: memory.entries.reduce(
        (total, entry) => total + entry.successfulRoutes,
        0
      ),
      firstReuseRecorded: memory.entries.filter(
        (entry) => entry.firstReuseAt !== undefined
      ).length,
      crossHostReuse: memory.entries.filter(
        (entry) => entry.verifiedHosts.length > 1
      ).length,
      qualityAssuranceSuccessfulRoutes: websiteQaEntries.reduce(
        (total, entry) => total + entry.successfulRoutes,
        0
      ),
      qualityAssuranceFirstReuseRecorded: websiteQaEntries.filter(
        (entry) => entry.firstReuseAt !== undefined
      ).length
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "unknown acquisition memory failure";
    warnings.push(`acquisition-memory: unreadable (${reason})`);

    return {
      path: filePath,
      exists,
      state: "unreadable",
      entries: 0,
      successfulRoutes: 0,
      firstReuseRecorded: 0,
      crossHostReuse: 0,
      qualityAssuranceSuccessfulRoutes: 0,
      qualityAssuranceFirstReuseRecorded: 0
    };
  }
}

function parseVerifiedManifestCandidate(raw: string): {
  isWebsiteQa: boolean;
} | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const skillName =
      typeof parsed.skillName === "string" ? parsed.skillName : undefined;
    const verifiedCandidate =
      typeof parsed.verifiedCandidate === "object" && parsed.verifiedCandidate !== null
        ? (parsed.verifiedCandidate as Record<string, unknown>)
        : undefined;
    const leaf =
      verifiedCandidate !== undefined &&
      typeof verifiedCandidate.leaf === "object" &&
      verifiedCandidate.leaf !== null
        ? (verifiedCandidate.leaf as Record<string, unknown>)
        : undefined;

    return {
      isWebsiteQa:
        skillName === WEBSITE_QA_SUBSKILL_ID ||
        leaf?.capabilityId === WEBSITE_QA_CAPABILITY_ID ||
        leaf?.subskillId === WEBSITE_QA_SUBSKILL_ID
    };
  } catch {
    return null;
  }
}

async function summarizeVerifiedDownstreamHost(
  directory: string,
  host: BrokerHost
): Promise<DoctorVerifiedDownstreamHostScan> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let manifests = 0;
    let qualityAssuranceManifests = 0;

    for (const entry of entries) {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        const nested = await summarizeVerifiedDownstreamHost(entryPath, host);
        if (nested.state === "unreadable") {
          return nested;
        }

        manifests += nested.manifests;
        qualityAssuranceManifests += nested.qualityAssuranceManifests ?? 0;
        continue;
      }

      if (!entry.isFile() || entry.name !== VERIFIED_MANIFEST_FILE) {
        continue;
      }

      let rawManifest: string;
      try {
        rawManifest = await readFile(entryPath, "utf8");
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "unknown manifest read failure";
        return {
          name: host,
          state: "unreadable",
          manifests,
          qualityAssuranceManifests,
          unreadableReason: `${entryPath}: ${reason}`
        };
      }

      const parsed = parseVerifiedManifestCandidate(rawManifest);
      if (parsed === null) {
        return {
          name: host,
          state: "unreadable",
          manifests,
          qualityAssuranceManifests,
          unreadableReason: `${entryPath}: invalid verified downstream manifest`
        };
      }

      manifests += 1;
      if (parsed.isWebsiteQa) {
        qualityAssuranceManifests += 1;
      }
    }

    return {
      name: host,
      state: manifests > 0 ? "present" : "missing",
      manifests,
      qualityAssuranceManifests
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return {
        name: host,
        state: "missing",
        manifests: 0,
        qualityAssuranceManifests: 0
      };
    }

    const reason =
      error instanceof Error ? error.message : "unknown downstream manifest failure";
    return {
      name: host,
      state: "unreadable",
      manifests: 0,
      qualityAssuranceManifests: 0,
      unreadableReason: `${directory}: ${reason}`
    };
  }
}

async function summarizeDoctorVerifiedDownstreamManifests(
  brokerHomeDirectory: string,
  warnings: string[]
): Promise<DoctorLifecycleResult["verifiedDownstreamManifests"]> {
  const hosts = await Promise.all(
    BROKER_HOSTS.map(async (host) => {
      const hostSummary = await summarizeVerifiedDownstreamHost(
        join(brokerHomeDirectory, "downstream", host, "skills"),
        host
      );

      if (hostSummary.state === "unreadable" && hostSummary.unreadableReason) {
        warnings.push(
          `downstream-manifests:${host}: unreadable (${hostSummary.unreadableReason})`
        );
      }

      return hostSummary;
    })
  );
  const state: DoctorProofRailState = hosts.some((host) => host.state === "unreadable")
    ? "unreadable"
    : hosts.some((host) => host.state === "present")
      ? "present"
      : "missing";

  return {
    rootPath: join(brokerHomeDirectory, "downstream"),
    state,
    manifests: hosts.reduce((total, host) => total + host.manifests, 0),
    qualityAssuranceManifests: hosts.reduce(
      (total, host) => total + host.qualityAssuranceManifests,
      0
    ),
    hosts: hosts.map(({ unreadableReason: _unreadableReason, ...host }) => host)
  };
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
  const warnings: string[] = [];
  const sharedHome = await summarizeDoctorSharedHome(
    options.brokerHomeDirectory,
    warnings
  );
  const hostTargets = await detectLifecycleHostTargets({
    homeDirectory: options.homeDirectory,
    brokerHomeOverride: options.brokerHomeDirectory,
    claudeDirOverride: options.claudeCodeInstallDirectory,
    codexDirOverride: options.codexInstallDirectory
  });
  const routingWindowDays = 7;
  const routingTraces = await readBrokerRoutingTraces(
    routingTraceLogFilePath(options.brokerHomeDirectory)
  );
  const routingSummary = summarizeBrokerRoutingTraces(
    routingTraces,
    {
      since: new Date(
        (options.now ?? new Date()).getTime() -
          routingWindowDays * 24 * 60 * 60 * 1000
      )
    }
  );
  const acquisitionMemory = await summarizeDoctorAcquisitionMemory(
    options.brokerHomeDirectory,
    warnings
  );
  const verifiedDownstreamManifests =
    await summarizeDoctorVerifiedDownstreamManifests(
      options.brokerHomeDirectory,
      warnings
    );
  const websiteQaInstallRequiredTraces = routingTraces.filter(
    (trace) =>
      new Date(trace.timestamp) >=
        new Date(
          (options.now ?? new Date()).getTime() -
            routingWindowDays * 24 * 60 * 60 * 1000
        ) &&
      trace.resultCode === "INSTALL_REQUIRED" &&
      isWebsiteQaTrace(trace)
  ).length;
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

  const phase = websiteQaLoopPhase({
    installRequiredTraces: websiteQaInstallRequiredTraces,
    rerunSuccessfulRoutes: acquisitionMemory.qualityAssuranceSuccessfulRoutes,
    reuseRecorded: acquisitionMemory.qualityAssuranceFirstReuseRecorded,
    acquisitionMemoryState: acquisitionMemory.state,
    verifiedDownstreamState: verifiedDownstreamManifests.state
  });

  const websiteQaLoop = {
    installRequiredTraces: websiteQaInstallRequiredTraces,
    rerunSuccessfulRoutes: acquisitionMemory.qualityAssuranceSuccessfulRoutes,
    reuseRecorded: acquisitionMemory.qualityAssuranceFirstReuseRecorded,
    downstreamReplayManifests:
      verifiedDownstreamManifests.qualityAssuranceManifests,
    acquisitionMemoryState: acquisitionMemory.state,
    verifiedDownstreamState: verifiedDownstreamManifests.state,
    verdict: websiteQaLoopVerdict(phase),
    phase,
    proofs: websiteQaLoopProofs({
      installRequiredTraces: websiteQaInstallRequiredTraces,
      rerunSuccessfulRoutes: acquisitionMemory.qualityAssuranceSuccessfulRoutes,
      reuseRecorded: acquisitionMemory.qualityAssuranceFirstReuseRecorded,
      downstreamReplayManifests:
        verifiedDownstreamManifests.qualityAssuranceManifests
    }),
    verifyState: websiteQaVerifyState({
      rerunSuccessfulRoutes: acquisitionMemory.qualityAssuranceSuccessfulRoutes,
      acquisitionMemoryState: acquisitionMemory.state
    }),
    crossHostReuseState: websiteQaCrossHostReuseState({
      reuseRecorded: acquisitionMemory.qualityAssuranceFirstReuseRecorded,
      acquisitionMemoryState: acquisitionMemory.state
    }),
    nextAction: websiteQaNextAction({
      installRequiredTraces: websiteQaInstallRequiredTraces,
      rerunSuccessfulRoutes: acquisitionMemory.qualityAssuranceSuccessfulRoutes,
      reuseRecorded: acquisitionMemory.qualityAssuranceFirstReuseRecorded,
      downstreamReplayManifests:
        verifiedDownstreamManifests.qualityAssuranceManifests,
      acquisitionMemoryState: acquisitionMemory.state,
      verifiedDownstreamState: verifiedDownstreamManifests.state
    })
  };

  return {
    command: "doctor",
    sharedHome,
    acquisitionMemory,
    verifiedDownstreamManifests,
    websiteQaLoop,
    routingMetrics: {
      windowDays: routingWindowDays,
      observed: routingSummary.observed,
      syntheticHostSkips: routingSummary.syntheticHostSkips,
      acquisition: routingSummary.acquisition,
      contracts: routingSummary.contracts,
      surfaces: routingSummary.surfaces
    },
    hosts,
    brokerFirstGate,
    status,
    adoptionHealth: resolveAdoptionHealth({
      sharedHomeExists: sharedHome.exists,
      sharedHomeReason:
        sharedHome.exists === true || sharedHome.missingPaths === undefined
          ? undefined
          : `missing install proof rails (${sharedHome.missingPaths
              .map((pathname) =>
                pathname.replace(`${options.brokerHomeDirectory}/`, "")
              )
              .join(", ")})`,
      hosts,
      brokerFirstGate,
      statusBoard: status,
      proofRails: {
        acquisitionMemory: acquisitionMemory.state,
        verifiedDownstreamManifests: verifiedDownstreamManifests.state
      }
    }),
    warnings
  };
}
