import { access } from "node:fs/promises";
import {
  installClaudeCodeHostShell,
  type InstallClaudeCodePluginResult
} from "../hosts/claude-code/install.js";
import {
  installCodexHostShell,
  type InstallCodexHostShellResult
} from "../hosts/codex/install.js";
import { readManagedShellManifest } from "./ownership.js";
import {
  installSharedBrokerHome,
  resolveSharedBrokerHomeLayout,
  type InstallSharedBrokerHomeOptions
} from "./install.js";

export type HostLifecycleStatus =
  | "installed"
  | "updated"
  | "up_to_date"
  | "planned_install"
  | "skipped_not_detected"
  | "skipped_conflict"
  | "failed";

export type UpdateLifecycleResult = {
  command: "update";
  status: "success" | "degraded_success" | "failed";
  dryRun: boolean;
  sharedHome: {
    path: string;
    status: "installed" | "updated" | "planned";
  };
  hosts: Array<{
    name: "claude-code" | "codex";
    status: HostLifecycleStatus;
    reason?: string;
  }>;
  warnings: string[];
};

export type UpdateSharedBrokerHomeOptions = InstallSharedBrokerHomeOptions & {
  claudeCodeInstallDirectory?: string;
  codexInstallDirectory?: string;
  dryRun?: boolean;
};

type HostLifecycleEntry = UpdateLifecycleResult["hosts"][number];

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function statusCountsAsSuccess(status: HostLifecycleStatus): boolean {
  return (
    status === "installed" ||
    status === "updated" ||
    status === "up_to_date" ||
    status === "planned_install" ||
    status === "skipped_not_detected"
  );
}

function resolveOverallStatus(hosts: HostLifecycleEntry[]): UpdateLifecycleResult["status"] {
  const problemCount = hosts.filter(
    (host) => host.status === "skipped_conflict" || host.status === "failed"
  ).length;

  if (problemCount === 0) {
    return "success";
  }

  const successCount = hosts.filter((host) => statusCountsAsSuccess(host.status)).length;
  return successCount > 0 ? "degraded_success" : "failed";
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

async function installHostShell(
  name: "claude-code" | "codex",
  installDirectory: string,
  brokerHomeDirectory: string,
  projectRoot: string | undefined
): Promise<InstallClaudeCodePluginResult | InstallCodexHostShellResult> {
  if (name === "claude-code") {
    return installClaudeCodeHostShell({
      installDirectory,
      brokerHomeDirectory,
      projectRoot
    });
  }

  return installCodexHostShell({
    installDirectory,
    brokerHomeDirectory
  });
}

async function updateHost(
  name: "claude-code" | "codex",
  installDirectory: string | undefined,
  options: UpdateSharedBrokerHomeOptions,
  warnings: string[]
): Promise<HostLifecycleEntry | undefined> {
  if (installDirectory === undefined) {
    return undefined;
  }

  const manifestState = await readManagedShellManifest(installDirectory);

  if (manifestState.status === "foreign") {
    warnings.push(`${name}: ${conflictReason(manifestState)}`);
    return {
      name,
      status: "skipped_conflict",
      reason: conflictReason(manifestState)
    };
  }

  if (
    manifestState.status === "invalid-json" ||
    manifestState.status === "invalid-manifest" ||
    manifestState.status === "unreadable"
  ) {
    warnings.push(`${name}: ${conflictReason(manifestState)}`);
    return {
      name,
      status: "skipped_conflict",
      reason: conflictReason(manifestState)
    };
  }

  const wasManaged = manifestState.status === "managed";
  if (options.dryRun) {
    return {
      name,
      status: wasManaged ? "up_to_date" : "planned_install"
    };
  }

  try {
    await installHostShell(
      name,
      installDirectory,
      options.brokerHomeDirectory,
      options.projectRoot
    );

    return {
      name,
      status: wasManaged ? "updated" : "installed"
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnings.push(`${name}: ${reason}`);
    return {
      name,
      status: "failed",
      reason
    };
  }
}

export async function updateSharedBrokerHome(
  options: UpdateSharedBrokerHomeOptions
): Promise<UpdateLifecycleResult> {
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const sharedHomeExists = await pathExists(sharedHomeLayout.packageJsonPath);
  const warnings: string[] = [];

  if (!options.dryRun) {
    await installSharedBrokerHome({
      brokerHomeDirectory: options.brokerHomeDirectory,
      projectRoot: options.projectRoot
    });
  }

  const hosts = (
    await Promise.all([
      updateHost("claude-code", options.claudeCodeInstallDirectory, options, warnings),
      updateHost("codex", options.codexInstallDirectory, options, warnings)
    ])
  ).filter((host): host is HostLifecycleEntry => host !== undefined);

  return {
    command: "update",
    status: resolveOverallStatus(hosts),
    dryRun: options.dryRun ?? false,
    sharedHome: {
      path: options.brokerHomeDirectory,
      status: options.dryRun ? "planned" : sharedHomeExists ? "updated" : "installed"
    },
    hosts,
    warnings
  };
}
