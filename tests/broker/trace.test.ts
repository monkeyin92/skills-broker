import { describe, expect, it } from "vitest";
import {
  BROKER_TRACE_VERSION,
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
    hostAction: null,
    candidateCount: 1,
    winnerId: "winner",
    winnerPackageId: "pkg",
    workflowId: null,
    runId: null,
    stageId: null,
    reasonCode: null,
    timestamp: "2026-04-01T10:00:00.000Z",
    ...overrides
  };
}

describe("summarizeBrokerRoutingTraces", () => {
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
          resultCode: "NO_CANDIDATE",
          routingOutcome: "fallback",
          missLayer: "retrieval",
          hostAction: "offer_capability_discovery",
          winnerId: null,
          winnerPackageId: null
        }),
        createTrace({
          requestText: "skipped",
          hostDecision: "handle_normally",
          resultCode: "HOST_SKIPPED_BROKER",
          routingOutcome: "host_skipped",
          missLayer: "host_selection",
          normalizedBy: null,
          requestSurface: null,
          hostAction: "continue_normally",
          candidateCount: null,
          winnerId: null,
          winnerPackageId: null
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
