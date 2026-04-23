import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { acquisitionMemoryFilePath } from "../../src/broker/acquisition-memory";
import { routingTraceLogFilePath } from "../../src/broker/trace-store";

export async function writeFreshWebsiteQaAdoptionFixtures(
  brokerHomeDirectory: string,
  options: {
    installRequiredAt?: string;
    codexHitAt?: string;
    claudeHitAt?: string;
    opencodeHitAt?: string;
  } = {}
): Promise<void> {
  const installRequiredAt =
    options.installRequiredAt ?? "2026-04-16T04:55:00.000Z";
  const codexHitAt = options.codexHitAt ?? "2026-04-16T05:00:00.000Z";
  const claudeHitAt = options.claudeHitAt ?? "2026-04-16T05:05:00.000Z";
  const opencodeHitAt = options.opencodeHitAt ?? "2026-04-16T05:10:00.000Z";
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
  await writeFile(
    traceFilePath,
    [
      {
        traceVersion: "2026-03-31",
        requestText: "QA this website https://example.com",
        host: "codex",
        hostDecision: "broker_first",
        resultCode: "INSTALL_REQUIRED",
        routingOutcome: "fallback",
        missLayer: "retrieval",
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        requestContract: "query_native",
        selectionMode: "explicit",
        hostAction: "offer_package_install",
        candidateCount: 1,
        winnerId: "website-qa",
        winnerPackageId: "gstack",
        selectedCapabilityId: "gstack.qa",
        selectedLeafCapabilityId: "qa",
        selectedImplementationId: "gstack.qa",
        selectedPackageInstallState: "available",
        semanticMatchReason: "direct_route",
        semanticMatchCandidateId: "website-qa",
        semanticMatchProofFamily: "website_qa",
        workflowId: null,
        runId: null,
        stageId: null,
        reasonCode: "package_not_installed",
        timestamp: installRequiredAt
      },
      {
        traceVersion: "2026-03-31",
        requestText: "QA this website https://example.com",
        host: "codex",
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        routingOutcome: "hit",
        missLayer: null,
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        requestContract: "query_native",
        selectionMode: "explicit",
        hostAction: null,
        candidateCount: 1,
        winnerId: "website-qa",
        winnerPackageId: "gstack",
        selectedCapabilityId: "gstack.qa",
        selectedLeafCapabilityId: "qa",
        selectedImplementationId: "gstack.qa",
        selectedPackageInstallState: "installed",
        semanticMatchReason: "direct_route",
        semanticMatchCandidateId: "website-qa",
        semanticMatchProofFamily: "website_qa",
        workflowId: null,
        runId: null,
        stageId: null,
        reasonCode: null,
        timestamp: codexHitAt
      },
      {
        traceVersion: "2026-03-31",
        requestText: "QA this website https://example.com",
        host: "claude-code",
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        routingOutcome: "hit",
        missLayer: null,
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        requestContract: "query_native",
        selectionMode: "explicit",
        hostAction: null,
        candidateCount: 1,
        winnerId: "website-qa",
        winnerPackageId: "gstack",
        selectedCapabilityId: "gstack.qa",
        selectedLeafCapabilityId: "qa",
        selectedImplementationId: "gstack.qa",
        selectedPackageInstallState: "installed",
        semanticMatchReason: "direct_route",
        semanticMatchCandidateId: "website-qa",
        semanticMatchProofFamily: "website_qa",
        workflowId: null,
        runId: null,
        stageId: null,
        reasonCode: null,
        timestamp: claudeHitAt
      },
      {
        traceVersion: "2026-03-31",
        requestText: "QA this website https://example.com",
        host: "opencode",
        hostDecision: "broker_first",
        resultCode: "HANDOFF_READY",
        routingOutcome: "hit",
        missLayer: null,
        normalizedBy: "structured_query",
        requestSurface: "structured_query",
        requestContract: "query_native",
        selectionMode: "explicit",
        hostAction: null,
        candidateCount: 1,
        winnerId: "website-qa",
        winnerPackageId: "gstack",
        selectedCapabilityId: "gstack.qa",
        selectedLeafCapabilityId: "qa",
        selectedImplementationId: "gstack.qa",
        selectedPackageInstallState: "installed",
        semanticMatchReason: "direct_route",
        semanticMatchCandidateId: "website-qa",
        semanticMatchProofFamily: "website_qa",
        workflowId: null,
        runId: null,
        stageId: null,
        reasonCode: null,
        timestamp: opencodeHitAt
      }
    ]
      .map((trace) => JSON.stringify(trace))
      .join("\n")
      .concat("\n"),
    "utf8"
  );

  const manifestFixtures = [
    {
      directory: qaManifestDirectories[0],
      verifiedAt: claudeHitAt
    },
    {
      directory: qaManifestDirectories[1],
      verifiedAt: codexHitAt
    },
    {
      directory: qaManifestDirectories[2],
      verifiedAt: opencodeHitAt
    }
  ];

  for (const fixture of manifestFixtures) {
    await writeFile(
      join(fixture.directory, ".skills-broker.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          verifiedAt: fixture.verifiedAt,
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
}
