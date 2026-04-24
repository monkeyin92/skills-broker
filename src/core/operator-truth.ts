export type OperatorTruthContract = {
  supportedHosts: readonly string[];
  deferredHosts: readonly string[];
  heroLane: "website QA";
  secondProvenFamily: "web markdown";
  thirdProvenFamily: "social markdown";
  qaFirstFamilyLoop: {
    en: string;
    zh: string;
  };
  postQaNextLoop: {
    en: string;
    zh: string;
  };
  lifecycleCommands: readonly string[];
  thirdHostReadinessTokens: readonly string[];
  coarseBoundary: {
    en: string;
    zh: string;
  };
  websiteQaProofSurface: {
    en: string;
    zh: string;
  };
  familyLoopProofSurface: {
    en: string;
    zh: string;
  };
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
  qaFirstFamilyLoop: {
    en: "QA-first family loop: website QA first, web markdown second, social markdown third.",
    zh: "QA-first family loop：先 website QA，再 web markdown，最后 social markdown。"
  },
  postQaNextLoop: {
    en: "After a successful website QA proof, the next proven loop to run is web markdown. After web markdown, social markdown is the next proven loop.",
    zh: "当 website QA proof 已成立后，下一条该跑的 proven loop 是 web markdown；完成之后，social markdown 是再下一条。"
  },
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
  coarseBoundary: {
    en: "Hosts choose only `broker_first`, `handle_normally`, or `clarify_before_broker`; the broker still chooses the concrete QA winner.",
    zh: "宿主只选择 `broker_first` / `handle_normally` / `clarify_before_broker`；具体 QA winner 仍由 broker 决定。"
  },
  websiteQaProofSurface: {
    en: "`doctor` now exposes a website QA adoption packet: recent routing evidence, freshness, and separate repeat-usage / cross-host reuse proof states.",
    zh: "`doctor` 现在会直接输出一份 website QA adoption packet：近期 routing evidence、freshness，以及拆开的 repeat usage / cross-host reuse proof state。"
  },
  familyLoopProofSurface: {
    en: "`doctor` now exposes a QA-first family-loop packet: website QA adoption plus web markdown/social markdown freshness, reuse, and sequence-aware next actions.",
    zh: "`doctor` 现在会直接输出一份 QA-first family-loop packet：包含 website QA adoption，以及 web markdown / social markdown 的 freshness、reuse 与按顺序排列的 next action。"
  },
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

export function formatQaFirstFamilyLoopLine(): string {
  return OPERATOR_TRUTH_CONTRACT.qaFirstFamilyLoop.en;
}

export function formatPostQaNextLoopLine(): string {
  return OPERATOR_TRUTH_CONTRACT.postQaNextLoop.en;
}

export function formatCoarseBoundaryLine(): string {
  return OPERATOR_TRUTH_CONTRACT.coarseBoundary.en;
}

export function formatWebsiteQaProofSurfaceLine(): string {
  return OPERATOR_TRUTH_CONTRACT.websiteQaProofSurface.en;
}

export function formatFamilyLoopProofSurfaceLine(): string {
  return OPERATOR_TRUTH_CONTRACT.familyLoopProofSurface.en;
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

export function formatQaFirstFamilyLoopZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.qaFirstFamilyLoop.zh;
}

export function formatPostQaNextLoopZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.postQaNextLoop.zh;
}

export function formatCoarseBoundaryZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.coarseBoundary.zh;
}

export function formatWebsiteQaProofSurfaceZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.websiteQaProofSurface.zh;
}

export function formatFamilyLoopProofSurfaceZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.familyLoopProofSurface.zh;
}

export function formatFullLifecycleParityZhLine(): string {
  return OPERATOR_TRUTH_CONTRACT.fullLifecycleParity.zh;
}

export function formatThirdHostReadinessZhLine(): string {
  return `三个支持宿主现在已经共享同一套 ${OPERATOR_TRUTH_CONTRACT.thirdHostReadinessTokens.join("、")} 与发布态 lifecycle 合同。`;
}
