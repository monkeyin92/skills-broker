import type { CapabilityCandidate } from "../core/capability-card";

export function discoverCandidates(
  ...sources: ReadonlyArray<ReadonlyArray<CapabilityCandidate>>
): CapabilityCandidate[] {
  const seen = new Set<string>();
  const merged: CapabilityCandidate[] = [];

  for (const source of sources) {
    for (const candidate of source) {
      const key = `${candidate.kind}:${candidate.id}`;

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
