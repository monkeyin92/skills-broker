import type { CapabilityCard } from "../core/capability-card.js";

export function discoverCandidates(
  ...sources: ReadonlyArray<ReadonlyArray<CapabilityCard>>
): CapabilityCard[] {
  const seen = new Set<string>();
  const merged: CapabilityCard[] = [];

  for (const source of sources) {
    for (const candidate of source) {
      const key = candidate.leaf.capabilityId;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(candidate);
    }
  }

  return merged;
}

export const mergeDiscoveryResults = discoverCandidates;
