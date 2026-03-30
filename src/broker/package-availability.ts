import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { CapabilityCard } from "../core/capability-card.js";

export type HydratePackageAvailabilityOptions = {
  currentHost: string;
  brokerHomeDirectory?: string;
  packageSearchRoots?: string[];
  cwd?: string;
};

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

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function normalizeDirectoryName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function baseSearchRoots(
  input: HydratePackageAvailabilityOptions
): string[] {
  if (input.packageSearchRoots !== undefined) {
    return unique(input.packageSearchRoots.map((root) => resolve(root)));
  }

  const cwd = resolve(input.cwd ?? process.cwd());
  const home = homedir();
  const roots = [
    join(home, ".agents", "skills"),
    join(home, ".agent", "skills"),
    join(home, ".codex", "skills"),
    join(cwd, ".agents", "skills"),
    join(cwd, ".agent", "skills"),
    join(cwd, ".codex", "skills")
  ];

  if (input.brokerHomeDirectory !== undefined) {
    roots.push(
      join(input.brokerHomeDirectory, "downstream", input.currentHost, "skills")
    );
  }

  return unique(roots.map((root) => resolve(root)));
}

async function nestedSearchRoots(roots: string[]): Promise<string[]> {
  const nested: string[] = [];

  for (const root of roots) {
    if (!(await directoryExists(root))) {
      continue;
    }

    const entries = await readdir(root, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageRoot = join(root, entry.name);
      const candidates = [
        join(packageRoot, ".agents", "skills"),
        join(packageRoot, ".agent", "skills"),
        join(packageRoot, ".codex", "skills")
      ];

      for (const candidate of candidates) {
        if (await directoryExists(candidate)) {
          nested.push(candidate);
        }
      }
    }
  }

  return unique(nested);
}

function candidateDirectoryNames(card: CapabilityCard): string[] {
  const sourceSkillName =
    typeof card.sourceMetadata.skillName === "string"
      ? card.sourceMetadata.skillName
      : undefined;

  const rawNames = [
    card.package.packageId,
    card.leaf.subskillId,
    sourceSkillName,
    `${card.package.packageId}-${card.leaf.subskillId}`,
    sourceSkillName === undefined
      ? undefined
      : `${card.package.packageId}-${sourceSkillName}`
  ].filter((value): value is string => value !== undefined);

  return unique(
    rawNames.flatMap((name) => {
      const normalized = normalizeDirectoryName(name);
      return normalized === name ? [name] : [name, normalized];
    })
  );
}

async function canUpgradeToInstalled(
  card: CapabilityCard,
  input: HydratePackageAvailabilityOptions
): Promise<boolean> {
  if (card.kind !== "skill" || card.package.installState !== "available") {
    return false;
  }

  const roots = baseSearchRoots(input);
  const searchRoots = roots.concat(await nestedSearchRoots(roots));
  const directoryNames = candidateDirectoryNames(card);

  for (const root of searchRoots) {
    for (const directoryName of directoryNames) {
      if (await directoryExists(join(root, directoryName))) {
        return true;
      }
    }
  }

  return false;
}

export async function hydratePackageAvailability(
  cards: CapabilityCard[],
  input: HydratePackageAvailabilityOptions
): Promise<CapabilityCard[]> {
  return Promise.all(
    cards.map(async (card) => {
      if (!(await canUpgradeToInstalled(card, input))) {
        return card;
      }

      return {
        ...card,
        package: {
          ...card.package,
          installState: "installed"
        },
        prepare: {
          ...card.prepare,
          installRequired: false
        }
      };
    })
  );
}
