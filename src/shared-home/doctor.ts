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
  type BrokerHost,
  type BrokerIntent,
  type CapabilityProofFamily
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
export type DoctorProofFamily = "website_qa" | "web_content_to_markdown";
export type DoctorFamilyProofPhase =
  | "install_required_pending"
  | "verify_pending"
  | "verify_confirmed"
  | "cross_host_reuse_pending"
  | "cross_host_reuse_confirmed"
  | "proof_unreadable";
export type DoctorFamilyProofVerdict = "blocked" | "in_progress" | "proven";

export type DoctorFamilyProofSummary = {
  label: string;
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  downstreamReplayManifests: number;
  acquisitionMemoryState: DoctorProofRailState;
  verifiedDownstreamState: DoctorProofRailState;
  verdict: DoctorFamilyProofVerdict;
  phase: DoctorFamilyProofPhase;
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
  familyProofs: Record<DoctorProofFamily, DoctorFamilyProofSummary>;
  websiteQaLoop: DoctorFamilyProofSummary;
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
  familyManifestCounts: Record<DoctorProofFamily, number>;
  qualityAssuranceManifests: number;
  unreadableReason?: string;
};

type DoctorVerifiedDownstreamScan =
  DoctorLifecycleResult["verifiedDownstreamManifests"] & {
    familyManifestCounts: Record<DoctorProofFamily, number>;
  };

type DoctorSharedHomeSummary = DoctorLifecycleResult["sharedHome"];

const WEBSITE_QA_WINNER_ID = "website-qa";
const WEBSITE_QA_CAPABILITY_ID = "gstack.qa";
const WEBSITE_QA_SUBSKILL_ID = "qa";
const WEB_MARKDOWN_WINNER_ID = "web-content-to-markdown";
const WEB_MARKDOWN_CAPABILITY_ID = "baoyu.url-to-markdown";
const WEB_MARKDOWN_SUBSKILL_ID = "url-to-markdown";
const VERIFIED_MANIFEST_FILE = ".skills-broker.json";

type DoctorFamilyConfig = {
  family: DoctorProofFamily;
  label: string;
  requestLabel: string;
  winnerIds: string[];
  candidateIds: string[];
  capabilityIds: string[];
  subskillIds: string[];
  proofFamilies: CapabilityProofFamily[];
  compatibilityIntents: BrokerIntent[];
  canonicalKeyFragments: string[];
  skillNames: string[];
  provenMessage: string;
};

const DOCTOR_FAMILY_CONFIGS: readonly DoctorFamilyConfig[] = [
  {
    family: "website_qa",
    label: "Website QA",
    requestLabel: "website QA",
    winnerIds: [WEBSITE_QA_WINNER_ID],
    candidateIds: [WEBSITE_QA_WINNER_ID, WEBSITE_QA_CAPABILITY_ID],
    capabilityIds: [WEBSITE_QA_CAPABILITY_ID],
    subskillIds: [WEBSITE_QA_SUBSKILL_ID],
    proofFamilies: ["website_qa"],
    compatibilityIntents: [],
    canonicalKeyFragments: ["families:quality_assurance"],
    skillNames: [WEBSITE_QA_SUBSKILL_ID],
    provenMessage:
      "Website QA loop is proven; keep this request path as the default-entry demo."
  },
  {
    family: "web_content_to_markdown",
    label: "Web Markdown",
    requestLabel: "web markdown",
    winnerIds: [WEB_MARKDOWN_WINNER_ID],
    candidateIds: [WEB_MARKDOWN_WINNER_ID, WEB_MARKDOWN_CAPABILITY_ID],
    capabilityIds: [WEB_MARKDOWN_CAPABILITY_ID],
    subskillIds: [WEB_MARKDOWN_SUBSKILL_ID],
    proofFamilies: ["web_content_to_markdown"],
    compatibilityIntents: ["web_content_to_markdown"],
    canonicalKeyFragments: ["families:content_acquisition,web_content_conversion"],
    skillNames: [WEB_MARKDOWN_SUBSKILL_ID],
    provenMessage:
      "Web Markdown loop is proven; keep this request path as the second maintained-family demo."
  }
] as const;

type DoctorFamilyEvidence = {
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  downstreamReplayManifests: number;
  acquisitionMemoryState: DoctorProofRailState;
  verifiedDownstreamState: DoctorProofRailState;
};

type ParsedVerifiedManifestCandidate = {
  skillName?: string;
  candidateId?: string;
  compatibilityIntent?: string;
  proofFamily?: string;
  capabilityId?: string;
  subskillId?: string;
};

function familyNextAction(
  config: DoctorFamilyConfig,
  input: DoctorFamilyEvidence
): string {
  if (input.installRequiredTraces === 0) {
    return `Trigger one ${config.requestLabel} request until the broker returns INSTALL_REQUIRED.`;
  }

  if (input.acquisitionMemoryState === "unreadable") {
    return `Repair acquisition memory so doctor can prove the install-required and rerun steps for ${config.requestLabel}.`;
  }

  if (input.rerunSuccessfulRoutes === 0) {
    return `Install the suggested ${config.requestLabel} package, verify it, then rerun the same request.`;
  }

  if (input.verifiedDownstreamState === "unreadable") {
    return `Repair verified downstream manifests so doctor can prove replay and reuse readiness for ${config.requestLabel}.`;
  }

  if (input.reuseRecorded === 0) {
    return `Repeat the same ${config.requestLabel} request from another host to record the first proven reuse.`;
  }

  if (input.downstreamReplayManifests === 0) {
    return `Verify one successful ${config.requestLabel} handoff so the downstream replay manifest is recorded.`;
  }

  return config.provenMessage;
}

function familyVerifyState(input: DoctorFamilyEvidence): "confirmed" | "pending" | "unknown" {
  if (input.acquisitionMemoryState === "unreadable") {
    return "unknown";
  }

  return input.rerunSuccessfulRoutes > 0 ? "confirmed" : "pending";
}

function familyCrossHostReuseState(
  input: DoctorFamilyEvidence
): "confirmed" | "pending" | "unknown" {
  if (input.acquisitionMemoryState === "unreadable") {
    return "unknown";
  }

  return input.reuseRecorded > 0 ? "confirmed" : "pending";
}

function buildFamilyProofFlags(input: DoctorFamilyEvidence): {
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

function familyPhase(input: DoctorFamilyEvidence): DoctorFamilyProofPhase {
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

function familyVerdict(phase: DoctorFamilyProofPhase): DoctorFamilyProofVerdict {
  if (phase === "proof_unreadable") {
    return "blocked";
  }

  if (phase === "cross_host_reuse_confirmed") {
    return "proven";
  }

  return "in_progress";
}

function buildFamilyProofSummary(
  config: DoctorFamilyConfig,
  input: DoctorFamilyEvidence
): DoctorFamilyProofSummary {
  const phase = familyPhase(input);

  return {
    label: config.label,
    installRequiredTraces: input.installRequiredTraces,
    rerunSuccessfulRoutes: input.rerunSuccessfulRoutes,
    reuseRecorded: input.reuseRecorded,
    downstreamReplayManifests: input.downstreamReplayManifests,
    acquisitionMemoryState: input.acquisitionMemoryState,
    verifiedDownstreamState: input.verifiedDownstreamState,
    verdict: familyVerdict(phase),
    phase,
    proofs: buildFamilyProofFlags(input),
    verifyState: familyVerifyState(input),
    crossHostReuseState: familyCrossHostReuseState(input),
    nextAction: familyNextAction(config, input)
  };
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

function includesConfiguredValue(
  value: string | null | undefined,
  candidates: readonly string[]
): boolean {
  return value !== undefined && value !== null && candidates.includes(value);
}

function isFamilyAcquisitionEntry(
  entry: AcquisitionMemoryEntry,
  config: DoctorFamilyConfig
): boolean {
  return (
    includesConfiguredValue(entry.candidateId, config.candidateIds) ||
    includesConfiguredValue(entry.leafCapabilityId, config.capabilityIds) ||
    config.compatibilityIntents.includes(entry.compatibilityIntent) ||
    config.canonicalKeyFragments.some((fragment) =>
      entry.canonicalKey.includes(fragment)
    ) ||
    includesConfiguredValue(entry.winnerSnapshot?.id, config.candidateIds) ||
    includesConfiguredValue(
      entry.winnerSnapshot?.leaf.capabilityId,
      config.capabilityIds
    ) ||
    includesConfiguredValue(
      entry.winnerSnapshot?.leaf.subskillId,
      config.subskillIds
    ) ||
    includesConfiguredValue(
      entry.winnerSnapshot?.query.proofFamily,
      config.proofFamilies
    )
  );
}

function isFamilyTrace(
  trace: BrokerRoutingTrace,
  config: DoctorFamilyConfig
): boolean {
  return (
    includesConfiguredValue(trace.winnerId, config.winnerIds) ||
    includesConfiguredValue(trace.selectedCapabilityId, config.capabilityIds) ||
    includesConfiguredValue(trace.selectedLeafCapabilityId, config.subskillIds) ||
    includesConfiguredValue(trace.semanticMatchCandidateId, config.candidateIds) ||
    includesConfiguredValue(trace.semanticMatchProofFamily, config.proofFamilies)
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
    const websiteQaEntries = memory.entries.filter((entry) =>
      isFamilyAcquisitionEntry(entry, DOCTOR_FAMILY_CONFIGS[0])
    );

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

function parseVerifiedManifestCandidate(raw: string): ParsedVerifiedManifestCandidate | null {
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
    const query =
      verifiedCandidate !== undefined &&
      typeof verifiedCandidate.query === "object" &&
      verifiedCandidate.query !== null
        ? (verifiedCandidate.query as Record<string, unknown>)
        : undefined;

    return {
      skillName,
      candidateId:
        typeof verifiedCandidate?.id === "string" ? verifiedCandidate.id : undefined,
      compatibilityIntent:
        typeof verifiedCandidate?.intent === "string"
          ? verifiedCandidate.intent
          : undefined,
      proofFamily:
        typeof query?.proofFamily === "string" ? query.proofFamily : undefined,
      capabilityId:
        typeof leaf?.capabilityId === "string" ? leaf.capabilityId : undefined,
      subskillId:
        typeof leaf?.subskillId === "string" ? leaf.subskillId : undefined
    };
  } catch {
    return null;
  }
}

function isFamilyManifest(
  candidate: ParsedVerifiedManifestCandidate,
  config: DoctorFamilyConfig
): boolean {
  return (
    includesConfiguredValue(candidate.skillName, config.skillNames) ||
    includesConfiguredValue(candidate.candidateId, config.candidateIds) ||
    includesConfiguredValue(candidate.compatibilityIntent, config.compatibilityIntents) ||
    includesConfiguredValue(candidate.proofFamily, config.proofFamilies) ||
    includesConfiguredValue(candidate.capabilityId, config.capabilityIds) ||
    includesConfiguredValue(candidate.subskillId, config.subskillIds)
  );
}

async function summarizeVerifiedDownstreamHost(
  directory: string,
  host: BrokerHost
): Promise<DoctorVerifiedDownstreamHostScan> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    let manifests = 0;
    let qualityAssuranceManifests = 0;
    const familyManifestCounts = Object.fromEntries(
      DOCTOR_FAMILY_CONFIGS.map((config) => [config.family, 0])
    ) as Record<DoctorProofFamily, number>;

    for (const entry of entries) {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        const nested = await summarizeVerifiedDownstreamHost(entryPath, host);
        if (nested.state === "unreadable") {
          return nested;
        }

        manifests += nested.manifests;
        qualityAssuranceManifests += nested.qualityAssuranceManifests ?? 0;
        for (const config of DOCTOR_FAMILY_CONFIGS) {
          familyManifestCounts[config.family] +=
            nested.familyManifestCounts[config.family];
        }
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
          familyManifestCounts,
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
          familyManifestCounts,
          qualityAssuranceManifests,
          unreadableReason: `${entryPath}: invalid verified downstream manifest`
        };
      }

      manifests += 1;
      for (const config of DOCTOR_FAMILY_CONFIGS) {
        if (isFamilyManifest(parsed, config)) {
          familyManifestCounts[config.family] += 1;
        }
      }
      qualityAssuranceManifests = familyManifestCounts.website_qa;
    }

    return {
      name: host,
      state: manifests > 0 ? "present" : "missing",
      manifests,
      familyManifestCounts,
      qualityAssuranceManifests
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return {
        name: host,
        state: "missing",
        manifests: 0,
        familyManifestCounts: {
          website_qa: 0,
          web_content_to_markdown: 0
        },
        qualityAssuranceManifests: 0
      };
    }

    const reason =
      error instanceof Error ? error.message : "unknown downstream manifest failure";
    return {
      name: host,
      state: "unreadable",
      manifests: 0,
      familyManifestCounts: {
        website_qa: 0,
        web_content_to_markdown: 0
      },
      qualityAssuranceManifests: 0,
      unreadableReason: `${directory}: ${reason}`
    };
  }
}

async function summarizeDoctorVerifiedDownstreamManifests(
  brokerHomeDirectory: string,
  warnings: string[]
): Promise<DoctorVerifiedDownstreamScan> {
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
  const familyManifestCounts = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [
      config.family,
      hosts.reduce(
        (total, host) => total + host.familyManifestCounts[config.family],
        0
      )
    ])
  ) as DoctorVerifiedDownstreamScan["familyManifestCounts"];

  return {
    rootPath: join(brokerHomeDirectory, "downstream"),
    state,
    manifests: hosts.reduce((total, host) => total + host.manifests, 0),
    familyManifestCounts,
    qualityAssuranceManifests: hosts.reduce(
      (total, host) => total + host.qualityAssuranceManifests,
      0
    ),
    hosts: hosts.map(
      ({
        unreadableReason: _unreadableReason,
        familyManifestCounts: _familyManifestCounts,
        ...host
      }) => host
    )
  };
}

async function collectFamilyAcquisitionMetrics(
  brokerHomeDirectory: string,
  state: DoctorProofRailState
): Promise<
  Record<
    DoctorProofFamily,
    {
      rerunSuccessfulRoutes: number;
      reuseRecorded: number;
    }
  >
> {
  const empty = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [
      config.family,
      {
        rerunSuccessfulRoutes: 0,
        reuseRecorded: 0
      }
    ])
  ) as Record<
    DoctorProofFamily,
    {
      rerunSuccessfulRoutes: number;
      reuseRecorded: number;
    }
  >;

  if (state !== "present") {
    return empty;
  }

  try {
    const memory = await new AcquisitionMemoryStore(
      acquisitionMemoryFilePath(brokerHomeDirectory)
    ).read();

    for (const config of DOCTOR_FAMILY_CONFIGS) {
      const entries = memory.entries.filter((entry) =>
        isFamilyAcquisitionEntry(entry, config)
      );
      empty[config.family] = {
        rerunSuccessfulRoutes: entries.reduce(
          (total, entry) => total + entry.successfulRoutes,
          0
        ),
        reuseRecorded: entries.filter((entry) => entry.firstReuseAt !== undefined)
          .length
      };
    }

    return empty;
  } catch {
    return empty;
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
  const verifiedDownstreamScan =
    await summarizeDoctorVerifiedDownstreamManifests(
      options.brokerHomeDirectory,
      warnings
    );
  const {
    familyManifestCounts,
    ...verifiedDownstreamManifests
  } = verifiedDownstreamScan;
  const familyAcquisitionMetrics = await collectFamilyAcquisitionMetrics(
    options.brokerHomeDirectory,
    acquisitionMemory.state
  );
  const familyReplayCounts = familyManifestCounts;
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

  const familyProofs = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => {
      const evidence: DoctorFamilyEvidence = {
        installRequiredTraces: routingTraces.filter(
          (trace) =>
            new Date(trace.timestamp) >=
              new Date(
                (options.now ?? new Date()).getTime() -
                  routingWindowDays * 24 * 60 * 60 * 1000
              ) &&
            trace.resultCode === "INSTALL_REQUIRED" &&
            isFamilyTrace(trace, config)
        ).length,
        rerunSuccessfulRoutes:
          familyAcquisitionMetrics[config.family].rerunSuccessfulRoutes,
        reuseRecorded: familyAcquisitionMetrics[config.family].reuseRecorded,
        downstreamReplayManifests: familyReplayCounts[config.family],
        acquisitionMemoryState: acquisitionMemory.state,
        verifiedDownstreamState: verifiedDownstreamManifests.state
      };
      return [config.family, buildFamilyProofSummary(config, evidence)];
    })
  ) as Record<DoctorProofFamily, DoctorFamilyProofSummary>;
  const websiteQaLoop = familyProofs.website_qa;

  return {
    command: "doctor",
    sharedHome,
    acquisitionMemory,
    verifiedDownstreamManifests,
    familyProofs,
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
