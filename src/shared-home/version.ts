import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PACKAGE_VERSION = process.env.npm_package_version ?? "0.0.0";

function resolvePackageJsonPath(projectRoot?: string): string {
  if (projectRoot !== undefined) {
    return join(projectRoot, "package.json");
  }

  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
}

export async function readPackageVersion(projectRoot?: string): Promise<string> {
  try {
    const packageJson = JSON.parse(
      await readFile(resolvePackageJsonPath(projectRoot), "utf8")
    ) as { version?: string };

    return packageJson.version ?? DEFAULT_PACKAGE_VERSION;
  } catch {
    return DEFAULT_PACKAGE_VERSION;
  }
}
