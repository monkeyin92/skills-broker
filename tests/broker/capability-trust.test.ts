import { describe, expect, it } from "vitest";
import {
  describeCapabilityTrust,
  inspectCapabilityTrustSurface
} from "../../src/broker/capability-trust";
import type { DiscoverySourceBatch } from "../../src/broker/discover";
import type { CapabilityCard } from "../../src/core/capability-card";

function makeCapabilityCard(
  overrides: Partial<CapabilityCard> & {
    id: string;
    leaf?: Partial<CapabilityCard["leaf"]>;
  }
): CapabilityCard {
  const capabilityId = overrides.leaf?.capabilityId ?? `pkg.${overrides.id}`;
  const packageId = overrides.leaf?.packageId ?? "pkg";
  const subskillId = overrides.leaf?.subskillId ?? overrides.id;

  return {
    id: overrides.id,
    kind: overrides.kind ?? "skill",
    label: overrides.label ?? overrides.id,
    compatibilityIntent:
      overrides.compatibilityIntent ?? "capability_discovery_or_install",
    package: overrides.package ?? {
      packageId,
      label: packageId,
      installState: "installed",
      acquisition: "local_skill_bundle"
    },
    leaf: {
      capabilityId,
      packageId,
      subskillId,
      ...overrides.leaf
    },
    query: overrides.query ?? {
      summary: "Capability",
      keywords: [],
      antiKeywords: [],
      confidenceHints: [],
      proofFamily: "capability_discovery_or_install",
      jobFamilies: ["capability_acquisition"],
      targetTypes: ["problem_statement"],
      artifacts: ["recommendation"],
      examples: []
    },
    implementation: overrides.implementation ?? {
      id: `${packageId}.${subskillId}`,
      type: overrides.kind === "mcp" ? "mcp_server" : "local_skill",
      ownerSurface: "broker_owned_downstream"
    },
    hosts: overrides.hosts ?? {
      currentHostSupported: true,
      portabilityScore: 1
    },
    prepare: overrides.prepare ?? {
      authRequired: false,
      installRequired: overrides.package?.installState === "available"
    },
    ranking: overrides.ranking ?? {
      contextCost: 0,
      confidence: 1
    },
    sourceMetadata: overrides.sourceMetadata ?? {}
  };
}

function mcpCard(overrides: Partial<CapabilityCard> = {}): CapabilityCard {
  return makeCapabilityCard({
    id: "registry-qa",
    kind: "mcp",
    package: {
      packageId: "io.example/registry-qa",
      label: "Registry QA",
      installState: "available",
      acquisition: "mcp_bundle"
    },
    prepare: {
      authRequired: false,
      installRequired: true
    },
    sourceMetadata: {
      discoverySource: "mcp_registry",
      registryName: "io.example/registry-qa",
      registryVersion: "1.0.0",
      registryTransport: "streamable-http",
      registryEndpointCount: 1,
      registryValidation: {
        status: "validated",
        usableRemoteCount: 1
      },
      registryQueryCoverage: {
        matchedBy: "structured_query",
        jobFamilies: ["capability_acquisition"],
        targetTypes: ["problem_statement"],
        artifacts: ["recommendation"]
      }
    },
    ...overrides
  });
}

describe("capability trust surface", () => {
  it("labels normalized provenance for installed, downstream, registry, and workflow candidates", () => {
    const installed = makeCapabilityCard({ id: "installed" });
    const downstream = makeCapabilityCard({
      id: "downstream",
      package: {
        packageId: "pkg",
        label: "pkg",
        installState: "available",
        acquisition: "published_package"
      },
      prepare: {
        authRequired: false,
        installRequired: true
      },
      sourceMetadata: {
        discoverySource: "downstream_manifest",
        verifiedDownstreamHost: "codex",
        verifiedDownstreamManifestAt: "2026-04-24T00:00:00.000Z"
      }
    });
    const registry = mcpCard();
    const workflow = makeCapabilityCard({
      id: "workflow",
      implementation: {
        id: "skills_broker.idea_to_ship",
        type: "broker_workflow",
        ownerSurface: "broker_owned_downstream"
      }
    });

    expect(describeCapabilityTrust(installed, "host_catalog").provenance).toBe(
      "installed_local_skill"
    );
    expect(describeCapabilityTrust(downstream, "downstream_manifest").provenance).toBe(
      "verified_downstream_manifest"
    );
    expect(describeCapabilityTrust(registry, "mcp_registry").provenance).toBe(
      "mcp_registry_advisory"
    );
    expect(describeCapabilityTrust(workflow, "workflow_catalog").provenance).toBe(
      "broker_owned_workflow"
    );
  });

  it("fails closed when registry metadata is missing", () => {
    const report = inspectCapabilityTrustSurface({
      sources: [
        {
          source: "mcp_registry",
          candidates: [
            mcpCard({
              sourceMetadata: {
                discoverySource: "mcp_registry",
                registryName: "io.example/registry-qa"
              }
            })
          ]
        }
      ]
    });

    expect(report.issues.map((issue) => issue.code)).toContain(
      "TRUST_METADATA_MISSING"
    );
  });

  it("fails closed when downstream manifests are stale", () => {
    const report = inspectCapabilityTrustSurface({
      now: new Date("2026-04-24T00:00:00.000Z"),
      maxVerifiedManifestAgeDays: 30,
      sources: [
        {
          source: "downstream_manifest",
          candidates: [
            makeCapabilityCard({
              id: "old-downstream",
              package: {
                packageId: "pkg",
                label: "pkg",
                installState: "available",
                acquisition: "published_package"
              },
              prepare: {
                authRequired: false,
                installRequired: true
              },
              sourceMetadata: {
                discoverySource: "downstream_manifest",
                verifiedDownstreamHost: "codex",
                verifiedDownstreamManifestAt: "2026-01-01T00:00:00.000Z"
              }
            })
          ]
        }
      ]
    });

    expect(report.issues.map((issue) => issue.code)).toContain(
      "TRUST_METADATA_STALE"
    );
  });

  it("passes when advisory registry candidates cannot outrank verified installed winners", () => {
    const installed = makeCapabilityCard({
      id: "installed-qa",
      leaf: {
        capabilityId: "pkg.qa",
        packageId: "pkg",
        subskillId: "qa"
      }
    });
    const advisory = mcpCard({
      id: "registry-qa",
      leaf: {
        capabilityId: "pkg.qa",
        packageId: "pkg",
        subskillId: "qa"
      },
      ranking: {
        contextCost: -100,
        confidence: 99
      }
    });
    const sources: DiscoverySourceBatch[] = [
      {
        source: "mcp_registry",
        candidates: [advisory]
      },
      {
        source: "host_catalog",
        candidates: [installed]
      }
    ];

    expect(inspectCapabilityTrustSurface({ sources }).issues).toEqual([]);
  });
});
