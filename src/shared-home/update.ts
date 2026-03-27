import {
  installClaudeCodeHostShell,
  type InstallClaudeCodePluginResult
} from "../hosts/claude-code/install.js";
import {
  installCodexHostShell,
  type InstallCodexHostShellResult
} from "../hosts/codex/install.js";
import {
  installSharedBrokerHome,
  type InstallSharedBrokerHomeOptions,
  type InstallSharedBrokerHomeResult
} from "./install.js";

export type UpdateSharedBrokerHomeOptions = InstallSharedBrokerHomeOptions & {
  claudeCodeInstallDirectory?: string;
  codexInstallDirectory?: string;
};

export type UpdateSharedBrokerHomeResult = {
  sharedHome: InstallSharedBrokerHomeResult;
  claudeCodeShell?: InstallClaudeCodePluginResult;
  codexShell?: InstallCodexHostShellResult;
};

export async function updateSharedBrokerHome(
  options: UpdateSharedBrokerHomeOptions
): Promise<UpdateSharedBrokerHomeResult> {
  const sharedHome = await installSharedBrokerHome({
    brokerHomeDirectory: options.brokerHomeDirectory,
    projectRoot: options.projectRoot
  });

  const claudeCodeShell =
    options.claudeCodeInstallDirectory === undefined
      ? undefined
      : await installClaudeCodeHostShell({
          installDirectory: options.claudeCodeInstallDirectory,
          brokerHomeDirectory: options.brokerHomeDirectory,
          projectRoot: options.projectRoot
        });

  const codexShell =
    options.codexInstallDirectory === undefined
      ? undefined
      : await installCodexHostShell({
          installDirectory: options.codexInstallDirectory,
          brokerHomeDirectory: options.brokerHomeDirectory
        });

  return {
    sharedHome,
    claudeCodeShell,
    codexShell
  };
}
