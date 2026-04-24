import { access } from "node:fs/promises";
import { join } from "node:path";
import type { CapabilityCandidate } from "../core/capability-card.js";
import { toCapabilityCard } from "../core/capability-card.js";
import { BROKER_HOSTS, type BrokerHost } from "../core/types.js";
import type { WorkflowRecipe } from "../core/workflow.js";
import {
  inspectCapabilityTrustSurface,
  type CapabilityTrustSurfaceReport
} from "../broker/capability-trust.js";
import { loadVerifiedDownstreamCandidates } from "../broker/downstream-manifest-source.js";
import type { DiscoverySourceBatch } from "../broker/discover.js";
import { searchMcpRegistry } from "../sources/mcp-registry.js";
import {
  loadHostSkillCandidates,
  loadHostWorkflowRecipes
} from "../sources/host-skill-catalog.js";

export type CapabilityTrustCheckOptions = {
  repoRoot?: string;
  brokerHomeDirectory?: string;
  hostCatalogFilePath?: string;
  mcpRegistryFilePath?: string;
  currentHost?: BrokerHost;
  now?: Date;
  maxVerifiedManifestAgeDays?: number;
};

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function workflowCandidate(recipe: WorkflowRecipe): CapabilityCandidate {
  return {
    id: recipe.id,
    kind: "skill",
    label: recipe.label,
    intent: recipe.compatibilityIntent,
    package: recipe.package,
    leaf: recipe.leaf,
    query: recipe.query,
    implementation: recipe.implementation,
    sourceMetadata: {
      ...(recipe.sourceMetadata ?? {}),
      discoverySource: "workflow_catalog"
    }
  };
}

export async function inspectRepoCapabilityTrust(
  options: CapabilityTrustCheckOptions = {}
): Promise<CapabilityTrustSurfaceReport> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const hostCatalogFilePath =
    options.hostCatalogFilePath ?? join(repoRoot, "config", "host-skills.seed.json");
  const mcpRegistryFilePath =
    options.mcpRegistryFilePath ?? join(repoRoot, "config", "mcp-registry.seed.json");
  const currentHost = options.currentHost ?? "claude-code";

  const hostCandidates = (await loadHostSkillCandidates(undefined, hostCatalogFilePath)).map(
    toCapabilityCard
  );
  const workflowCandidates = (await loadHostWorkflowRecipes(undefined, hostCatalogFilePath))
    .map(workflowCandidate)
    .map(toCapabilityCard);
  const downstreamCandidates = await loadVerifiedDownstreamCandidates({
    brokerHomeDirectory: options.brokerHomeDirectory,
    currentHost,
    visibleHosts: [...BROKER_HOSTS]
  });
  const mcpCandidates = (await pathExists(mcpRegistryFilePath))
    ? (await searchMcpRegistry(
        {
          intent: "capability_discovery_or_install",
          capabilityQuery: {
            kind: "capability_request",
            goal: "discover or install capabilities",
            host: currentHost,
            requestText: "discover or install capabilities",
            jobFamilies: ["capability_acquisition"],
            targets: [
              {
                type: "problem_statement",
                value: "discover or install capabilities"
              }
            ],
            artifacts: ["recommendation", "installation_plan"]
          }
        },
        mcpRegistryFilePath
      )).map(toCapabilityCard)
    : [];

  const sources: DiscoverySourceBatch[] = [
    {
      source: "downstream_manifest",
      candidates: downstreamCandidates
    },
    {
      source: "host_catalog",
      candidates: hostCandidates
    },
    {
      source: "workflow_catalog",
      candidates: workflowCandidates
    },
    {
      source: "mcp_registry",
      candidates: mcpCandidates
    }
  ];

  return inspectCapabilityTrustSurface({
    sources,
    now: options.now,
    maxVerifiedManifestAgeDays: options.maxVerifiedManifestAgeDays
  });
}

export async function runCapabilityTrustCheckCli(
  options: CapabilityTrustCheckOptions & {
    stdout?: Pick<NodeJS.WriteStream, "write">;
    stderr?: Pick<NodeJS.WriteStream, "write">;
  } = {}
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const report = await inspectRepoCapabilityTrust(options);

  if (!report.hasIssues) {
    stdout.write("Capability trust check passed.\n");
    return 0;
  }

  stderr.write("Capability trust check failed:\n");
  for (const issue of report.issues) {
    stderr.write(
      `- ${issue.code} ${issue.capabilityId} (${issue.candidateId}): ${issue.message}\n`
    );
  }

  return 1;
}
