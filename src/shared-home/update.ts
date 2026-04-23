import { randomUUID } from "node:crypto";
import { access, readdir, stat } from "node:fs/promises";
import {
  BROKER_HOSTS,
  brokerHostKnownShellEntries,
  type BrokerHost
} from "../core/types.js";
import {
  installClaudeCodeHostShell,
  type InstallClaudeCodePluginResult
} from "../hosts/claude-code/install.js";
import {
  installCodexHostShell,
  type InstallCodexHostShellResult
} from "../hosts/codex/install.js";
import {
  installOpenCodeHostShell,
  type InstallOpenCodeHostShellResult
} from "../hosts/opencode/install.js";
import { readManagedShellManifest } from "./ownership.js";
import {
  buildPeerSkillRemediation,
  competingPeerSkillsWarning,
  type AppliedPeerSkillMoveResult,
  type PlannedPeerSkillMove,
  inspectManagedPeerSurface,
  planCompetingPeerSkillMoves,
  applyPlannedPeerSkillMove,
  rollbackPeerSkillMoves
} from "./host-surface.js";
import {
  installSharedBrokerHome,
  resolveSharedBrokerHomeLayout,
  type InstallSharedBrokerHomeOptions
} from "./install.js";
import { repairBrokerManagedDownstreamRuntimes } from "./downstream-runtime-repair.js";
import { materializeBrokerFirstGateArtifact } from "./broker-first-gate.js";
import {
  appendPeerSurfaceLedgerEvent,
  createPeerSurfaceLedgerEvent,
  deletePeerSurfaceManualRecoveryMarker,
  type PeerSurfaceHostName,
  type PeerSurfaceIntegrityIssue,
  type PeerSurfaceLedgerEvent,
  type PeerSurfaceManualRecoveryMarker,
  peerSurfaceManualRecoveryMarkerPath,
  recommendedManualRecoveryClearCommand,
  withPeerSurfaceHostLock,
  writePeerSurfaceManualRecoveryMarker
} from "./peer-surface-audit.js";
import {
  detectLifecycleHostTargets,
  lifecycleHostTarget
} from "./paths.js";
import {
  resolveAdoptionHealth,
  type AdoptionHealthResult
} from "./adoption-health.js";

export type HostLifecycleStatus =
  | "installed"
  | "updated"
  | "up_to_date"
  | "cleared_manual_recovery"
  | "planned_install"
  | "skipped_not_detected"
  | "skipped_conflict"
  | "failed";

type HostLifecycleManualRecovery = PeerSurfaceManualRecoveryMarker & {
  path: string;
  clearCommand: string;
};

export type UpdateLifecycleResult = {
  command: "update";
  status: "success" | "degraded_success" | "failed";
  dryRun: boolean;
  sharedHome: {
    path: string;
    status: "installed" | "updated" | "planned" | "failed";
    reason?: string;
  };
  hosts: Array<{
    name: BrokerHost;
    status: HostLifecycleStatus;
    reason?: string;
    competingPeerSkills?: string[];
    migratedPeerSkills?: string[];
    integrityIssues?: PeerSurfaceIntegrityIssue[];
    manualRecovery?: HostLifecycleManualRecovery;
    clearedManualRecovery?: {
      markerId: string;
      path: string;
    };
    remediation?: {
      action: "hide_competing_peer_skills";
      targetDirectory: string;
      peerSkills: string[];
      message: string;
    };
  }>;
  adoptionHealth: AdoptionHealthResult;
  warnings: string[];
};

export type UpdateSharedBrokerHomeOptions = InstallSharedBrokerHomeOptions & {
  homeDirectory?: string;
  claudeCodeInstallDirectory?: string;
  codexInstallDirectory?: string;
  opencodeInstallDirectory?: string;
  dryRun?: boolean;
  repairHostSurface?: boolean;
  clearManualRecovery?: boolean;
  clearManualRecoveryHost?: PeerSurfaceHostName;
  clearManualRecoveryMarkerId?: string;
  clearManualRecoveryOperatorNote?: string;
  clearManualRecoveryVerificationNote?: string;
  clearManualRecoveryEvidenceRefs?: string[];
};

type HostLifecycleEntry = UpdateLifecycleResult["hosts"][number];

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function statusCountsAsSuccess(status: HostLifecycleStatus): boolean {
  return (
    status === "installed" ||
    status === "updated" ||
    status === "cleared_manual_recovery" ||
    status === "up_to_date" ||
    status === "planned_install" ||
    status === "skipped_not_detected"
  );
}

function sharedHomeCountsAsSuccess(
  status: UpdateLifecycleResult["sharedHome"]["status"]
): boolean {
  return status === "installed" || status === "updated" || status === "planned";
}

function resolveOverallStatus(
  sharedHome: UpdateLifecycleResult["sharedHome"],
  hosts: HostLifecycleEntry[]
): UpdateLifecycleResult["status"] {
  if (sharedHome.status === "failed") {
    return "failed";
  }

  if (
    hosts.some(
      (host) =>
        host.manualRecovery !== undefined &&
        host.manualRecovery.failurePhase === "rollback"
    )
  ) {
    return "failed";
  }

  const problemCount = hosts.filter(
    (host) =>
      host.status === "skipped_conflict" ||
      host.status === "failed" ||
      (host.integrityIssues?.length ?? 0) > 0 ||
      host.manualRecovery !== undefined ||
      (host.competingPeerSkills?.length ?? 0) > 0
  ).length;

  if (problemCount === 0) {
    return "success";
  }

  const successCount =
    (sharedHomeCountsAsSuccess(sharedHome.status) ? 1 : 0) +
    hosts.filter((host) => statusCountsAsSuccess(host.status)).length;
  return successCount > 0 ? "degraded_success" : "failed";
}

function buildUpdateLifecycleResult(input: {
  dryRun: boolean;
  sharedHome: UpdateLifecycleResult["sharedHome"];
  hosts: HostLifecycleEntry[];
  warnings: string[];
  status?: UpdateLifecycleResult["status"];
}): UpdateLifecycleResult {
  return {
    command: "update",
    status:
      input.status ?? resolveOverallStatus(input.sharedHome, input.hosts),
    dryRun: input.dryRun,
    sharedHome: input.sharedHome,
    hosts: input.hosts,
    adoptionHealth: resolveAdoptionHealth({
      sharedHomeState: input.sharedHome.status,
      sharedHomeReason: input.sharedHome.reason,
      hosts: input.hosts
    }),
    warnings: input.warnings
  };
}

function conflictReason(
  state: Awaited<ReturnType<typeof readManagedShellManifest>>
): string {
  switch (state.status) {
    case "foreign":
      return "foreign ownership manifest";
    case "invalid-json":
      return "invalid ownership manifest json";
    case "invalid-manifest":
      return "invalid ownership manifest";
    case "unreadable":
      return `unreadable ownership manifest: ${state.error.message}`;
    default:
      return "conflicting host shell state";
  }
}

async function installHostShell(
  name: BrokerHost,
  installDirectory: string,
  brokerHomeDirectory: string,
  projectRoot: string | undefined
): Promise<
  | InstallClaudeCodePluginResult
  | InstallCodexHostShellResult
  | InstallOpenCodeHostShellResult
> {
  if (name === "claude-code") {
    return installClaudeCodeHostShell({
      installDirectory,
      brokerHomeDirectory,
      projectRoot
    });
  }

  if (name === "opencode") {
    return installOpenCodeHostShell({
      installDirectory,
      brokerHomeDirectory,
      projectRoot
    });
  }

  return installCodexHostShell({
    installDirectory,
    brokerHomeDirectory,
    projectRoot
  });
}

async function detectUnmanagedHostConflict(
  name: BrokerHost,
  installDirectory: string
): Promise<string | undefined> {
  try {
    const directoryStat = await stat(installDirectory);

    if (!directoryStat.isDirectory()) {
      return "existing unmanaged host path is not a directory";
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }

  const entries = await readdir(installDirectory);
  if (entries.length === 0) {
    return undefined;
  }

  if (
    entries.some((entry) => brokerHostKnownShellEntries(name).includes(entry)) ||
    entries.length > 0
  ) {
    return "existing unmanaged host directory";
  }

  return undefined;
}

type ClearManualRecoveryEvidence = {
  operatorNote: string;
  verificationNote: string;
  evidenceRefs: string[];
};

type RepairPeerSurfaceResult = {
  migratedPeerSkills: string[];
  competingPeerSkills: string[];
  warnings: string[];
  integrityIssues: PeerSurfaceIntegrityIssue[];
  manualRecovery?: HostLifecycleManualRecovery;
  reason?: string;
};

function peerSurfaceIntegrityMessage(issue: PeerSurfaceIntegrityIssue): string {
  return `${issue.code}: ${issue.message}`;
}

function peerSurfaceIntegrityWarnings(
  host: PeerSurfaceHostName,
  issues: PeerSurfaceIntegrityIssue[]
): string[] {
  return issues.map((issue) => `${host}: ${peerSurfaceIntegrityMessage(issue)}`);
}

function summarizePeerSurfaceReason(
  host: PeerSurfaceHostName,
  issues: PeerSurfaceIntegrityIssue[],
  manualRecovery?: HostLifecycleManualRecovery
): string | undefined {
  if (issues.length > 0) {
    return issues.map(peerSurfaceIntegrityMessage).join("; ");
  }

  if (manualRecovery !== undefined) {
    return `${host}: manual recovery required (${manualRecovery.markerId})`;
  }

  return undefined;
}

function resolveClearManualRecoveryEvidence(
  options: UpdateSharedBrokerHomeOptions
): ClearManualRecoveryEvidence {
  return {
    operatorNote: options.clearManualRecoveryOperatorNote ?? "",
    verificationNote: options.clearManualRecoveryVerificationNote ?? "",
    evidenceRefs: options.clearManualRecoveryEvidenceRefs ?? []
  };
}

async function appendPeerSurfaceWarningEvent(
  brokerHomeDirectory: string,
  warningCollector: string[],
  event: PeerSurfaceLedgerEvent
): Promise<void> {
  try {
    await appendPeerSurfaceLedgerEvent(brokerHomeDirectory, event);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warningCollector.push(`peer-surface audit append failed: ${message}`);
  }
}

async function enterPeerSurfaceManualRecovery(
  host: PeerSurfaceHostName,
  brokerHomeDirectory: string,
  attemptId: string,
  failurePhase: "append" | "rollback" | "move",
  failedPeers: string[],
  reason: string,
  warningCollector: string[]
): Promise<HostLifecycleManualRecovery | undefined> {
  const markerId = randomUUID();
  const marker = await writePeerSurfaceManualRecoveryMarker(
    brokerHomeDirectory,
    {
      schemaVersion: 1,
      markerId,
      host,
      attemptId,
      createdAt: new Date().toISOString(),
      failurePhase,
      failedPeers,
      rollbackStatus: "failed",
      evidenceRefs: [],
      reason
    }
  );

  await appendPeerSurfaceWarningEvent(
    brokerHomeDirectory,
    warningCollector,
    createPeerSurfaceLedgerEvent({
      eventType: "manual_recovery_required",
      host,
      actor: "skills-broker",
      result: "failed",
      evidenceRefs: [],
      attemptId,
      markerId,
      details: {
        failedPeers,
        failurePhase,
        rollbackStatus: "failed",
        reason
      }
    })
  );

  warningCollector.push(
    `${host}: ${reason}; manual recovery required (${markerId})`
  );

  return {
    ...marker,
    path: peerSurfaceManualRecoveryMarkerPath(brokerHomeDirectory, host),
    clearCommand: recommendedManualRecoveryClearCommand(
      host,
      markerId,
      brokerHomeDirectory
    )
  };
}

function summarizeRollbackFailureReason(input: {
  failurePhase: "move" | "append";
  cause: string;
  rollbackWarnings: string[];
}): string {
  const repairFailureReason =
    input.failurePhase === "append"
      ? `peer-surface audit append failed: ${input.cause}`
      : `peer-surface repair failed before completion: ${input.cause}`;
  const rollbackReason =
    input.rollbackWarnings.length > 0
      ? input.rollbackWarnings.join("; ")
      : "rollback could not fully restore the host surface";

  return `${repairFailureReason}; rollback failed during repair: ${rollbackReason}`;
}

async function repairHostPeerSurface(
  host: PeerSurfaceHostName,
  installDirectory: string,
  brokerHomeDirectory: string
): Promise<RepairPeerSurfaceResult> {
  const warnings: string[] = [];

  return withPeerSurfaceHostLock(brokerHomeDirectory, host, async () => {
    const initialState = await inspectManagedPeerSurface(
      host,
      installDirectory,
      brokerHomeDirectory
    );

    warnings.push(...peerSurfaceIntegrityWarnings(host, initialState.integrityIssues));

    if (initialState.integrityIssues.length > 0) {
      return {
        migratedPeerSkills: [],
        competingPeerSkills: initialState.competingPeerSkills,
        warnings,
        integrityIssues: initialState.integrityIssues,
        manualRecovery: initialState.manualRecovery,
        reason: summarizePeerSurfaceReason(
          host,
          initialState.integrityIssues,
          initialState.manualRecovery
        )
      };
    }

    if (initialState.manualRecovery !== undefined) {
      warnings.push(`${host}: manual recovery required (${initialState.manualRecovery.markerId})`);
      return {
        migratedPeerSkills: [],
        competingPeerSkills: initialState.competingPeerSkills,
        warnings,
        integrityIssues: [],
        manualRecovery: initialState.manualRecovery,
        reason: `${host}: manual recovery required (${initialState.manualRecovery.markerId})`
      };
    }

    if (initialState.competingPeerSkills.length === 0) {
      return {
        migratedPeerSkills: [],
        competingPeerSkills: [],
        warnings,
        integrityIssues: []
      };
    }

    const attemptId = randomUUID();
    const moves = planCompetingPeerSkillMoves(
      host,
      installDirectory,
      brokerHomeDirectory,
      initialState.competingPeerSkills
    );
    const moved: PlannedPeerSkillMove[] = [];

    try {
      for (const move of moves) {
        const outcome: AppliedPeerSkillMoveResult =
          await applyPlannedPeerSkillMove(move);

        if (outcome === "moved") {
          moved.push(move);
        }
      }

      try {
        await appendPeerSurfaceLedgerEvent(
          brokerHomeDirectory,
          createPeerSurfaceLedgerEvent({
            eventType: "repair_succeeded",
            host,
            actor: "skills-broker",
            result: "success",
            evidenceRefs: [],
            attemptId,
            details: {
              migratedPeerSkills: initialState.competingPeerSkills
            }
          })
        );
      } catch (error) {
        const appendMessage = error instanceof Error ? error.message : String(error);
        const rollback = await rollbackPeerSkillMoves(moved);
        warnings.push(...rollback.warnings.map((warning) => `${host}: ${warning}`));
        await appendPeerSurfaceWarningEvent(
          brokerHomeDirectory,
          warnings,
          createPeerSurfaceLedgerEvent({
            eventType: "repair_failed",
            host,
            actor: "skills-broker",
            result: "failed",
            evidenceRefs: [],
            attemptId,
            details: {
              competingPeerSkills: initialState.competingPeerSkills,
              migratedPeerSkills: moved.map((move) => move.skillName),
              failurePhase: "append",
              rollbackStatus:
                rollback.failedPeerSkills.length > 0 ? "failed" : "succeeded",
              reason: appendMessage
            }
          })
        );

        if (rollback.failedPeerSkills.length > 0) {
          const rollbackFailureReason = summarizeRollbackFailureReason({
            failurePhase: "append",
            cause: appendMessage,
            rollbackWarnings: rollback.warnings
          });
          const manualRecovery = await enterPeerSurfaceManualRecovery(
            host,
            brokerHomeDirectory,
            attemptId,
            "rollback",
            rollback.failedPeerSkills,
            rollbackFailureReason,
            warnings
          );

          return {
            migratedPeerSkills: moved.map((move) => move.skillName),
            competingPeerSkills: rollback.failedPeerSkills,
            warnings,
            integrityIssues: [],
            manualRecovery,
            reason: `BROKER_FIRST_PEER_SURFACE_MANUAL_RECOVERY_REQUIRED: ${rollbackFailureReason}`
          };
        }

        return {
          migratedPeerSkills: [],
          competingPeerSkills: initialState.competingPeerSkills,
          warnings: [
            ...warnings,
            `${host}: BROKER_FIRST_PEER_SURFACE_REPAIR_APPEND_FAILED: ${appendMessage}`
          ],
          integrityIssues: [],
          reason: `BROKER_FIRST_PEER_SURFACE_REPAIR_APPEND_FAILED: ${appendMessage}`
        };
      }

      const finalState = await inspectManagedPeerSurface(
        host,
        installDirectory,
        brokerHomeDirectory
      );
      warnings.push(...peerSurfaceIntegrityWarnings(host, finalState.integrityIssues));

      return {
        migratedPeerSkills: initialState.competingPeerSkills,
        competingPeerSkills: finalState.competingPeerSkills,
        warnings,
        integrityIssues: finalState.integrityIssues,
        manualRecovery: finalState.manualRecovery
      };
    } catch (error) {
      const moveMessage = error instanceof Error ? error.message : String(error);
      const rollback = await rollbackPeerSkillMoves(moved);
      warnings.push(...rollback.warnings.map((warning) => `${host}: ${warning}`));

      await appendPeerSurfaceWarningEvent(
        brokerHomeDirectory,
        warnings,
        createPeerSurfaceLedgerEvent({
          eventType: "repair_failed",
          host,
          actor: "skills-broker",
          result: "failed",
          evidenceRefs: [],
          attemptId,
          details: {
            competingPeerSkills: initialState.competingPeerSkills,
            migratedPeerSkills: moved.map((move) => move.skillName),
            failurePhase: "move",
            rollbackStatus:
              rollback.failedPeerSkills.length > 0 ? "failed" : "succeeded",
            reason: moveMessage
          }
        })
      );

      if (rollback.failedPeerSkills.length > 0) {
        const rollbackFailureReason = summarizeRollbackFailureReason({
          failurePhase: "move",
          cause: moveMessage,
          rollbackWarnings: rollback.warnings
        });
        const manualRecovery = await enterPeerSurfaceManualRecovery(
          host,
          brokerHomeDirectory,
          attemptId,
          "rollback",
          rollback.failedPeerSkills,
          rollbackFailureReason,
          warnings
        );

        return {
          migratedPeerSkills: moved.map((move) => move.skillName),
          competingPeerSkills: rollback.failedPeerSkills,
          warnings,
          integrityIssues: [],
          manualRecovery,
          reason: `BROKER_FIRST_PEER_SURFACE_MANUAL_RECOVERY_REQUIRED: ${rollbackFailureReason}`
        };
      }

      return {
        migratedPeerSkills: [],
        competingPeerSkills: initialState.competingPeerSkills,
        warnings,
        integrityIssues: [],
        reason: `BROKER_FIRST_PEER_SURFACE_REPAIR_FAILED: ${moveMessage}`
      };
    }
  });
}

async function clearHostManualRecovery(
  host: PeerSurfaceHostName,
  installDirectory: string,
  brokerHomeDirectory: string,
  markerId: string,
  evidence: ClearManualRecoveryEvidence
): Promise<{ host: HostLifecycleEntry; warnings: string[] }> {
  const warnings: string[] = [];

  return withPeerSurfaceHostLock(brokerHomeDirectory, host, async () => {
    const state = await inspectManagedPeerSurface(
      host,
      installDirectory,
      brokerHomeDirectory
    );

    warnings.push(...peerSurfaceIntegrityWarnings(host, state.integrityIssues));

    if (state.integrityIssues.length > 0) {
      return {
        host: {
          name: host,
          status: "failed",
          reason: summarizePeerSurfaceReason(host, state.integrityIssues),
          integrityIssues: state.integrityIssues,
          manualRecovery: state.manualRecovery
        },
        warnings
      };
    }

    if (state.manualRecovery === undefined) {
      await appendPeerSurfaceWarningEvent(
        brokerHomeDirectory,
        warnings,
        createPeerSurfaceLedgerEvent({
          eventType: "clear_rejected",
          host,
          actor: "skills-broker",
          result: "failed",
          evidenceRefs: evidence.evidenceRefs,
          markerId,
          details: {
            ...evidence,
            rejectionCode: "BROKER_FIRST_PEER_SURFACE_CLEAR_MARKER_MISSING",
            rejectionReason: `${host}: no manual recovery marker is active`
          }
        })
      );

      return {
        host: {
          name: host,
          status: "failed",
          reason: `${host}: no manual recovery marker is active`
        },
        warnings
      };
    }

    if (state.manualRecovery.markerId !== markerId) {
      await appendPeerSurfaceWarningEvent(
        brokerHomeDirectory,
        warnings,
        createPeerSurfaceLedgerEvent({
          eventType: "clear_rejected",
          host,
          actor: "skills-broker",
          result: "failed",
          evidenceRefs: evidence.evidenceRefs,
          markerId: state.manualRecovery.markerId,
          details: {
            ...evidence,
            rejectionCode: "BROKER_FIRST_PEER_SURFACE_CLEAR_MARKER_MISMATCH",
            rejectionReason: `${host}: marker mismatch, expected ${state.manualRecovery.markerId} but received ${markerId}`
          }
        })
      );

      return {
        host: {
          name: host,
          status: "failed",
          reason: `${host}: marker mismatch, expected ${state.manualRecovery.markerId} but received ${markerId}`,
          manualRecovery: state.manualRecovery
        },
        warnings
      };
    }

    if (state.competingPeerSkills.length > 0) {
      await appendPeerSurfaceWarningEvent(
        brokerHomeDirectory,
        warnings,
        createPeerSurfaceLedgerEvent({
          eventType: "clear_rejected",
          host,
          actor: "skills-broker",
          result: "failed",
          evidenceRefs: evidence.evidenceRefs,
          markerId,
          details: {
            ...evidence,
            rejectionCode: "BROKER_FIRST_PEER_SURFACE_CLEAR_INVALID_HOST_STATE",
            rejectionReason: `${host}: competing peers still visible (${state.competingPeerSkills.join(", ")})`
          }
        })
      );

      return {
        host: {
          name: host,
          status: "failed",
          reason: `${host}: competing peers still visible (${state.competingPeerSkills.join(", ")})`,
          competingPeerSkills: state.competingPeerSkills,
          remediation: state.remediation,
          manualRecovery: state.manualRecovery
        },
        warnings
      };
    }

    try {
      await deletePeerSurfaceManualRecoveryMarker(brokerHomeDirectory, host);
      await appendPeerSurfaceLedgerEvent(
        brokerHomeDirectory,
        createPeerSurfaceLedgerEvent({
          eventType: "clear_succeeded",
          host,
          actor: "skills-broker",
          result: "success",
          evidenceRefs: evidence.evidenceRefs,
          markerId,
          details: evidence
        })
      );

      return {
        host: {
          name: host,
          status: "cleared_manual_recovery",
          clearedManualRecovery: {
            markerId,
            path: state.manualRecovery.path
          }
        },
        warnings
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const finalState = await inspectManagedPeerSurface(
        host,
        installDirectory,
        brokerHomeDirectory
      );
      warnings.push(...peerSurfaceIntegrityWarnings(host, finalState.integrityIssues));

      return {
        host: {
          name: host,
          status: "failed",
          reason: `BROKER_FIRST_PEER_SURFACE_CLEAR_FAILED: ${message}`,
          ...(finalState.manualRecovery === undefined
            ? {}
            : { manualRecovery: finalState.manualRecovery }),
          ...(finalState.integrityIssues.length === 0
            ? {}
            : { integrityIssues: finalState.integrityIssues }),
          ...(finalState.competingPeerSkills.length > 0
            ? {
                competingPeerSkills: finalState.competingPeerSkills,
                remediation: finalState.remediation
              }
            : {})
        },
        warnings
      };
    }
  });
}

async function updateHost(
  name: BrokerHost,
  installDirectory: string | undefined,
  notDetectedReason: string | undefined,
  options: UpdateSharedBrokerHomeOptions,
  warnings: string[]
): Promise<HostLifecycleEntry> {
  if (installDirectory === undefined) {
    return {
      name,
      status: "skipped_not_detected",
      reason: notDetectedReason
    };
  }

  const manifestState = await readManagedShellManifest(installDirectory);

  if (manifestState.status === "foreign") {
    warnings.push(`${name}: ${conflictReason(manifestState)}`);
    return {
      name,
      status: "skipped_conflict",
      reason: conflictReason(manifestState)
    };
  }

  if (
    manifestState.status === "invalid-json" ||
    manifestState.status === "invalid-manifest" ||
    manifestState.status === "unreadable"
  ) {
    warnings.push(`${name}: ${conflictReason(manifestState)}`);
    return {
      name,
      status: "skipped_conflict",
      reason: conflictReason(manifestState)
    };
  }

  const wasManaged = manifestState.status === "managed";
  if (manifestState.status === "absent") {
    const unmanagedConflictReason = await detectUnmanagedHostConflict(name, installDirectory);

    if (unmanagedConflictReason !== undefined) {
      warnings.push(`${name}: ${unmanagedConflictReason}`);
      return {
        name,
        status: "skipped_conflict",
        reason: unmanagedConflictReason
      };
    }
  }

  if (options.dryRun) {
    const peerSurface = await inspectManagedPeerSurface(
      name,
      installDirectory,
      options.brokerHomeDirectory
    );

    warnings.push(...peerSurfaceIntegrityWarnings(name, peerSurface.integrityIssues));
    if (peerSurface.competingPeerSkills.length > 0) {
      warnings.push(competingPeerSkillsWarning(name, peerSurface.competingPeerSkills));
    }
    if (peerSurface.manualRecovery !== undefined) {
      warnings.push(`${name}: manual recovery required (${peerSurface.manualRecovery.markerId})`);
    }

    return {
      name,
      status: wasManaged ? "up_to_date" : "planned_install",
      ...(peerSurface.competingPeerSkills.length > 0
        ? {
            competingPeerSkills: peerSurface.competingPeerSkills,
            remediation: peerSurface.remediation
          }
        : {}),
      ...(peerSurface.manualRecovery === undefined
        ? {}
        : { manualRecovery: peerSurface.manualRecovery }),
      ...(peerSurface.integrityIssues.length === 0
        ? {}
        : { integrityIssues: peerSurface.integrityIssues })
    };
  }

  try {
    await installHostShell(
      name,
      installDirectory,
      options.brokerHomeDirectory,
      options.projectRoot
    );

    let peerSurface = await inspectManagedPeerSurface(
      name,
      installDirectory,
      options.brokerHomeDirectory
    );
    let migratedPeerSkills: string[] = [];

    warnings.push(...peerSurfaceIntegrityWarnings(name, peerSurface.integrityIssues));

    if (peerSurface.integrityIssues.length > 0) {
      return {
        name,
        status: "failed",
        reason: summarizePeerSurfaceReason(
          name,
          peerSurface.integrityIssues,
          peerSurface.manualRecovery
        ),
        integrityIssues: peerSurface.integrityIssues,
        ...(peerSurface.manualRecovery === undefined
          ? {}
          : { manualRecovery: peerSurface.manualRecovery }),
        ...(peerSurface.competingPeerSkills.length > 0
          ? {
              competingPeerSkills: peerSurface.competingPeerSkills,
              remediation: peerSurface.remediation
            }
          : {})
      };
    }

    if (peerSurface.manualRecovery !== undefined) {
      warnings.push(`${name}: manual recovery required (${peerSurface.manualRecovery.markerId})`);
      return {
        name,
        status: "failed",
        reason: `${name}: manual recovery required (${peerSurface.manualRecovery.markerId})`,
        manualRecovery: peerSurface.manualRecovery,
        ...(peerSurface.competingPeerSkills.length > 0
          ? {
              competingPeerSkills: peerSurface.competingPeerSkills,
              remediation: peerSurface.remediation
            }
          : {})
      };
    }

    if (peerSurface.competingPeerSkills.length > 0 && options.repairHostSurface) {
      const repair = await repairHostPeerSurface(
        name,
        installDirectory,
        options.brokerHomeDirectory
      );

      migratedPeerSkills = repair.migratedPeerSkills;
      warnings.push(...repair.warnings);
      peerSurface = {
        competingPeerSkills: repair.competingPeerSkills,
        remediation:
          repair.competingPeerSkills.length > 0
            ? buildPeerSkillRemediation(
                name,
                options.brokerHomeDirectory,
                repair.competingPeerSkills
              )
            : undefined,
        manualRecovery: repair.manualRecovery,
        integrityIssues: repair.integrityIssues
      };

      if (repair.reason !== undefined) {
        return {
          name,
          status: "failed",
          reason: repair.reason,
          ...(repair.manualRecovery === undefined
            ? {}
            : { manualRecovery: repair.manualRecovery }),
          ...(repair.integrityIssues.length === 0
            ? {}
            : { integrityIssues: repair.integrityIssues }),
          ...(peerSurface.competingPeerSkills.length > 0
            ? {
                competingPeerSkills: peerSurface.competingPeerSkills,
                remediation: peerSurface.remediation
              }
            : {})
        };
      }
    }

    if (peerSurface.competingPeerSkills.length > 0) {
      warnings.push(competingPeerSkillsWarning(name, peerSurface.competingPeerSkills));
    }

    return {
      name,
      status: wasManaged ? "updated" : "installed",
      ...(migratedPeerSkills.length > 0 ? { migratedPeerSkills } : {}),
      ...(peerSurface.competingPeerSkills.length > 0
        ? {
            competingPeerSkills: peerSurface.competingPeerSkills,
            remediation: peerSurface.remediation
          }
        : {}),
      ...(peerSurface.manualRecovery === undefined
        ? {}
        : { manualRecovery: peerSurface.manualRecovery }),
      ...(peerSurface.integrityIssues.length === 0
        ? {}
        : { integrityIssues: peerSurface.integrityIssues })
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "failed",
      reason
    };
  }
}

export async function updateSharedBrokerHome(
  options: UpdateSharedBrokerHomeOptions
): Promise<UpdateLifecycleResult> {
  const hostTargets = await detectLifecycleHostTargets({
    homeDirectory: options.homeDirectory,
    brokerHomeOverride: options.brokerHomeDirectory,
    claudeDirOverride: options.claudeCodeInstallDirectory,
    codexDirOverride: options.codexInstallDirectory,
    opencodeDirOverride: options.opencodeInstallDirectory
  });
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const sharedHomeExists = await pathExists(sharedHomeLayout.packageJsonPath);
  const warnings: string[] = [];
  let sharedHome: UpdateLifecycleResult["sharedHome"] = {
    path: options.brokerHomeDirectory,
    status: options.dryRun ? "planned" : sharedHomeExists ? "updated" : "installed"
  };

  if (options.clearManualRecovery) {
    const host = options.clearManualRecoveryHost ?? BROKER_HOSTS[0];
    const markerId = options.clearManualRecoveryMarkerId ?? "";
    const evidence = resolveClearManualRecoveryEvidence(options);

    if (!sharedHomeExists) {
      return buildUpdateLifecycleResult({
        status: "failed",
        dryRun: false,
        sharedHome: {
          path: options.brokerHomeDirectory,
          status: "failed",
          reason: "shared broker home is missing"
        },
        hosts: [
          {
            name: host,
            status: "failed",
            reason: "shared broker home is missing"
          }
        ],
        warnings
      });
    }

    const target = lifecycleHostTarget(hostTargets, host);

    if (target.installDirectory === undefined) {
      return buildUpdateLifecycleResult({
        status: "failed",
        dryRun: false,
        sharedHome,
        hosts: [
          {
            name: host,
            status: "failed",
            reason: target.reason
          }
        ],
        warnings
      });
    }

    const clearResult = await clearHostManualRecovery(
      host,
      target.installDirectory,
      options.brokerHomeDirectory,
      markerId,
      evidence
    );
    warnings.push(...clearResult.warnings);

    if (clearResult.host.status === "cleared_manual_recovery") {
      try {
        await materializeBrokerFirstGateArtifact({
          brokerHomeDirectory: options.brokerHomeDirectory
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`shared-home: ${reason}`);
        sharedHome = {
          path: options.brokerHomeDirectory,
          status: "failed",
          reason
        };
      }
    }

    return buildUpdateLifecycleResult({
      status:
        clearResult.host.status === "cleared_manual_recovery" &&
        sharedHome.status !== "failed"
          ? "success"
          : "failed",
      dryRun: false,
      sharedHome,
      hosts: [clearResult.host],
      warnings
    });
  }

  if (!options.dryRun) {
    try {
      await installSharedBrokerHome({
        brokerHomeDirectory: options.brokerHomeDirectory,
        projectRoot: options.projectRoot
      });
      await materializeBrokerFirstGateArtifact({
        brokerHomeDirectory: options.brokerHomeDirectory
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warnings.push(`shared-home: ${reason}`);
      sharedHome = {
        path: options.brokerHomeDirectory,
        status: "failed",
        reason
      };
    }
  }

  const hosts =
    sharedHome.status === "failed"
      ? BROKER_HOSTS.map((host) => {
          const target = lifecycleHostTarget(hostTargets, host);

          return {
            name: host,
            status:
              target.installDirectory === undefined
                ? ("skipped_not_detected" as const)
                : ("failed" as const),
            reason:
              target.installDirectory === undefined
                ? target.reason
                : sharedHome.reason
          };
        })
      : await Promise.all([
          ...BROKER_HOSTS.map((host) => {
            const target = lifecycleHostTarget(hostTargets, host);
            return updateHost(
              host,
              target.installDirectory,
              target.reason,
              options,
              warnings
            );
          })
        ]);

  if (!options.dryRun && sharedHome.status !== "failed") {
    const downstreamRepair = await repairBrokerManagedDownstreamRuntimes(
      options.brokerHomeDirectory
    );

    warnings.push(
      ...downstreamRepair.warnings.map((warning) => `shared-home: ${warning}`)
    );
  }

  return buildUpdateLifecycleResult({
    dryRun: options.dryRun ?? false,
    sharedHome,
    hosts,
    warnings
  });
}
