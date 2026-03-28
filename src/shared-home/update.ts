import { access, readdir, stat } from "node:fs/promises";
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
import { detectLifecycleHostTargets } from "./paths.js";

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
    status: "installed" | "updated" | "planned" | "failed";
    reason?: string;
  };
  hosts: Array<{
    name: "claude-code" | "codex";
    status: HostLifecycleStatus;
    reason?: string;
  }>;
  warnings: string[];
};

export type UpdateSharedBrokerHomeOptions = InstallSharedBrokerHomeOptions & {
  homeDirectory?: string;
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

function sharedHomeCountsAsSuccess(
  status: UpdateLifecycleResult["sharedHome"]["status"]
): boolean {
  return status === "installed" || status === "updated" || status === "planned";
}

function resolveOverallStatus(
  sharedHome: UpdateLifecycleResult["sharedHome"],
  hosts: HostLifecycleEntry[]
): UpdateLifecycleResult["status"] {
  if (sharedHome.status === "failed") {
    return "failed";
  }

  const problemCount = hosts.filter(
    (host) => host.status === "skipped_conflict" || host.status === "failed"
  ).length;

  if (problemCount === 0) {
    return "success";
  }

  const successCount =
    (sharedHomeCountsAsSuccess(sharedHome.status) ? 1 : 0) +
    hosts.filter((host) => statusCountsAsSuccess(host.status)).length;
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

async function detectUnmanagedHostConflict(
  name: "claude-code" | "codex",
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

  const knownHostFiles =
    name === "claude-code"
      ? ["SKILL.md", "package.json", ".claude-plugin", "skills", "bin"]
      : ["SKILL.md", "bin", ".skills-broker.json"];

  if (entries.some((entry) => knownHostFiles.includes(entry)) || entries.length > 0) {
    return "existing unmanaged host directory";
  }

  return undefined;
}

async function updateHost(
  name: "claude-code" | "codex",
  installDirectory: string | undefined,
  notDetectedReason: string | undefined,
  options: UpdateSharedBrokerHomeOptions,
  warnings: string[]
): Promise<HostLifecycleEntry> {
  if (installDirectory === undefined) {
    return {
      name,
      status: "skipped_not_detected",
      reason: notDetectedReason
    };
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
  if (manifestState.status === "absent") {
    const unmanagedConflictReason = await detectUnmanagedHostConflict(name, installDirectory);

    if (unmanagedConflictReason !== undefined) {
      warnings.push(`${name}: ${unmanagedConflictReason}`);
      return {
        name,
        status: "skipped_conflict",
        reason: unmanagedConflictReason
      };
    }
  }

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
  const hostTargets = await detectLifecycleHostTargets({
    homeDirectory: options.homeDirectory,
    brokerHomeOverride: options.brokerHomeDirectory,
    claudeDirOverride: options.claudeCodeInstallDirectory,
    codexDirOverride: options.codexInstallDirectory
  });
  const sharedHomeLayout = resolveSharedBrokerHomeLayout(options.brokerHomeDirectory);
  const sharedHomeExists = await pathExists(sharedHomeLayout.packageJsonPath);
  const warnings: string[] = [];
  let sharedHome: UpdateLifecycleResult["sharedHome"] = {
    path: options.brokerHomeDirectory,
    status: options.dryRun ? "planned" : sharedHomeExists ? "updated" : "installed"
  };

  if (!options.dryRun) {
    try {
      await installSharedBrokerHome({
        brokerHomeDirectory: options.brokerHomeDirectory,
        projectRoot: options.projectRoot
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warnings.push(`shared-home: ${reason}`);
      sharedHome = {
        path: options.brokerHomeDirectory,
        status: "failed",
        reason
      };
    }
  }

  const hosts =
    sharedHome.status === "failed"
      ? [
          {
            name: "claude-code" as const,
            status:
              hostTargets.claudeCode.installDirectory === undefined
                ? ("skipped_not_detected" as const)
                : ("failed" as const),
            reason:
              hostTargets.claudeCode.installDirectory === undefined
                ? hostTargets.claudeCode.reason
                : sharedHome.reason
          },
          {
            name: "codex" as const,
            status:
              hostTargets.codex.installDirectory === undefined
                ? ("skipped_not_detected" as const)
                : ("failed" as const),
            reason:
              hostTargets.codex.installDirectory === undefined
                ? hostTargets.codex.reason
                : sharedHome.reason
          }
        ]
      : await Promise.all([
          updateHost(
            "claude-code",
            hostTargets.claudeCode.installDirectory,
            hostTargets.claudeCode.reason,
            options,
            warnings
          ),
          updateHost(
            "codex",
            hostTargets.codex.installDirectory,
            hostTargets.codex.reason,
            options,
            warnings
          )
        ]);

  return {
    command: "update",
    status: resolveOverallStatus(sharedHome, hosts),
    dryRun: options.dryRun ?? false,
    sharedHome,
    hosts,
    warnings
  };
}
