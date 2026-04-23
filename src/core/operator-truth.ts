export type OperatorTruthContract = {
  supportedHosts: readonly string[];
  deferredHosts: readonly string[];
  heroLane: "website QA";
  secondProvenFamily: "web markdown";
  thirdProvenFamily: "social markdown";
  lifecycleCommands: readonly string[];
  thirdHostReadinessTokens: readonly string[];
  fullLifecycleParity: {
    en: string;
    zh: string;
  };
};

export const OPERATOR_TRUTH_CONTRACT = {
  supportedHosts: ["Claude Code", "Codex", "OpenCode"],
  deferredHosts: [],
  heroLane: "website QA",
  secondProvenFamily: "web markdown",
  thirdProvenFamily: "social markdown",
  lifecycleCommands: [
    "npx skills-broker update",
    "npx skills-broker doctor",
    "npx skills-broker remove"
  ],
  thirdHostReadinessTokens: [
    "shared broker home",
    "thin host shell",
    "proof/reuse state"
  ],
  fullLifecycleParity: {
    en: "Claude Code, Codex, and OpenCode now share full published lifecycle and proof/reuse parity.",
    zh: "Claude Code、Codex、OpenCode 现在已经共享完整的发布态 lifecycle 与 proof/reuse parity。"
  }
} as const satisfies OperatorTruthContract;

export function formatSupportedHostsLine(): string {
  return `Supported now: ${OPERATOR_TRUTH_CONTRACT.supportedHosts.join(", ")}`;
}

export function formatDeferredHostsLine(): string {
  if (OPERATOR_TRUTH_CONTRACT.deferredHosts.length === 0) {
    return "Deferred but planned: none.";
  }

  return `Deferred but planned: ${OPERATOR_TRUTH_CONTRACT.deferredHosts.join(", ")} thin host shell`;
}

export function formatPublishedLifecycleCommandsLine(): string {
  return `Published lifecycle commands: ${OPERATOR_TRUTH_CONTRACT.lifecycleCommands.join(" / ")}`;
}

export function formatFullLifecycleParityLine(): string {
  return OPERATOR_TRUTH_CONTRACT.fullLifecycleParity.en;
}

export function formatThirdHostReadinessLine(): string {
  return `All supported hosts now share the same ${OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens.join(", ")}, and published lifecycle contract.`;
}

export function formatSupportedHostsZhLine(): string {
  return `现在支持：${OPERATOR_TRUTH_CONTRACT.supportedHosts.join("、")}`;
}

export function formatDeferredHostsZhLine(): string {
  if (OPERATOR_TRUTH_CONTRACT.deferredHosts.length === 0) {
    return "已 defer 但计划中：无。";
  }

  return `已 defer 但计划中：${OPERATOR_TRUTH_CONTRACT.deferredHosts.join("、")} 薄宿主壳`;
}

export function formatPublishedLifecycleCommandsZhLine(): string {
  return `发布态 lifecycle 命令统一为：${OPERATOR_TRUTH_CONTRACT.lifecycleCommands.join(" / ")}`;
}

export function formatFullLifecycleParityZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.fullLifecycleParity.zh;
}

export function formatThirdHostReadinessZhLine(): string {
  return `三个支持宿主现在已经共享同一套 ${OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens.join("、")} 与发布态 lifecycle 合同。`;
}
