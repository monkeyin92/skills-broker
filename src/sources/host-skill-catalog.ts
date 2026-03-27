import { readFile } from "node:fs/promises";
import type { CapabilityCandidate } from "../core/capability-card";
import type { BrokerIntent } from "../core/types";

type HostSkillCatalog = {
  skills?: CapabilityCandidate[];
};

export async function loadHostSkillCandidates(
  intent: BrokerIntent,
  catalogFilePath: string
): Promise<CapabilityCandidate[]> {
  const catalog = await readHostSkillCatalog(catalogFilePath);

  return (catalog.skills ?? []).filter(
    (candidate) => candidate.kind === "skill" && candidate.intent === intent
  );
}

async function readHostSkillCatalog(
  filePath: string
): Promise<HostSkillCatalog> {
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as HostSkillCatalog;
}
