import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CapabilityCard } from "../core/capability-card.js";
import type { BrokerHost, BrokerIntent } from "../core/types.js";
import type { RoutingHistory } from "./rank.js";

export const ACQUISITION_MEMORY_VERSION = "2026-04-16" as const;

export type AcquisitionMemoryEntry = {
  canonicalKey: string;
  compatibilityIntent: BrokerIntent;
  candidateId: string;
  packageId: string;
  leafCapabilityId: string;
  successfulRoutes: number;
  installedAt: string;
  verifiedAt: string;
  firstReuseAt?: string;
  verifiedHosts: BrokerHost[];
  provenance: "package_probe";
  winnerSnapshot?: CapabilityCard;
};

type AcquisitionMemoryFile = {
  version: typeof ACQUISITION_MEMORY_VERSION;
  entries: AcquisitionMemoryEntry[];
};

type RecordVerifiedWinnerInput = {
  canonicalKey: string;
  compatibilityIntent: BrokerIntent;
  winner: CapabilityCard;
  currentHost: BrokerHost;
  now: Date;
};

function emptyMemoryFile(): AcquisitionMemoryFile {
  return {
    version: ACQUISITION_MEMORY_VERSION,
    entries: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBrokerIntent(value: unknown): value is BrokerIntent {
  return (
    value === "web_content_to_markdown" ||
    value === "social_post_to_markdown" ||
    value === "capability_discovery_or_install"
  );
}

function isBrokerHost(value: unknown): value is BrokerHost {
  return value === "claude-code" || value === "codex";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isCapabilityCardSnapshot(value: unknown): value is CapabilityCard {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.kind === "skill" || value.kind === "mcp") &&
    typeof value.label === "string" &&
    isBrokerIntent(value.compatibilityIntent) &&
    isRecord(value.package) &&
    typeof value.package.packageId === "string" &&
    typeof value.package.label === "string" &&
    (value.package.installState === "installed" ||
      value.package.installState === "available") &&
    (value.package.acquisition === "local_skill_bundle" ||
      value.package.acquisition === "published_package" ||
      value.package.acquisition === "broker_native" ||
      value.package.acquisition === "mcp_bundle") &&
    isRecord(value.leaf) &&
    typeof value.leaf.capabilityId === "string" &&
    typeof value.leaf.packageId === "string" &&
    typeof value.leaf.subskillId === "string" &&
    isRecord(value.query) &&
    isStringArray(value.query.jobFamilies) &&
    isStringArray(value.query.targetTypes) &&
    isStringArray(value.query.artifacts) &&
    isStringArray(value.query.examples) &&
    isRecord(value.implementation) &&
    typeof value.implementation.id === "string" &&
    (value.implementation.type === "local_skill" ||
      value.implementation.type === "mcp_server" ||
      value.implementation.type === "broker_workflow") &&
    (value.implementation.ownerSurface === "host_visible" ||
      value.implementation.ownerSurface === "broker_owned_downstream") &&
    isRecord(value.hosts) &&
    typeof value.hosts.currentHostSupported === "boolean" &&
    typeof value.hosts.portabilityScore === "number" &&
    isRecord(value.prepare) &&
    typeof value.prepare.authRequired === "boolean" &&
    typeof value.prepare.installRequired === "boolean" &&
    isRecord(value.ranking) &&
    typeof value.ranking.contextCost === "number" &&
    typeof value.ranking.confidence === "number" &&
    isRecord(value.sourceMetadata)
  );
}

function cloneCapabilityCard(card: CapabilityCard): CapabilityCard {
  return JSON.parse(JSON.stringify(card)) as CapabilityCard;
}

function replayableWinnerSnapshot(
  snapshot: CapabilityCard,
  canonicalKey: string
): CapabilityCard {
  const candidate = cloneCapabilityCard(snapshot);

  return {
    ...candidate,
    package: {
      ...candidate.package,
      installState: "available"
    },
    prepare: {
      ...candidate.prepare,
      installRequired: true
    },
    sourceMetadata: {
      ...candidate.sourceMetadata,
      discoverySource: "acquisition_memory",
      acquisitionMemoryCanonicalKey: canonicalKey
    }
  };
}

function isValidEntry(value: unknown): value is AcquisitionMemoryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.canonicalKey === "string" &&
    isBrokerIntent(value.compatibilityIntent) &&
    typeof value.candidateId === "string" &&
    typeof value.packageId === "string" &&
    typeof value.leafCapabilityId === "string" &&
    typeof value.successfulRoutes === "number" &&
    typeof value.installedAt === "string" &&
    typeof value.verifiedAt === "string" &&
    (value.firstReuseAt === undefined || typeof value.firstReuseAt === "string") &&
    Array.isArray(value.verifiedHosts) &&
    value.verifiedHosts.every((host) => isBrokerHost(host)) &&
    value.provenance === "package_probe" &&
    (value.winnerSnapshot === undefined ||
      isCapabilityCardSnapshot(value.winnerSnapshot))
  );
}

function normalizeMemoryFile(value: unknown): AcquisitionMemoryFile | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !== ACQUISITION_MEMORY_VERSION ||
    !Array.isArray(value.entries) ||
    !value.entries.every((entry) => isValidEntry(entry))
  ) {
    return null;
  }

  return {
    version: ACQUISITION_MEMORY_VERSION,
    entries: value.entries
  };
}

function uniqueHosts(hosts: BrokerHost[]): BrokerHost[] {
  return Array.from(new Set(hosts));
}

export function acquisitionMemoryFilePath(
  brokerHomeDirectory: string
): string {
  return join(brokerHomeDirectory, "state", "acquisition-memory.json");
}

export class AcquisitionMemoryStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<AcquisitionMemoryFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;

      return normalizeMemoryFile(parsed) ?? emptyMemoryFile();
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === "ENOENT" ||
        error instanceof SyntaxError
      ) {
        return emptyMemoryFile();
      }

      throw error;
    }
  }

  async historyByCandidateId(
    canonicalKey: string,
    candidates: CapabilityCard[]
  ): Promise<Record<string, RoutingHistory>> {
    const memory = await this.read();
    const matchingEntries = memory.entries.filter(
      (entry) => entry.canonicalKey === canonicalKey
    );

    if (matchingEntries.length === 0) {
      return {};
    }

    return Object.fromEntries(
      candidates.flatMap((candidate) => {
        const matchedEntry = matchingEntries.find(
          (entry) =>
            entry.candidateId === candidate.id ||
            (entry.packageId === candidate.package.packageId &&
              entry.leafCapabilityId === candidate.leaf.capabilityId)
        );

        if (matchedEntry === undefined) {
          return [];
        }

        return [
          [
            candidate.id,
            {
              successfulRoutes: matchedEntry.successfulRoutes
            } satisfies RoutingHistory
          ] as const
        ];
      })
    );
  }

  async replayCandidates(canonicalKey: string): Promise<CapabilityCard[]> {
    const memory = await this.read();

    return memory.entries
      .filter(
        (entry) =>
          entry.canonicalKey === canonicalKey &&
          entry.winnerSnapshot !== undefined &&
          isCapabilityCardSnapshot(entry.winnerSnapshot)
      )
      .sort((left, right) => {
        if (left.successfulRoutes !== right.successfulRoutes) {
          return right.successfulRoutes - left.successfulRoutes;
        }

        if (left.verifiedAt !== right.verifiedAt) {
          return right.verifiedAt.localeCompare(left.verifiedAt);
        }

        return left.candidateId.localeCompare(right.candidateId);
      })
      .map((entry) =>
        replayableWinnerSnapshot(entry.winnerSnapshot as CapabilityCard, canonicalKey)
      );
  }

  async recordVerifiedWinner(
    input: RecordVerifiedWinnerInput
  ): Promise<void> {
    const nowIso = input.now.toISOString();
    const memory = await this.read();
    const existingIndex = memory.entries.findIndex(
      (entry) =>
        entry.canonicalKey === input.canonicalKey &&
        entry.packageId === input.winner.package.packageId &&
        entry.leafCapabilityId === input.winner.leaf.capabilityId
    );

    const existingEntry =
      existingIndex === -1 ? undefined : memory.entries[existingIndex];
    const nextEntry: AcquisitionMemoryEntry = {
      canonicalKey: input.canonicalKey,
      compatibilityIntent: input.compatibilityIntent,
      candidateId: input.winner.id,
      packageId: input.winner.package.packageId,
      leafCapabilityId: input.winner.leaf.capabilityId,
      successfulRoutes: (existingEntry?.successfulRoutes ?? 0) + 1,
      installedAt: existingEntry?.installedAt ?? nowIso,
      verifiedAt: nowIso,
      firstReuseAt:
        existingEntry === undefined || existingEntry.successfulRoutes < 1
          ? existingEntry?.firstReuseAt
          : existingEntry.firstReuseAt ?? nowIso,
      verifiedHosts: uniqueHosts([
        ...(existingEntry?.verifiedHosts ?? []),
        input.currentHost
      ]),
      provenance: "package_probe",
      winnerSnapshot: cloneCapabilityCard(input.winner)
    };

    const nextEntries = memory.entries.slice();
    if (existingIndex === -1) {
      nextEntries.push(nextEntry);
    } else {
      nextEntries[existingIndex] = nextEntry;
    }

    const temporaryFilePath = `${this.filePath}.tmp`;

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      temporaryFilePath,
      JSON.stringify(
        {
          version: ACQUISITION_MEMORY_VERSION,
          entries: nextEntries
        } satisfies AcquisitionMemoryFile,
        null,
        2
      ),
      "utf8"
    );
    await rename(temporaryFilePath, this.filePath);
  }
}
