import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerIntent } from "../core/types.js";
import type { RequestRoutingReasonCode } from "./resolved-request.js";
import type { RoutingHistory } from "./rank.js";

export type ExplainDecisionInput = {
  currentHost: string;
  requestCompatibilityIntent: BrokerIntent;
  selectionReasonCode: RequestRoutingReasonCode;
  history?: RoutingHistory;
};

function preparationBurden(card: CapabilityCard): number {
  return Number(card.prepare.authRequired) + Number(card.prepare.installRequired);
}

function mcpRegistryEvidence(card: CapabilityCard): string | null {
  if (card.kind !== "mcp") {
    return null;
  }

  const version =
    typeof card.sourceMetadata.registryVersion === "string"
      ? card.sourceMetadata.registryVersion
      : null;
  const transport =
    typeof card.sourceMetadata.registryTransport === "string"
      ? card.sourceMetadata.registryTransport
      : null;
  const endpointCount =
    typeof card.sourceMetadata.registryEndpointCount === "number"
      ? card.sourceMetadata.registryEndpointCount
      : null;
  const validation =
    typeof card.sourceMetadata.registryValidation === "object" &&
    card.sourceMetadata.registryValidation !== null
      ? (card.sourceMetadata.registryValidation as {
          status?: string;
          usableRemoteCount?: number;
        })
      : null;
  const coverage =
    typeof card.sourceMetadata.registryQueryCoverage === "object" &&
    card.sourceMetadata.registryQueryCoverage !== null
      ? (card.sourceMetadata.registryQueryCoverage as {
          matchedBy?: string;
          jobFamilies?: string[];
          targetTypes?: string[];
          artifacts?: string[];
        })
      : null;

  if (
    version === null &&
    transport === null &&
    endpointCount === null &&
    validation?.status === undefined &&
    coverage?.matchedBy === undefined
  ) {
    return null;
  }

  const coverageFragments = [
    (coverage?.jobFamilies?.length ?? 0) > 0
      ? `jobFamilies=${coverage?.jobFamilies?.join(",")}`
      : null,
    (coverage?.targetTypes?.length ?? 0) > 0
      ? `targetTypes=${coverage?.targetTypes?.join(",")}`
      : null,
    (coverage?.artifacts?.length ?? 0) > 0
      ? `artifacts=${coverage?.artifacts?.join(",")}`
      : null
  ].filter((value): value is string => value !== null);

  const versionFragment = version === null ? "unknown version" : `v${version}`;
  const transportFragment =
    transport === null
      ? "transport unknown"
      : endpointCount === null
        ? `transport ${transport}`
        : `transport ${transport} (${endpointCount} endpoint${endpointCount === 1 ? "" : "s"})`;
  const validationFragment =
    validation?.status === undefined
      ? "validation unknown"
      : validation.usableRemoteCount === undefined
        ? `${validation.status} MCP`
        : `${validation.status} MCP (${validation.usableRemoteCount} usable remote${validation.usableRemoteCount === 1 ? "" : "s"})`;
  const coverageFragment =
    coverage?.matchedBy === undefined
      ? "query coverage unknown"
      : coverageFragments.length === 0
        ? `query coverage: ${coverage.matchedBy}`
        : `query coverage: ${coverage.matchedBy} ${coverageFragments.join(" ")}`;

  return `registry evidence: ${validationFragment}, ${versionFragment}, ${transportFragment}, ${coverageFragment}`;
}

export function explainDecision(
  card: CapabilityCard,
  input: ExplainDecisionInput
): string {
  const history = input.history;
  const cacheReuse = history?.cacheHit ? "cache hit" : "no cache hit";
  const successfulRoutes = history?.successfulRoutes ?? 0;
  const intentMatch =
    card.compatibilityIntent === input.requestCompatibilityIntent
      ? "match"
      : "mismatch";
  const hostSupport = card.hosts.currentHostSupported ? "supported" : "unsupported";
  const selectionBasis =
    input.selectionReasonCode === "query_native"
      ? "query-native match"
      : `compatibility-assisted via ${input.requestCompatibilityIntent}`;

  return [
    `current host ${input.currentHost} selected ${card.label}`,
    `current host support: ${hostSupport}`,
    `selection basis: ${selectionBasis}`,
    `compatibility lane: ${intentMatch} for ${input.requestCompatibilityIntent}`,
    `preparation burden: ${preparationBurden(card)}`,
    `context cost: ${card.ranking.contextCost}`,
    `cache reuse: ${cacheReuse}, successful routing history: ${successfulRoutes}`,
    `portability bonus: ${card.hosts.portabilityScore}`,
    mcpRegistryEvidence(card)
  ]
    .filter((value): value is string => value !== null)
    .join("; ");
}
