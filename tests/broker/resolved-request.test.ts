import { describe, expect, it } from "vitest";
import {
  buildRequestQueryIdentity,
  requestRoutingReasonCode,
  resolveBrokerRequest
} from "../../src/broker/resolved-request";
import type { CapabilityCard } from "../../src/core/capability-card";
import type { QueryBackedBrokerRequest } from "../../src/core/types";

function createRequest(
  overrides: Partial<QueryBackedBrokerRequest> = {}
): QueryBackedBrokerRequest {
  return {
    outputMode: "markdown_only",
    capabilityQuery: {
      kind: "capability_request",
      goal: "analyze a product requirement and produce a design doc",
      host: "claude-code",
      requestText: "帮我做需求分析并产出设计文档",
      jobFamilies: ["requirements_analysis"],
      targets: [
        {
          type: "problem_statement",
          value: "skills-broker capability query migration"
        }
      ],
      artifacts: ["design_doc", "analysis"]
    },
    ...overrides
  };
}

function createCard(
  overrides: Partial<CapabilityCard> & Pick<CapabilityCard, "id" | "label">
): CapabilityCard {
  return {
    id: overrides.id,
    kind: overrides.kind ?? "skill",
    label: overrides.label,
    compatibilityIntent:
      overrides.compatibilityIntent ?? "capability_discovery_or_install",
    package: overrides.package ?? {
      packageId: "gstack",
      label: "gstack",
      installState: "installed",
      acquisition: "local_skill_bundle"
    },
    leaf: overrides.leaf ?? {
      capabilityId: `gstack.${overrides.id}`,
      packageId: "gstack",
      subskillId: overrides.id
    },
    query: overrides.query ?? {
      jobFamilies: ["requirements_analysis"],
      targetTypes: ["problem_statement", "text"],
      artifacts: ["design_doc", "analysis"],
      examples: ["帮我做需求分析并产出设计文档"]
    },
    implementation: overrides.implementation ?? {
      id: `gstack.${overrides.id}`,
      type: "local_skill",
      ownerSurface: "broker_owned_downstream"
    },
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

describe("resolved broker request", () => {
  it("builds a canonical query identity that is stable across array order and normalized values", () => {
    const first = buildRequestQueryIdentity(
      createRequest({
        capabilityQuery: {
          ...createRequest().capabilityQuery,
          jobFamilies: ["requirements_analysis", "strategy_review"],
          artifacts: ["analysis", "design_doc"],
          constraints: ["no_install", "low_context"],
          targets: [
            {
              type: "url",
              value: " HTTPS://Example.com/Plan "
            },
            {
              type: "problem_statement",
              value: "skills-broker   capability   query migration"
            }
          ],
          preferredCapability: " gstack-office-hours "
        }
      })
    );
    const second = buildRequestQueryIdentity(
      createRequest({
        capabilityQuery: {
          ...createRequest().capabilityQuery,
          artifacts: ["design_doc", "analysis", "analysis"],
          jobFamilies: ["strategy_review", "requirements_analysis"],
          constraints: ["low_context", "no_install"],
          targets: [
            {
              type: "problem_statement",
              value: "skills-broker capability query migration"
            },
            {
              type: "url",
              value: "https://example.com/plan"
            }
          ],
          preferredCapability: "gstack-office-hours"
        }
      })
    );

    expect(first).toBe(second);
  });

  it("includes normalized target values in the canonical query identity", () => {
    const first = buildRequestQueryIdentity(
      createRequest({
        capabilityQuery: {
          ...createRequest().capabilityQuery,
          targets: [
            {
              type: "url",
              value: "https://example.com/plan-a"
            }
          ]
        }
      })
    );
    const second = buildRequestQueryIdentity(
      createRequest({
        capabilityQuery: {
          ...createRequest().capabilityQuery,
          targets: [
            {
              type: "url",
              value: "https://example.com/plan-b"
            }
          ]
        }
      })
    );

    expect(first).not.toBe(second);
  });

  it("distinguishes query-native selection from compatibility fallback", () => {
    const resolvedRequest = resolveBrokerRequest(createRequest());
    const queryNativeCard = createCard({
      id: "requirements-analysis",
      label: "Requirements Analysis"
    });
    const compatibilityFallbackCard = createCard({
      id: "generic-discovery",
      label: "Generic Discovery",
      query: {
        jobFamilies: ["capability_acquisition"],
        targetTypes: ["text"],
        artifacts: ["installation_plan"],
        examples: ["find a skill"]
      }
    });

    expect(requestRoutingReasonCode(queryNativeCard, resolvedRequest)).toBe(
      "query_native"
    );
    expect(
      requestRoutingReasonCode(compatibilityFallbackCard, resolvedRequest)
    ).toBe("query_native_via_legacy_compat");
  });
});
