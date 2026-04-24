import type { CapabilityCard } from "../core/capability-card.js";
import type { DiscoverySourceBatch, DiscoverySourceName } from "./discover.js";
import { discoverCandidates } from "./discover.js";

export type CapabilityProvenanceKind =
  | "installed_local_skill"
  | "verified_downstream_manifest"
  | "mcp_registry_advisory"
  | "broker_owned_workflow"
  | "acquisition_memory"
  | "host_catalog_available"
  | "unknown";

export type CapabilityTrustEligibility = "eligible" | "degraded" | "rejected";

export type CapabilityTrustSummary = {
  provenance: CapabilityProvenanceKind;
  eligibility: CapabilityTrustEligibility;
  reasons: string[];
  source?: DiscoverySourceName;
  installState: CapabilityCard["package"]["installState"];
  installRequired: boolean;
  metadata: Record<string, string | number | boolean>;
};

export type CapabilityTrustIssueCode =
  | "TRUST_SOURCE_CONTRADICTION"
  | "TRUST_METADATA_MISSING"
  | "TRUST_METADATA_STALE"
  | "TRUST_ADVISORY_OUTRANKS_VERIFIED";

export type CapabilityTrustIssue = {
  code: CapabilityTrustIssueCode;
  candidateId: string;
  capabilityId: string;
  message: string;
};

export type CapabilityTrustSurfaceReport = {
  issues: CapabilityTrustIssue[];
  hasIssues: boolean;
};

type InspectCapabilityTrustSurfaceInput = {
  sources: ReadonlyArray<DiscoverySourceBatch>;
  now?: Date;
  maxVerifiedManifestAgeDays?: number;
};

const DEFAULT_VERIFIED_MANIFEST_MAX_AGE_DAYS = 90;

function metadataString(
  card: CapabilityCard,
  key: string
): string | undefined {
  const value = card.sourceMetadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function metadataNumber(
  card: CapabilityCard,
  key: string
): number | undefined {
  const value = card.sourceMetadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function metadataRecord(
  card: CapabilityCard,
  key: string
): Record<string, unknown> | undefined {
  const value = card.sourceMetadata[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function inferProvenance(
  card: CapabilityCard,
  source?: DiscoverySourceName
): CapabilityProvenanceKind {
  const metadataSource = metadataString(card, "discoverySource");
  const resolvedSource = source ?? metadataSource;

  if (card.implementation.type === "broker_workflow" || resolvedSource === "workflow_catalog") {
    return "broker_owned_workflow";
  }

  if (resolvedSource === "downstream_manifest") {
    return "verified_downstream_manifest";
  }

  if (resolvedSource === "acquisition_memory") {
    return "acquisition_memory";
  }

  if (resolvedSource === "mcp_registry" || card.kind === "mcp") {
    return "mcp_registry_advisory";
  }

  if (resolvedSource === "host_catalog" && card.package.installState === "installed") {
    return "installed_local_skill";
  }

  if (resolvedSource === "host_catalog" && card.package.installState === "available") {
    return "host_catalog_available";
  }

  if (card.kind === "skill" && card.package.installState === "installed") {
    return "installed_local_skill";
  }

  return "unknown";
}

function requiredRegistryMetadata(card: CapabilityCard): string[] {
  const missing: string[] = [];
  const validation = metadataRecord(card, "registryValidation");
  const coverage = metadataRecord(card, "registryQueryCoverage");

  if (metadataString(card, "registryName") === undefined) {
    missing.push("registryName");
  }
  if (metadataString(card, "registryVersion") === undefined) {
    missing.push("registryVersion");
  }
  if (metadataString(card, "registryTransport") === undefined) {
    missing.push("registryTransport");
  }
  if (metadataNumber(card, "registryEndpointCount") === undefined) {
    missing.push("registryEndpointCount");
  }
  if (typeof validation?.status !== "string") {
    missing.push("registryValidation.status");
  }
  if (typeof validation?.usableRemoteCount !== "number") {
    missing.push("registryValidation.usableRemoteCount");
  }
  if (typeof coverage?.matchedBy !== "string") {
    missing.push("registryQueryCoverage.matchedBy");
  }

  return missing;
}

function requiredDownstreamMetadata(card: CapabilityCard): string[] {
  const missing: string[] = [];

  if (metadataString(card, "verifiedDownstreamHost") === undefined) {
    missing.push("verifiedDownstreamHost");
  }
  if (metadataString(card, "verifiedDownstreamManifestAt") === undefined) {
    missing.push("verifiedDownstreamManifestAt");
  }

  return missing;
}

function manifestAgeDays(card: CapabilityCard, now: Date): number | undefined {
  const verifiedAt = metadataString(card, "verifiedDownstreamManifestAt");
  if (verifiedAt === undefined) {
    return undefined;
  }

  const timestamp = Date.parse(verifiedAt);
  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((now.getTime() - timestamp) / 86_400_000);
}

export function describeCapabilityTrust(
  card: CapabilityCard,
  source?: DiscoverySourceName
): CapabilityTrustSummary {
  const provenance = inferProvenance(card, source);
  const reasons: string[] = [];
  const metadata: Record<string, string | number | boolean> = {
    packageId: card.package.packageId,
    implementationType: card.implementation.type,
    ownerSurface: card.implementation.ownerSurface
  };

  if (source !== undefined) {
    metadata.discoverySource = source;
  }

  let eligibility: CapabilityTrustEligibility = "eligible";

  if (provenance === "mcp_registry_advisory") {
    const missing = requiredRegistryMetadata(card);
    const validation = metadataRecord(card, "registryValidation");
    const coverage = metadataRecord(card, "registryQueryCoverage");
    const endpointCount = metadataNumber(card, "registryEndpointCount");
    metadata.registryVersion = metadataString(card, "registryVersion") ?? "missing";
    metadata.registryTransport = metadataString(card, "registryTransport") ?? "missing";
    metadata.registryEndpointCount = endpointCount ?? 0;
    metadata.registryValidation =
      typeof validation?.status === "string" ? validation.status : "missing";
    metadata.registryCoverage =
      typeof coverage?.matchedBy === "string" ? coverage.matchedBy : "missing";

    if (missing.length > 0) {
      eligibility = "degraded";
      reasons.push(`missing registry metadata: ${missing.join(", ")}`);
    } else {
      reasons.push("registry advisory metadata validated");
    }
  }

  if (provenance === "verified_downstream_manifest") {
    const missing = requiredDownstreamMetadata(card);
    metadata.verifiedDownstreamHost =
      metadataString(card, "verifiedDownstreamHost") ?? "missing";
    metadata.verifiedDownstreamManifestAt =
      metadataString(card, "verifiedDownstreamManifestAt") ?? "missing";

    if (missing.length > 0) {
      eligibility = "degraded";
      reasons.push(`missing downstream manifest metadata: ${missing.join(", ")}`);
    } else {
      reasons.push("verified downstream manifest replay");
    }
  }

  if (provenance === "unknown") {
    eligibility = "degraded";
    reasons.push("unknown capability provenance");
  }

  if (reasons.length === 0) {
    reasons.push("installed or broker-owned candidate metadata validated");
  }

  return {
    provenance,
    eligibility,
    reasons,
    source,
    installState: card.package.installState,
    installRequired: card.prepare.installRequired,
    metadata
  };
}

function issue(
  code: CapabilityTrustIssueCode,
  card: CapabilityCard,
  message: string
): CapabilityTrustIssue {
  return {
    code,
    candidateId: card.id,
    capabilityId: card.leaf.capabilityId,
    message
  };
}

function sourceContradiction(
  card: CapabilityCard,
  source: DiscoverySourceName
): string | null {
  const metadataSource = metadataString(card, "discoverySource");
  if (metadataSource !== undefined && metadataSource !== source) {
    return `source batch ${source} contradicts candidate discoverySource ${metadataSource}`;
  }

  if (source === "mcp_registry" && card.kind !== "mcp") {
    return "mcp_registry source emitted a non-MCP candidate";
  }

  if (source === "workflow_catalog" && card.implementation.type !== "broker_workflow") {
    return "workflow_catalog source emitted a non-workflow candidate";
  }

  return null;
}

function isVerifiedInstalledCandidate(card: CapabilityCard, source: DiscoverySourceName): boolean {
  const provenance = inferProvenance(card, source);
  return (
    card.package.installState === "installed" &&
    (provenance === "installed_local_skill" || provenance === "broker_owned_workflow")
  );
}

function isAdvisoryCandidate(card: CapabilityCard, source: DiscoverySourceName): boolean {
  return inferProvenance(card, source) === "mcp_registry_advisory";
}

export function inspectCapabilityTrustSurface(
  input: InspectCapabilityTrustSurfaceInput
): CapabilityTrustSurfaceReport {
  const now = input.now ?? new Date();
  const maxAgeDays =
    input.maxVerifiedManifestAgeDays ?? DEFAULT_VERIFIED_MANIFEST_MAX_AGE_DAYS;
  const issues: CapabilityTrustIssue[] = [];
  const candidatesByCapability = new Map<
    string,
    Array<{ card: CapabilityCard; source: DiscoverySourceName }>
  >();

  for (const sourceBatch of input.sources) {
    for (const card of sourceBatch.candidates) {
      const contradiction = sourceContradiction(card, sourceBatch.source);
      if (contradiction !== null) {
        issues.push(issue("TRUST_SOURCE_CONTRADICTION", card, contradiction));
      }

      const summary = describeCapabilityTrust(card, sourceBatch.source);
      if (summary.eligibility !== "eligible") {
        issues.push(
          issue("TRUST_METADATA_MISSING", card, summary.reasons.join("; "))
        );
      }

      if (summary.provenance === "verified_downstream_manifest") {
        const ageDays = manifestAgeDays(card, now);
        if (ageDays === undefined || ageDays < 0 || ageDays > maxAgeDays) {
          issues.push(
            issue(
              "TRUST_METADATA_STALE",
              card,
              `verified downstream manifest age ${ageDays ?? "unknown"} days exceeds ${maxAgeDays} days`
            )
          );
        }
      }

      const bucket = candidatesByCapability.get(card.leaf.capabilityId) ?? [];
      bucket.push({ card, source: sourceBatch.source });
      candidatesByCapability.set(card.leaf.capabilityId, bucket);
    }
  }

  const merged = discoverCandidates(...input.sources);
  const mergedByCapability = new Map(
    merged.map((card) => [card.leaf.capabilityId, card])
  );

  for (const [capabilityId, candidates] of candidatesByCapability) {
    const verifiedInstalled = candidates.find(({ card, source }) =>
      isVerifiedInstalledCandidate(card, source)
    );
    const selected = mergedByCapability.get(capabilityId);
    if (verifiedInstalled === undefined || selected === undefined) {
      continue;
    }

    const selectedSource = candidates.find(({ card }) => card === selected)?.source;
    if (
      selectedSource !== undefined &&
      isAdvisoryCandidate(selected, selectedSource)
    ) {
      issues.push(
        issue(
          "TRUST_ADVISORY_OUTRANKS_VERIFIED",
          selected,
          `advisory candidate ${selected.id} outranked verified installed candidate ${verifiedInstalled.card.id}`
        )
      );
    }
  }

  return {
    issues,
    hasIssues: issues.length > 0
  };
}
