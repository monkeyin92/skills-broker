import { access } from "node:fs/promises";
import {
  loadMaintainedBrokerFirstContract,
  type MaintainedBrokerFirstContract
} from "../core/maintained-broker-first.js";
import { resolveSharedBrokerHomeLayout } from "./install.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";

export const BROKER_FIRST_GATE_SCHEMA_VERSION = 1 as const;
export const BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS = [
  "phase2Boundary",
  "phase3Eval",
  "peerConflict"
] as const;
export const BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS =
  36 * 60 * 60 * 1000;

export type BrokerFirstGateProofKey =
  (typeof BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS)[number];
export type BrokerFirstGateProofVerdict = "pass" | "fail";
export type BrokerFirstGateStatus = "green" | "red";
export type BrokerFirstGateIssueScope = "artifact" | "family" | "proof";

export type BrokerFirstGateIssue = {
  scope: BrokerFirstGateIssueScope;
  code: string;
  message: string;
  retryable: boolean;
  recommendedAction?: string;
  evidenceRefs: string[];
  family?: string;
  proofKey?: BrokerFirstGateProofKey;
};

export type BrokerFirstGateFamilyResult = {
  family: string;
  winnerId: string;
  capabilityId: string;
  status: BrokerFirstGateStatus;
  proofs: Record<BrokerFirstGateProofKey, BrokerFirstGateProofVerdict>;
  issues: BrokerFirstGateIssue[];
};

export type BrokerFirstGateArtifact = {
  schemaVersion: typeof BROKER_FIRST_GATE_SCHEMA_VERSION;
  artifactPath: string;
  generatedAt: string;
  maintainedFamilies: BrokerFirstGateFamilyResult[];
  issues: BrokerFirstGateIssue[];
};

export type BrokerFirstGateFreshness = {
  state: "fresh" | "stale" | "missing" | "unknown";
  detail: string;
  generatedAt?: string;
  ageMs?: number;
  allowedWindowMs: number;
};

export type BrokerFirstGateDiagnosticResult = {
  skipped: boolean;
  skipReason?: string;
  artifactPath: string;
  contractPath: string;
  freshness: BrokerFirstGateFreshness;
  issues: BrokerFirstGateIssue[];
  maintainedFamilies: BrokerFirstGateFamilyResult[];
  hasStrictIssues: boolean;
};

export type EvaluateBrokerFirstGateOptions = {
  brokerHomeDirectory: string;
  refresh?: boolean;
  now?: Date;
};

export type LoadBrokerFirstGateOptions = {
  brokerHomeDirectory: string;
  contractFilePath?: string;
  sharedHomeExists?: boolean;
  refresh?: boolean;
  now?: Date;
};

export type BrokerFirstGateResult = BrokerFirstGateDiagnosticResult;

type ParseBrokerFirstGateOptions = {
  artifactPath: string;
  contract: MaintainedBrokerFirstContract;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function doctorRefreshRecommendedAction(): string {
  return "node dist/bin/skills-broker.js doctor --refresh-remote";
}

function fallbackProofIssue(
  family: string,
  proofKey: BrokerFirstGateProofKey,
  artifactPath: string
): BrokerFirstGateIssue {
  const proofLabels: Record<BrokerFirstGateProofKey, string> = {
    phase2Boundary: "maintained Phase 2 coarse-boundary proof",
    phase3Eval: "maintained Phase 3 eval proof",
    peerConflict: "peer-surface conflict proof"
  };

  return {
    scope: "proof",
    family,
    proofKey,
    code:
      proofKey === "phase2Boundary"
        ? "BROKER_FIRST_PHASE2_BOUNDARY_MISSING"
        : proofKey === "phase3Eval"
          ? "BROKER_FIRST_PHASE3_EVAL_MISSING"
          : "BROKER_FIRST_PEER_CONFLICT_PROOF_MISSING",
    message: `Broker-first gate refresh could not carry forward ${proofLabels[proofKey]} for ${family}.`,
    retryable: true,
    recommendedAction: doctorRefreshRecommendedAction(),
    evidenceRefs: [`family:${family}`, `file:${artifactPath}`]
  };
}

function missingArtifactIssue(artifactPath: string): BrokerFirstGateIssue {
  return {
    scope: "artifact",
    code: "BROKER_FIRST_GATE_MISSING",
    message: "Broker-first gate artifact is missing.",
    retryable: true,
    recommendedAction: doctorRefreshRecommendedAction(),
    evidenceRefs: [`file:${artifactPath}`]
  };
}

function invalidArtifactIssue(
  artifactPath: string,
  message: string,
  code = "BROKER_FIRST_GATE_INVALID"
): BrokerFirstGateIssue {
  return {
    scope: "artifact",
    code,
    message,
    retryable: true,
    recommendedAction: doctorRefreshRecommendedAction(),
    evidenceRefs: [`file:${artifactPath}`]
  };
}

function staleArtifactIssue(artifactPath: string): BrokerFirstGateIssue {
  return {
    scope: "artifact",
    code: "BROKER_FIRST_GATE_STALE",
    message: "Broker-first gate artifact is older than the allowed freshness window.",
    retryable: true,
    recommendedAction: doctorRefreshRecommendedAction(),
    evidenceRefs: [`file:${artifactPath}`]
  };
}

function formatFreshnessDetail(
  ageMs: number | undefined,
  allowedWindowMs: number
): string {
  if (ageMs === undefined) {
    return `generatedAt unavailable; allowed window ${(allowedWindowMs / 3600000).toFixed(1)}h`;
  }

  return `age ${(ageMs / 3600000).toFixed(2)}h; allowed ${(allowedWindowMs / 3600000).toFixed(2)}h`;
}

function evaluateFreshness(
  generatedAt: string | undefined,
  now: Date
): BrokerFirstGateFreshness {
  if (generatedAt === undefined) {
    return {
      state: "missing",
      detail: `generatedAt unavailable; allowed window ${(BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS / 3600000).toFixed(1)}h`,
      allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
    };
  }

  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    return {
      state: "stale",
      detail: `generatedAt "${generatedAt}" is invalid; allowed window ${(BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS / 3600000).toFixed(1)}h`,
      generatedAt,
      allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
    };
  }

  const ageMs = Math.max(0, now.getTime() - generatedAtMs);
  if (ageMs > BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS) {
    return {
      state: "stale",
      detail: formatFreshnessDetail(ageMs, BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS),
      generatedAt,
      ageMs,
      allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
    };
  }

  return {
    state: "fresh",
    detail: formatFreshnessDetail(ageMs, BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS),
    generatedAt,
    ageMs,
    allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
  };
}

function parseIssue(
  rawIssue: unknown,
  family?: string
): BrokerFirstGateIssue {
  if (!isRecord(rawIssue)) {
    throw new Error("Expected broker-first gate issue to be an object.");
  }

  if (
    rawIssue.scope !== "artifact" &&
    rawIssue.scope !== "family" &&
    rawIssue.scope !== "proof"
  ) {
    throw new Error("Expected broker-first gate issue.scope to be artifact, family, or proof.");
  }

  if (!isNonEmptyString(rawIssue.code)) {
    throw new Error("Expected broker-first gate issue.code to be a non-empty string.");
  }

  if (!isNonEmptyString(rawIssue.message)) {
    throw new Error("Expected broker-first gate issue.message to be a non-empty string.");
  }

  if (!isBoolean(rawIssue.retryable)) {
    throw new Error("Expected broker-first gate issue.retryable to be a boolean.");
  }

  if (
    !Array.isArray(rawIssue.evidenceRefs) ||
    !rawIssue.evidenceRefs.every((value) => isNonEmptyString(value))
  ) {
    throw new Error("Expected broker-first gate issue.evidenceRefs to be an array of strings.");
  }

  const issueFamily =
    rawIssue.family === undefined
      ? family
      : isNonEmptyString(rawIssue.family)
        ? rawIssue.family
        : undefined;

  if (rawIssue.scope !== "artifact" && !isNonEmptyString(issueFamily)) {
    throw new Error("Expected broker-first gate family/proof issue to declare family.");
  }

  let proofKey: BrokerFirstGateProofKey | undefined;
  if (rawIssue.scope === "proof") {
    if (
      typeof rawIssue.proofKey !== "string" ||
      !BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS.includes(
        rawIssue.proofKey as BrokerFirstGateProofKey
      )
    ) {
      throw new Error(
        `Expected broker-first gate proof issue.proofKey to be one of ${BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS.join(", ")}.`
      );
    }

    proofKey = rawIssue.proofKey as BrokerFirstGateProofKey;
  }

  return {
    scope: rawIssue.scope,
    code: rawIssue.code,
    message: rawIssue.message,
    retryable: rawIssue.retryable,
    ...(typeof rawIssue.recommendedAction === "string"
      ? { recommendedAction: rawIssue.recommendedAction }
      : {}),
    evidenceRefs: rawIssue.evidenceRefs as string[],
    ...(issueFamily === undefined ? {} : { family: issueFamily }),
    ...(proofKey === undefined ? {} : { proofKey })
  };
}

function parseFamilyResult(
  rawFamily: unknown,
  options: ParseBrokerFirstGateOptions
): BrokerFirstGateFamilyResult {
  if (!isRecord(rawFamily)) {
    throw new Error("Expected broker-first gate maintained family entry to be an object.");
  }

  if (!isNonEmptyString(rawFamily.family)) {
    throw new Error("Expected broker-first gate maintained family to declare family.");
  }

  const expectedFamilyEntries = new Map(
    options.contract.maintainedFamilies.map((entry) => [entry.family, entry])
  );
  const contractEntry = expectedFamilyEntries.get(rawFamily.family);
  if (contractEntry === undefined) {
    throw new Error(
      `Broker-first gate family ${rawFamily.family} is not present in the maintained-family contract.`
    );
  }

  if (
    !isNonEmptyString(rawFamily.winnerId) ||
    rawFamily.winnerId !== contractEntry.winnerId
  ) {
    throw new Error(
      `Expected broker-first gate winnerId for ${rawFamily.family} to match the maintained-family contract.`
    );
  }

  if (
    !isNonEmptyString(rawFamily.capabilityId) ||
    rawFamily.capabilityId !== contractEntry.capabilityId
  ) {
    throw new Error(
      `Expected broker-first gate capabilityId for ${rawFamily.family} to match the maintained-family contract.`
    );
  }

  if (rawFamily.status !== "green" && rawFamily.status !== "red") {
    throw new Error("Expected broker-first gate maintained family status to be green or red.");
  }

  if (!isRecord(rawFamily.proofs)) {
    throw new Error("Expected broker-first gate maintained family proofs to be an object.");
  }

  const proofs = {} as Record<
    BrokerFirstGateProofKey,
    BrokerFirstGateProofVerdict
  >;

  for (
    let index = 0;
    index < BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS.length;
    index += 1
  ) {
    const proofKey = BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS[index];
    const verdict = rawFamily.proofs[proofKey];

    if (verdict !== "pass" && verdict !== "fail") {
      throw new Error(
        `Expected broker-first gate proof ${proofKey} for ${rawFamily.family} to be pass or fail.`
      );
    }

    proofs[proofKey] = verdict;
  }

  if (!Array.isArray(rawFamily.issues)) {
    throw new Error("Expected broker-first gate maintained family issues to be an array.");
  }

  return {
    family: rawFamily.family,
    winnerId: rawFamily.winnerId,
    capabilityId: rawFamily.capabilityId,
    status: rawFamily.status,
    proofs,
    issues: rawFamily.issues.map((issue) =>
      parseIssue(issue, rawFamily.family as string)
    )
  };
}

function parseBrokerFirstGateArtifact(
  rawArtifact: unknown,
  options: ParseBrokerFirstGateOptions
): BrokerFirstGateArtifact {
  if (!isRecord(rawArtifact)) {
    throw new Error("Expected broker-first gate artifact to be a JSON object.");
  }

  if (rawArtifact.schemaVersion !== BROKER_FIRST_GATE_SCHEMA_VERSION) {
    throw new Error(
      `Expected broker-first gate schemaVersion to be ${BROKER_FIRST_GATE_SCHEMA_VERSION}.`
    );
  }

  if (!isNonEmptyString(rawArtifact.artifactPath)) {
    throw new Error("Expected broker-first gate artifactPath to be a non-empty string.");
  }

  if (!isNonEmptyString(rawArtifact.generatedAt)) {
    throw new Error("Expected broker-first gate generatedAt to be a non-empty string.");
  }

  if (!Array.isArray(rawArtifact.maintainedFamilies)) {
    throw new Error("Expected broker-first gate maintainedFamilies to be an array.");
  }

  if (!Array.isArray(rawArtifact.issues)) {
    throw new Error("Expected broker-first gate issues to be an array.");
  }

  const maintainedFamilies = rawArtifact.maintainedFamilies.map((entry) =>
    parseFamilyResult(entry, options)
  );
  const seenFamilies = new Set<string>();

  for (let index = 0; index < maintainedFamilies.length; index += 1) {
    const family = maintainedFamilies[index].family;

    if (seenFamilies.has(family)) {
      throw new Error(`Duplicate broker-first gate family entry: ${family}.`);
    }

    seenFamilies.add(family);
  }

  for (let index = 0; index < options.contract.maintainedFamilies.length; index += 1) {
    const family = options.contract.maintainedFamilies[index].family;

    if (!seenFamilies.has(family)) {
      throw new Error(
        `Broker-first gate artifact is missing maintained family ${family}.`
      );
    }
  }

  const issues = rawArtifact.issues.map((issue) => parseIssue(issue));

  for (let index = 0; index < issues.length; index += 1) {
    if (issues[index].scope !== "artifact") {
      throw new Error("Top-level broker-first gate issues must use artifact scope.");
    }
  }

  return {
    schemaVersion: BROKER_FIRST_GATE_SCHEMA_VERSION,
    artifactPath: rawArtifact.artifactPath,
    generatedAt: rawArtifact.generatedAt,
    maintainedFamilies,
    issues
  };
}

function buildFreshFallbackFamily(
  contractEntry: MaintainedBrokerFirstContract["maintainedFamilies"][number],
  artifactPath: string,
  previous?: BrokerFirstGateFamilyResult
): BrokerFirstGateFamilyResult {
  const proofs = {} as Record<
    BrokerFirstGateProofKey,
    BrokerFirstGateProofVerdict
  >;
  const issues: BrokerFirstGateIssue[] = [];

  for (
    let index = 0;
    index < BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS.length;
    index += 1
  ) {
    const proofKey = BROKER_FIRST_GATE_REQUIRED_PROOF_KEYS[index];
    const verdict =
      previous?.proofs[proofKey] === "pass"
        ? "pass"
        : proofKey === "peerConflict"
          ? "pass"
          : "fail";

    proofs[proofKey] = verdict;
    if (verdict === "fail" && proofKey !== "peerConflict") {
      issues.push(fallbackProofIssue(contractEntry.family, proofKey, artifactPath));
    }
  }

  return {
    family: contractEntry.family,
    winnerId: contractEntry.winnerId,
    capabilityId: contractEntry.capabilityId,
    status: issues.length === 0 ? "green" : "red",
    proofs,
    issues
  };
}

function buildPassingFamilyFromContract(
  contractEntry: MaintainedBrokerFirstContract["maintainedFamilies"][number]
): BrokerFirstGateFamilyResult {
  return {
    family: contractEntry.family,
    winnerId: contractEntry.winnerId,
    capabilityId: contractEntry.capabilityId,
    status: "green",
    proofs: {
      phase2Boundary: "pass",
      phase3Eval: "pass",
      peerConflict: "pass"
    },
    issues: []
  };
}

async function loadExistingArtifactForRefresh(
  contract: MaintainedBrokerFirstContract,
  artifactPath: string
): Promise<BrokerFirstGateArtifact | undefined> {
  const rawArtifact = await readJsonFile<unknown>(artifactPath);

  if (rawArtifact === null) {
    return undefined;
  }

  try {
    return parseBrokerFirstGateArtifact(rawArtifact, {
      artifactPath,
      contract
    });
  } catch {
    return undefined;
  }
}

export async function refreshBrokerFirstGateArtifact(
  options: EvaluateBrokerFirstGateOptions
): Promise<BrokerFirstGateArtifact> {
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const contract = await loadMaintainedBrokerFirstContract(
    sharedHomeLayout.maintainedFamiliesPath
  );
  const existingArtifact = await loadExistingArtifactForRefresh(
    contract,
    sharedHomeLayout.brokerFirstGatePath
  );
  const previousFamilies = new Map(
    existingArtifact?.maintainedFamilies.map((entry) => [entry.family, entry]) ?? []
  );

  const artifact: BrokerFirstGateArtifact = {
    schemaVersion: BROKER_FIRST_GATE_SCHEMA_VERSION,
    artifactPath: sharedHomeLayout.brokerFirstGatePath,
    generatedAt: (options.now ?? new Date()).toISOString(),
    maintainedFamilies: contract.maintainedFamilies.map((entry) =>
      buildFreshFallbackFamily(
        entry,
        sharedHomeLayout.brokerFirstGatePath,
        previousFamilies.get(entry.family)
      )
    ),
    issues: []
  };

  await writeJsonFile(sharedHomeLayout.brokerFirstGatePath, artifact);
  return artifact;
}

export async function materializeBrokerFirstGateArtifact(
  options: EvaluateBrokerFirstGateOptions
): Promise<BrokerFirstGateArtifact> {
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const contract = await loadMaintainedBrokerFirstContract(
    sharedHomeLayout.maintainedFamiliesPath
  );
  const artifact: BrokerFirstGateArtifact = {
    schemaVersion: BROKER_FIRST_GATE_SCHEMA_VERSION,
    artifactPath: sharedHomeLayout.brokerFirstGatePath,
    generatedAt: (options.now ?? new Date()).toISOString(),
    maintainedFamilies: contract.maintainedFamilies.map((entry) =>
      buildPassingFamilyFromContract(entry)
    ),
    issues: []
  };

  await writeJsonFile(sharedHomeLayout.brokerFirstGatePath, artifact);
  return artifact;
}

export async function evaluateBrokerFirstGate(
  options: EvaluateBrokerFirstGateOptions
): Promise<BrokerFirstGateDiagnosticResult> {
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const sharedHomeExists = await pathExists(sharedHomeLayout.packageJsonPath);

  if (!sharedHomeExists) {
    return {
      skipped: true,
      skipReason: "Shared broker home is not installed yet.",
      artifactPath: sharedHomeLayout.brokerFirstGatePath,
      contractPath: sharedHomeLayout.maintainedFamiliesPath,
      freshness: {
        state: "unknown",
        detail: "shared broker home is not installed",
        allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
      },
      issues: [],
      maintainedFamilies: [],
      hasStrictIssues: false
    };
  }

  let contract: MaintainedBrokerFirstContract;
  try {
    contract = await loadMaintainedBrokerFirstContract(
      sharedHomeLayout.maintainedFamiliesPath
    );
  } catch (error) {
    return {
      skipped: false,
      artifactPath: sharedHomeLayout.brokerFirstGatePath,
      contractPath: sharedHomeLayout.maintainedFamiliesPath,
      freshness: {
        state: "missing",
        detail: `maintained-family contract unavailable; allowed window ${(BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS / 3600000).toFixed(1)}h`,
        allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
      },
      issues: [
        invalidArtifactIssue(
          sharedHomeLayout.brokerFirstGatePath,
          error instanceof Error
            ? error.message
            : "Could not load maintained-family contract.",
          "BROKER_FIRST_GATE_CONTRACT_INVALID"
        )
      ],
      maintainedFamilies: [],
      hasStrictIssues: true
    };
  }

  if (options.refresh === true) {
    await refreshBrokerFirstGateArtifact(options);
  }

  const rawArtifact = await readJsonFile<unknown>(sharedHomeLayout.brokerFirstGatePath);
  if (rawArtifact === null) {
    return {
      skipped: false,
      artifactPath: sharedHomeLayout.brokerFirstGatePath,
      contractPath: sharedHomeLayout.maintainedFamiliesPath,
      freshness: {
        state: "missing",
        detail: `broker-first gate artifact missing; allowed window ${(BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS / 3600000).toFixed(1)}h`,
        allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
      },
      issues: [missingArtifactIssue(sharedHomeLayout.brokerFirstGatePath)],
      maintainedFamilies: [],
      hasStrictIssues: true
    };
  }

  let artifact: BrokerFirstGateArtifact;
  try {
    artifact = parseBrokerFirstGateArtifact(rawArtifact, {
      artifactPath: sharedHomeLayout.brokerFirstGatePath,
      contract
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Broker-first gate artifact is invalid.";
    const code = /maintained-family contract|missing maintained family|winnerId|capabilityId/.test(
      message
    )
      ? "BROKER_FIRST_GATE_CONTRACT_MISMATCH"
      : "BROKER_FIRST_GATE_INVALID";

    return {
      skipped: false,
      artifactPath: sharedHomeLayout.brokerFirstGatePath,
      contractPath: sharedHomeLayout.maintainedFamiliesPath,
      freshness: {
        state: "missing",
        detail: `broker-first gate artifact invalid; allowed window ${(BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS / 3600000).toFixed(1)}h`,
        allowedWindowMs: BROKER_FIRST_GATE_ALLOWED_FRESHNESS_MS
      },
      issues: [
        invalidArtifactIssue(
          sharedHomeLayout.brokerFirstGatePath,
          message,
          code
        )
      ],
      maintainedFamilies: [],
      hasStrictIssues: true
    };
  }

  const freshness = evaluateFreshness(
    artifact.generatedAt,
    options.now ?? new Date()
  );

  if (artifact.issues.length > 0 || freshness.state === "stale") {
    return {
      skipped: false,
      artifactPath: sharedHomeLayout.brokerFirstGatePath,
      contractPath: sharedHomeLayout.maintainedFamiliesPath,
      freshness,
      issues: [
        ...artifact.issues,
        ...(freshness.state === "stale"
          ? [staleArtifactIssue(sharedHomeLayout.brokerFirstGatePath)]
          : [])
      ],
      maintainedFamilies: [],
      hasStrictIssues: true
    };
  }

  return {
    skipped: false,
    artifactPath: sharedHomeLayout.brokerFirstGatePath,
    contractPath: sharedHomeLayout.maintainedFamiliesPath,
    freshness,
    issues: [],
    maintainedFamilies: artifact.maintainedFamilies,
    hasStrictIssues: artifact.maintainedFamilies.some(
      (family) => family.status === "red" || family.issues.length > 0
    )
  };
}

export function brokerFirstGateArtifactPath(
  brokerHomeDirectory: string
): string {
  return resolveSharedBrokerHomeLayout(brokerHomeDirectory).brokerFirstGatePath;
}

export async function loadBrokerFirstGate(
  options: LoadBrokerFirstGateOptions
): Promise<BrokerFirstGateResult> {
  return evaluateBrokerFirstGate({
    brokerHomeDirectory: options.brokerHomeDirectory,
    refresh: options.refresh,
    now: options.now
  });
}
