import { describe, expect, it } from "vitest";
import { discoverCandidates } from "../../src/broker/discover";
import type { CapabilityCard } from "../../src/core/capability-card";

function makeCapabilityCard(
  overrides: Partial<CapabilityCard> & {
    id: string;
    leaf: CapabilityCard["leaf"];
    implementation: CapabilityCard["implementation"];
  }
): CapabilityCard {
  return {
    id: overrides.id,
    kind: overrides.kind ?? "skill",
    label: overrides.label ?? overrides.id,
    compatibilityIntent:
      overrides.compatibilityIntent ?? "capability_discovery_or_install",
    package: overrides.package ?? {
      packageId: "gstack",
      label: "gstack",
      installState: "installed",
      acquisition: "local_skill_bundle"
    },
    leaf: overrides.leaf,
    query: overrides.query ?? {
      jobFamilies: ["requirements_analysis"],
      targetTypes: ["problem_statement"],
      artifacts: ["analysis"],
      examples: ["help me think through this idea"]
    },
    implementation: overrides.implementation,
    hosts: overrides.hosts ?? {
      currentHostSupported: true,
      portabilityScore: 1
    },
    prepare: overrides.prepare ?? {
      authRequired: false,
      installRequired: false
    },
    ranking: overrides.ranking ?? {
      contextCost: 0,
      confidence: 1
    },
    sourceMetadata: overrides.sourceMetadata ?? {}
  };
}

describe("discoverCandidates", () => {
  it("dedupes by canonical leaf capability id and keeps the first source winner", () => {
    const hostSkill = makeCapabilityCard({
      id: "requirements-analysis",
      leaf: {
        capabilityId: "gstack.office-hours",
        packageId: "gstack",
        subskillId: "office-hours"
      },
      implementation: {
        id: "gstack.office_hours",
        type: "local_skill",
        ownerSurface: "broker_owned_downstream"
      }
    });
    const mcpMirror = makeCapabilityCard({
      id: "gstack",
      kind: "mcp",
      label: "Office Hours MCP",
      leaf: {
        capabilityId: "gstack.office-hours",
        packageId: "gstack",
        subskillId: "office-hours"
      },
      implementation: {
        id: "gstack",
        type: "mcp_server",
        ownerSurface: "broker_owned_downstream"
      },
      package: {
        packageId: "gstack",
        label: "gstack",
        installState: "available",
        acquisition: "mcp_bundle"
      },
      ranking: {
        contextCost: 1,
        confidence: 1
      }
    });

    expect(discoverCandidates([hostSkill], [mcpMirror])).toEqual([hostSkill]);
  });

  it("keeps distinct capabilities even when their candidate ids collide", () => {
    const officeHours = makeCapabilityCard({
      id: "gstack",
      leaf: {
        capabilityId: "gstack.office-hours",
        packageId: "gstack",
        subskillId: "office-hours"
      },
      implementation: {
        id: "gstack.office_hours",
        type: "local_skill",
        ownerSurface: "broker_owned_downstream"
      }
    });
    const qa = makeCapabilityCard({
      id: "gstack",
      leaf: {
        capabilityId: "gstack.qa",
        packageId: "gstack",
        subskillId: "qa"
      },
      implementation: {
        id: "gstack.qa",
        type: "local_skill",
        ownerSurface: "broker_owned_downstream"
      }
    });

    expect(discoverCandidates([officeHours, qa])).toEqual([officeHours, qa]);
  });
});
