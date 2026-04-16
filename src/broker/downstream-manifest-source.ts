import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CapabilityCard,
  CapabilityCandidate
} from "../core/capability-card.js";
import { toCapabilityCard } from "../core/capability-card.js";
import type { BrokerHost, BrokerIntent } from "../core/types.js";
import { findInstalledLeafLocation } from "./package-availability.js";

const VERIFIED_MANIFEST_FILE = ".skills-broker.json";
const VERIFIED_MANIFEST_SCHEMA_VERSION = 1 as const;

type VerifiedDownstreamCapabilityManifest = {
  schemaVersion: typeof VERIFIED_MANIFEST_SCHEMA_VERSION;
  verifiedAt: string;
  skillName?: string;
  verifiedCandidate: CapabilityCandidate;
};

type WriteVerifiedDownstreamManifestInput = {
  winner: CapabilityCard;
  brokerHomeDirectory?: string;
  currentHost: BrokerHost;
  now: Date;
};

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

function isCapabilityCandidateSnapshot(
  value: unknown
): value is CapabilityCandidate {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.kind === "skill" || value.kind === "mcp") &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    isBrokerIntent(value.intent)
  );
}

function brokerManagedDownstreamRoot(
  brokerHomeDirectory: string,
  host: BrokerHost
): string {
  return join(brokerHomeDirectory, "downstream", host, "skills");
}

function cloneCandidate(candidate: CapabilityCandidate): CapabilityCandidate {
  return JSON.parse(JSON.stringify(candidate)) as CapabilityCandidate;
}

function candidateFromCard(card: CapabilityCard): CapabilityCandidate {
  return {
    id: card.id,
    kind: card.kind,
    label: card.label,
    intent: card.compatibilityIntent,
    package: JSON.parse(JSON.stringify(card.package)),
    leaf: JSON.parse(JSON.stringify(card.leaf)),
    query: JSON.parse(JSON.stringify(card.query)),
    implementation: JSON.parse(JSON.stringify(card.implementation)),
    sourceMetadata: JSON.parse(JSON.stringify(card.sourceMetadata))
  };
}

function advisoryReplayCard(
  candidate: CapabilityCandidate,
  host: BrokerHost
): CapabilityCard {
  const advisoryCandidate = cloneCandidate(candidate);
  const advisoryCard = toCapabilityCard({
    ...advisoryCandidate,
    sourceMetadata: {
      ...(advisoryCandidate.sourceMetadata ?? {}),
      discoverySource: "downstream_manifest",
      verifiedDownstreamHost: host
    }
  });

  return {
    ...advisoryCard,
    package: {
      ...advisoryCard.package,
      installState: "available"
    },
    prepare: {
      ...advisoryCard.prepare,
      installRequired: true
    }
  };
}

async function readVerifiedManifest(
  filePath: string
): Promise<VerifiedDownstreamCapabilityManifest | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    if (
      parsed.schemaVersion !== VERIFIED_MANIFEST_SCHEMA_VERSION ||
      typeof parsed.verifiedAt !== "string" ||
      !isCapabilityCandidateSnapshot(parsed.verifiedCandidate)
    ) {
      return null;
    }

    return {
      schemaVersion: VERIFIED_MANIFEST_SCHEMA_VERSION,
      verifiedAt: parsed.verifiedAt,
      skillName:
        typeof parsed.skillName === "string" ? parsed.skillName : undefined,
      verifiedCandidate: parsed.verifiedCandidate
    };
  } catch {
    return null;
  }
}

async function collectVerifiedManifestCandidates(
  directory: string,
  host: BrokerHost
): Promise<CapabilityCard[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const candidates: CapabilityCard[] = [];

    for (const entry of entries) {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        candidates.push(...(await collectVerifiedManifestCandidates(entryPath, host)));
        continue;
      }

      if (!entry.isFile() || entry.name !== VERIFIED_MANIFEST_FILE) {
        continue;
      }

      const manifest = await readVerifiedManifest(entryPath);
      if (manifest === null) {
        continue;
      }

      candidates.push(advisoryReplayCard(manifest.verifiedCandidate, host));
    }

    return candidates;
  } catch {
    return [];
  }
}

export async function loadVerifiedDownstreamCandidates(input: {
  brokerHomeDirectory?: string;
  currentHost: BrokerHost;
  visibleHosts?: BrokerHost[];
}): Promise<CapabilityCard[]> {
  if (input.brokerHomeDirectory === undefined) {
    return [];
  }

  const visibleHosts = Array.from(
    new Set(input.visibleHosts ?? [input.currentHost])
  );
  const orderedHosts = [
    input.currentHost,
    ...visibleHosts.filter((host) => host !== input.currentHost)
  ].filter((host, index, hosts) => hosts.indexOf(host) === index);
  const candidates: CapabilityCard[] = [];

  for (const host of orderedHosts) {
    candidates.push(
      ...(await collectVerifiedManifestCandidates(
        brokerManagedDownstreamRoot(input.brokerHomeDirectory, host),
        host
      ))
    );
  }

  return candidates;
}

export async function writeVerifiedDownstreamManifest(
  input: WriteVerifiedDownstreamManifestInput
): Promise<void> {
  if (input.brokerHomeDirectory === undefined) {
    return;
  }

  const downstreamRoot = brokerManagedDownstreamRoot(
    input.brokerHomeDirectory,
    input.currentHost
  );
  const location = await findInstalledLeafLocation(input.winner, {
    currentHost: input.currentHost,
    brokerHomeDirectory: input.brokerHomeDirectory,
    packageSearchRoots: [downstreamRoot]
  });

  if (location === undefined) {
    return;
  }

  const manifestPath = join(location.skillDirectory, VERIFIED_MANIFEST_FILE);
  const existing =
    (await readVerifiedManifest(manifestPath)) satisfies
      | VerifiedDownstreamCapabilityManifest
      | null;
  const skillName =
    (typeof input.winner.sourceMetadata.skillName === "string"
      ? input.winner.sourceMetadata.skillName
      : undefined) ?? input.winner.leaf.subskillId;
  const nextManifest: VerifiedDownstreamCapabilityManifest = {
    schemaVersion: VERIFIED_MANIFEST_SCHEMA_VERSION,
    verifiedAt: input.now.toISOString(),
    skillName: existing?.skillName ?? skillName,
    verifiedCandidate: candidateFromCard(input.winner)
  };

  await mkdir(location.skillDirectory, { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(nextManifest, null, 2)}\n`,
    "utf8"
  );
}
