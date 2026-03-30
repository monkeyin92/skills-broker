import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { CapabilityCard } from "../core/capability-card.js";
import type {
  CapabilityPackageProbe,
  LeafCapabilityProbe
} from "../core/types.js";

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

function packageProbe(card: CapabilityCard): CapabilityPackageProbe {
  const probe = card.package.probe;

  return {
    ...(probe ?? {}),
    layouts: probe?.layouts ?? ["single_skill_directory"],
    manifestFiles: probe?.manifestFiles ?? [
      "package.json",
      "SKILL.md",
      ".skills-broker.json",
      "conductor.json"
    ],
    manifestNames: probe?.manifestNames ?? [card.package.packageId]
  };
}

function leafProbe(card: CapabilityCard): LeafCapabilityProbe {
  const probe = card.leaf.probe;

  return {
    ...(probe ?? {}),
    manifestFiles: probe?.manifestFiles ?? ["SKILL.md", ".skills-broker.json"],
    manifestNames: probe?.manifestNames ?? [card.leaf.subskillId],
    aliases: probe?.aliases ?? [`${card.package.packageId}-${card.leaf.subskillId}`]
  };
}

function candidatePackageNames(card: CapabilityCard): string[] {
  const probe = packageProbe(card);

  return normalizedValues([
    card.package.packageId,
    ...(probe.manifestNames ?? []),
    ...(probe.aliases ?? [])
  ]);
}

function candidateSkillNames(card: CapabilityCard): string[] {
  const probe = leafProbe(card);

  return normalizedValues([
    card.leaf.subskillId,
    ...(probe.manifestNames ?? []),
    ...(probe.aliases ?? [])
  ]);
}

async function readPackageManifestNames(
  packageRoot: string,
  card: CapabilityCard
): Promise<string[] | undefined> {
  const probe = packageProbe(card);
  const manifestFiles = probe.manifestFiles ?? [];
  const packageJsonPath = join(packageRoot, "package.json");
  const packageJson =
    manifestFiles.includes("package.json")
      ? await readJsonObject(packageJsonPath)
      : undefined;
  const rootSkillName =
    manifestFiles.includes("SKILL.md")
      ? await readSkillFrontmatterName(join(packageRoot, "SKILL.md"))
      : undefined;
  const brokerMetadata =
    manifestFiles.includes(".skills-broker.json")
      ? await readJsonObject(join(packageRoot, ".skills-broker.json"))
      : undefined;
  const conductorExists =
    manifestFiles.includes("conductor.json") &&
    (await fileExists(join(packageRoot, "conductor.json")));
  const hasManifest =
    packageJson !== undefined ||
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
  skillDirectory: string,
  card: CapabilityCard
): Promise<string[] | undefined> {
  const probe = leafProbe(card);
  const manifestFiles = probe.manifestFiles ?? [];
  const skillName =
    manifestFiles.includes("SKILL.md")
      ? await readSkillFrontmatterName(join(skillDirectory, "SKILL.md"))
      : undefined;
  const brokerMetadata =
    manifestFiles.includes(".skills-broker.json")
      ? await readJsonObject(join(skillDirectory, ".skills-broker.json"))
      : undefined;
  const hasManifest = skillName !== undefined || brokerMetadata !== undefined;

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
  const probe = packageProbe(card);
  const packageManifestNames = await readPackageManifestNames(packageRoot, card);

  if (!hasNameIntersection(packageManifestNames, candidatePackageNames(card))) {
    return false;
  }

  const skillDirectoryGroups: Promise<string[]>[] = [];

  if (probe.layouts.includes("bundle_root_children")) {
    skillDirectoryGroups.push(childDirectories(packageRoot));
  }

  if (probe.layouts.includes("nested_agent_skills")) {
    skillDirectoryGroups.push(
      childDirectories(join(packageRoot, ".agents", "skills")),
      childDirectories(join(packageRoot, ".agent", "skills")),
      childDirectories(join(packageRoot, ".codex", "skills"))
    );
  }

  const skillDirectories = unique((await Promise.all(skillDirectoryGroups)).flat());

  for (const skillDirectory of skillDirectories) {
    if (
      hasNameIntersection(
        await readSkillManifestNames(skillDirectory, card),
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
  const probe = packageProbe(card);

  if (probe.layouts.includes("single_skill_directory")) {
    if (
      hasNameIntersection(
        await readSkillManifestNames(root, card),
        candidateSkillNames(card)
      )
    ) {
      return true;
    }
  }

  if (await packageContainsMatchingSkill(root, card)) {
    return true;
  }

  for (const childDirectory of await childDirectories(root)) {
    if (probe.layouts.includes("single_skill_directory")) {
      if (
        hasNameIntersection(
          await readSkillManifestNames(childDirectory, card),
          candidateSkillNames(card)
        )
      ) {
        return true;
      }
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
