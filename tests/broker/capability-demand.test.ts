import { describe, expect, it } from "vitest";
import { summarizeCapabilityDemand } from "../../src/broker/capability-demand";
import type { AcquisitionMemoryEntry } from "../../src/broker/acquisition-memory";
import type { BrokerRoutingTrace } from "../../src/broker/trace";

function trace(overrides: Partial<BrokerRoutingTrace>): BrokerRoutingTrace {
  return {
    traceVersion: "2026-03-31",
    requestText: "install capability",
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
    reasonCode: null,
    timestamp: "2026-04-24T10:00:00.000Z",
    ...overrides
  };
}

function entry(overrides: Partial<AcquisitionMemoryEntry>): AcquisitionMemoryEntry {
  return {
    canonicalKey: "query:v2|families:capability_acquisition",
    compatibilityIntent: "capability_discovery_or_install",
    candidateId: "gstack.office-hours",
    packageId: "gstack",
    leafCapabilityId: "gstack.office-hours",
    successfulRoutes: 2,
    installedAt: "2026-04-24T10:30:00.000Z",
    verifiedAt: "2026-04-24T11:00:00.000Z",
    firstReuseAt: "2026-04-24T11:30:00.000Z",
    verifiedHosts: ["codex", "claude-code"],
    provenance: "package_probe",
    outcomes: {
      firstInstallAt: "2026-04-24T10:30:00.000Z",
      verificationSuccesses: 2,
      repeatUsages: 1,
      crossHostReuses: 1,
      degradedAcquisitions: 0,
      failedAcquisitions: 0
    },
    ...overrides
  };
}

describe("summarizeCapabilityDemand", () => {
  it("classifies recent install-required demand as blocked until verified", () => {
    const summary = summarizeCapabilityDemand({
      traces: [trace({})],
      acquisitionEntries: [],
      since: new Date("2026-04-24T00:00:00.000Z"),
      windowDays: 7
    });

    expect(summary).toMatchObject({
      status: "active",
      totals: {
        opportunities: 1,
        recentDemand: 1,
        blockedAcquisition: 1
      },
      nextAction: "verify"
    });
    expect(summary.opportunities[0]).toMatchObject({
      key: "gstack.office-hours",
      state: "blocked_acquisition",
      nextAction: "verify",
      installRequired: 1,
      evidence: ["install_required", "routing_trace"]
    });
  });

  it("promotes repeated verified acquisition demand to readiness", () => {
    const summary = summarizeCapabilityDemand({
      traces: [trace({ selectedPackageInstallState: "installed", resultCode: "HANDOFF_READY", routingOutcome: "hit" })],
      acquisitionEntries: [entry({})],
      since: new Date("2026-04-24T00:00:00.000Z"),
      windowDays: 7
    });

    expect(summary.totals.readyForPromotion).toBe(1);
    expect(summary.opportunities[0]).toMatchObject({
      state: "ready_for_promotion",
      nextAction: "promote",
      successfulRoutes: 2,
      repeatUsages: 1,
      crossHostReuses: 1
    });
  });

  it("marks historical unresolved install-required demand as stale metadata", () => {
    const summary = summarizeCapabilityDemand({
      traces: [trace({ timestamp: "2026-04-01T10:00:00.000Z" })],
      acquisitionEntries: [],
      since: new Date("2026-04-24T00:00:00.000Z"),
      windowDays: 7
    });

    expect(summary).toMatchObject({
      status: "stale",
      totals: {
        staleMetadata: 1
      },
      nextAction: "refresh_metadata"
    });
  });

  it("deduplicates routing and memory evidence for one demanded capability", () => {
    const summary = summarizeCapabilityDemand({
      traces: [
        trace({}),
        trace({ host: "claude-code", timestamp: "2026-04-24T10:05:00.000Z" })
      ],
      acquisitionEntries: [entry({ successfulRoutes: 1, outcomes: {
        firstInstallAt: "2026-04-24T10:30:00.000Z",
        verificationSuccesses: 1,
        repeatUsages: 0,
        crossHostReuses: 0,
        degradedAcquisitions: 0,
        failedAcquisitions: 0
      } })],
      since: new Date("2026-04-24T00:00:00.000Z"),
      windowDays: 7
    });

    expect(summary.totals.opportunities).toBe(1);
    expect(summary.opportunities[0]).toMatchObject({
      recentDemand: 3,
      totalDemand: 3,
      hosts: ["claude-code", "codex"],
      state: "satisfied_local_winner",
      nextAction: "prefer_verified_winner"
    });
  });
});
