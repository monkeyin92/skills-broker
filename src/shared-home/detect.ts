import { access, constants, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  readManagedShellManifest,
  type ManagedShellManifestState
} from "./ownership.js";

export type WritableDirectoryState =
  | {
      status: "writable";
      targetDirectory: string;
      nearestExistingDirectory: string;
      checkedDirectory: string;
      targetExists: boolean;
    }
  | {
      status: "not-writable";
      targetDirectory: string;
      nearestExistingDirectory: string;
      checkedDirectory: string;
      targetExists: boolean;
      reason: "permission-denied" | "not-a-directory";
    };

async function findNearestExistingDirectory(targetDirectory: string): Promise<{
  nearestExistingDirectory: string;
  targetExists: boolean;
  targetIsDirectory: boolean;
}> {
  const resolvedTargetDirectory = resolve(targetDirectory);
  let candidateDirectory = resolvedTargetDirectory;

  while (true) {
    try {
      const candidateStat = await stat(candidateDirectory);

      if (candidateStat.isDirectory()) {
        return {
          nearestExistingDirectory: candidateDirectory,
          targetExists: candidateDirectory === resolvedTargetDirectory,
          targetIsDirectory: true
        };
      }

      if (candidateDirectory === resolvedTargetDirectory) {
        return {
          nearestExistingDirectory: dirname(candidateDirectory),
          targetExists: true,
          targetIsDirectory: false
        };
      }

      if (candidateDirectory === dirname(candidateDirectory)) {
        return {
          nearestExistingDirectory: candidateDirectory,
          targetExists: false,
          targetIsDirectory: false
        };
      }

      candidateDirectory = dirname(candidateDirectory);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code !== "ENOENT") {
        throw error;
      }

      const parentDirectory = dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return {
          nearestExistingDirectory: candidateDirectory,
          targetExists: false,
          targetIsDirectory: false
        };
      }

      candidateDirectory = parentDirectory;
    }
  }
}

export async function canWriteDirectory(directory: string): Promise<boolean> {
  const state = await detectWritableDirectory(directory);

  return state.status === "writable";
}

export async function detectManagedShell(
  shellDirectory: string
): Promise<ManagedShellManifestState> {
  return readManagedShellManifest(shellDirectory);
}

export async function detectWritableDirectory(
  directory: string
): Promise<WritableDirectoryState> {
  const resolvedDirectory = resolve(directory);
  const { nearestExistingDirectory, targetExists, targetIsDirectory } =
    await findNearestExistingDirectory(resolvedDirectory);

  if (targetExists && !targetIsDirectory) {
    return {
      status: "not-writable",
      targetDirectory: resolvedDirectory,
      nearestExistingDirectory,
      checkedDirectory: nearestExistingDirectory,
      targetExists,
      reason: "not-a-directory"
    };
  }

  try {
    await access(nearestExistingDirectory, constants.W_OK | constants.X_OK);
    return {
      status: "writable",
      targetDirectory: resolvedDirectory,
      nearestExistingDirectory,
      checkedDirectory: nearestExistingDirectory,
      targetExists
    };
  } catch {
    return {
      status: "not-writable",
      targetDirectory: resolvedDirectory,
      nearestExistingDirectory,
      checkedDirectory: nearestExistingDirectory,
      targetExists,
      reason: "permission-denied"
    };
  }
}
