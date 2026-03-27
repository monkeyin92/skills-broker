import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CapabilityCandidate } from "../core/capability-card";
import type { BrokerIntent } from "../core/types";

type HostSkillCatalog = {
  skills?: CapabilityCandidate[];
};

export async function loadHostSkillCandidates(
  intent: BrokerIntent
): Promise<CapabilityCandidate[]> {
  const catalog = await readHostSkillCatalog();

  return (catalog.skills ?? []).filter(
    (candidate) => candidate.kind === "skill" && candidate.intent === intent
  );
}

async function readHostSkillCatalog(): Promise<HostSkillCatalog> {
  const filePath = join(process.cwd(), "config", "host-skills.seed.json");
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as HostSkillCatalog;
}
