import type { CapabilityCard } from "../core/capability-card.js";

export type DiscoverySourceName =
  | "downstream_manifest"
  | "acquisition_memory"
  | "host_catalog"
  | "workflow_catalog"
  | "mcp_registry";

export type DiscoverySourceBatch = {
  source: DiscoverySourceName;
  candidates: ReadonlyArray<CapabilityCard>;
};

function discoverySourcePrecedence(source: DiscoverySourceName): number {
  switch (source) {
    case "downstream_manifest":
      return 5;
    case "acquisition_memory":
      return 4;
    case "host_catalog":
      return 3;
    case "workflow_catalog":
      return 2;
    case "mcp_registry":
      return 1;
  }
}

function duplicatePriority(
  candidate: CapabilityCard,
  source: DiscoverySourceName
): [number, number, number, number] {
  return [
    discoverySourcePrecedence(source),
    candidate.package.installState === "installed" ? 1 : 0,
    -candidate.ranking.contextCost,
    candidate.ranking.confidence
  ];
}

function shouldReplaceDuplicate(
  current: CapabilityCard,
  currentSource: DiscoverySourceName,
  next: CapabilityCard,
  nextSource: DiscoverySourceName
): boolean {
  const currentPriority = duplicatePriority(current, currentSource);
  const nextPriority = duplicatePriority(next, nextSource);

  for (let index = 0; index < currentPriority.length; index += 1) {
    if (currentPriority[index] === nextPriority[index]) {
      continue;
    }

    return nextPriority[index] > currentPriority[index];
  }

  return false;
}

export function discoverCandidates(
  ...sources: ReadonlyArray<DiscoverySourceBatch>
): CapabilityCard[] {
  const seen = new Map<
    string,
    {
      index: number;
      source: DiscoverySourceName;
    }
  >();
  const merged: CapabilityCard[] = [];

  for (const source of sources) {
    for (const candidate of source.candidates) {
      const key = candidate.leaf.capabilityId;
      const existing = seen.get(key);

      if (existing === undefined) {
        seen.set(key, {
          index: merged.length,
          source: source.source
        });
        merged.push(candidate);
        continue;
      }

      const current = merged[existing.index];
      if (
        shouldReplaceDuplicate(
          current,
          existing.source,
          candidate,
          source.source
        )
      ) {
        merged[existing.index] = candidate;
        seen.set(key, {
          index: existing.index,
          source: source.source
        });
      }
    }
  }

  return merged;
}

export const mergeDiscoveryResults = discoverCandidates;
