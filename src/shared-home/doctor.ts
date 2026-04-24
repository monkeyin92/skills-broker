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
  summarizeCapabilityDemand,
  type CapabilityDemandSummary
} from "../broker/capability-demand.js";
import {
  BROKER_HOSTS,
  brokerHostKnownShellEntries,
  isBrokerHost,
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
export type DoctorProofFamily =
  | "website_qa"
  | "web_content_to_markdown"
  | "social_post_to_markdown";
export type DoctorFamilyProofPhase =
  | "install_required_pending"
  | "verify_pending"
  | "verify_confirmed"
  | "repeat_usage_pending"
  | "cross_host_reuse_pending"
  | "cross_host_reuse_confirmed"
  | "proof_unreadable";
export type DoctorFamilyProofVerdict = "blocked" | "in_progress" | "proven";

export type DoctorFamilyProofSummary = {
  label: string;
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  crossHostReuseRecorded: number;
  downstreamReplayManifests: number;
  acquisitionMemoryState: DoctorProofRailState;
  verifiedDownstreamState: DoctorProofRailState;
  verdict: DoctorFamilyProofVerdict;
  phase: DoctorFamilyProofPhase;
  proofs: {
    installRequiredObserved: boolean;
    verifyConfirmed: boolean;
    repeatUsageConfirmed: boolean;
    crossHostReuseConfirmed: boolean;
    replayReady: boolean;
  };
  verifyState: "confirmed" | "pending" | "unknown";
  repeatUsageState: "confirmed" | "pending" | "unknown";
  crossHostReuseState: "confirmed" | "pending" | "unknown";
  nextAction: string;
};

export type DoctorWebsiteQaAdoptionSignalStatus =
  | "active"
  | "stale"
  | "missing";

export type DoctorWebsiteQaAdoptionSignal = {
  windowDays: number;
  status: DoctorWebsiteQaAdoptionSignalStatus;
  recent: {
    observed: number;
    hits: number;
    misroutes: number;
    fallbacks: number;
    hostSkips: number;
    hostsCovered: number;
    supportedHosts: number;
  };
  proofs: {
    verifyState: DoctorFamilyProofSummary["verifyState"];
    repeatUsageState: DoctorFamilyProofSummary["repeatUsageState"];
    crossHostReuseState: DoctorFamilyProofSummary["crossHostReuseState"];
  };
  latest: {
    traceAt?: string;
    verifiedAt?: string;
    firstReuseAt?: string;
    verifiedManifestAt?: string;
    activityAt?: string;
  };
  hosts: Array<{
    name: BrokerHost;
    status: DoctorWebsiteQaAdoptionSignalStatus;
    observed: number;
    hits: number;
    misroutes: number;
    fallbacks: number;
    hostSkips: number;
    lastTraceAt?: string;
    lastVerifiedManifestAt?: string;
    historicalVerified: boolean;
  }>;
  nextAction: string;
};

export type DoctorFamilyLoopSignalStatus =
  DoctorWebsiteQaAdoptionSignalStatus;

export type DoctorFamilyLoopSignal = {
  label: string;
  windowDays: number;
  status: DoctorFamilyLoopSignalStatus;
  proofs: {
    verifyState: DoctorFamilyProofSummary["verifyState"];
    repeatUsageState: DoctorFamilyProofSummary["repeatUsageState"];
    crossHostReuseState: DoctorFamilyProofSummary["crossHostReuseState"];
  };
  latest: {
    verifiedAt?: string;
    firstReuseAt?: string;
    verifiedManifestAt?: string;
    activityAt?: string;
  };
  reuse: {
    rerunSuccessfulRoutes: number;
    reuseRecorded: number;
    crossHostReuseRecorded: number;
    downstreamReplayManifests: number;
    verifiedHosts: BrokerHost[];
    activeHosts: number;
    supportedHosts: number;
  };
  hosts: Array<{
    name: BrokerHost;
    status: DoctorFamilyLoopSignalStatus;
    lastVerifiedManifestAt?: string;
    historicalVerified: boolean;
  }>;
  nextAction: string;
};

type DoctorFamilyLoopSignalBase = Omit<DoctorFamilyLoopSignal, "nextAction">;

type DoctorFamilyAcquisitionMetric = {
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  crossHostReuseRecorded: number;
  latestVerifiedAt?: string;
  latestFirstReuseAt?: string;
  verifiedHosts: BrokerHost[];
  entries: number;
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
    verificationSuccesses: number;
    firstReuseRecorded: number;
    repeatUsages: number;
    crossHostReuse: number;
    degradedAcquisitions: number;
    failedAcquisitions: number;
    nextAction: "install" | "verify" | "rerun" | "refresh_metadata" | "prefer_verified_winner";
    qualityAssuranceSuccessfulRoutes: number;
    qualityAssuranceFirstReuseRecorded: number;
    qualityAssuranceCrossHostReuse: number;
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
  websiteQaAdoption: DoctorWebsiteQaAdoptionSignal;
  familyLoopSignals: Record<DoctorProofFamily, DoctorFamilyLoopSignal>;
  capabilityGrowthHealth: CapabilityDemandSummary;
  websiteQaRouting: {
    windowDays: number;
    observed: number;
    syntheticHostSkips: number;
    hits: number;
    misroutes: number;
    fallbacks: number;
    hitRate: number;
    misrouteRate: number;
    fallbackRate: number;
    hosts: Array<{
      name: BrokerHost;
      observed: number;
      syntheticHostSkips: number;
      hits: number;
      misroutes: number;
      fallbacks: number;
      hitRate: number;
      misrouteRate: number;
      fallbackRate: number;
    }>;
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
  opencodeInstallDirectory?: string;
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
  familyLatestVerifiedAt: Record<DoctorProofFamily, string | undefined>;
  qualityAssuranceManifests: number;
  unreadableReason?: string;
};

type DoctorVerifiedDownstreamScan =
  DoctorLifecycleResult["verifiedDownstreamManifests"] & {
    familyManifestCounts: Record<DoctorProofFamily, number>;
    familyLatestVerifiedAt: Record<DoctorProofFamily, string | undefined>;
    hostFamilyManifestCounts: Record<
      BrokerHost,
      Record<DoctorProofFamily, number>
    >;
    hostFamilyLatestVerifiedAt: Record<
      BrokerHost,
      Record<DoctorProofFamily, string | undefined>
    >;
  };

type DoctorSharedHomeSummary = DoctorLifecycleResult["sharedHome"];

const WEBSITE_QA_WINNER_ID = "website-qa";
const WEBSITE_QA_CAPABILITY_ID = "gstack.qa";
const WEBSITE_QA_SUBSKILL_ID = "qa";
const WEB_MARKDOWN_WINNER_ID = "web-content-to-markdown";
const WEB_MARKDOWN_CAPABILITY_ID = "baoyu.url-to-markdown";
const WEB_MARKDOWN_SUBSKILL_ID = "url-to-markdown";
const SOCIAL_MARKDOWN_WINNER_ID = "social-post-to-markdown";
const SOCIAL_MARKDOWN_CAPABILITY_ID = "baoyu.x-post-to-markdown";
const SOCIAL_MARKDOWN_SUBSKILL_ID = "x-post-to-markdown";
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
  },
  {
    family: "social_post_to_markdown",
    label: "Social Markdown",
    requestLabel: "social markdown",
    winnerIds: [SOCIAL_MARKDOWN_WINNER_ID],
    candidateIds: [SOCIAL_MARKDOWN_WINNER_ID, SOCIAL_MARKDOWN_CAPABILITY_ID],
    capabilityIds: [SOCIAL_MARKDOWN_CAPABILITY_ID],
    subskillIds: [SOCIAL_MARKDOWN_SUBSKILL_ID],
    proofFamilies: ["social_post_to_markdown"],
    compatibilityIntents: ["social_post_to_markdown"],
    canonicalKeyFragments: [
      "families:content_acquisition,social_content_conversion"
    ],
    skillNames: [SOCIAL_MARKDOWN_SUBSKILL_ID],
    provenMessage:
      "Social Markdown loop is proven; keep this request path as the next maintained-family demo."
  }
] as const;

function emptyFamilyManifestCounts(): Record<DoctorProofFamily, number> {
  return Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [config.family, 0])
  ) as Record<DoctorProofFamily, number>;
}

function emptyFamilyLatestVerifiedAt(): Record<
  DoctorProofFamily,
  string | undefined
> {
  return Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [config.family, undefined])
  ) as Record<DoctorProofFamily, string | undefined>;
}

type DoctorFamilyEvidence = {
  installRequiredTraces: number;
  rerunSuccessfulRoutes: number;
  reuseRecorded: number;
  crossHostReuseRecorded: number;
  downstreamReplayManifests: number;
  acquisitionMemoryState: DoctorProofRailState;
  verifiedDownstreamState: DoctorProofRailState;
};

type ParsedVerifiedManifestCandidate = {
  verifiedAt?: string;
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

  if (input.downstreamReplayManifests === 0) {
    return `Verify one successful ${config.requestLabel} handoff so the downstream replay manifest is recorded.`;
  }

  if (input.reuseRecorded === 0) {
    return `Repeat the same ${config.requestLabel} request once more to prove repeat usage beyond the first verified handoff.`;
  }

  if (input.crossHostReuseRecorded === 0) {
    return `Repeat the same ${config.requestLabel} request from another host to record the first proven cross-host reuse.`;
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

  return input.crossHostReuseRecorded > 0 ? "confirmed" : "pending";
}

function familyRepeatUsageState(
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
  repeatUsageConfirmed: boolean;
  crossHostReuseConfirmed: boolean;
  replayReady: boolean;
} {
  return {
    installRequiredObserved: input.installRequiredTraces > 0,
    verifyConfirmed: input.rerunSuccessfulRoutes > 0,
    repeatUsageConfirmed: input.reuseRecorded > 0,
    crossHostReuseConfirmed: input.crossHostReuseRecorded > 0,
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
    return "repeat_usage_pending";
  }

  if (input.crossHostReuseRecorded === 0) {
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
    crossHostReuseRecorded: input.crossHostReuseRecorded,
    downstreamReplayManifests: input.downstreamReplayManifests,
    acquisitionMemoryState: input.acquisitionMemoryState,
    verifiedDownstreamState: input.verifiedDownstreamState,
    verdict: familyVerdict(phase),
    phase,
    proofs: buildFamilyProofFlags(input),
    verifyState: familyVerifyState(input),
    repeatUsageState: familyRepeatUsageState(input),
    crossHostReuseState: familyCrossHostReuseState(input),
    nextAction: familyNextAction(config, input)
  };
}

function parseValidTimestamp(value: string | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function latestTimestamp(
  ...values: Array<string | undefined>
): string | undefined {
  let latestValue: string | undefined;
  let latestDate: Date | undefined;

  for (const value of values) {
    const parsed = parseValidTimestamp(value);
    if (parsed === undefined) {
      continue;
    }

    if (latestDate === undefined || parsed > latestDate) {
      latestDate = parsed;
      latestValue = value;
    }
  }

  return latestValue;
}

function isTimestampOnOrAfter(
  value: string | undefined,
  since: Date
): boolean {
  const parsed = parseValidTimestamp(value);

  return parsed !== undefined && parsed >= since;
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
    includesConfiguredValue(trace.requestedProofFamily, config.proofFamilies) ||
    includesConfiguredValue(trace.winnerId, config.winnerIds) ||
    includesConfiguredValue(trace.selectedCapabilityId, config.capabilityIds) ||
    includesConfiguredValue(trace.selectedLeafCapabilityId, config.subskillIds) ||
    includesConfiguredValue(trace.semanticMatchCandidateId, config.candidateIds) ||
    includesConfiguredValue(trace.semanticMatchProofFamily, config.proofFamilies)
  );
}

function doctorRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function websiteQaRoutingNextAction(input: {
  observed: number;
  syntheticHostSkips: number;
  misroutes: number;
  fallbacks: number;
}): string {
  if (input.observed === 0 && input.syntheticHostSkips === 0) {
    return "Trigger one clear website QA request through a supported host to record broker-first routing evidence.";
  }

  if (input.syntheticHostSkips > 0) {
    return "Review host-side coarse boundary prompts so clear website QA asks cross into broker_first instead of staying in the host.";
  }

  if (input.misroutes > 0) {
    return "Inspect recent website QA misroutes and tighten normalization for nearby non-QA phrasing.";
  }

  if (input.fallbacks > 0) {
    return "Resolve the remaining website QA fallbacks so clear requests reach a stable handoff.";
  }

  return "Website QA routing evidence is healthy across recent traces.";
}

function summarizeWebsiteQaRouting(
  traces: BrokerRoutingTrace[],
  options: {
    since: Date;
    windowDays: number;
  }
): DoctorLifecycleResult["websiteQaRouting"] {
  const websiteQaConfig = DOCTOR_FAMILY_CONFIGS[0];
  const totals = {
    observed: 0,
    syntheticHostSkips: 0,
    hits: 0,
    misroutes: 0,
    fallbacks: 0
  };
  const perHost = new Map<
    BrokerHost,
    Omit<DoctorLifecycleResult["websiteQaRouting"]["hosts"][number], "name" | "hitRate" | "misrouteRate" | "fallbackRate">
  >(
    BROKER_HOSTS.map((host) => [
      host,
      {
        observed: 0,
        syntheticHostSkips: 0,
        hits: 0,
        misroutes: 0,
        fallbacks: 0
      }
    ])
  );

  for (const trace of traces) {
    if (new Date(trace.timestamp) < options.since || !isFamilyTrace(trace, websiteQaConfig)) {
      continue;
    }

    if (!isBrokerHost(trace.host)) {
      continue;
    }

    const hostSummary = perHost.get(trace.host)!;

    if (trace.routingOutcome === "host_skipped") {
      totals.syntheticHostSkips += 1;
      hostSummary.syntheticHostSkips += 1;
      continue;
    }

    totals.observed += 1;
    hostSummary.observed += 1;

    switch (trace.routingOutcome) {
      case "hit":
        totals.hits += 1;
        hostSummary.hits += 1;
        break;
      case "misroute":
        totals.misroutes += 1;
        hostSummary.misroutes += 1;
        break;
      case "fallback":
        totals.fallbacks += 1;
        hostSummary.fallbacks += 1;
        break;
    }
  }

  return {
    windowDays: options.windowDays,
    observed: totals.observed,
    syntheticHostSkips: totals.syntheticHostSkips,
    hits: totals.hits,
    misroutes: totals.misroutes,
    fallbacks: totals.fallbacks,
    hitRate: doctorRate(totals.hits, totals.observed),
    misrouteRate: doctorRate(totals.misroutes, totals.observed),
    fallbackRate: doctorRate(totals.fallbacks, totals.observed),
    hosts: BROKER_HOSTS.map((host) => {
      const summary = perHost.get(host)!;

      return {
        name: host,
        ...summary,
        hitRate: doctorRate(summary.hits, summary.observed),
        misrouteRate: doctorRate(summary.misroutes, summary.observed),
        fallbackRate: doctorRate(summary.fallbacks, summary.observed)
      };
    }).filter((host) => host.observed > 0 || host.syntheticHostSkips > 0),
    nextAction: websiteQaRoutingNextAction(totals)
  };
}

function acquisitionMemoryNextAction(
  entries: AcquisitionMemoryEntry[]
): DoctorLifecycleResult["acquisitionMemory"]["nextAction"] {
  if (entries.length === 0) {
    return "install";
  }

  const degradedOrFailed = entries.some(
    (entry) =>
      entry.outcomes.degradedAcquisitions > 0 ||
      entry.outcomes.failedAcquisitions > 0
  );
  if (degradedOrFailed) {
    return "verify";
  }

  const hasRepeatUsage = entries.some((entry) => entry.outcomes.repeatUsages > 0);
  if (!hasRepeatUsage) {
    return "rerun";
  }

  return "prefer_verified_winner";
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
      verificationSuccesses: 0,
      firstReuseRecorded: 0,
      repeatUsages: 0,
      crossHostReuse: 0,
      degradedAcquisitions: 0,
      failedAcquisitions: 0,
      nextAction: "install",
      qualityAssuranceSuccessfulRoutes: 0,
      qualityAssuranceFirstReuseRecorded: 0,
      qualityAssuranceCrossHostReuse: 0
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
      verificationSuccesses: memory.entries.reduce(
        (total, entry) => total + entry.outcomes.verificationSuccesses,
        0
      ),
      firstReuseRecorded: memory.entries.filter(
        (entry) => entry.firstReuseAt !== undefined
      ).length,
      repeatUsages: memory.entries.reduce(
        (total, entry) => total + entry.outcomes.repeatUsages,
        0
      ),
      crossHostReuse: memory.entries.filter(
        (entry) => entry.verifiedHosts.length > 1
      ).length,
      degradedAcquisitions: memory.entries.reduce(
        (total, entry) => total + entry.outcomes.degradedAcquisitions,
        0
      ),
      failedAcquisitions: memory.entries.reduce(
        (total, entry) => total + entry.outcomes.failedAcquisitions,
        0
      ),
      nextAction: acquisitionMemoryNextAction(memory.entries),
      qualityAssuranceSuccessfulRoutes: websiteQaEntries.reduce(
        (total, entry) => total + entry.successfulRoutes,
        0
      ),
      qualityAssuranceFirstReuseRecorded: websiteQaEntries.filter(
        (entry) => entry.firstReuseAt !== undefined
      ).length,
      qualityAssuranceCrossHostReuse: websiteQaEntries.filter(
        (entry) => entry.verifiedHosts.length > 1
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
      verificationSuccesses: 0,
      firstReuseRecorded: 0,
      repeatUsages: 0,
      crossHostReuse: 0,
      degradedAcquisitions: 0,
      failedAcquisitions: 0,
      nextAction: "refresh_metadata",
      qualityAssuranceSuccessfulRoutes: 0,
      qualityAssuranceFirstReuseRecorded: 0,
      qualityAssuranceCrossHostReuse: 0
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
      verifiedAt:
        typeof parsed.verifiedAt === "string" ? parsed.verifiedAt : undefined,
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
    const familyLatestVerifiedAt = emptyFamilyLatestVerifiedAt();

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
          familyLatestVerifiedAt[config.family] = latestTimestamp(
            familyLatestVerifiedAt[config.family],
            nested.familyLatestVerifiedAt[config.family]
          );
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
          familyLatestVerifiedAt,
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
          familyLatestVerifiedAt,
          qualityAssuranceManifests,
          unreadableReason: `${entryPath}: invalid verified downstream manifest`
        };
      }

      manifests += 1;
      for (const config of DOCTOR_FAMILY_CONFIGS) {
        if (isFamilyManifest(parsed, config)) {
          familyManifestCounts[config.family] += 1;
          familyLatestVerifiedAt[config.family] = latestTimestamp(
            familyLatestVerifiedAt[config.family],
            parsed.verifiedAt
          );
        }
      }
      qualityAssuranceManifests = familyManifestCounts.website_qa;
    }

    return {
      name: host,
      state: manifests > 0 ? "present" : "missing",
      manifests,
      familyManifestCounts,
      familyLatestVerifiedAt,
      qualityAssuranceManifests
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return {
        name: host,
        state: "missing",
        manifests: 0,
        familyManifestCounts: emptyFamilyManifestCounts(),
        familyLatestVerifiedAt: emptyFamilyLatestVerifiedAt(),
        qualityAssuranceManifests: 0
      };
    }

    const reason =
      error instanceof Error ? error.message : "unknown downstream manifest failure";
    return {
      name: host,
      state: "unreadable",
      manifests: 0,
      familyManifestCounts: emptyFamilyManifestCounts(),
      familyLatestVerifiedAt: emptyFamilyLatestVerifiedAt(),
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
  const familyLatestVerifiedAt = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [
      config.family,
      hosts.reduce<string | undefined>(
        (latest, host) =>
          latestTimestamp(latest, host.familyLatestVerifiedAt[config.family]),
        undefined
      )
    ])
  ) as DoctorVerifiedDownstreamScan["familyLatestVerifiedAt"];
  const hostFamilyManifestCounts = Object.fromEntries(
    hosts.map((host) => [host.name, host.familyManifestCounts])
  ) as DoctorVerifiedDownstreamScan["hostFamilyManifestCounts"];
  const hostFamilyLatestVerifiedAt = Object.fromEntries(
    hosts.map((host) => [host.name, host.familyLatestVerifiedAt])
  ) as DoctorVerifiedDownstreamScan["hostFamilyLatestVerifiedAt"];

  return {
    rootPath: join(brokerHomeDirectory, "downstream"),
    state,
    manifests: hosts.reduce((total, host) => total + host.manifests, 0),
    familyManifestCounts,
    familyLatestVerifiedAt,
    hostFamilyManifestCounts,
    hostFamilyLatestVerifiedAt,
    qualityAssuranceManifests: hosts.reduce(
      (total, host) => total + host.qualityAssuranceManifests,
      0
    ),
    hosts: hosts.map(
      ({
        unreadableReason: _unreadableReason,
        familyManifestCounts: _familyManifestCounts,
        familyLatestVerifiedAt: _familyLatestVerifiedAt,
        ...host
      }) => host
    )
  };
}

async function collectFamilyAcquisitionMetrics(
  brokerHomeDirectory: string,
  state: DoctorProofRailState
): Promise<Record<DoctorProofFamily, DoctorFamilyAcquisitionMetric>> {
  const empty = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [
      config.family,
      {
        rerunSuccessfulRoutes: 0,
        reuseRecorded: 0,
        crossHostReuseRecorded: 0,
        latestVerifiedAt: undefined,
        latestFirstReuseAt: undefined,
        verifiedHosts: [] as BrokerHost[],
        entries: 0
      }
    ])
  ) as unknown as Record<DoctorProofFamily, DoctorFamilyAcquisitionMetric>;

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
          .length,
        crossHostReuseRecorded: entries.filter(
          (entry) => entry.verifiedHosts.length > 1
        ).length,
        latestVerifiedAt: entries.reduce<string | undefined>(
          (latest, entry) => latestTimestamp(latest, entry.verifiedAt),
          undefined
        ),
        latestFirstReuseAt: entries.reduce<string | undefined>(
          (latest, entry) => latestTimestamp(latest, entry.firstReuseAt),
          undefined
        ),
        verifiedHosts: Array.from(
          new Set(entries.flatMap((entry) => entry.verifiedHosts))
        ),
        entries: entries.length
      };
    }

    return empty;
  } catch {
    return empty;
  }
}

async function collectCapabilityDemandAcquisitionEntries(
  brokerHomeDirectory: string,
  state: DoctorProofRailState
): Promise<AcquisitionMemoryEntry[]> {
  if (state !== "present") {
    return [];
  }

  try {
    const memory = await new AcquisitionMemoryStore(
      acquisitionMemoryFilePath(brokerHomeDirectory)
    ).read();

    return memory.entries;
  } catch {
    return [];
  }
}

function summarizeWebsiteQaHistoricalTraceActivity(
  traces: BrokerRoutingTrace[]
): {
  lastTraceAt?: string;
  hosts: Record<BrokerHost, { lastTraceAt?: string }>;
} {
  const hosts = Object.fromEntries(
    BROKER_HOSTS.map((host) => [host, { lastTraceAt: undefined }])
  ) as Record<BrokerHost, { lastTraceAt?: string }>;
  let lastTraceAt: string | undefined;

  for (const trace of traces) {
    if (!isBrokerHost(trace.host) || !isFamilyTrace(trace, DOCTOR_FAMILY_CONFIGS[0])) {
      continue;
    }

    lastTraceAt = latestTimestamp(lastTraceAt, trace.timestamp);
    hosts[trace.host].lastTraceAt = latestTimestamp(
      hosts[trace.host].lastTraceAt,
      trace.timestamp
    );
  }

  return {
    lastTraceAt,
    hosts
  };
}

function websiteQaAdoptionNextAction(input: {
  status: DoctorWebsiteQaAdoptionSignalStatus;
  proof: DoctorFamilyProofSummary;
  routing: DoctorLifecycleResult["websiteQaRouting"];
}): string {
  if (input.status === "missing") {
    return "Trigger one clear website QA request through a supported host, accept INSTALL_REQUIRED if needed, then rerun the same request so doctor records a current adoption signal.";
  }

  if (input.status === "stale") {
    if (input.proof.verifyState !== "confirmed") {
      return "Refresh the website QA signal now: run the same request again, accept INSTALL_REQUIRED if needed, then rerun until doctor records a fresh verification.";
    }

    if (input.proof.repeatUsageState !== "confirmed") {
      return "Refresh the website QA signal by rerunning the same website QA request now so repeat usage is visible in the current window.";
    }

    if (input.proof.crossHostReuseState !== "confirmed") {
      return "Refresh the website QA signal from another supported host so the shared-home surface records fresh cross-host reuse.";
    }

    return "Run one clear website QA request through a supported host now so doctor shows a current QA-first signal instead of historical proof only.";
  }

  if (input.routing.syntheticHostSkips > 0) {
    return "Refresh the website QA signal on the skipped host so the same QA-first ask crosses the coarse broker-first boundary there too.";
  }

  if (
    input.proof.verifyState !== "confirmed" ||
    input.proof.repeatUsageState !== "confirmed" ||
    input.proof.crossHostReuseState !== "confirmed"
  ) {
    return input.proof.nextAction;
  }

  if (input.routing.misroutes > 0) {
    return "Recent website QA signal is active, but nearby phrasing still misroutes. Tighten normalization so the hero lane stays explicit.";
  }

  if (input.routing.fallbacks > 0 && input.routing.hits === 0) {
    return "Recent website QA signal is active, but it still depends on fallback-only traffic. Rerun after install so doctor records a fresh stable handoff.";
  }

  return "Website QA adoption signal is active; keep this hero lane exercised as the default-entry demo.";
}

function summarizeWebsiteQaAdoptionSignal(input: {
  routing: DoctorLifecycleResult["websiteQaRouting"];
  routingTraces: BrokerRoutingTrace[];
  since: Date;
  windowDays: number;
  proof: DoctorFamilyProofSummary;
  acquisition: Awaited<ReturnType<typeof collectFamilyAcquisitionMetrics>>["website_qa"];
  verifiedDownstream: DoctorVerifiedDownstreamScan;
}): DoctorWebsiteQaAdoptionSignal {
  const historicalTraces = summarizeWebsiteQaHistoricalTraceActivity(
    input.routingTraces
  );
  const latestVerifiedManifestAt =
    input.verifiedDownstream.familyLatestVerifiedAt.website_qa;
  const latestActivityAt = latestTimestamp(
    historicalTraces.lastTraceAt,
    input.acquisition.latestVerifiedAt,
    input.acquisition.latestFirstReuseAt,
    latestVerifiedManifestAt
  );

  const status: DoctorWebsiteQaAdoptionSignalStatus =
    latestActivityAt === undefined
      ? "missing"
      : isTimestampOnOrAfter(latestActivityAt, input.since)
        ? "active"
        : "stale";

  const recentHostCounts = new Map<
    BrokerHost,
    DoctorLifecycleResult["websiteQaRouting"]["hosts"][number]
  >(input.routing.hosts.map((host) => [host.name, host]));

  const hosts = BROKER_HOSTS.map((host) => {
    const recent = recentHostCounts.get(host);
    const lastVerifiedManifestAt =
      input.verifiedDownstream.hostFamilyLatestVerifiedAt[host].website_qa;
    const historicalVerified =
      input.acquisition.verifiedHosts.includes(host) ||
      input.verifiedDownstream.hostFamilyManifestCounts[host].website_qa > 0;
    const recentSignal =
      (recent?.observed ?? 0) > 0 ||
      (recent?.syntheticHostSkips ?? 0) > 0 ||
      isTimestampOnOrAfter(lastVerifiedManifestAt, input.since);
    const hostStatus: DoctorWebsiteQaAdoptionSignalStatus = recentSignal
      ? "active"
      : historicalTraces.hosts[host].lastTraceAt !== undefined ||
          historicalVerified === true
        ? "stale"
        : "missing";

    return {
      name: host,
      status: hostStatus,
      observed: recent?.observed ?? 0,
      hits: recent?.hits ?? 0,
      misroutes: recent?.misroutes ?? 0,
      fallbacks: recent?.fallbacks ?? 0,
      hostSkips: recent?.syntheticHostSkips ?? 0,
      lastTraceAt: historicalTraces.hosts[host].lastTraceAt,
      lastVerifiedManifestAt,
      historicalVerified
    };
  });

  return {
    windowDays: input.windowDays,
    status,
    recent: {
      observed: input.routing.observed,
      hits: input.routing.hits,
      misroutes: input.routing.misroutes,
      fallbacks: input.routing.fallbacks,
      hostSkips: input.routing.syntheticHostSkips,
      hostsCovered: hosts.filter((host) => host.status === "active").length,
      supportedHosts: BROKER_HOSTS.length
    },
    proofs: {
      verifyState: input.proof.verifyState,
      repeatUsageState: input.proof.repeatUsageState,
      crossHostReuseState: input.proof.crossHostReuseState
    },
    latest: {
      traceAt: historicalTraces.lastTraceAt,
      verifiedAt: input.acquisition.latestVerifiedAt,
      firstReuseAt: input.acquisition.latestFirstReuseAt,
      verifiedManifestAt: latestVerifiedManifestAt,
      activityAt: latestActivityAt
    },
    hosts,
    nextAction: websiteQaAdoptionNextAction({
      status,
      proof: input.proof,
      routing: input.routing
    })
  };
}

function summarizeWebsiteQaFamilyLoopSignal(input: {
  adoption: DoctorWebsiteQaAdoptionSignal;
  proof: DoctorFamilyProofSummary;
  acquisition: DoctorFamilyAcquisitionMetric;
}): DoctorFamilyLoopSignalBase {
  const hosts = input.adoption.hosts.map((host) => ({
    name: host.name,
    status: host.status,
    lastVerifiedManifestAt: host.lastVerifiedManifestAt,
    historicalVerified: host.historicalVerified
  }));

  return {
    label: "Website QA",
    windowDays: input.adoption.windowDays,
    status: input.adoption.status,
    proofs: {
      verifyState: input.adoption.proofs.verifyState,
      repeatUsageState: input.adoption.proofs.repeatUsageState,
      crossHostReuseState: input.adoption.proofs.crossHostReuseState
    },
    latest: {
      verifiedAt: input.adoption.latest.verifiedAt,
      firstReuseAt: input.adoption.latest.firstReuseAt,
      verifiedManifestAt: input.adoption.latest.verifiedManifestAt,
      activityAt: input.adoption.latest.activityAt
    },
    reuse: {
      rerunSuccessfulRoutes: input.acquisition.rerunSuccessfulRoutes,
      reuseRecorded: input.acquisition.reuseRecorded,
      crossHostReuseRecorded: input.acquisition.crossHostReuseRecorded,
      downstreamReplayManifests: input.proof.downstreamReplayManifests,
      verifiedHosts: input.acquisition.verifiedHosts,
      activeHosts: hosts.filter((host) => host.status === "active").length,
      supportedHosts: BROKER_HOSTS.length
    },
    hosts
  };
}

function summarizeGenericFamilyLoopSignal(input: {
  family: DoctorProofFamily;
  windowDays: number;
  since: Date;
  proof: DoctorFamilyProofSummary;
  acquisition: DoctorFamilyAcquisitionMetric;
  verifiedDownstream: DoctorVerifiedDownstreamScan;
}): DoctorFamilyLoopSignalBase {
  const latestVerifiedManifestAt =
    input.verifiedDownstream.familyLatestVerifiedAt[input.family];
  const latestActivityAt = latestTimestamp(
    input.acquisition.latestVerifiedAt,
    input.acquisition.latestFirstReuseAt,
    latestVerifiedManifestAt
  );
  const status: DoctorFamilyLoopSignalStatus =
    latestActivityAt === undefined
      ? "missing"
      : isTimestampOnOrAfter(latestActivityAt, input.since)
        ? "active"
        : "stale";

  const hosts = BROKER_HOSTS.map((host) => {
    const lastVerifiedManifestAt =
      input.verifiedDownstream.hostFamilyLatestVerifiedAt[host][input.family];
    const historicalVerified =
      input.acquisition.verifiedHosts.includes(host) ||
      input.verifiedDownstream.hostFamilyManifestCounts[host][input.family] > 0;
    const hostStatus: DoctorFamilyLoopSignalStatus = isTimestampOnOrAfter(
      lastVerifiedManifestAt,
      input.since
    )
      ? "active"
      : historicalVerified
        ? "stale"
        : "missing";

    return {
      name: host,
      status: hostStatus,
      lastVerifiedManifestAt,
      historicalVerified
    };
  });

  return {
    label: input.proof.label,
    windowDays: input.windowDays,
    status,
    proofs: {
      verifyState: input.proof.verifyState,
      repeatUsageState: input.proof.repeatUsageState,
      crossHostReuseState: input.proof.crossHostReuseState
    },
    latest: {
      verifiedAt: input.acquisition.latestVerifiedAt,
      firstReuseAt: input.acquisition.latestFirstReuseAt,
      verifiedManifestAt: latestVerifiedManifestAt,
      activityAt: latestActivityAt
    },
    reuse: {
      rerunSuccessfulRoutes: input.acquisition.rerunSuccessfulRoutes,
      reuseRecorded: input.acquisition.reuseRecorded,
      crossHostReuseRecorded: input.acquisition.crossHostReuseRecorded,
      downstreamReplayManifests: input.proof.downstreamReplayManifests,
      verifiedHosts: input.acquisition.verifiedHosts,
      activeHosts: hosts.filter((host) => host.status === "active").length,
      supportedHosts: BROKER_HOSTS.length
    },
    hosts
  };
}

function familyLoopSequenceLabel(family: DoctorProofFamily): string {
  switch (family) {
    case "website_qa":
      return "QA-first hero-lane";
    case "web_content_to_markdown":
      return "second proven loop";
    case "social_post_to_markdown":
      return "third proven loop";
  }
}

function familyLoopActiveMessage(family: DoctorProofFamily): string {
  switch (family) {
    case "website_qa":
      return "Website QA signal is active; keep this hero lane exercised as the default-entry demo.";
    case "web_content_to_markdown":
      return "Web Markdown signal is active; keep this second proven loop exercised after website QA.";
    case "social_post_to_markdown":
      return "Social Markdown signal is active; keep this third proven loop exercised after web markdown.";
  }
}

function familyLoopMissingMessage(config: DoctorFamilyConfig): string {
  return `Run one ${config.requestLabel} request now so doctor records a current ${familyLoopSequenceLabel(config.family)} signal.`;
}

function familyLoopStaleMessage(config: DoctorFamilyConfig): string {
  return `Refresh the ${config.requestLabel} loop now so doctor shows a current ${familyLoopSequenceLabel(config.family)} signal instead of historical proof only.`;
}

function familyLoopSignalNextAction(input: {
  config: DoctorFamilyConfig;
  signal: DoctorFamilyLoopSignalBase;
  proof: DoctorFamilyProofSummary;
  familySignals: Record<DoctorProofFamily, DoctorFamilyLoopSignalBase>;
  websiteQaAdoption: DoctorWebsiteQaAdoptionSignal;
}): string {
  if (input.config.family === "website_qa") {
    return input.websiteQaAdoption.nextAction;
  }

  if (input.familySignals.website_qa.status !== "active") {
    return `Refresh the website QA hero lane first, then rerun the same ${input.config.requestLabel} request so doctor records a fresh ${familyLoopSequenceLabel(input.config.family)} signal.`;
  }

  if (
    input.config.family === "social_post_to_markdown" &&
    input.familySignals.web_content_to_markdown.status !== "active"
  ) {
    return "Refresh the web markdown loop first, then rerun the same social markdown request so doctor records a fresh third proven loop signal.";
  }

  if (input.proof.phase === "proof_unreadable") {
    return input.proof.nextAction;
  }

  if (
    input.proof.verifyState !== "confirmed" ||
    input.proof.repeatUsageState !== "confirmed" ||
    input.proof.crossHostReuseState !== "confirmed"
  ) {
    return input.proof.nextAction;
  }

  if (input.signal.status === "missing") {
    return familyLoopMissingMessage(input.config);
  }

  if (input.signal.status === "stale") {
    return familyLoopStaleMessage(input.config);
  }

  return familyLoopActiveMessage(input.config.family);
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
    codexDirOverride: options.codexInstallDirectory,
    opencodeDirOverride: options.opencodeInstallDirectory
  });
  const routingWindowDays = 7;
  const routingTraces = await readBrokerRoutingTraces(
    routingTraceLogFilePath(options.brokerHomeDirectory)
  );
  const routingSince = new Date(
    (options.now ?? new Date()).getTime() -
      routingWindowDays * 24 * 60 * 60 * 1000
  );
  const routingSummary = summarizeBrokerRoutingTraces(
    routingTraces,
    {
      since: routingSince
    }
  );
  const websiteQaRouting = summarizeWebsiteQaRouting(routingTraces, {
    since: routingSince,
    windowDays: routingWindowDays
  });
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
    familyLatestVerifiedAt: _familyLatestVerifiedAt,
    hostFamilyManifestCounts: _hostFamilyManifestCounts,
    hostFamilyLatestVerifiedAt: _hostFamilyLatestVerifiedAt,
    ...verifiedDownstreamManifests
  } = verifiedDownstreamScan;
  const familyAcquisitionMetrics = await collectFamilyAcquisitionMetrics(
    options.brokerHomeDirectory,
    acquisitionMemory.state
  );
  const capabilityDemandAcquisitionEntries =
    await collectCapabilityDemandAcquisitionEntries(
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
            new Date(trace.timestamp) >= routingSince &&
            trace.resultCode === "INSTALL_REQUIRED" &&
            isFamilyTrace(trace, config)
        ).length,
        rerunSuccessfulRoutes:
          familyAcquisitionMetrics[config.family].rerunSuccessfulRoutes,
        reuseRecorded: familyAcquisitionMetrics[config.family].reuseRecorded,
        crossHostReuseRecorded:
          familyAcquisitionMetrics[config.family].crossHostReuseRecorded,
        downstreamReplayManifests: familyReplayCounts[config.family],
        acquisitionMemoryState: acquisitionMemory.state,
        verifiedDownstreamState: verifiedDownstreamManifests.state
      };
      return [config.family, buildFamilyProofSummary(config, evidence)];
    })
  ) as Record<DoctorProofFamily, DoctorFamilyProofSummary>;
  const websiteQaLoop = familyProofs.website_qa;
  const websiteQaAdoption = summarizeWebsiteQaAdoptionSignal({
    routing: websiteQaRouting,
    routingTraces,
    since: routingSince,
    windowDays: routingWindowDays,
    proof: websiteQaLoop,
    acquisition: familyAcquisitionMetrics.website_qa,
    verifiedDownstream: verifiedDownstreamScan
  });
  const familyLoopSignalBases = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => {
      if (config.family === "website_qa") {
        return [
          config.family,
          summarizeWebsiteQaFamilyLoopSignal({
            adoption: websiteQaAdoption,
            proof: familyProofs.website_qa,
            acquisition: familyAcquisitionMetrics.website_qa
          })
        ];
      }

      return [
        config.family,
        summarizeGenericFamilyLoopSignal({
          family: config.family,
          windowDays: routingWindowDays,
          since: routingSince,
          proof: familyProofs[config.family],
          acquisition: familyAcquisitionMetrics[config.family],
          verifiedDownstream: verifiedDownstreamScan
        })
      ];
    })
  ) as Record<DoctorProofFamily, DoctorFamilyLoopSignalBase>;
  const familyLoopSignals = Object.fromEntries(
    DOCTOR_FAMILY_CONFIGS.map((config) => [
      config.family,
      {
        ...familyLoopSignalBases[config.family],
        nextAction: familyLoopSignalNextAction({
          config,
          signal: familyLoopSignalBases[config.family],
          proof: familyProofs[config.family],
          familySignals: familyLoopSignalBases,
          websiteQaAdoption
        })
      }
    ])
  ) as Record<DoctorProofFamily, DoctorFamilyLoopSignal>;
  const capabilityGrowthHealth = summarizeCapabilityDemand({
    traces: routingTraces,
    acquisitionEntries: capabilityDemandAcquisitionEntries,
    since: routingSince,
    windowDays: routingWindowDays
  });

  return {
    command: "doctor",
    sharedHome,
    acquisitionMemory,
    verifiedDownstreamManifests,
    familyProofs,
    websiteQaLoop,
    websiteQaAdoption,
    familyLoopSignals,
    capabilityGrowthHealth,
    websiteQaRouting,
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
      },
      websiteQaSignal: websiteQaAdoption
    }),
    warnings
  };
}
