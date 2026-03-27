import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type ManagedShellManifest = {
  managedBy: "skills-broker";
  host: "claude-code" | "codex";
  version: string;
  brokerHome: string;
};

export const OWNERSHIP_FILE = ".skills-broker.json";

function isManagedShellManifest(value: unknown): value is ManagedShellManifest {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ManagedShellManifest>;

  return (
    candidate.managedBy === "skills-broker" &&
    (candidate.host === "claude-code" || candidate.host === "codex") &&
    typeof candidate.version === "string" &&
    typeof candidate.brokerHome === "string"
  );
}

export async function readManagedShellManifest(
  shellDirectory: string
): Promise<ManagedShellManifest | undefined> {
  try {
    const manifest = JSON.parse(
      await readFile(join(shellDirectory, OWNERSHIP_FILE), "utf8")
    ) as unknown;

    return isManagedShellManifest(manifest) ? manifest : undefined;
  } catch {
    return undefined;
  }
}

export async function writeManagedShellManifest(
  shellDirectory: string,
  manifest: ManagedShellManifest
): Promise<string> {
  const manifestPath = join(shellDirectory, OWNERSHIP_FILE);

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return manifestPath;
}
