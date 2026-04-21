import { join } from "node:path";
import type { CapabilityCard } from "../core/capability-card.js";
import { BROKER_HOSTS, type BrokerHost } from "../core/types.js";
import { findInstalledLeafLocation } from "./package-availability.js";

export type LocalSkillHandoffSource = {
  skillName: string;
  skillDirectory: string;
  skillFilePath: string;
  sourceHost?: BrokerHost;
};

type ResolveLocalSkillHandoffSourceOptions = {
  currentHost: BrokerHost;
  brokerHomeDirectory?: string;
  packageSearchRoots?: string[];
  cwd?: string;
};

function preferredSkillName(card: CapabilityCard): string {
  if (typeof card.sourceMetadata.skillName === "string") {
    return card.sourceMetadata.skillName;
  }

  const manifestName = card.leaf.probe?.manifestNames?.[0];

  if (typeof manifestName === "string" && manifestName.trim().length > 0) {
    return manifestName;
  }

  return card.leaf.subskillId;
}

function handoffSearchHosts(
  currentHost: BrokerHost,
  brokerHomeDirectory: string | undefined
): BrokerHost[] {
  if (brokerHomeDirectory === undefined) {
    return [currentHost];
  }

  return [currentHost, ...BROKER_HOSTS.filter((host) => host !== currentHost)];
}

export async function resolveLocalSkillHandoffSource(
  card: CapabilityCard,
  options: ResolveLocalSkillHandoffSourceOptions
): Promise<LocalSkillHandoffSource | undefined> {
  if (card.kind !== "skill" || card.implementation.type !== "local_skill") {
    return undefined;
  }

  const skillName = preferredSkillName(card);

  for (const host of handoffSearchHosts(
    options.currentHost,
    options.brokerHomeDirectory
  )) {
    const location = await findInstalledLeafLocation(card, {
      currentHost: host,
      brokerHomeDirectory: options.brokerHomeDirectory,
      packageSearchRoots: options.packageSearchRoots,
      cwd: options.cwd
    });

    if (location === undefined) {
      continue;
    }

    return {
      skillName,
      skillDirectory: location.skillDirectory,
      skillFilePath: join(location.skillDirectory, "SKILL.md"),
      sourceHost: host === options.currentHost ? undefined : host
    };
  }

  return undefined;
}
