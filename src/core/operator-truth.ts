export type OperatorTruthContract = {
  supportedHosts: readonly string[];
  deferredHosts: readonly string[];
  heroLane: "website QA";
  secondProvenFamily: "web markdown";
  lifecycleCommands: readonly string[];
  thirdHostReadinessTokens: readonly string[];
};

export const OPERATOR_TRUTH_CONTRACT = {
  supportedHosts: ["Claude Code", "Codex"],
  deferredHosts: ["OpenCode"],
  heroLane: "website QA",
  secondProvenFamily: "web markdown",
  lifecycleCommands: [
    "npx skills-broker update",
    "npx skills-broker doctor",
    "npx skills-broker remove"
  ],
  thirdHostReadinessTokens: [
    "shared broker home",
    "thin host shell",
    "proof/reuse state"
  ]
} as const satisfies OperatorTruthContract;

export function formatSupportedHostsLine(): string {
  return `Supported now: ${OPERATOR_TRUTH_CONTRACT.supportedHosts.join(", ")}`;
}

export function formatDeferredHostsLine(): string {
  return `Deferred but planned: ${OPERATOR_TRUTH_CONTRACT.deferredHosts.join(", ")} thin host shell`;
}

export function formatPublishedLifecycleCommandsLine(): string {
  return `Published lifecycle commands: ${OPERATOR_TRUTH_CONTRACT.lifecycleCommands.join(" / ")}`;
}

export function formatThirdHostReadinessLine(): string {
  return `Third-host readiness stays gated on the same ${OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens.join(", ")}, and published lifecycle parity.`;
}

export function formatSupportedHostsZhLine(): string {
  return `现在支持：${OPERATOR_TRUTH_CONTRACT.supportedHosts.join("、")}`;
}

export function formatDeferredHostsZhLine(): string {
  return `已 defer 但计划中：${OPERATOR_TRUTH_CONTRACT.deferredHosts.join("、")} 薄宿主壳`;
}

export function formatPublishedLifecycleCommandsZhLine(): string {
  return `发布态 lifecycle 命令统一为：${OPERATOR_TRUTH_CONTRACT.lifecycleCommands.join(" / ")}`;
}

export function formatThirdHostReadinessZhLine(): string {
  return `第三宿主 readiness 继续受同一套 ${OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens.join("、")} 与 published lifecycle parity 约束。`;
}
