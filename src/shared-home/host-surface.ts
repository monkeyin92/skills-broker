import { cp, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

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
  hostName: "claude-code" | "codex",
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

export function buildPeerSkillRemediation(
  hostName: "claude-code" | "codex",
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
  hostName: "claude-code" | "codex"
): string {
  return join(brokerHomeDirectory, "downstream", hostName, "skills");
}

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

export async function migrateCompetingPeerSkills(
  hostName: "claude-code" | "codex",
  installDirectory: string,
  brokerHomeDirectory: string,
  skillNames: string[]
): Promise<MigratePeerSkillsResult> {
  const hostSkillsDirectory = dirname(installDirectory);
  const downstreamDirectory = resolveDownstreamSkillStoreDirectory(
    brokerHomeDirectory,
    hostName
  );
  const migratedPeerSkills: string[] = [];
  const remainingPeerSkills: string[] = [];
  const warnings: string[] = [];

  await mkdir(downstreamDirectory, { recursive: true });

  for (const skillName of skillNames) {
    const sourceDirectory = join(hostSkillsDirectory, skillName);
    const targetDirectory = join(downstreamDirectory, skillName);

    if (await directoryExists(targetDirectory)) {
      remainingPeerSkills.push(skillName);
      warnings.push(
        `${hostName}: cannot migrate ${skillName} because downstream target already exists at ${targetDirectory}`
      );
      continue;
    }

    try {
      await moveDirectory(sourceDirectory, targetDirectory);
      migratedPeerSkills.push(skillName);
    } catch (error) {
      remainingPeerSkills.push(skillName);
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`${hostName}: failed to migrate ${skillName}: ${message}`);
    }
  }

  return {
    migratedPeerSkills,
    remainingPeerSkills,
    warnings
  };
}
