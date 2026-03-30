import { readdir, stat } from "node:fs/promises";
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
