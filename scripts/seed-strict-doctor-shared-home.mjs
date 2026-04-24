import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { acquisitionMemoryFilePath } from "../dist/broker/acquisition-memory.js";
import { routingTraceLogFilePath } from "../dist/broker/trace-store.js";

const brokerHomeDirectory = process.argv[2];

if (!brokerHomeDirectory) {
  throw new Error("Usage: node scripts/seed-strict-doctor-shared-home.mjs <broker-home>");
}

const installRequiredAt = "2026-04-23T04:55:00.000Z";
const codexHitAt = "2026-04-23T05:00:00.000Z";
const claudeHitAt = "2026-04-23T05:05:00.000Z";
const opencodeHitAt = "2026-04-23T05:10:00.000Z";

const traceFilePath = routingTraceLogFilePath(brokerHomeDirectory);
const acquisitionMemoryPath = acquisitionMemoryFilePath(brokerHomeDirectory);
const qaManifestDirectories = [
  join(
    brokerHomeDirectory,
    "downstream",
    "claude-code",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-qa"
  ),
  join(
    brokerHomeDirectory,
    "downstream",
    "codex",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-qa"
  ),
  join(
    brokerHomeDirectory,
    "downstream",
    "opencode",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-qa"
  )
];

await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
for (const directory of qaManifestDirectories) {
  await mkdir(directory, { recursive: true });
}

await writeFile(
  acquisitionMemoryPath,
  `${JSON.stringify(
    {
      version: "2026-04-16",
      entries: [
        {
          canonicalKey: "query:v2|families:quality_assurance",
          compatibilityIntent: "capability_discovery_or_install",
          candidateId: "gstack.qa",
          packageId: "gstack",
          leafCapabilityId: "gstack.qa",
          successfulRoutes: 3,
          installedAt: installRequiredAt,
          verifiedAt: opencodeHitAt,
          firstReuseAt: claudeHitAt,
          verifiedHosts: ["codex", "claude-code", "opencode"],
          provenance: "package_probe"
        }
      ]
    },
    null,
    2
  )}\n`,
  "utf8"
);

const traces = [
  {
    host: "codex",
    resultCode: "INSTALL_REQUIRED",
    routingOutcome: "fallback",
    timestamp: installRequiredAt,
    reasonCode: "package_not_installed"
  },
  {
    host: "codex",
    resultCode: "HANDOFF_READY",
    routingOutcome: "hit",
    timestamp: codexHitAt,
    reasonCode: null
  },
  {
    host: "claude-code",
    resultCode: "HANDOFF_READY",
    routingOutcome: "hit",
    timestamp: claudeHitAt,
    reasonCode: null
  },
  {
    host: "opencode",
    resultCode: "HANDOFF_READY",
    routingOutcome: "hit",
    timestamp: opencodeHitAt,
    reasonCode: null
  }
].map(({ host, resultCode, routingOutcome, timestamp, reasonCode }) => ({
  traceVersion: "2026-03-31",
  requestText: "QA this website https://example.com",
  host,
  hostDecision: "broker_first",
  resultCode,
  routingOutcome,
  missLayer: resultCode === "INSTALL_REQUIRED" ? "retrieval" : null,
  normalizedBy: "structured_query",
  requestSurface: "structured_query",
  requestContract: "query_native",
  selectionMode: "explicit",
  hostAction: resultCode === "INSTALL_REQUIRED" ? "offer_package_install" : null,
  candidateCount: 1,
  winnerId: "website-qa",
  winnerPackageId: "gstack",
  selectedCapabilityId: "gstack.qa",
  selectedLeafCapabilityId: "qa",
  selectedImplementationId: "gstack.qa",
  selectedPackageInstallState:
    resultCode === "INSTALL_REQUIRED" ? "available" : "installed",
  semanticMatchReason: "direct_route",
  semanticMatchCandidateId: "website-qa",
  semanticMatchProofFamily: "website_qa",
  workflowId: null,
  runId: null,
  stageId: null,
  reasonCode,
  timestamp
}));

await writeFile(
  traceFilePath,
  `${traces.map((trace) => JSON.stringify(trace)).join("\n")}\n`,
  "utf8"
);

for (const [directory, verifiedAt] of [
  [qaManifestDirectories[0], claudeHitAt],
  [qaManifestDirectories[1], codexHitAt],
  [qaManifestDirectories[2], opencodeHitAt]
]) {
  await writeFile(
    join(directory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt,
        skillName: "qa",
        verifiedCandidate: {
          id: "website-qa",
          kind: "skill",
          label: "Website QA",
          intent: "capability_discovery_or_install",
          package: {
            packageId: "gstack",
            installState: "installed"
          },
          leaf: {
            capabilityId: "gstack.qa",
            packageId: "gstack",
            subskillId: "qa"
          },
          implementation: {
            id: "gstack.qa",
            type: "local_skill",
            ownerSurface: "broker_owned_downstream"
          },
          sourceMetadata: {
            skillName: "qa"
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}
