import { readFile } from "node:fs/promises";
import type { CapabilityCandidate } from "../core/capability-card.js";
import type { BrokerIntent, CapabilityPackageRef } from "../core/types.js";

type HostSkillCatalog = {
  packages?: CapabilityPackageRef[];
  skills?: CapabilityCandidate[];
};

export async function loadHostSkillCandidates(
  intent: BrokerIntent,
  catalogFilePath: string
): Promise<CapabilityCandidate[]> {
  const catalog = await readHostSkillCatalog(catalogFilePath);
  const packageMap = new Map(
    (catalog.packages ?? []).map((pkg) => [pkg.packageId, pkg] as const)
  );

  return (catalog.skills ?? []).filter(
    (candidate) => candidate.kind === "skill" && candidate.intent === intent
  ).map((candidate) => {
    const packageId =
      candidate.package?.packageId ??
      (typeof candidate.sourceMetadata?.packageId === "string"
        ? candidate.sourceMetadata.packageId
        : undefined);

    if (packageId === undefined) {
      return candidate;
    }

    const packageRef = packageMap.get(packageId);

    if (packageRef === undefined) {
      return candidate;
    }

    return {
      ...candidate,
      package: {
        ...packageRef,
        ...candidate.package
      }
    };
  });
}

async function readHostSkillCatalog(
  filePath: string
): Promise<HostSkillCatalog> {
  const raw = await readFile(filePath, "utf8");

  return JSON.parse(raw) as HostSkillCatalog;
}
