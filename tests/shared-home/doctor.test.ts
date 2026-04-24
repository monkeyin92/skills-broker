import { chmod, mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acquisitionMemoryFilePath } from "../../src/broker/acquisition-memory";
import { routingTraceLogFilePath } from "../../src/broker/trace-store";
import { loadMaintainedBrokerFirstContract } from "../../src/core/maintained-broker-first";
import {
  formatFamilyLoopProofSurfaceLine,
  formatPostQaNextLoopLine,
  formatQaFirstFamilyLoopLine
} from "../../src/core/operator-truth";
import {
  brokerFirstGateArtifactPath,
  type BrokerFirstGateArtifact
} from "../../src/shared-home/broker-first-gate";
import { formatLifecycleResult } from "../../src/shared-home/format";
import { doctorSharedBrokerHome } from "../../src/shared-home/doctor";
import {
  installSharedBrokerHome,
  resolveSharedBrokerHomeLayout
} from "../../src/shared-home/install";
import { writeManagedShellManifest } from "../../src/shared-home/ownership";
import { commitAll, initGitRepo } from "../helpers/git";

function renderStatusBoard(status: string): string {
  return `# STATUS

<!-- skills-broker-status:start -->
\`\`\`json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "status-board-proof-rails",
      "title": "Status board proof rails",
      "status": "${status}",
      "proofs": [
        {
          "type": "file",
          "path": "README.md"
        }
      ]
    }
  ]
}
\`\`\`
<!-- skills-broker-status:end -->
`;
}

async function writeFreshGateArtifact(
  brokerHomeDirectory: string,
  generatedAt = new Date().toISOString()
): Promise<void> {
  const layout = resolveSharedBrokerHomeLayout(brokerHomeDirectory);
  const contract = await loadMaintainedBrokerFirstContract(
    layout.maintainedFamiliesPath
  );
  const artifactPath = brokerFirstGateArtifactPath(brokerHomeDirectory);
  const artifact: BrokerFirstGateArtifact = {
    schemaVersion: 1,
    artifactPath,
    generatedAt,
    maintainedFamilies: contract.maintainedFamilies.map((family) => ({
      family: family.family,
      winnerId: family.winnerId,
      capabilityId: family.capabilityId,
      status: "green",
      proofs: {
        phase2Boundary: "pass",
        phase3Eval: "pass",
        peerConflict: "pass"
      },
      issues: []
    })),
    issues: []
  };

  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8"
  );
}

async function writeAcquisitionMemoryFixture(
  brokerHomeDirectory: string
): Promise<void> {
  const filePath = acquisitionMemoryFilePath(brokerHomeDirectory);
  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        version: "2026-04-16",
        entries: [
          {
            canonicalKey: "query:v2|families:requirements_analysis",
            compatibilityIntent: "capability_discovery_or_install",
            candidateId: "gstack.office-hours",
            packageId: "gstack",
            leafCapabilityId: "gstack.office-hours",
            successfulRoutes: 2,
            installedAt: "2026-04-16T03:00:00.000Z",
            verifiedAt: "2026-04-16T04:00:00.000Z",
            firstReuseAt: "2026-04-16T04:00:00.000Z",
            verifiedHosts: ["codex", "claude-code"],
            provenance: "package_probe"
          },
          {
            canonicalKey: "query:v2|families:quality_assurance",
            compatibilityIntent: "capability_discovery_or_install",
            candidateId: "gstack.qa",
            packageId: "gstack",
            leafCapabilityId: "gstack.qa",
            successfulRoutes: 1,
            installedAt: "2026-04-16T05:00:00.000Z",
            verifiedAt: "2026-04-16T05:00:00.000Z",
            verifiedHosts: ["codex"],
            provenance: "package_probe"
          }
        ]
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function writeVerifiedDownstreamManifestFixture(
  brokerHomeDirectory: string,
  options: {
    includeOpencodeWebMarkdown?: boolean;
  } = {}
): Promise<void> {
  const claudeSkillDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "claude-code",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-office-hours"
  );
  const codexSkillDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "codex",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-qa"
  );
  const opencodeMarkdownDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "opencode",
    "skills",
    "baoyu",
    ".agents",
    "skills",
    "baoyu-url-to-markdown"
  );

  await mkdir(claudeSkillDirectory, { recursive: true });
  await mkdir(codexSkillDirectory, { recursive: true });
  if (options.includeOpencodeWebMarkdown) {
    await mkdir(opencodeMarkdownDirectory, { recursive: true });
  }
  await writeFile(
    join(claudeSkillDirectory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: "2026-04-16T04:00:00.000Z",
        skillName: "office-hours",
        verifiedCandidate: {
          id: "remembered-analysis",
          kind: "skill",
          label: "Remembered Analysis",
          intent: "capability_discovery_or_install",
          package: {
            packageId: "gstack",
            installState: "installed"
          },
          leaf: {
            capabilityId: "gstack.office-hours",
            packageId: "gstack",
            subskillId: "office-hours"
          },
          implementation: {
            id: "gstack.office_hours",
            type: "local_skill",
            ownerSurface: "broker_owned_downstream"
          },
          sourceMetadata: {
            skillName: "office-hours"
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    join(codexSkillDirectory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: "2026-04-16T05:00:00.000Z",
        skillName: "qa",
        verifiedCandidate: {
          id: "remembered-qa",
          kind: "skill",
          label: "Remembered QA",
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
  if (options.includeOpencodeWebMarkdown) {
    await writeFile(
      join(opencodeMarkdownDirectory, ".skills-broker.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          verifiedAt: "2026-04-16T06:30:00.000Z",
          skillName: "url-to-markdown",
          verifiedCandidate: {
            id: "web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown",
            intent: "web_content_to_markdown",
            package: {
              packageId: "baoyu",
              installState: "installed"
            },
            leaf: {
              capabilityId: "baoyu.url-to-markdown",
              packageId: "baoyu",
              subskillId: "url-to-markdown"
            },
            implementation: {
              id: "baoyu.url_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            sourceMetadata: {
              skillName: "url-to-markdown"
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

async function writeWebsiteQaInstallRequiredTraceFixture(
  brokerHomeDirectory: string
): Promise<void> {
  const traceFilePath = routingTraceLogFilePath(brokerHomeDirectory);
  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    traceFilePath,
    `${JSON.stringify({
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
      hostAction: null,
      candidateCount: 1,
      winnerId: "website-qa",
      winnerPackageId: "gstack",
      selectedCapabilityId: "gstack.qa",
      selectedLeafCapabilityId: "qa",
      selectedImplementationId: "gstack.qa",
      selectedPackageInstallState: "available",
      workflowId: null,
      runId: null,
      stageId: null,
      reasonCode: null,
      timestamp: "2026-04-16T05:00:00.000Z"
    })}\n`,
    "utf8"
  );
}

async function writeCapabilityDemandTraceFixture(
  brokerHomeDirectory: string,
  timestamp = "2026-04-24T10:00:00.000Z"
): Promise<void> {
  const traceFilePath = routingTraceLogFilePath(brokerHomeDirectory);
  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await writeFile(
    traceFilePath,
    `${JSON.stringify({
      traceVersion: "2026-03-31",
      requestText: "install a repo office-hours analysis capability",
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
      winnerId: "gstack.office-hours",
      winnerPackageId: "gstack",
      selectedCapabilityId: "gstack.office-hours",
      selectedLeafCapabilityId: "office-hours",
      selectedImplementationId: "gstack.office_hours",
      selectedPackageInstallState: "available",
      requestedProofFamily: "capability_discovery_or_install",
      semanticMatchReason: null,
      semanticMatchCandidateId: null,
      semanticMatchProofFamily: null,
      workflowId: null,
      runId: null,
      stageId: null,
      reasonCode: "package_not_installed",
      timestamp
    })}\n`,
    "utf8"
  );
}

async function writeReusableFamilyProofFixtures(
  brokerHomeDirectory: string,
  options: {
    includeOpencodeWebMarkdown?: boolean;
    includeSocialMarkdown?: boolean;
    includeWebsiteQaRepeatUsageWithoutCrossHost?: boolean;
  } = {
    includeSocialMarkdown: true
  }
): Promise<void> {
  const traceFilePath = routingTraceLogFilePath(brokerHomeDirectory);
  const acquisitionMemoryPath = acquisitionMemoryFilePath(brokerHomeDirectory);
  const claudeMarkdownDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "claude-code",
    "skills",
    "baoyu",
    ".agents",
    "skills",
    "baoyu-url-to-markdown"
  );
  const codexQaDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "codex",
    "skills",
    "gstack",
    ".agents",
    "skills",
    "gstack-qa"
  );
  const opencodeMarkdownDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "opencode",
    "skills",
    "baoyu",
    ".agents",
    "skills",
    "baoyu-url-to-markdown"
  );
  const opencodeSocialDirectory = join(
    brokerHomeDirectory,
    "downstream",
    "opencode",
    "skills",
    "baoyu",
    ".agents",
    "skills",
    "baoyu-danger-x-to-markdown"
  );

  await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
  await mkdir(claudeMarkdownDirectory, { recursive: true });
  await mkdir(codexQaDirectory, { recursive: true });
  if (options.includeOpencodeWebMarkdown) {
    await mkdir(opencodeMarkdownDirectory, { recursive: true });
  }
  if (options.includeSocialMarkdown !== false) {
    await mkdir(opencodeSocialDirectory, { recursive: true });
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
            successfulRoutes: options.includeWebsiteQaRepeatUsageWithoutCrossHost
              ? 2
              : 1,
            installedAt: "2026-04-16T05:00:00.000Z",
            verifiedAt: options.includeWebsiteQaRepeatUsageWithoutCrossHost
              ? "2026-04-16T05:10:00.000Z"
              : "2026-04-16T05:00:00.000Z",
            ...(options.includeWebsiteQaRepeatUsageWithoutCrossHost
              ? {
                  firstReuseAt: "2026-04-16T05:10:00.000Z"
                }
              : {}),
            verifiedHosts: ["codex"],
            provenance: "package_probe"
          },
          {
            canonicalKey:
              "query:v2|output:markdown_only|families:content_acquisition,web_content_conversion|targets:url:https://example.com/article",
            compatibilityIntent: "web_content_to_markdown",
            candidateId: "web-content-to-markdown",
            packageId: "baoyu",
            leafCapabilityId: "baoyu.url-to-markdown",
            successfulRoutes: options.includeOpencodeWebMarkdown ? 2 : 1,
            installedAt: "2026-04-16T06:00:00.000Z",
            verifiedAt: "2026-04-16T06:05:00.000Z",
            firstReuseAt: "2026-04-16T06:30:00.000Z",
            verifiedHosts: options.includeOpencodeWebMarkdown
              ? ["claude-code", "opencode"]
              : ["claude-code", "codex"],
            provenance: "package_probe"
          },
          ...(options.includeSocialMarkdown === false
            ? []
            : [
                {
                  canonicalKey:
                    "query:v2|output:markdown_only|families:content_acquisition,social_content_conversion|artifacts:markdown|constraints:|targets:url:https://x.com/example/status/1|preferred:",
                  compatibilityIntent: "social_post_to_markdown",
                  candidateId: "social-post-to-markdown",
                  packageId: "baoyu",
                  leafCapabilityId: "baoyu.x-post-to-markdown",
                  successfulRoutes: 2,
                  installedAt: "2026-04-16T07:00:00.000Z",
                  verifiedAt: "2026-04-16T07:05:00.000Z",
                  firstReuseAt: "2026-04-16T07:20:00.000Z",
                  verifiedHosts: ["codex", "opencode"],
                  provenance: "package_probe"
                }
              ])
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
        hostAction: null,
        candidateCount: 1,
        winnerId: "website-qa",
        winnerPackageId: "gstack",
        selectedCapabilityId: "gstack.qa",
        selectedLeafCapabilityId: "qa",
        selectedImplementationId: "gstack.qa",
        selectedPackageInstallState: "available",
        semanticMatchReason: null,
        semanticMatchCandidateId: null,
        semanticMatchProofFamily: null,
        workflowId: null,
        runId: null,
        stageId: null,
        reasonCode: null,
        timestamp: "2026-04-16T05:00:00.000Z"
      },
      {
        traceVersion: "2026-03-31",
        requestText: "turn this webpage into markdown",
        host: "claude-code",
        hostDecision: "broker_first",
        resultCode: "INSTALL_REQUIRED",
        routingOutcome: "fallback",
        missLayer: "retrieval",
        normalizedBy: "legacy_intent",
        requestSurface: "legacy_task",
        requestContract: "query_native_via_legacy_compat",
        selectionMode: "explicit",
        hostAction: null,
        candidateCount: 1,
        winnerId: "web-content-to-markdown",
        winnerPackageId: "baoyu",
        selectedCapabilityId: "baoyu.url-to-markdown",
        selectedLeafCapabilityId: "url-to-markdown",
        selectedImplementationId: "baoyu.url_to_markdown",
        selectedPackageInstallState: "available",
        semanticMatchReason: "explicit_family",
        semanticMatchCandidateId: "web-content-to-markdown",
        semanticMatchProofFamily: "web_content_to_markdown",
        workflowId: null,
        runId: null,
        stageId: null,
        reasonCode: null,
        timestamp: "2026-04-16T06:00:00.000Z"
      },
      ...(options.includeSocialMarkdown === false
        ? []
        : [
            {
              traceVersion: "2026-03-31",
              requestText: "save this X post as markdown",
              host: "codex",
              hostDecision: "broker_first",
              resultCode: "INSTALL_REQUIRED",
              routingOutcome: "fallback",
              missLayer: "retrieval",
              normalizedBy: "structured_query",
              requestSurface: "structured_query",
              requestContract: "query_native",
              selectionMode: "explicit",
              hostAction: null,
              candidateCount: 1,
              winnerId: "social-post-to-markdown",
              winnerPackageId: "baoyu",
              selectedCapabilityId: "baoyu.x-post-to-markdown",
              selectedLeafCapabilityId: "x-post-to-markdown",
              selectedImplementationId: "baoyu.x_post_to_markdown",
              selectedPackageInstallState: "available",
              semanticMatchReason: "direct_route",
              semanticMatchCandidateId: "social-post-to-markdown",
              semanticMatchProofFamily: "social_post_to_markdown",
              workflowId: null,
              runId: null,
              stageId: null,
              reasonCode: "package_not_installed",
              timestamp: "2026-04-16T07:00:00.000Z"
            }
          ])
    ]
      .map((trace) => JSON.stringify(trace))
      .join("\n")
      .concat("\n"),
    "utf8"
  );
  await writeFile(
    join(claudeMarkdownDirectory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: "2026-04-16T06:05:00.000Z",
        skillName: "url-to-markdown",
        verifiedCandidate: {
          id: "web-content-to-markdown",
          kind: "skill",
          label: "Web Content to Markdown",
          intent: "web_content_to_markdown",
          package: {
            packageId: "baoyu",
            installState: "installed"
          },
          leaf: {
            capabilityId: "baoyu.url-to-markdown",
            packageId: "baoyu",
            subskillId: "url-to-markdown"
          },
          implementation: {
            id: "baoyu.url_to_markdown",
            type: "local_skill",
            ownerSurface: "broker_owned_downstream"
          },
          sourceMetadata: {
            skillName: "url-to-markdown"
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    join(codexQaDirectory, ".skills-broker.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: "2026-04-16T05:00:00.000Z",
        skillName: "qa",
        verifiedCandidate: {
          id: "remembered-qa",
          kind: "skill",
          label: "Remembered QA",
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
  if (options.includeSocialMarkdown !== false) {
    await writeFile(
      join(opencodeSocialDirectory, ".skills-broker.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          verifiedAt: "2026-04-16T07:20:00.000Z",
          skillName: "x-post-to-markdown",
          verifiedCandidate: {
            id: "social-post-to-markdown",
            kind: "skill",
            label: "Social Post to Markdown",
            intent: "social_post_to_markdown",
            package: {
              packageId: "baoyu",
              installState: "installed"
            },
            leaf: {
              capabilityId: "baoyu.x-post-to-markdown",
              packageId: "baoyu",
              subskillId: "x-post-to-markdown"
            },
            implementation: {
              id: "baoyu.x_post_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            query: {
              proofFamily: "social_post_to_markdown"
            },
            sourceMetadata: {
              skillName: "x-post-to-markdown"
            }
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
  if (options.includeOpencodeWebMarkdown) {
    await writeFile(
      join(opencodeMarkdownDirectory, ".skills-broker.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          verifiedAt: "2026-04-16T06:30:00.000Z",
          skillName: "url-to-markdown",
          verifiedCandidate: {
            id: "web-content-to-markdown",
            kind: "skill",
            label: "Web Content to Markdown",
            intent: "web_content_to_markdown",
            package: {
              packageId: "baoyu",
              installState: "installed"
            },
            leaf: {
              capabilityId: "baoyu.url-to-markdown",
              packageId: "baoyu",
              subskillId: "url-to-markdown"
            },
            implementation: {
              id: "baoyu.url_to_markdown",
              type: "local_skill",
              ownerSurface: "broker_owned_downstream"
            },
            sourceMetadata: {
              skillName: "url-to-markdown"
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

async function writeFreshWebsiteQaAdoptionFixtures(
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

describe("doctor shared broker home", () => {
  it("explains why codex was not detected", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-missing-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const missingCodexDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory: missingCodexDirectory
      });

      expect(result.command).toBe("doctor");
      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false,
        missingPaths: expect.arrayContaining([
          join(brokerHomeDirectory, "package.json")
        ])
      });
      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("missing")
        })
      );
      expect(result.hosts).toContainEqual({
        name: "claude-code",
        status: "not_detected",
        reason: expect.stringContaining("--claude-dir")
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("reports a host as not writable when the target directory cannot be created", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-readonly-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const parentDirectory = join(runtimeDirectory, "readonly");
    const codexInstallDirectory = join(parentDirectory, "child");

    try {
      await mkdir(parentDirectory, { recursive: true });
      await chmod(parentDirectory, 0o555);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.hosts).toContainEqual(
        expect.objectContaining({
          name: "codex",
          status: "not_writable"
        })
      );
      expect(result.hosts[1]?.reason ?? "").toMatch(/not writable|permission/i);
    } finally {
      await chmod(parentDirectory, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("keeps an existing managed host detected even when the install directory is read-only", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-managed-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await chmod(codexInstallDirectory, 0o555);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "detected",
        reason: "managed by skills-broker"
      });
    } finally {
      await chmod(codexInstallDirectory, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("formats doctor results as JSON", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-json-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });

      const rendered = formatLifecycleResult(result, "json");
      const parsed = JSON.parse(rendered) as typeof result;

      expect(parsed.command).toBe("doctor");
      expect(parsed.adoptionHealth.status).toBe("inactive");
      expect(parsed.sharedHome.exists).toBe(false);
      expect(parsed.status.skipped).toBe(true);
      expect(parsed.status.issues).toEqual([]);
      expect(parsed.hosts).toEqual([
        {
          name: "claude-code",
          status: "not_detected",
          reason: expect.stringContaining("--claude-dir")
        },
        {
          name: "codex",
          status: "not_detected",
          reason: expect.stringContaining("--codex-dir")
        },
        {
          name: "opencode",
          status: "not_detected",
          reason: expect.stringContaining("--opencode-dir")
        }
      ]);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("detects a managed OpenCode shell without claiming downstream proof parity", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-opencode-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const opencodeRootDirectory = join(runtimeDirectory, ".config", "opencode");
    const opencodeInstallDirectory = join(
      opencodeRootDirectory,
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await mkdir(opencodeRootDirectory, { recursive: true });
      await mkdir(opencodeInstallDirectory, { recursive: true });
      await writeManagedShellManifest(opencodeInstallDirectory, {
        managedBy: "skills-broker",
        host: "opencode",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });

      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "detected",
        reason: "managed by skills-broker"
      });
      expect(result.adoptionHealth).toMatchObject({
        status: "blocked",
        managedHosts: ["opencode"],
        nextAction: expect.stringContaining("Trigger one clear website QA request")
      });
      expect(result.adoptionHealth.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "WEBSITE_QA_SIGNAL_MISSING"
          })
        ])
      );
      expect(result.verifiedDownstreamManifests.hosts).toContainEqual({
        name: "opencode",
        state: "missing",
        manifests: 0,
        qualityAssuranceManifests: 0
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("blocks adoption health when a managed host shell remains but the shared home is missing", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-missing-shared-home-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });

      expect(result.sharedHome).toEqual({
        path: brokerHomeDirectory,
        exists: false,
        missingPaths: expect.arrayContaining([
          join(brokerHomeDirectory, "package.json")
        ])
      });
      expect(result.adoptionHealth).toEqual({
        status: "blocked",
        managedHosts: ["codex"],
        reasons: [
          {
            code: "SHARED_HOME_MISSING",
            message:
              expect.stringContaining(
                "shared-home: managed host shells exist but the shared broker home is missing"
            )
          }
        ]
      });
      expect(formatLifecycleResult(result, "text")).toContain(
        "Adoption health: blocked (SHARED_HOME_MISSING)"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("treats a partially installed shared home as missing install truth", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-incomplete-shared-home-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      const sharedHomeLayout = await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await rm(sharedHomeLayout.maintainedFamiliesPath, { force: true });
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        codexInstallDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.sharedHome.exists).toBe(false);
      expect(result.sharedHome.missingPaths).toEqual(
        expect.arrayContaining([sharedHomeLayout.maintainedFamiliesPath])
      );
      expect(result.adoptionHealth.status).toBe("blocked");
      expect(rendered).toContain(
        "Shared home exists: no (missing config/maintained-broker-first-families.json)"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("includes a first-class status object in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-json-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const claudeCodeInstallDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexInstallDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add repo status board");
      const repoRealPath = await realpath(repoDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory
      });

      expect(result.status.repoTarget).toBe(repoRealPath);
      expect(result.brokerFirstGate.hasStrictIssues).toBe(false);
      expect(result.brokerFirstGate.maintainedFamilies).toHaveLength(3);
      expect(result.status.items).toContainEqual(
        expect.objectContaining({
          id: "status-board-proof-rails",
          declaredStatus: "in_progress",
          evaluatedStatus: "in_progress"
        })
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.status.boardPath).toBe(join(repoRealPath, "STATUS.md"));
      expect(parsed.brokerFirstGate.maintainedFamilies).toHaveLength(3);
      expect(parsed.status.items).toHaveLength(1);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("reports capabilityGrowth acquisition memory reuse metrics in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-acq-memory-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeAcquisitionMemoryFixture(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.acquisitionMemory).toEqual({
        path: acquisitionMemoryFilePath(brokerHomeDirectory),
        exists: true,
        state: "present",
        entries: 2,
        successfulRoutes: 3,
        verificationSuccesses: 3,
        firstReuseRecorded: 1,
        repeatUsages: 1,
        crossHostReuse: 1,
        degradedAcquisitions: 0,
        failedAcquisitions: 0,
        nextAction: "prefer_verified_winner",
        qualityAssuranceSuccessfulRoutes: 1,
        qualityAssuranceFirstReuseRecorded: 0,
        qualityAssuranceCrossHostReuse: 0
      });
      expect(rendered).toContain(
        "Acquisition memory: present, entries=2, successful_routes=3, verification_successes=3, first_reuse_after_install=1, repeat_usage=1, cross_host_reuse=1, degraded=0, failed=0, next_action=prefer_verified_winner, website_qa_successful_reruns=1, website_qa_repeat_usage=0"
      );
      expect(rendered).toContain(
        "Capability growth health (last 7d): stale, opportunities=2, recent_demand=0, proven=0, speculative=0, blocked=0, stale=2, ready=0, satisfied=0, next_action=refresh_metadata"
      );
      expect(rendered).toContain(
        "Capability growth opportunity gstack.office-hours: state=stale_metadata, next_action=refresh_metadata"
      );
      expect(rendered).toContain(
        "Website QA acquisition proof: repeat_usage=0, cross_host_reuse=0"
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.acquisitionMemory).toEqual({
        path: acquisitionMemoryFilePath(brokerHomeDirectory),
        exists: true,
        state: "present",
        entries: 2,
        successfulRoutes: 3,
        verificationSuccesses: 3,
        firstReuseRecorded: 1,
        repeatUsages: 1,
        crossHostReuse: 1,
        degradedAcquisitions: 0,
        failedAcquisitions: 0,
        nextAction: "prefer_verified_winner",
        qualityAssuranceSuccessfulRoutes: 1,
        qualityAssuranceFirstReuseRecorded: 0,
        qualityAssuranceCrossHostReuse: 0
      });
      expect(parsed.capabilityGrowthHealth.totals.staleMetadata).toBe(2);
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports demand-guided capability growth health for blocked and stale opportunities", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-demand-health-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeCapabilityDemandTraceFixture(brokerHomeDirectory);

      const blockedResult = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-24T12:00:00.000Z")
      });
      const blockedRendered = formatLifecycleResult(blockedResult, "text");

      expect(blockedResult.capabilityGrowthHealth).toMatchObject({
        status: "active",
        totals: {
          opportunities: 1,
          recentDemand: 1,
          blockedAcquisition: 1
        },
        nextAction: "verify"
      });
      expect(blockedRendered).toContain(
        "Capability growth health (last 7d): active, opportunities=1, recent_demand=1, proven=0, speculative=0, blocked=1, stale=0, ready=0, satisfied=0, next_action=verify"
      );

      const staleResult = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-05-10T12:00:00.000Z")
      });

      expect(staleResult.capabilityGrowthHealth).toMatchObject({
        status: "stale",
        totals: {
          staleMetadata: 1
        },
        nextAction: "refresh_metadata"
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports verified downstream manifests in doctor output", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-downstream-manifests-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeVerifiedDownstreamManifestFixture(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.verifiedDownstreamManifests).toEqual({
        rootPath: join(brokerHomeDirectory, "downstream"),
        state: "present",
        manifests: 2,
        qualityAssuranceManifests: 1,
        hosts: [
          {
            name: "claude-code",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 0
          },
          {
            name: "codex",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 1
          },
          {
            name: "opencode",
            state: "missing",
            manifests: 0,
            qualityAssuranceManifests: 0
          }
        ]
      });
      expect(rendered).toContain(
        "Verified downstream manifests: present, total=2, website_qa=1, claude-code=1, codex=1, opencode=0"
      );

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.verifiedDownstreamManifests).toEqual({
        rootPath: join(brokerHomeDirectory, "downstream"),
        state: "present",
        manifests: 2,
        qualityAssuranceManifests: 1,
        hosts: [
          {
            name: "claude-code",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 0
          },
          {
            name: "codex",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 1
          },
          {
            name: "opencode",
            state: "missing",
            manifests: 0,
            qualityAssuranceManifests: 0
          }
        ]
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("shows OpenCode participation on the shared verified downstream surface", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-downstream-opencode-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeVerifiedDownstreamManifestFixture(brokerHomeDirectory, {
        includeOpencodeWebMarkdown: true
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.verifiedDownstreamManifests).toEqual({
        rootPath: join(brokerHomeDirectory, "downstream"),
        state: "present",
        manifests: 3,
        qualityAssuranceManifests: 1,
        hosts: [
          {
            name: "claude-code",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 0
          },
          {
            name: "codex",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 1
          },
          {
            name: "opencode",
            state: "present",
            manifests: 1,
            qualityAssuranceManifests: 0
          }
        ]
      });
      expect(rendered).toContain(
        "Verified downstream manifests: present, total=3, website_qa=1, claude-code=1, codex=1, opencode=1"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("emits reusable family proofs for website QA, web markdown, and social markdown", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-qa-loop-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeReusableFamilyProofFixtures(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });

      expect(result.familyProofs.website_qa).toEqual({
        label: "Website QA",
        installRequiredTraces: 1,
        rerunSuccessfulRoutes: 1,
        reuseRecorded: 0,
        crossHostReuseRecorded: 0,
        downstreamReplayManifests: 1,
        acquisitionMemoryState: "present",
        verifiedDownstreamState: "present",
        verdict: "in_progress",
        phase: "repeat_usage_pending",
        proofs: {
          installRequiredObserved: true,
          verifyConfirmed: true,
          repeatUsageConfirmed: false,
          crossHostReuseConfirmed: false,
          replayReady: true
        },
        verifyState: "confirmed",
        repeatUsageState: "pending",
        crossHostReuseState: "pending",
        nextAction:
          "Repeat the same website QA request once more to prove repeat usage beyond the first verified handoff."
      });
      expect(result.familyProofs.web_content_to_markdown).toEqual({
        label: "Web Markdown",
        installRequiredTraces: 1,
        rerunSuccessfulRoutes: 1,
        reuseRecorded: 1,
        crossHostReuseRecorded: 1,
        downstreamReplayManifests: 1,
        acquisitionMemoryState: "present",
        verifiedDownstreamState: "present",
        verdict: "proven",
        phase: "cross_host_reuse_confirmed",
        proofs: {
          installRequiredObserved: true,
          verifyConfirmed: true,
          repeatUsageConfirmed: true,
          crossHostReuseConfirmed: true,
          replayReady: true
        },
        verifyState: "confirmed",
        repeatUsageState: "confirmed",
        crossHostReuseState: "confirmed",
        nextAction:
          "Web Markdown loop is proven; keep this request path as the second maintained-family demo."
      });
      expect(result.familyProofs.social_post_to_markdown).toEqual({
        label: "Social Markdown",
        installRequiredTraces: 1,
        rerunSuccessfulRoutes: 2,
        reuseRecorded: 1,
        crossHostReuseRecorded: 1,
        downstreamReplayManifests: 1,
        acquisitionMemoryState: "present",
        verifiedDownstreamState: "present",
        verdict: "proven",
        phase: "cross_host_reuse_confirmed",
        proofs: {
          installRequiredObserved: true,
          verifyConfirmed: true,
          repeatUsageConfirmed: true,
          crossHostReuseConfirmed: true,
          replayReady: true
        },
        verifyState: "confirmed",
        repeatUsageState: "confirmed",
        crossHostReuseState: "confirmed",
        nextAction:
          "Social Markdown loop is proven; keep this request path as the next maintained-family demo."
      });
      expect(result.websiteQaLoop).toEqual(result.familyProofs.website_qa);
      expect(result.websiteQaRouting).toEqual({
        windowDays: 7,
        observed: 1,
        syntheticHostSkips: 0,
        hits: 0,
        misroutes: 0,
        fallbacks: 1,
        hitRate: 0,
        misrouteRate: 0,
        fallbackRate: 1,
        hosts: [
          {
            name: "codex",
            observed: 1,
            syntheticHostSkips: 0,
            hits: 0,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0,
            misrouteRate: 0,
            fallbackRate: 1
          }
        ],
        nextAction:
          "Resolve the remaining website QA fallbacks so clear requests reach a stable handoff."
      });
      expect(result.websiteQaAdoption).toEqual({
        windowDays: 7,
        status: "active",
        recent: {
          observed: 1,
          hits: 0,
          misroutes: 0,
          fallbacks: 1,
          hostSkips: 0,
          hostsCovered: 1,
          supportedHosts: 3
        },
        proofs: {
          verifyState: "confirmed",
          repeatUsageState: "pending",
          crossHostReuseState: "pending"
        },
        latest: {
          traceAt: "2026-04-16T05:00:00.000Z",
          verifiedAt: "2026-04-16T05:00:00.000Z",
          firstReuseAt: undefined,
          verifiedManifestAt: "2026-04-16T05:00:00.000Z",
          activityAt: "2026-04-16T05:00:00.000Z"
        },
        hosts: [
          {
            name: "claude-code",
            status: "missing",
            observed: 0,
            hits: 0,
            misroutes: 0,
            fallbacks: 0,
            hostSkips: 0,
            lastTraceAt: undefined,
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          },
          {
            name: "codex",
            status: "active",
            observed: 1,
            hits: 0,
            misroutes: 0,
            fallbacks: 1,
            hostSkips: 0,
            lastTraceAt: "2026-04-16T05:00:00.000Z",
            lastVerifiedManifestAt: "2026-04-16T05:00:00.000Z",
            historicalVerified: true
          },
          {
            name: "opencode",
            status: "missing",
            observed: 0,
            hits: 0,
            misroutes: 0,
            fallbacks: 0,
            hostSkips: 0,
            lastTraceAt: undefined,
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          }
        ],
        nextAction:
          "Repeat the same website QA request once more to prove repeat usage beyond the first verified handoff."
      });
      expect(result.familyLoopSignals.website_qa).toEqual({
        label: "Website QA",
        windowDays: 7,
        status: "active",
        proofs: {
          verifyState: "confirmed",
          repeatUsageState: "pending",
          crossHostReuseState: "pending"
        },
        latest: {
          verifiedAt: "2026-04-16T05:00:00.000Z",
          firstReuseAt: undefined,
          verifiedManifestAt: "2026-04-16T05:00:00.000Z",
          activityAt: "2026-04-16T05:00:00.000Z"
        },
        reuse: {
          rerunSuccessfulRoutes: 1,
          reuseRecorded: 0,
          crossHostReuseRecorded: 0,
          downstreamReplayManifests: 1,
          verifiedHosts: ["codex"],
          activeHosts: 1,
          supportedHosts: 3
        },
        hosts: [
          {
            name: "claude-code",
            status: "missing",
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          },
          {
            name: "codex",
            status: "active",
            lastVerifiedManifestAt: "2026-04-16T05:00:00.000Z",
            historicalVerified: true
          },
          {
            name: "opencode",
            status: "missing",
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          }
        ],
        nextAction:
          "Repeat the same website QA request once more to prove repeat usage beyond the first verified handoff."
      });
      expect(result.familyLoopSignals.web_content_to_markdown).toEqual({
        label: "Web Markdown",
        windowDays: 7,
        status: "active",
        proofs: {
          verifyState: "confirmed",
          repeatUsageState: "confirmed",
          crossHostReuseState: "confirmed"
        },
        latest: {
          verifiedAt: "2026-04-16T06:05:00.000Z",
          firstReuseAt: "2026-04-16T06:30:00.000Z",
          verifiedManifestAt: "2026-04-16T06:05:00.000Z",
          activityAt: "2026-04-16T06:30:00.000Z"
        },
        reuse: {
          rerunSuccessfulRoutes: 1,
          reuseRecorded: 1,
          crossHostReuseRecorded: 1,
          downstreamReplayManifests: 1,
          verifiedHosts: ["claude-code", "codex"],
          activeHosts: 1,
          supportedHosts: 3
        },
        hosts: [
          {
            name: "claude-code",
            status: "active",
            lastVerifiedManifestAt: "2026-04-16T06:05:00.000Z",
            historicalVerified: true
          },
          {
            name: "codex",
            status: "stale",
            lastVerifiedManifestAt: undefined,
            historicalVerified: true
          },
          {
            name: "opencode",
            status: "missing",
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          }
        ],
        nextAction:
          "Web Markdown signal is active; keep this second proven loop exercised after website QA."
      });
      expect(result.familyLoopSignals.social_post_to_markdown).toEqual({
        label: "Social Markdown",
        windowDays: 7,
        status: "active",
        proofs: {
          verifyState: "confirmed",
          repeatUsageState: "confirmed",
          crossHostReuseState: "confirmed"
        },
        latest: {
          verifiedAt: "2026-04-16T07:05:00.000Z",
          firstReuseAt: "2026-04-16T07:20:00.000Z",
          verifiedManifestAt: "2026-04-16T07:20:00.000Z",
          activityAt: "2026-04-16T07:20:00.000Z"
        },
        reuse: {
          rerunSuccessfulRoutes: 2,
          reuseRecorded: 1,
          crossHostReuseRecorded: 1,
          downstreamReplayManifests: 1,
          verifiedHosts: ["codex", "opencode"],
          activeHosts: 1,
          supportedHosts: 3
        },
        hosts: [
          {
            name: "claude-code",
            status: "missing",
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          },
          {
            name: "codex",
            status: "stale",
            lastVerifiedManifestAt: undefined,
            historicalVerified: true
          },
          {
            name: "opencode",
            status: "active",
            lastVerifiedManifestAt: "2026-04-16T07:20:00.000Z",
            historicalVerified: true
          }
        ],
        nextAction:
          "Social Markdown signal is active; keep this third proven loop exercised after web markdown."
      });

      const parsed = JSON.parse(formatLifecycleResult(result, "json")) as typeof result;
      expect(parsed.websiteQaLoop).toEqual(parsed.familyProofs.website_qa);
      expect(parsed.websiteQaAdoption).toEqual(result.websiteQaAdoption);
      expect(parsed.familyLoopSignals).toEqual(result.familyLoopSignals);
      expect(parsed.websiteQaRouting).toEqual(result.websiteQaRouting);
      expect(parsed.familyProofs.website_qa.phase).toBe("repeat_usage_pending");
      expect(parsed.familyProofs.web_content_to_markdown.verdict).toBe("proven");
      expect(parsed.familyProofs.web_content_to_markdown.phase).toBe(
        "cross_host_reuse_confirmed"
      );
      expect(parsed.familyProofs.social_post_to_markdown.verdict).toBe("proven");
      expect(parsed.familyProofs.social_post_to_markdown.phase).toBe(
        "cross_host_reuse_confirmed"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("renders Website QA, Web Markdown, and Social Markdown proof loops in text output", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-family-proof-text-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeReusableFamilyProofFixtures(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(rendered).toContain(
        "Website QA adoption (last 7d): active, observed=1, hit=0, misroute=0, fallback=1, host_skips=0, hosts=1/3, verify=confirmed, repeat_usage=pending, cross_host_reuse=pending"
      );
      expect(rendered).toContain(
        "Website QA adoption latest: activity=2026-04-16T05:00:00.000Z, trace=2026-04-16T05:00:00.000Z, verify=2026-04-16T05:00:00.000Z, replay=2026-04-16T05:00:00.000Z"
      );
      expect(rendered).toContain(
        "Website QA adoption host codex: active, observed=1, hit=0, misroute=0, fallback=1, host_skips=0, historical_verified=yes, last_trace=2026-04-16T05:00:00.000Z, last_replay=2026-04-16T05:00:00.000Z"
      );
      expect(rendered).toContain(
        "Website QA adoption next action: Repeat the same website QA request once more to prove repeat usage beyond the first verified handoff."
      );
      expect(rendered).toContain(
        "Website QA verdict: in_progress (phase=repeat_usage_pending)"
      );
      expect(rendered).toContain(formatQaFirstFamilyLoopLine());
      expect(rendered).toContain(formatPostQaNextLoopLine());
      expect(rendered).toContain(formatFamilyLoopProofSurfaceLine());
      expect(rendered).toContain(
        "QA-first family freshness (last 7d): website QA=active, web markdown=active, social markdown=active"
      );
      expect(rendered).toContain(
        "Web Markdown freshness (last 7d): active, verify=confirmed, repeat_usage=confirmed, cross_host_reuse=confirmed, verified_hosts=claude-code,codex, replay_hosts=1/3"
      );
      expect(rendered).toContain(
        "Web Markdown freshness latest: activity=2026-04-16T06:30:00.000Z, verify=2026-04-16T06:05:00.000Z, first_reuse=2026-04-16T06:30:00.000Z, replay=2026-04-16T06:05:00.000Z"
      );
      expect(rendered).toContain(
        "Web Markdown freshness host claude-code: active, historical_verified=yes, last_replay=2026-04-16T06:05:00.000Z"
      );
      expect(rendered).toContain(
        "Web Markdown freshness host codex: stale, historical_verified=yes"
      );
      expect(rendered).toContain(
        "Web Markdown freshness next action: Web Markdown signal is active; keep this second proven loop exercised after website QA."
      );
      expect(rendered).toContain(
        "Social Markdown freshness (last 7d): active, verify=confirmed, repeat_usage=confirmed, cross_host_reuse=confirmed, verified_hosts=codex,opencode, replay_hosts=1/3"
      );
      expect(rendered).toContain(
        "Social Markdown freshness latest: activity=2026-04-16T07:20:00.000Z, verify=2026-04-16T07:05:00.000Z, first_reuse=2026-04-16T07:20:00.000Z, replay=2026-04-16T07:20:00.000Z"
      );
      expect(rendered).toContain(
        "Social Markdown freshness host opencode: active, historical_verified=yes, last_replay=2026-04-16T07:20:00.000Z"
      );
      expect(rendered).toContain(
        "Social Markdown freshness next action: Social Markdown signal is active; keep this third proven loop exercised after web markdown."
      );
      expect(rendered.indexOf("Website QA adoption (last 7d): active")).toBeLessThan(
        rendered.indexOf("Website QA verdict: in_progress")
      );
      expect(rendered.indexOf("Website QA verdict: in_progress")).toBeLessThan(
        rendered.indexOf("QA-first family freshness")
      );
      expect(rendered.indexOf("QA-first family freshness")).toBeLessThan(
        rendered.indexOf("Routing metrics")
      );
      expect(rendered).toContain(
        "Website QA loop: install_required=observed (1 install_required trace); rerun=confirmed (1 successful rerun); reuse=pending (no website QA reuse recorded yet); replay=ready (1 verified downstream manifest)"
      );
      expect(rendered).toContain(
        "Website QA repeat-usage proof: pending (no repeated successful route recorded yet)"
      );
      expect(rendered).toContain(
        "Website QA next action: Repeat the same website QA request once more to prove repeat usage beyond the first verified handoff."
      );
      expect(rendered).toContain(
        "Website QA routing (last 7d): observed=1, host_skips=0, hit=0.00, misroute=0.00, fallback=1.00"
      );
      expect(rendered).toContain(
        "Website QA routing host codex: observed=1, host_skips=0, hit=0.00, misroute=0.00, fallback=1.00"
      );
      expect(rendered).toContain(
        "Website QA routing next action: Resolve the remaining website QA fallbacks so clear requests reach a stable handoff."
      );
      expect(rendered).toContain(
        "Web Markdown loop: install_required=observed (1 install_required trace); verify=confirmed (1 successful route); reuse=confirmed (1 first reuse event); replay=ready (1 verified downstream manifest)"
      );
      expect(rendered).toContain(
        "Web Markdown verify proof: confirmed (successful verification evidence recorded)"
      );
      expect(rendered).toContain(
        "Web Markdown repeat-usage proof: confirmed (at least one repeated successful route recorded)"
      );
      expect(rendered).toContain(
        "Web Markdown cross-host reuse proof: confirmed (first reuse across hosts recorded)"
      );
      expect(rendered).toContain(
        "Web Markdown next action: Web Markdown loop is proven; keep this request path as the second maintained-family demo."
      );
      expect(rendered).toContain(
        "Social Markdown loop: install_required=observed (1 install_required trace); verify=confirmed (2 successful routes); reuse=confirmed (1 first reuse event); replay=ready (1 verified downstream manifest)"
      );
      expect(rendered).toContain(
        "Social Markdown verify proof: confirmed (successful verification evidence recorded)"
      );
      expect(rendered).toContain(
        "Social Markdown repeat-usage proof: confirmed (at least one repeated successful route recorded)"
      );
      expect(rendered).toContain(
        "Social Markdown cross-host reuse proof: confirmed (first reuse across hosts recorded)"
      );
      expect(rendered).toContain(
        "Social Markdown next action: Social Markdown loop is proven; keep this request path as the next maintained-family demo."
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes stale website QA adoption from currently active signal", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-qa-adoption-stale-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeReusableFamilyProofFixtures(brokerHomeDirectory, {
        includeSocialMarkdown: false,
        includeWebsiteQaRepeatUsageWithoutCrossHost: true
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-25T08:00:00.000Z")
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.websiteQaAdoption).toEqual({
        windowDays: 7,
        status: "stale",
        recent: {
          observed: 0,
          hits: 0,
          misroutes: 0,
          fallbacks: 0,
          hostSkips: 0,
          hostsCovered: 0,
          supportedHosts: 3
        },
        proofs: {
          verifyState: "confirmed",
          repeatUsageState: "confirmed",
          crossHostReuseState: "pending"
        },
        latest: {
          traceAt: "2026-04-16T05:00:00.000Z",
          verifiedAt: "2026-04-16T05:10:00.000Z",
          firstReuseAt: "2026-04-16T05:10:00.000Z",
          verifiedManifestAt: "2026-04-16T05:00:00.000Z",
          activityAt: "2026-04-16T05:10:00.000Z"
        },
        hosts: [
          {
            name: "claude-code",
            status: "missing",
            observed: 0,
            hits: 0,
            misroutes: 0,
            fallbacks: 0,
            hostSkips: 0,
            lastTraceAt: undefined,
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          },
          {
            name: "codex",
            status: "stale",
            observed: 0,
            hits: 0,
            misroutes: 0,
            fallbacks: 0,
            hostSkips: 0,
            lastTraceAt: "2026-04-16T05:00:00.000Z",
            lastVerifiedManifestAt: "2026-04-16T05:00:00.000Z",
            historicalVerified: true
          },
          {
            name: "opencode",
            status: "missing",
            observed: 0,
            hits: 0,
            misroutes: 0,
            fallbacks: 0,
            hostSkips: 0,
            lastTraceAt: undefined,
            lastVerifiedManifestAt: undefined,
            historicalVerified: false
          }
        ],
        nextAction:
          "Refresh the website QA signal from another supported host so the shared-home surface records fresh cross-host reuse."
      });
      expect(result.familyLoopSignals.website_qa).toEqual(
        expect.objectContaining({
          status: "stale",
          nextAction:
            "Refresh the website QA signal from another supported host so the shared-home surface records fresh cross-host reuse."
        })
      );
      expect(result.familyLoopSignals.web_content_to_markdown).toEqual(
        expect.objectContaining({
          status: "stale",
          nextAction:
            "Refresh the website QA hero lane first, then rerun the same web markdown request so doctor records a fresh second proven loop signal."
        })
      );
      expect(result.familyLoopSignals.social_post_to_markdown).toEqual(
        expect.objectContaining({
          status: "missing",
          nextAction:
            "Refresh the website QA hero lane first, then rerun the same social markdown request so doctor records a fresh third proven loop signal."
        })
      );
      expect(rendered).toContain(
        "Website QA adoption (last 7d): stale, observed=0, hit=0, misroute=0, fallback=0, host_skips=0, hosts=0/3, verify=confirmed, repeat_usage=confirmed, cross_host_reuse=pending"
      );
      expect(rendered).toContain(
        "QA-first family freshness (last 7d): website QA=stale, web markdown=stale, social markdown=missing"
      );
      expect(rendered).toContain(
        "Web Markdown freshness next action: Refresh the website QA hero lane first, then rerun the same web markdown request so doctor records a fresh second proven loop signal."
      );
      expect(rendered).toContain(
        "Social Markdown freshness next action: Refresh the website QA hero lane first, then rerun the same social markdown request so doctor records a fresh third proven loop signal."
      );
      expect(rendered).toContain(
        "Website QA adoption host codex: stale, observed=0, hit=0, misroute=0, fallback=0, host_skips=0, historical_verified=yes, last_trace=2026-04-16T05:00:00.000Z, last_replay=2026-04-16T05:00:00.000Z"
      );
      expect(rendered).toContain(
        "Website QA adoption next action: Refresh the website QA signal from another supported host so the shared-home surface records fresh cross-host reuse."
      );
      expect(rendered).toContain(
        "Routing metrics (last 7d): no traces recorded yet"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("proves stale-to-fresh website QA adoption health transitions on the three-host surface", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-qa-refresh-transition-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const claudeCodeInstallDirectory = join(
      runtimeDirectory,
      ".claude",
      "skills",
      "skills-broker"
    );
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const opencodeInstallDirectory = join(
      runtimeDirectory,
      ".config",
      "opencode",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(
        brokerHomeDirectory,
        "2026-04-25T07:59:00.000Z"
      );
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add clean status board");
      await mkdir(claudeCodeInstallDirectory, { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await mkdir(opencodeInstallDirectory, { recursive: true });
      await writeManagedShellManifest(claudeCodeInstallDirectory, {
        managedBy: "skills-broker",
        host: "claude-code",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await writeManagedShellManifest(opencodeInstallDirectory, {
        managedBy: "skills-broker",
        host: "opencode",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      await writeFreshWebsiteQaAdoptionFixtures(brokerHomeDirectory, {
        installRequiredAt: "2026-04-01T04:55:00.000Z",
        codexHitAt: "2026-04-01T05:00:00.000Z",
        claudeHitAt: "2026-04-01T05:05:00.000Z",
        opencodeHitAt: "2026-04-01T05:10:00.000Z"
      });

      const staleResult = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory,
        opencodeInstallDirectory,
        now: new Date("2026-04-25T08:00:00.000Z")
      });

      expect(staleResult.websiteQaAdoption.status).toBe("stale");
      expect(staleResult.adoptionHealth).toMatchObject({
        status: "blocked",
        managedHosts: ["claude-code", "codex", "opencode"],
        nextAction: expect.stringContaining("current QA-first signal")
      });
      expect(staleResult.adoptionHealth.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "WEBSITE_QA_SIGNAL_STALE"
          })
        ])
      );

      await writeFreshWebsiteQaAdoptionFixtures(brokerHomeDirectory, {
        installRequiredAt: "2026-04-25T04:55:00.000Z",
        codexHitAt: "2026-04-25T05:00:00.000Z",
        claudeHitAt: "2026-04-25T05:05:00.000Z",
        opencodeHitAt: "2026-04-25T05:10:00.000Z"
      });

      const freshResult = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory,
        opencodeInstallDirectory,
        now: new Date("2026-04-25T08:00:00.000Z")
      });

      expect(freshResult.websiteQaAdoption.status).toBe("active");
      expect(freshResult.websiteQaAdoption.recent.hostsCovered).toBe(3);
      expect(freshResult.websiteQaAdoption.hosts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "claude-code",
            status: "active"
          }),
          expect.objectContaining({
            name: "codex",
            status: "active"
          }),
          expect.objectContaining({
            name: "opencode",
            status: "active"
          })
        ])
      );
      expect(freshResult.adoptionHealth).toEqual({
        status: "green",
        managedHosts: ["claude-code", "codex", "opencode"],
        reasons: []
      });
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("shows OpenCode-backed web markdown reuse on the shared doctor surface", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-opencode-proof-reuse-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeReusableFamilyProofFixtures(brokerHomeDirectory, {
        includeOpencodeWebMarkdown: true,
        includeSocialMarkdown: false
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.acquisitionMemory).toEqual(
        expect.objectContaining({
          state: "present",
          successfulRoutes: 3,
          firstReuseRecorded: 1,
          crossHostReuse: 1
        })
      );
      expect(result.verifiedDownstreamManifests.hosts).toContainEqual({
        name: "opencode",
        state: "present",
        manifests: 1,
        qualityAssuranceManifests: 0
      });
      expect(result.familyProofs.web_content_to_markdown).toEqual(
        expect.objectContaining({
          rerunSuccessfulRoutes: 2,
          reuseRecorded: 1,
          crossHostReuseRecorded: 1,
          downstreamReplayManifests: 2,
          verifyState: "confirmed",
          repeatUsageState: "confirmed",
          crossHostReuseState: "confirmed",
          verdict: "proven",
          phase: "cross_host_reuse_confirmed"
        })
      );
      expect(result.familyLoopSignals.web_content_to_markdown).toEqual(
        expect.objectContaining({
          status: "active",
          reuse: {
            rerunSuccessfulRoutes: 2,
            reuseRecorded: 1,
            crossHostReuseRecorded: 1,
            downstreamReplayManifests: 2,
            verifiedHosts: ["claude-code", "opencode"],
            activeHosts: 2,
            supportedHosts: 3
          },
          nextAction:
            "Web Markdown signal is active; keep this second proven loop exercised after website QA."
        })
      );
      expect(rendered).toContain(
        "Verified downstream manifests: present, total=3, website_qa=1, claude-code=1, codex=1, opencode=1"
      );
      expect(rendered).toContain(
        "Web Markdown freshness (last 7d): active, verify=confirmed, repeat_usage=confirmed, cross_host_reuse=confirmed, verified_hosts=claude-code,opencode, replay_hosts=2/3"
      );
      expect(rendered).toContain(
        "Web Markdown freshness host opencode: active, historical_verified=yes, last_replay=2026-04-16T06:30:00.000Z"
      );
      expect(rendered).toContain(
        "Web Markdown loop: install_required=observed (1 install_required trace); verify=confirmed (2 successful routes); reuse=confirmed (1 first reuse event); replay=ready (2 verified downstream manifests)"
      );
      expect(rendered).toContain(
        "Web Markdown repeat-usage proof: confirmed (at least one repeated successful route recorded)"
      );
      expect(rendered).toContain(
        "Web Markdown cross-host reuse proof: confirmed (first reuse across hosts recorded)"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("distinguishes website QA repeat usage from cross-host reuse on the doctor surface", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-qa-repeat-vs-cross-host-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeReusableFamilyProofFixtures(brokerHomeDirectory, {
        includeSocialMarkdown: false,
        includeWebsiteQaRepeatUsageWithoutCrossHost: true
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.familyProofs.website_qa).toEqual(
        expect.objectContaining({
          rerunSuccessfulRoutes: 2,
          reuseRecorded: 1,
          crossHostReuseRecorded: 0,
          verifyState: "confirmed",
          repeatUsageState: "confirmed",
          crossHostReuseState: "pending",
          phase: "cross_host_reuse_pending",
          nextAction:
            "Repeat the same website QA request from another host to record the first proven cross-host reuse."
        })
      );
      expect(result.familyProofs.website_qa.proofs).toEqual({
        installRequiredObserved: true,
        verifyConfirmed: true,
        repeatUsageConfirmed: true,
        crossHostReuseConfirmed: false,
        replayReady: true
      });
      expect(rendered).toContain(
        "Website QA repeat-usage proof: confirmed (at least one repeated successful route recorded)"
      );
      expect(rendered).toContain(
        "Website QA cross-host reuse proof: pending (first reuse across hosts not recorded yet)"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("reports green adoption health when a managed host and repo truth are both clean", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-adoption-green-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add clean status board");
      await writeFreshWebsiteQaAdoptionFixtures(brokerHomeDirectory);
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        codexInstallDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });

      expect(result.adoptionHealth).toEqual({
        status: "green",
        managedHosts: ["codex"],
        reasons: []
      });
      expect(formatLifecycleResult(result, "text")).toContain("Adoption health: green");
      expect(result.websiteQaAdoption.status).toBe("active");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("keeps adoption health green for a managed OpenCode shell when repo truth is clean", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-opencode-adoption-green-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const opencodeInstallDirectory = join(
      runtimeDirectory,
      ".config",
      "opencode",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add clean status board");
      await writeFreshWebsiteQaAdoptionFixtures(brokerHomeDirectory);
      await mkdir(opencodeInstallDirectory, { recursive: true });
      await writeManagedShellManifest(opencodeInstallDirectory, {
        managedBy: "skills-broker",
        host: "opencode",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        now: new Date("2026-04-16T08:00:00.000Z")
      });

      expect(result.hosts).toContainEqual({
        name: "opencode",
        status: "detected",
        reason: "managed by skills-broker"
      });
      expect(result.adoptionHealth).toEqual({
        status: "green",
        managedHosts: ["opencode"],
        reasons: []
      });
      expect(result.websiteQaAdoption.status).toBe("active");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("blocks adoption health when website QA proof rails are unreadable", async () => {
    const runtimeDirectory = await mkdtemp(
      join(tmpdir(), "skills-broker-doctor-proof-rails-unreadable-")
    );
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );
    const acquisitionMemoryPath = acquisitionMemoryFilePath(brokerHomeDirectory);
    const downstreamRoot = join(brokerHomeDirectory, "downstream");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);
      await writeAcquisitionMemoryFixture(brokerHomeDirectory);
      await writeVerifiedDownstreamManifestFixture(brokerHomeDirectory);
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("in_progress"), "utf8");
      await commitAll(repoDirectory, "add clean status board");
      await mkdir(codexInstallDirectory, { recursive: true });
      await writeManagedShellManifest(codexInstallDirectory, {
        managedBy: "skills-broker",
        host: "codex",
        version: "test-version",
        brokerHome: brokerHomeDirectory
      });
      await chmod(acquisitionMemoryPath, 0o000);
      await chmod(downstreamRoot, 0o000);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        codexInstallDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.familyProofs.website_qa.verdict).toBe("blocked");
      expect(result.familyProofs.website_qa.phase).toBe("proof_unreadable");
      expect(result.familyProofs.website_qa.proofs).toEqual({
        installRequiredObserved: false,
        verifyConfirmed: false,
        repeatUsageConfirmed: false,
        crossHostReuseConfirmed: false,
        replayReady: false
      });
      expect(result.familyProofs.web_content_to_markdown.verdict).toBe("blocked");
      expect(result.familyProofs.web_content_to_markdown.phase).toBe(
        "proof_unreadable"
      );
      expect(result.familyProofs.social_post_to_markdown.verdict).toBe("blocked");
      expect(result.familyProofs.social_post_to_markdown.phase).toBe(
        "proof_unreadable"
      );
      expect(result.adoptionHealth.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "ACQUISITION_MEMORY_UNREADABLE",
            message: expect.stringContaining(
              "website QA verify proof is unreadable"
            )
          }),
          expect.objectContaining({
            code: "VERIFIED_DOWNSTREAM_MANIFESTS_UNREADABLE",
            message: expect.stringContaining(
              "website QA replay/reuse proof is unreadable"
            )
          })
        ])
      );
      expect(rendered).toContain(
        "Website QA verdict: blocked (phase=proof_unreadable)"
      );
      expect(rendered).toContain(
        "Website QA loop: install_required=pending (no website QA install_required trace recorded yet); rerun=unknown (acquisition memory unreadable); reuse=unknown (acquisition memory unreadable); replay=unknown (verified downstream manifests unreadable)"
      );
      expect(rendered).toContain(
        "Website QA verify proof: unknown (acquisition memory unreadable)"
      );
      expect(rendered).toContain(
        "Website QA repeat-usage proof: unknown (acquisition memory unreadable)"
      );
      expect(rendered).toContain(
        "Website QA cross-host reuse proof: unknown (acquisition memory unreadable)"
      );
      expect(rendered).toContain(
        "Website QA next action: Trigger one website QA request until the broker returns INSTALL_REQUIRED."
      );
    } finally {
      await chmod(acquisitionMemoryPath, 0o644).catch(() => undefined);
      await chmod(downstreamRoot, 0o755).catch(() => undefined);
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("renders all maintained broker-first proofs in doctor text output", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-gate-proofs-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await writeFreshGateArtifact(brokerHomeDirectory);

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(rendered).toContain(
        "proofs=phase2Boundary:pass, phase3Eval:pass, peerConflict:pass"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("renders broker-first gate issues in doctor text output without duplicating them into warnings", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-gate-text-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.warnings).not.toContain(
        expect.stringContaining("BROKER_FIRST_GATE_MISSING")
      );
      expect(rendered).toContain("Broker-first gate:");
      expect(rendered).toContain(
        "Broker-first gate issue BROKER_FIRST_GATE_MISSING"
      );
      expect(rendered).not.toContain("Warning: BROKER_FIRST_GATE_MISSING");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("skips repo-scoped status checks when doctor runs outside a git repo", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-skip-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");

    try {
      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.status.skipped).toBe(true);
      expect(result.status.issues).toEqual([]);
      expect(rendered).toContain("Status board: skipped");
      expect(rendered).toContain("Status issues: none");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });

  it("renders status issues in doctor text output without duplicating them into warnings", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-status-text-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const repoDirectory = join(runtimeDirectory, "repo");
    const claudeCodeInstallDirectory = join(runtimeDirectory, ".claude", "skills", "skills-broker");
    const codexInstallDirectory = join(runtimeDirectory, ".agents", "skills", "skills-broker");

    try {
      await initGitRepo(repoDirectory);
      await writeFile(join(repoDirectory, "README.md"), "# repo\n", "utf8");
      await writeFile(join(repoDirectory, "STATUS.md"), renderStatusBoard("shipped_remote"), "utf8");
      await commitAll(repoDirectory, "add mismatched status board");

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        repoRootOverride: repoDirectory,
        claudeCodeInstallDirectory,
        codexInstallDirectory
      });
      const rendered = formatLifecycleResult(result, "text");

      expect(result.warnings).not.toContain(
        expect.stringContaining("STATUS_SHIP_REF_UNRESOLVED")
      );
      expect(rendered).toContain("Status board:");
      expect(rendered).toContain("Status status-board-proof-rails: declared=shipped_remote, evaluated=shipped_remote");
      expect(rendered).toContain("Status issue STATUS_SHIP_REF_UNRESOLVED");
      expect(rendered).not.toContain("Warning: STATUS_SHIP_REF_UNRESOLVED");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("includes structured remediation when competing peer skills are detected", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-remediation-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const codexInstallDirectory = join(
      runtimeDirectory,
      ".agents",
      "skills",
      "skills-broker"
    );

    try {
      await installSharedBrokerHome({
        brokerHomeDirectory,
        projectRoot: process.cwd()
      });
      await mkdir(join(runtimeDirectory, ".codex"), { recursive: true });
      await mkdir(codexInstallDirectory, { recursive: true });
      await mkdir(
        join(runtimeDirectory, ".agents", "skills", "baoyu-danger-x-to-markdown"),
        { recursive: true }
      );
      await writeFile(
        join(codexInstallDirectory, ".skills-broker.json"),
        JSON.stringify({
          managedBy: "skills-broker",
          host: "codex",
          version: "test-version",
          brokerHome: brokerHomeDirectory
        }),
        "utf8"
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        cwd: runtimeDirectory
      });

      expect(result.adoptionHealth.status).toBe("blocked");
      expect(result.hosts).toContainEqual({
        name: "codex",
        status: "detected",
        reason: "managed by skills-broker",
        competingPeerSkills: ["baoyu-danger-x-to-markdown"],
        remediation: {
          action: "hide_competing_peer_skills",
          targetDirectory: join(
            brokerHomeDirectory,
            "downstream",
            "codex",
            "skills"
          ),
          peerSkills: ["baoyu-danger-x-to-markdown"],
          message: expect.stringContaining("Hide competing peer skills behind skills-broker")
        }
      });
      expect(formatLifecycleResult(result, "text")).toContain("HOST_COMPETING_PEERS");
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  it("summarizes recent routing hit, misroute, and fallback rates from persisted traces", async () => {
    const runtimeDirectory = await mkdtemp(join(tmpdir(), "skills-broker-doctor-traces-"));
    const brokerHomeDirectory = join(runtimeDirectory, ".skills-broker");
    const traceFilePath = join(brokerHomeDirectory, "state", "routing-traces.jsonl");

    try {
      await mkdir(join(brokerHomeDirectory, "state"), { recursive: true });
      await writeFile(
        traceFilePath,
        [
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "structured hit",
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
            winnerId: "requirements-analysis",
            winnerPackageId: "gstack",
            selectedCapabilityId: "gstack.office-hours",
            selectedLeafCapabilityId: "office-hours",
            selectedImplementationId: "gstack.office_hours",
            selectedPackageInstallState: "installed",
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:00:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "qa near miss",
            host: "codex",
            hostDecision: "broker_first",
            resultCode: "UNSUPPORTED_REQUEST",
            routingOutcome: "misroute",
            missLayer: "broker_normalization",
            normalizedBy: "raw_request_fallback",
            requestSurface: "raw_envelope",
            requestContract: "raw_envelope_fallback",
            selectionMode: null,
            hostAction: "continue_normally",
            candidateCount: 0,
            winnerId: null,
            winnerPackageId: null,
            selectedCapabilityId: null,
            selectedLeafCapabilityId: null,
            selectedImplementationId: null,
            selectedPackageInstallState: null,
            requestedProofFamily: "website_qa",
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:05:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "legacy fallback",
            host: "claude-code",
            hostDecision: "broker_first",
            resultCode: "NO_CANDIDATE",
            routingOutcome: "fallback",
            missLayer: "retrieval",
            normalizedBy: "legacy_intent",
            requestSurface: "legacy_task",
            requestContract: "query_native_via_legacy_compat",
            selectionMode: null,
            hostAction: "offer_capability_discovery",
            candidateCount: 0,
            winnerId: null,
            winnerPackageId: null,
            selectedCapabilityId: null,
            selectedLeafCapabilityId: null,
            selectedImplementationId: null,
            selectedPackageInstallState: null,
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:10:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "install required",
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
            candidateCount: 2,
            winnerId: "website-qa",
            winnerPackageId: "io.example/website-qa",
            selectedCapabilityId: "io.example/website-qa",
            selectedLeafCapabilityId: "website-qa",
            selectedImplementationId: "io.example/website-qa",
            selectedPackageInstallState: "available",
            requestedProofFamily: "website_qa",
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: "package_not_installed",
            timestamp: "2026-03-31T11:15:00.000Z"
          }),
          JSON.stringify({
            traceVersion: "2026-03-31",
            requestText: "QA this website https://example.com",
            host: "opencode",
            hostDecision: "handle_normally",
            resultCode: "HOST_SKIPPED_BROKER",
            routingOutcome: "host_skipped",
            missLayer: "host_selection",
            normalizedBy: null,
            requestSurface: null,
            requestContract: null,
            selectionMode: null,
            hostAction: "continue_normally",
            candidateCount: null,
            winnerId: null,
            winnerPackageId: null,
            selectedCapabilityId: null,
            selectedLeafCapabilityId: null,
            selectedImplementationId: null,
            selectedPackageInstallState: null,
            requestedProofFamily: "website_qa",
            workflowId: null,
            runId: null,
            stageId: null,
            reasonCode: null,
            timestamp: "2026-03-31T11:20:00.000Z"
          })
        ].join("\n"),
        "utf8"
      );

      const result = await doctorSharedBrokerHome({
        brokerHomeDirectory,
        homeDirectory: runtimeDirectory,
        now: new Date("2026-04-01T12:00:00.000Z"),
        cwd: runtimeDirectory
      });

      expect(result.routingMetrics).toEqual({
        windowDays: 7,
        observed: 5,
        syntheticHostSkips: 1,
        acquisition: {
          trueNoCandidate: 1,
          installRequired: 1
        },
        contracts: [
          {
            requestContract: "query_native",
            observed: 2,
            hits: 1,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0.5,
            misrouteRate: 0,
            fallbackRate: 0.5
          },
          {
            requestContract: "query_native_via_legacy_compat",
            observed: 1,
            hits: 0,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0,
            misrouteRate: 0,
            fallbackRate: 1
          },
          {
            requestContract: "raw_envelope_fallback",
            observed: 1,
            hits: 0,
            misroutes: 1,
            fallbacks: 0,
            hitRate: 0,
            misrouteRate: 1,
            fallbackRate: 0
          }
        ],
        surfaces: [
          {
            requestSurface: "structured_query",
            normalizedBy: "structured_query",
            observed: 2,
            hits: 1,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0.5,
            misrouteRate: 0,
            fallbackRate: 0.5
          },
          {
            requestSurface: "raw_envelope",
            normalizedBy: "raw_request_fallback",
            observed: 1,
            hits: 0,
            misroutes: 1,
            fallbacks: 0,
            hitRate: 0,
            misrouteRate: 1,
            fallbackRate: 0
          },
          {
            requestSurface: "legacy_task",
            normalizedBy: "legacy_intent",
            observed: 1,
            hits: 0,
            misroutes: 0,
            fallbacks: 1,
            hitRate: 0,
            misrouteRate: 0,
            fallbackRate: 1
          }
        ]
      });
      expect(result.websiteQaRouting).toEqual({
        windowDays: 7,
        observed: 2,
        syntheticHostSkips: 1,
        hits: 0,
        misroutes: 1,
        fallbacks: 1,
        hitRate: 0,
        misrouteRate: 0.5,
        fallbackRate: 0.5,
        hosts: [
          {
            name: "codex",
            observed: 2,
            syntheticHostSkips: 0,
            hits: 0,
            misroutes: 1,
            fallbacks: 1,
            hitRate: 0,
            misrouteRate: 0.5,
            fallbackRate: 0.5
          },
          {
            name: "opencode",
            observed: 0,
            syntheticHostSkips: 1,
            hits: 0,
            misroutes: 0,
            fallbacks: 0,
            hitRate: 0,
            misrouteRate: 0,
            fallbackRate: 0
          }
        ],
        nextAction:
          "Review host-side coarse boundary prompts so clear website QA asks cross into broker_first instead of staying in the host."
      });

      expect(formatLifecycleResult(result, "text")).toContain(
        "Routing contract query_native: observed=2, hit=0.50, misroute=0.00, fallback=0.50"
      );
      expect(formatLifecycleResult(result, "text")).toContain(
        "Routing structured_query: observed=2, hit=0.50, misroute=0.00, fallback=0.50"
      );
      expect(formatLifecycleResult(result, "text")).toContain(
        "Acquisition routing: true_no_candidate=1, install_required=1"
      );
      expect(formatLifecycleResult(result, "text")).toContain(
        "Website QA routing (last 7d): observed=2, host_skips=1, hit=0.00, misroute=0.50, fallback=0.50"
      );
      expect(formatLifecycleResult(result, "text")).toContain(
        "Website QA routing host opencode: observed=0, host_skips=1, hit=0.00, misroute=0.00, fallback=0.00"
      );
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  }, 30_000);
});
