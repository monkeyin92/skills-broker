import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type ManagedShellManifest = {
  managedBy: "skills-broker";
  host: "claude-code" | "codex";
  version: string;
  brokerHome: string;
};

export type ManagedShellManifestState =
  | {
      status: "absent";
      manifestPath: string;
    }
  | {
      status: "unreadable";
      manifestPath: string;
      error: NodeJS.ErrnoException;
    }
  | {
      status: "invalid-json";
      manifestPath: string;
      error: SyntaxError;
    }
  | {
      status: "foreign";
      manifestPath: string;
      manifest: Record<string, unknown>;
      managedBy: unknown;
    }
  | {
      status: "invalid-manifest";
      manifestPath: string;
      manifest: Record<string, unknown>;
    }
  | {
      status: "managed";
      manifestPath: string;
      manifest: ManagedShellManifest;
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
): Promise<ManagedShellManifestState> {
  const manifestPath = join(shellDirectory, OWNERSHIP_FILE);

  try {
    const contents = await readFile(manifestPath, "utf8");

    try {
      const manifest = JSON.parse(contents) as unknown;

      if (manifest === null || typeof manifest !== "object") {
        return {
          status: "invalid-manifest",
          manifestPath,
          manifest: {}
        };
      }

      const candidate = manifest as Record<string, unknown>;

      if (candidate.managedBy !== "skills-broker") {
        return {
          status: "foreign",
          manifestPath,
          manifest: candidate,
          managedBy: candidate.managedBy
        };
      }

      if (isManagedShellManifest(candidate)) {
        return {
          status: "managed",
          manifestPath,
          manifest: candidate
        };
      }

      return {
        status: "invalid-manifest",
        manifestPath,
        manifest: candidate
      };
    } catch (error) {
      return {
        status: "invalid-json",
        manifestPath,
        error: error as SyntaxError
      };
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return {
        status: "absent",
        manifestPath
      };
    }

    return {
      status: "unreadable",
      manifestPath,
      error: nodeError
    };
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
