import { describe, expect, it } from "vitest";
import {
  BROKER_TRACE_VERSION,
  createBrokerRoutingTrace,
  createSyntheticHostSkippedBrokerTrace,
  summarizeBrokerRoutingTraces,
  type BrokerRoutingTrace
} from "../../src/broker/trace";

function createTrace(
  overrides: Partial<BrokerRoutingTrace>
): BrokerRoutingTrace {
  return {
    traceVersion: BROKER_TRACE_VERSION,
    requestText: "request",
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
    winnerId: "winner",
    winnerPackageId: "pkg",
    selectedCapabilityId: "pkg.winner",
    selectedLeafCapabilityId: "winner",
    selectedImplementationId: "pkg.winner",
    selectedPackageInstallState: "installed",
    requestedProofFamily: null,
    semanticMatchReason: null,
    semanticMatchCandidateId: null,
    semanticMatchProofFamily: null,
    workflowId: null,
    runId: null,
    stageId: null,
    reasonCode: null,
    timestamp: "2026-04-01T10:00:00.000Z",
    ...overrides
  };
}

describe("summarizeBrokerRoutingTraces", () => {
  it("includes semantic trace fields in the formal schema for direct and clarify verdicts", () => {
    const directTrace = createBrokerRoutingTrace({
      input: {
        requestText: "turn this webpage into markdown",
        host: "codex",
        capabilityQuery: {
          kind: "capability_request",
          goal: "convert web content to markdown",
          host: "codex",
          requestText: "turn this webpage into markdown",
          jobFamilies: ["content_acquisition", "web_content_conversion"],
          artifacts: ["markdown"]
        }
      },
      currentHost: "codex",
      resultCode: "HANDOFF_READY",
      now: new Date("2026-04-18T10:00:00.000Z"),
      hostAction: null,
      candidateCount: 1,
      winner: {
        id: "web-content-to-markdown",
        package: {
          packageId: "baoyu"
        },
        leaf: {
          capabilityId: "baoyu.url-to-markdown",
          subskillId: "url-to-markdown"
        },
        implementation: {
          id: "baoyu.url_to_markdown"
        }
      },
      semanticRouting: {
        verdict: "direct_route",
        topMatch: {
          candidateId: "web-content-to-markdown",
          proofFamily: "web_content_to_markdown"
        }
      }
    });
    const clarifyTrace = createBrokerRoutingTrace({
      input: {
        requestText: "markdown this link",
        host: "codex",
        capabilityQuery: {
          kind: "capability_request",
          goal: "convert web content to markdown",
          host: "codex",
          requestText: "markdown this link",
          jobFamilies: ["content_acquisition", "web_content_conversion"],
          artifacts: ["markdown"]
        }
      },
      currentHost: "codex",
      resultCode: "HANDOFF_READY",
      now: new Date("2026-04-18T10:01:00.000Z"),
      hostAction: null,
      candidateCount: 1,
      winner: {
        id: "web-content-to-markdown",
        package: {
          packageId: "baoyu"
        },
        leaf: {
          capabilityId: "baoyu.url-to-markdown",
          subskillId: "url-to-markdown"
        },
        implementation: {
          id: "baoyu.url_to_markdown"
        }
      },
      semanticRouting: {
        verdict: "clarify",
        topMatch: {
          candidateId: "web-content-to-markdown",
          proofFamily: "web_content_to_markdown"
        }
      }
    });

    expect(directTrace).toMatchObject({
      requestedProofFamily: "web_content_to_markdown",
      semanticMatchReason: "direct_route",
      semanticMatchCandidateId: "web-content-to-markdown",
      semanticMatchProofFamily: "web_content_to_markdown"
    });
    expect(clarifyTrace).toMatchObject({
      semanticMatchReason: "clarify",
      semanticMatchCandidateId: "web-content-to-markdown",
      semanticMatchProofFamily: "web_content_to_markdown"
    });
  });

  it("tracks the requested proof family for QA install-help and synthetic host skips", () => {
    const qaDiscoveryTrace = createBrokerRoutingTrace({
      input: {
        requestText: "有没有现成 skill 能做这个网站 QA",
        host: "codex"
      },
      currentHost: "codex",
      resultCode: "HANDOFF_READY",
      now: new Date("2026-04-18T10:02:00.000Z"),
      hostAction: null,
      candidateCount: 1,
      winner: {
        id: "capability-discovery",
        package: {
          packageId: "skills_broker"
        },
        leaf: {
          capabilityId: "skills_broker.capability-discovery",
          subskillId: "capability-discovery"
        },
        implementation: {
          id: "skills_broker.capability_discovery"
        }
      }
    });
    const skippedTrace = createSyntheticHostSkippedBrokerTrace({
      requestText: "测下这个网站的质量：https://example.com",
      host: "codex",
      now: new Date("2026-04-18T10:03:00.000Z")
    });

    expect(qaDiscoveryTrace.requestedProofFamily).toBe("website_qa");
    expect(skippedTrace.requestedProofFamily).toBe("website_qa");
  });

  it("groups routing hit, misroute, and fallback rates by request surface", () => {
    const summary = summarizeBrokerRoutingTraces(
      [
        createTrace({
          requestSurface: "structured_query",
          normalizedBy: "structured_query",
          routingOutcome: "hit"
        }),
        createTrace({
          requestSurface: "structured_query",
          normalizedBy: "structured_query",
          resultCode: "AMBIGUOUS_REQUEST",
          routingOutcome: "misroute",
          missLayer: "broker_normalization",
          hostAction: "ask_clarifying_question",
          winnerId: null,
          winnerPackageId: null
        }),
        createTrace({
          requestSurface: "raw_envelope",
          normalizedBy: "raw_request_fallback",
          requestContract: "raw_envelope_fallback",
          resultCode: "INSTALL_REQUIRED",
          routingOutcome: "fallback",
          missLayer: "retrieval",
          hostAction: "offer_package_install",
          selectedPackageInstallState: "available"
        }),
        createTrace({
          requestText: "skipped",
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
          selectedPackageInstallState: null
        }),
        createTrace({
          timestamp: "2026-03-20T10:00:00.000Z"
        })
      ],
      {
        since: new Date("2026-03-25T00:00:00.000Z")
      }
    );

    expect(summary).toEqual({
      observed: 4,
      syntheticHostSkips: 1,
      acquisition: {
        trueNoCandidate: 0,
        installRequired: 1
      },
      contracts: [
        {
          requestContract: "query_native",
          observed: 2,
          hits: 1,
          misroutes: 1,
          fallbacks: 0,
          hitRate: 0.5,
          misrouteRate: 0.5,
          fallbackRate: 0
        },
        {
          requestContract: "raw_envelope_fallback",
          observed: 1,
          hits: 0,
          misroutes: 0,
          fallbacks: 1,
          hitRate: 0,
          misrouteRate: 0,
          fallbackRate: 1
        }
      ],
      surfaces: [
        {
          requestSurface: "structured_query",
          normalizedBy: "structured_query",
          observed: 2,
          hits: 1,
          misroutes: 1,
          fallbacks: 0,
          hitRate: 0.5,
          misrouteRate: 0.5,
          fallbackRate: 0
        },
        {
          requestSurface: "raw_envelope",
          normalizedBy: "raw_request_fallback",
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
  });
});
