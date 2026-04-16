import { access, readdir, rm, stat } from "node:fs/promises";
import { acquisitionMemoryFilePath } from "../broker/acquisition-memory.js";
import {
  BROKER_HOSTS,
  brokerHostKnownShellEntries,
  type BrokerHost
} from "../core/types.js";
import { readManagedShellManifest } from "./ownership.js";
import {
  detectLifecycleHostTargets,
  lifecycleHostTarget
} from "./paths.js";

export type RemoveLifecycleResult = {
  command: "remove";
  sharedHome: {
    path: string;
    status: "preserved" | "purged";
    acquisitionMemory: "preserved" | "cleared" | "already_absent";
  };
  hosts: Array<{
    name: BrokerHost;
    status: "removed" | "preserved" | "already_absent" | "skipped_conflict";
    reason?: string;
  }>;
  warnings: string[];
};

export type RemoveSharedBrokerHomeOptions = {
  brokerHomeDirectory: string;
  homeDirectory?: string;
  claudeCodeInstallDirectory?: string;
  codexInstallDirectory?: string;
  purgeSharedHome?: boolean;
  resetAcquisitionMemory?: boolean;
};

type RemoveHostEntry = RemoveLifecycleResult["hosts"][number];

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function conflictReason(
  state: Awaited<ReturnType<typeof readManagedShellManifest>>
): string {
  switch (state.status) {
    case "foreign":
      return "foreign ownership manifest";
    case "invalid-json":
      return "invalid ownership manifest json";
    case "invalid-manifest":
      return "invalid ownership manifest";
    case "unreadable":
      return `unreadable ownership manifest: ${state.error.message}`;
    default:
      return "conflicting host shell state";
  }
}

async function detectUnmanagedHostConflict(
  name: BrokerHost,
  installDirectory: string
): Promise<string | undefined> {
  try {
    const directoryStat = await stat(installDirectory);

    if (!directoryStat.isDirectory()) {
      return "existing unmanaged host path is not a directory";
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }

  const entries = await readdir(installDirectory);
  if (entries.length === 0) {
    return undefined;
  }

  if (
    entries.some((entry) => brokerHostKnownShellEntries(name).includes(entry)) ||
    entries.length > 0
  ) {
    return "existing unmanaged host directory";
  }

  return undefined;
}

async function removeHost(
  name: BrokerHost,
  installDirectory: string | undefined,
  warnings: string[]
): Promise<RemoveHostEntry> {
  if (installDirectory === undefined) {
    return {
      name,
      status: "already_absent"
    };
  }

  const manifestState = await readManagedShellManifest(installDirectory);
  if (manifestState.status === "managed") {
    await rm(installDirectory, { recursive: true, force: true });
    return {
      name,
      status: "removed"
    };
  }

  if (
    manifestState.status === "foreign" ||
    manifestState.status === "invalid-json" ||
    manifestState.status === "invalid-manifest" ||
    manifestState.status === "unreadable"
  ) {
    const reason = conflictReason(manifestState);
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "skipped_conflict",
      reason
    };
  }

  if (!(await pathExists(installDirectory))) {
    return {
      name,
      status: "already_absent"
    };
  }

  const unmanagedConflictReason = await detectUnmanagedHostConflict(name, installDirectory);
  if (unmanagedConflictReason !== undefined) {
    warnings.push(`${name}: ${unmanagedConflictReason}`);
    return {
      name,
      status: "skipped_conflict",
      reason: unmanagedConflictReason
    };
  }

  return {
    name,
    status: "already_absent"
  };
}

async function preserveHost(
  name: BrokerHost,
  installDirectory: string | undefined,
  warnings: string[]
): Promise<RemoveHostEntry> {
  if (installDirectory === undefined) {
    return {
      name,
      status: "already_absent"
    };
  }

  const manifestState = await readManagedShellManifest(installDirectory);
  if (manifestState.status === "managed") {
    return {
      name,
      status: "preserved"
    };
  }

  if (
    manifestState.status === "foreign" ||
    manifestState.status === "invalid-json" ||
    manifestState.status === "invalid-manifest" ||
    manifestState.status === "unreadable"
  ) {
    const reason = conflictReason(manifestState);
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "skipped_conflict",
      reason
    };
  }

  if (!(await pathExists(installDirectory))) {
    return {
      name,
      status: "already_absent"
    };
  }

  const unmanagedConflictReason = await detectUnmanagedHostConflict(name, installDirectory);
  if (unmanagedConflictReason !== undefined) {
    warnings.push(`${name}: ${unmanagedConflictReason}`);
    return {
      name,
      status: "skipped_conflict",
      reason: unmanagedConflictReason
    };
  }

  return {
    name,
    status: "already_absent"
  };
}

export async function removeSharedBrokerHome(
  options: RemoveSharedBrokerHomeOptions
): Promise<RemoveLifecycleResult> {
  const hostTargets = await detectLifecycleHostTargets({
    homeDirectory: options.homeDirectory,
    brokerHomeOverride: options.brokerHomeDirectory,
    claudeDirOverride: options.claudeCodeInstallDirectory,
    codexDirOverride: options.codexInstallDirectory
  });
  const warnings: string[] = [];
  const hosts: RemoveLifecycleResult["hosts"] = await Promise.all(
    BROKER_HOSTS.map((host) => {
      const installDirectory = lifecycleHostTarget(hostTargets, host).installDirectory;

      return options.resetAcquisitionMemory
        ? preserveHost(host, installDirectory, warnings)
        : removeHost(host, installDirectory, warnings);
    })
  );
  const memoryPath = acquisitionMemoryFilePath(options.brokerHomeDirectory);
  let acquisitionMemoryStatus: RemoveLifecycleResult["sharedHome"]["acquisitionMemory"] =
    "preserved";

  if (options.purgeSharedHome) {
    acquisitionMemoryStatus = (await pathExists(memoryPath)) ? "cleared" : "already_absent";
  } else if (options.resetAcquisitionMemory) {
    if (await pathExists(memoryPath)) {
      await rm(memoryPath, { force: true });
      acquisitionMemoryStatus = "cleared";
    } else {
      acquisitionMemoryStatus = "already_absent";
    }
  }

  if (options.purgeSharedHome) {
    await rm(options.brokerHomeDirectory, { recursive: true, force: true });
  }

  return {
    command: "remove",
    sharedHome: {
      path: options.brokerHomeDirectory,
      status: options.purgeSharedHome ? "purged" : "preserved",
      acquisitionMemory: acquisitionMemoryStatus
    },
    hosts,
    warnings
  };
}
