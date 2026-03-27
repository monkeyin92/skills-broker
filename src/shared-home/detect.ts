import { access, constants } from "node:fs/promises";
import {
  readManagedShellManifest,
  type ManagedShellManifest
} from "./ownership.js";

export type WritableDirectoryState = {
  directory: string;
  writable: boolean;
};

export async function canWriteDirectory(directory: string): Promise<boolean> {
  try {
    await access(directory, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectManagedShell(
  shellDirectory: string
): Promise<ManagedShellManifest | undefined> {
  return readManagedShellManifest(shellDirectory);
}

export async function detectWritableDirectory(
  directory: string
): Promise<WritableDirectoryState> {
  return {
    directory,
    writable: await canWriteDirectory(directory)
  };
}
