import type { CapabilityCard } from "../core/capability-card.js";
import type {
  BrokerIntent,
  CapabilityQueryTarget,
  QueryBackedBrokerRequest
} from "../core/types.js";
import { deriveCompatibilityIntent } from "./query-compiler.js";
import { hasCapabilityQueryMatch } from "./rank.js";

export type RequestRoutingReasonCode =
  | "query_native"
  | "query_native_via_legacy_compat";

export type ResolvedBrokerRequest = {
  request: QueryBackedBrokerRequest;
  compatibilityIntent: BrokerIntent;
  requestQueryIdentity: string;
  legacyRequestCacheKey: string;
  legacyIntentCacheKey: string;
};

function stableListKey(values: string[] | undefined): string {
  if (values === undefined || values.length === 0) {
    return "";
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  )
    .sort()
    .join(",");
}

function normalizeTextValue(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTargetValue(target: CapabilityQueryTarget): string {
  const normalized = normalizeTextValue(target.value);

  switch (target.type) {
    case "url":
    case "website":
    case "repo":
      return normalized.toLowerCase();
    default:
      return normalized;
  }
}

function targetIdentity(target: CapabilityQueryTarget): string {
  return `${target.type}:${normalizeTargetValue(target)}`;
}

export function buildRequestQueryIdentity(
  request: Pick<QueryBackedBrokerRequest, "outputMode" | "capabilityQuery">
): string {
  const query = request.capabilityQuery;

  return [
    "query:v2",
    `output:${request.outputMode}`,
    `families:${stableListKey(query.jobFamilies)}`,
    `artifacts:${stableListKey(query.artifacts)}`,
    `constraints:${stableListKey(query.constraints)}`,
    `targets:${stableListKey(query.targets?.map((target) => targetIdentity(target)))}`,
    `preferred:${normalizeTextValue(query.preferredCapability ?? "")}`
  ].join("|");
}

export function legacyIntentCacheKey(intent: BrokerIntent): string {
  return `intent:${intent}`;
}

export function buildLegacyRequestCacheKey(
  request: Pick<QueryBackedBrokerRequest, "capabilityQuery">,
  compatibilityIntent: BrokerIntent
): string {
  const targetTypes = stableListKey(
    request.capabilityQuery.targets?.map((target) => target.type)
  );

  return [
    legacyIntentCacheKey(compatibilityIntent),
    `families:${stableListKey(request.capabilityQuery.jobFamilies)}`,
    `artifacts:${stableListKey(request.capabilityQuery.artifacts)}`,
    `targetTypes:${targetTypes}`,
    `preferred:${request.capabilityQuery.preferredCapability ?? ""}`
  ].join("|");
}

export function resolveBrokerRequest(
  request: QueryBackedBrokerRequest
): ResolvedBrokerRequest {
  const compatibilityIntent = deriveCompatibilityIntent(request.capabilityQuery);

  return {
    request,
    compatibilityIntent,
    requestQueryIdentity: buildRequestQueryIdentity(request),
    legacyRequestCacheKey: buildLegacyRequestCacheKey(
      request,
      compatibilityIntent
    ),
    legacyIntentCacheKey: legacyIntentCacheKey(compatibilityIntent)
  };
}

export function requestRoutingReasonCode(
  card: CapabilityCard,
  request: Pick<ResolvedBrokerRequest, "request">
): RequestRoutingReasonCode {
  return hasCapabilityQueryMatch(card, request.request.capabilityQuery)
    ? "query_native"
    : "query_native_via_legacy_compat";
}
