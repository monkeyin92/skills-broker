import { cp, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  PeerSurfaceAuditInspection,
  PeerSurfaceHostName,
  PeerSurfaceManualRecoveryMarker
} from "./peer-surface-audit.js";
import {
  inspectPeerSurfaceAuditState,
  recommendedManualRecoveryClearCommand
} from "./peer-surface-audit.js";

const COMPETING_PEER_SKILL_NAMES = [
  "baoyu-url-to-markdown",
  "baoyu-danger-x-to-markdown"
] as const;

async function directoryExists(pathname: string): Promise<boolean> {
  try {
    const pathnameStat = await stat(pathname);
    return pathnameStat.isDirectory();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT" || nodeError.code === "ENOTDIR") {
      return false;
    }

    throw error;
  }
}

export async function detectCompetingPeerSkills(
  installDirectory: string
): Promise<string[]> {
  const skillsDirectory = dirname(installDirectory);

  if (!(await directoryExists(skillsDirectory))) {
    return [];
  }

  const entries = await readdir(skillsDirectory);
  const detected: string[] = [];

  for (const skillName of COMPETING_PEER_SKILL_NAMES) {
    if (!entries.includes(skillName)) {
      continue;
    }

    if (await directoryExists(join(skillsDirectory, skillName))) {
      detected.push(skillName);
    }
  }

  return detected;
}

export function competingPeerSkillsWarning(
  hostName: PeerSurfaceHostName,
  skillNames: string[]
): string {
  return `${hostName}: competing peer skills detected (${skillNames.join(", ")}); broker-first hit rate may be reduced until these peer skills are hidden behind skills-broker`;
}

export type PeerSkillRemediation = {
  action: "hide_competing_peer_skills";
  targetDirectory: string;
  peerSkills: string[];
  message: string;
};

export type PeerSurfaceManagedState = {
  competingPeerSkills: string[];
  remediation?: PeerSkillRemediation;
  manualRecovery?: PeerSurfaceManualRecoveryMarker & {
    path: string;
    clearCommand: string;
  };
  integrityIssues: PeerSurfaceAuditInspection["integrityIssues"];
};

export function buildPeerSkillRemediation(
  hostName: PeerSurfaceHostName,
  brokerHomeDirectory: string,
  peerSkills: string[]
): PeerSkillRemediation {
  const targetDirectory = join(
    brokerHomeDirectory,
    "downstream",
    hostName,
    "skills"
  );

  return {
    action: "hide_competing_peer_skills",
    targetDirectory,
    peerSkills,
    message: `Hide competing peer skills behind skills-broker by moving ${peerSkills.join(", ")} out of the host-visible skills surface and into ${targetDirectory}`
  };
}

export function resolveDownstreamSkillStoreDirectory(
  brokerHomeDirectory: string,
  hostName: PeerSurfaceHostName
): string {
  return join(brokerHomeDirectory, "downstream", hostName, "skills");
}

export type PlannedPeerSkillMove = {
  skillName: string;
  sourceDirectory: string;
  targetDirectory: string;
};

type MigratePeerSkillsResult = {
  migratedPeerSkills: string[];
  remainingPeerSkills: string[];
  warnings: string[];
};

async function moveDirectory(sourceDirectory: string, targetDirectory: string): Promise<void> {
  try {
    await rename(sourceDirectory, targetDirectory);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== "EXDEV") {
      throw error;
    }

    await cp(sourceDirectory, targetDirectory, { recursive: true, force: false });
    await rm(sourceDirectory, { recursive: true, force: true });
  }
}

export function planCompetingPeerSkillMoves(
  hostName: PeerSurfaceHostName,
  installDirectory: string,
  brokerHomeDirectory: string,
  skillNames: string[]
): PlannedPeerSkillMove[] {
  const hostSkillsDirectory = dirname(installDirectory);
  const downstreamDirectory = resolveDownstreamSkillStoreDirectory(
    brokerHomeDirectory,
    hostName
  );

  return skillNames.map((skillName) => ({
    skillName,
    sourceDirectory: join(hostSkillsDirectory, skillName),
    targetDirectory: join(downstreamDirectory, skillName)
  }));
}

export async function movePlannedPeerSkillMoves(
  moves: PlannedPeerSkillMove[]
): Promise<void> {
  if (moves.length === 0) {
    return;
  }

  await mkdir(dirname(moves[0]!.targetDirectory), { recursive: true });

  for (const move of moves) {
    if (await directoryExists(move.targetDirectory)) {
      throw new Error(
        `cannot migrate ${move.skillName} because downstream target already exists at ${move.targetDirectory}`
      );
    }
  }

  for (const move of moves) {
    await applyPlannedPeerSkillMove(move);
  }
}

export async function applyPlannedPeerSkillMove(
  move: PlannedPeerSkillMove
): Promise<void> {
  await mkdir(dirname(move.targetDirectory), { recursive: true });

  if (await directoryExists(move.targetDirectory)) {
    throw new Error(
      `cannot migrate ${move.skillName} because downstream target already exists at ${move.targetDirectory}`
    );
  }

  await moveDirectory(move.sourceDirectory, move.targetDirectory);
}

export async function rollbackPeerSkillMoves(
  moves: PlannedPeerSkillMove[]
): Promise<{
  restoredPeerSkills: string[];
  failedPeerSkills: string[];
  warnings: string[];
}> {
  const restoredPeerSkills: string[] = [];
  const failedPeerSkills: string[] = [];
  const warnings: string[] = [];

  for (const move of [...moves].reverse()) {
    const targetExists = await directoryExists(move.targetDirectory);

    if (!targetExists) {
      continue;
    }

    if (await directoryExists(move.sourceDirectory)) {
      failedPeerSkills.push(move.skillName);
      warnings.push(
        `cannot rollback ${move.skillName} because source already exists at ${move.sourceDirectory}`
      );
      continue;
    }

    try {
      await moveDirectory(move.targetDirectory, move.sourceDirectory);
      restoredPeerSkills.push(move.skillName);
    } catch (error) {
      failedPeerSkills.push(move.skillName);
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`failed to rollback ${move.skillName}: ${message}`);
    }
  }

  return {
    restoredPeerSkills,
    failedPeerSkills,
    warnings
  };
}

export async function inspectManagedPeerSurface(
  hostName: PeerSurfaceHostName,
  installDirectory: string,
  brokerHomeDirectory: string
): Promise<PeerSurfaceManagedState> {
  const competingPeerSkills = await detectCompetingPeerSkills(installDirectory);
  const auditState = await inspectPeerSurfaceAuditState(
    brokerHomeDirectory,
    hostName
  );

  return {
    competingPeerSkills,
    ...(competingPeerSkills.length > 0
      ? {
          remediation: buildPeerSkillRemediation(
            hostName,
            brokerHomeDirectory,
            competingPeerSkills
          )
        }
      : {}),
    ...(auditState.marker === null
      ? {}
      : {
          manualRecovery: {
            ...auditState.marker,
            path: auditState.markerPath,
            clearCommand: recommendedManualRecoveryClearCommand(
              hostName,
              auditState.marker.markerId,
              brokerHomeDirectory
            )
          }
        }),
    integrityIssues: auditState.integrityIssues
  };
}

export async function migrateCompetingPeerSkills(
  hostName: PeerSurfaceHostName,
  installDirectory: string,
  brokerHomeDirectory: string,
  skillNames: string[]
): Promise<MigratePeerSkillsResult> {
  const moves = planCompetingPeerSkillMoves(
    hostName,
    installDirectory,
    brokerHomeDirectory,
    skillNames
  );

  try {
    await movePlannedPeerSkillMoves(moves);

    return {
      migratedPeerSkills: skillNames,
      remainingPeerSkills: [],
      warnings: []
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      migratedPeerSkills: [],
      remainingPeerSkills: skillNames,
      warnings: [`${hostName}: failed to migrate competing peers: ${message}`]
    };
  }
}
