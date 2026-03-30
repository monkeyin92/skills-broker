import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
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

async function fileExists(pathname: string): Promise<boolean> {
  try {
    const pathnameStat = await stat(pathname);
    return pathnameStat.isFile();
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

function normalizedValues(values: Array<string | undefined>): string[] {
  return unique(
    values
      .filter((value): value is string => value !== undefined)
      .map((value) => normalizeDirectoryName(value))
      .filter((value) => value.length > 0)
  );
}

function stripYamlQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function readSkillFrontmatterName(
  skillFilePath: string
): Promise<string | undefined> {
  if (!(await fileExists(skillFilePath))) {
    return undefined;
  }

  const raw = await readFile(skillFilePath, "utf8");
  const frontmatterMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);

  if (frontmatterMatch === null) {
    return undefined;
  }

  for (const line of frontmatterMatch[1].split(/\r?\n/)) {
    const nameMatch = line.match(/^name:\s*(.+?)\s*$/);

    if (nameMatch !== null) {
      return stripYamlQuotes(nameMatch[1].trim());
    }
  }

  return undefined;
}

async function readJsonObject(
  pathname: string
): Promise<Record<string, unknown> | undefined> {
  if (!(await fileExists(pathname))) {
    return undefined;
  }

  const raw = await readFile(pathname, "utf8");

  return JSON.parse(raw) as Record<string, unknown>;
}

async function childDirectories(pathname: string): Promise<string[]> {
  if (!(await directoryExists(pathname))) {
    return [];
  }

  const entries = await readdir(pathname, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pathname, entry.name));
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

function candidatePackageNames(card: CapabilityCard): string[] {
  const sourcePackageName =
    typeof card.sourceMetadata.packageName === "string"
      ? card.sourceMetadata.packageName
      : undefined;

  return normalizedValues([card.package.packageId, sourcePackageName]);
}

function candidateSkillNames(card: CapabilityCard): string[] {
  const sourceSkillName =
    typeof card.sourceMetadata.skillName === "string"
      ? card.sourceMetadata.skillName
      : undefined;

  return normalizedValues([
    card.leaf.subskillId,
    sourceSkillName,
    `${card.package.packageId}-${card.leaf.subskillId}`,
    sourceSkillName === undefined
      ? undefined
      : `${card.package.packageId}-${sourceSkillName}`
  ]);
}

async function readPackageManifestNames(
  packageRoot: string
): Promise<string[] | undefined> {
  const packageJsonPath = join(packageRoot, "package.json");
  const packageJsonExists = await fileExists(packageJsonPath);
  const packageJson = await readJsonObject(packageJsonPath);
  const rootSkillName = await readSkillFrontmatterName(join(packageRoot, "SKILL.md"));
  const brokerMetadata = await readJsonObject(
    join(packageRoot, ".skills-broker.json")
  );
  const conductorExists = await fileExists(join(packageRoot, "conductor.json"));
  const hasManifest =
    packageJsonExists ||
    brokerMetadata !== undefined ||
    rootSkillName !== undefined ||
    conductorExists;

  if (!hasManifest) {
    return undefined;
  }

  const manifestNames = normalizedValues([
    basename(packageRoot),
    typeof packageJson?.name === "string" ? packageJson.name : undefined,
    rootSkillName,
    typeof brokerMetadata?.managedBy === "string"
      ? brokerMetadata.managedBy
      : undefined
  ]);

  return manifestNames;
}

async function readSkillManifestNames(
  skillDirectory: string
): Promise<string[] | undefined> {
  const skillFilePath = join(skillDirectory, "SKILL.md");
  const brokerMetadataPath = join(skillDirectory, ".skills-broker.json");
  const skillFileExists = await fileExists(skillFilePath);
  const skillName = await readSkillFrontmatterName(skillFilePath);
  const brokerMetadata = await readJsonObject(brokerMetadataPath);
  const hasManifest = skillFileExists || brokerMetadata !== undefined;

  if (!hasManifest) {
    return undefined;
  }

  const manifestNames = normalizedValues([
    basename(skillDirectory),
    skillName,
    typeof brokerMetadata?.skillName === "string"
      ? brokerMetadata.skillName
      : undefined
  ]);

  return manifestNames;
}

function hasNameIntersection(
  actualNames: string[] | undefined,
  expectedNames: string[]
): boolean {
  if (actualNames === undefined) {
    return false;
  }

  const expected = new Set(expectedNames);

  return actualNames.some((name) => expected.has(name));
}

async function packageContainsMatchingSkill(
  packageRoot: string,
  card: CapabilityCard
): Promise<boolean> {
  const packageManifestNames = await readPackageManifestNames(packageRoot);

  if (!hasNameIntersection(packageManifestNames, candidatePackageNames(card))) {
    return false;
  }

  const skillDirectories = unique(
    (
      await Promise.all([
        childDirectories(packageRoot),
        childDirectories(join(packageRoot, ".agents", "skills")),
        childDirectories(join(packageRoot, ".agent", "skills")),
        childDirectories(join(packageRoot, ".codex", "skills"))
      ])
    ).flat()
  );

  for (const skillDirectory of skillDirectories) {
    if (
      hasNameIntersection(
        await readSkillManifestNames(skillDirectory),
        candidateSkillNames(card)
      )
    ) {
      return true;
    }
  }

  return false;
}

async function searchRootContainsInstalledLeaf(
  root: string,
  card: CapabilityCard
): Promise<boolean> {
  if (
    hasNameIntersection(await readSkillManifestNames(root), candidateSkillNames(card))
  ) {
    return true;
  }

  if (await packageContainsMatchingSkill(root, card)) {
    return true;
  }

  for (const childDirectory of await childDirectories(root)) {
    if (
      hasNameIntersection(
        await readSkillManifestNames(childDirectory),
        candidateSkillNames(card)
      )
    ) {
      return true;
    }

    if (await packageContainsMatchingSkill(childDirectory, card)) {
      return true;
    }
  }

  return false;
}

async function canUpgradeToInstalled(
  card: CapabilityCard,
  input: HydratePackageAvailabilityOptions
): Promise<boolean> {
  if (card.kind !== "skill" || card.package.installState !== "available") {
    return false;
  }

  for (const root of baseSearchRoots(input)) {
    if (await searchRootContainsInstalledLeaf(root, card)) {
      return true;
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
