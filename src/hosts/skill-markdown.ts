import type { BrokerHost } from "../core/types.js";
import {
  formatCoarseBoundaryLine,
  OPERATOR_TRUTH_CONTRACT,
  formatFullLifecycleParityLine,
  formatPublishedLifecycleCommandsLine,
  formatSupportedHostsLine,
  formatThirdHostReadinessLine
} from "../core/operator-truth.js";

type HostShellSkillMarkdownOptions = {
  host: BrokerHost;
  invocationMode: "auto" | "explicit";
  runnerCommand: string;
  maintainedBoundaryExamples?: readonly string[];
};

const WEBSITE_QA_HERO_EXAMPLES = [
  "测下这个网站的质量：https://www.baidu.com",
  "QA 这个网站 https://example.com",
  "QA this website https://example.com",
  "检查这个网站质量",
  "find a skill or MCP for website QA",
  "有没有现成 skill 能做这个网站 QA"
] as const;

const OTHER_BROKER_FIRST_EXAMPLES = [
  "我有一个想法：做一个自动串起评审和发版的工具",
  "帮我做需求分析并产出设计文档",
  "帮我看看这个需求有没有漏洞",
  "investigate this site failure with a reusable workflow"
] as const;

const WEB_MARKDOWN_SECOND_PROVEN_EXAMPLES = [
  "把这个页面转成 markdown: https://example.com/a",
  "convert this webpage to markdown https://example.com/a"
] as const;

const SOCIAL_MARKDOWN_THIRD_PROVEN_EXAMPLES = [
  "save this X post as markdown: https://x.com/example/status/1",
  "把这个帖子转成 markdown: https://x.com/example/status/1"
] as const;

const HANDLE_NORMALLY_EXAMPLES = [
  "总结一下这个网页讲了什么",
  "Explain this TypeScript error",
  "帮我翻译这段话",
  "写一封邮件回复客户",
  "这个网站怎么样",
  "check this code",
  "what is on this page",
  "save this webpage as pdf"
] as const;

const CLARIFY_BEFORE_BROKER_EXAMPLES = [
  "check this page",
  "看下这个页面",
  "look at this url",
  "检查一下这个链接",
  "test this",
  "帮我分析一下"
] as const;

const {
  heroLane: HERO_LANE,
  secondProvenFamily: SECOND_PROVEN_FAMILY,
  thirdProvenFamily: THIRD_PROVEN_FAMILY
} = OPERATOR_TRUTH_CONTRACT;

function renderExamples(examples: readonly string[]): string {
  return examples.map((example) => `- "${example}"`).join("\n");
}

function renderCommand(runnerCommand: string, payload: object, debug = false): string {
  const prefix = debug ? `${runnerCommand} --debug` : runnerCommand;
  return `\`\`\`bash
${prefix} '${JSON.stringify(payload)}'
\`\`\``;
}

function partitionExamples(
  maintainedBoundaryExamples: readonly string[] | undefined
): {
  heroExamples: readonly string[];
  secondaryMaintainedExamples: readonly string[];
  otherBrokerFirstExamples: readonly string[];
} {
  const uniqueMaintainedExamples = Array.from(
    new Set(maintainedBoundaryExamples ?? [])
  );
  const heroExamples = Array.from(
    new Set([
      ...WEBSITE_QA_HERO_EXAMPLES,
      ...uniqueMaintainedExamples.filter((example) =>
        WEBSITE_QA_HERO_EXAMPLES.includes(
          example as (typeof WEBSITE_QA_HERO_EXAMPLES)[number]
        )
      )
    ])
  );
  const secondaryMaintainedExamples = uniqueMaintainedExamples.filter(
    (example) => !heroExamples.includes(example)
  );

  return {
    heroExamples,
    secondaryMaintainedExamples: Array.from(
      new Set([
        ...WEB_MARKDOWN_SECOND_PROVEN_EXAMPLES,
        ...SOCIAL_MARKDOWN_THIRD_PROVEN_EXAMPLES,
        ...secondaryMaintainedExamples
      ])
    ),
    otherBrokerFirstExamples: OTHER_BROKER_FIRST_EXAMPLES
  };
}

export function buildHostShellSkillMarkdown(
  options: HostShellSkillMarkdownOptions
): string {
  const {
    heroExamples,
    secondaryMaintainedExamples,
    otherBrokerFirstExamples
  } = partitionExamples(options.maintainedBoundaryExamples);
  const markdownPayload = {
    requestText: "turn this webpage into markdown: https://example.com/article",
    host: options.host,
    invocationMode: options.invocationMode,
    urls: ["https://example.com/article"]
  };
  const debugPayload = {
    requestText: "QA this website https://example.com",
    host: options.host,
    invocationMode: options.invocationMode,
    urls: ["https://example.com"]
  };
  const structuredPayload = {
    requestText: "帮我做需求分析并产出设计文档",
    host: options.host,
    invocationMode: options.invocationMode,
    capabilityQuery: {
      kind: "capability_request",
      goal: "analyze a product requirement and produce a design doc",
      host: options.host,
      requestText: "帮我做需求分析并产出设计文档",
      jobFamilies: ["requirements_analysis"],
      artifacts: ["design_doc"]
    }
  };
  const workflowResumePayload = {
    requestText: "继续这个 workflow",
    host: options.host,
    invocationMode: options.invocationMode,
    workflowResume: {
      runId: "run-123",
      stageId: "office-hours",
      decision: "confirm",
      artifacts: ["design_doc", "analysis"]
    }
  };
  const executionFailureRetryPayload = {
    requestText: "turn this webpage into markdown: https://example.com/article",
    host: options.host,
    invocationMode: options.invocationMode,
    urls: ["https://example.com/article"],
    executionFailures: [
      {
        candidateId: "web-content-to-markdown",
        packageId: "baoyu",
        leafCapabilityId: "baoyu.url-to-markdown",
        implementationId: "baoyu.url_to_markdown",
        reasonCode: "dependency_broken",
        evidence: "Cannot find module jsdom/xhr-sync-worker.js"
      }
    ]
  };

  return `---
name: "skills-broker"
description: "Route coarse capability-boundary decisions through skills-broker. Use when the host should decide between broker_first, handle_normally, and clarify_before_broker for reusable workflows, capability lookup, or external capability execution. The host decides only the boundary; the broker chooses the package, workflow, skill, or MCP. Handle ordinary chat, coding, translation, summarization, and drafting normally."
---

# Skills Broker

Use this skill only at the coarse broker boundary.

The host decides only one of these boundary outcomes:

- \`broker_first\`
- \`handle_normally\`
- \`clarify_before_broker\`

${formatCoarseBoundaryLine()}

Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer. That selection belongs to the broker after handoff.

## Supported Host Truth

- ${formatSupportedHostsLine()}
- ${formatFullLifecycleParityLine()}
- ${formatPublishedLifecycleCommandsLine()}
- ${formatThirdHostReadinessLine()}

## Broker-First (\`broker_first\`)

Use the broker first when the user is asking for:

- a specialized reusable workflow
- capability lookup or install help
- external capability execution instead of ordinary model-native work

If you need one concrete broker-first example to calibrate the boundary, start with ${HERO_LANE}.

Treat the examples below as semantic anchors, not literal trigger phrases.

- Minor wording changes that preserve the same intent should keep the same boundary decision.
- Prefer semantic judgment over exact string overlap.
- If the user clearly wants ${HERO_LANE}, requirements analysis, investigation, or capability lookup, choose \`broker_first\` even when the wording is a paraphrase rather than one of the example sentences.

### Hero lane: ${HERO_LANE}

Start here when you need one first-use path that proves the host shell is routing correctly.

- If the user clearly wants a website tested, or wants help finding/installing the ${HERO_LANE} winner, choose \`broker_first\`.
- Keep ${HERO_LANE} visually first. It is the QA default-entry lane and the calibration lane. Other maintained lanes are still valid, but secondary.

Examples:

${renderExamples(heroExamples)}

### Secondary maintained lanes

The second proven family is ${SECOND_PROVEN_FAMILY}. Keep it visible here after ${HERO_LANE}, not as a competing first move.
The next proven family is ${THIRD_PROVEN_FAMILY}. Keep it visible after ${SECOND_PROVEN_FAMILY}, not as a competing first move.

Requirements analysis and investigation still stay broker-first. They are maintained lanes, but they should not be the first thing this installed shell makes you try.

Examples:

${renderExamples(secondaryMaintainedExamples)}

### Other broker-first lanes

Use the broker first for other reusable capability execution too, including broader workflow or capability lookup paths.

Examples:

${renderExamples(otherBrokerFirstExamples)}

## Handle Normally (\`handle_normally\`)

Keep the request in the host when it is ordinary model-native work, such as:

- summarization
- coding help
- translation
- drafting
- casual inspection without workflow intent

Examples:

${renderExamples(HANDLE_NORMALLY_EXAMPLES)}

## Clarify Before Broker (\`clarify_before_broker\`)

Do not silently broker vague phrases. Ask a short clarifying question first when the request is missing workflow shape, target, or artifact clues.

Examples:

${renderExamples(CLARIFY_BEFORE_BROKER_EXAMPLES)}

## Host Contract

When this skill is loaded:

1. preserve the user's original wording
2. choose only \`broker_first\`, \`handle_normally\`, or \`clarify_before_broker\`
3. do not pick a package, workflow family, skill, or MCP at the host layer
4. if the request looks broker-first, build a broker envelope with raw request text plus safe hints
5. when confident, optionally include a structured \`capabilityQuery\`
6. forward that envelope to the local broker runner
7. if the request is ordinary model-native work, keep it in the host's normal flow
8. if the request is too vague, ask a short clarifying question before brokering
9. do not silently substitute a host-native fetch, browsing, or install path when broker routing should decide
10. when resuming a broker-owned workflow stage that lists \`producesArtifacts\`, include only the artifacts actually produced in \`workflowResume.artifacts\`

## Capability Query Contract

When you can confidently normalize the request, \`capabilityQuery\` is optional but preferred.

Use this shape:

\`\`\`json
${JSON.stringify(structuredPayload.capabilityQuery, null, 2)}
\`\`\`

If you are not confident, omit \`capabilityQuery\` and still send the raw envelope.

## Decline Contract

- If the broker returns \`UNSUPPORTED_REQUEST\`, continue normally.
- If the broker returns \`AMBIGUOUS_REQUEST\`, ask a clarifying question.
- If the broker returns \`NO_CANDIDATE\`, offer capability discovery help.
- If the broker returns \`INSTALL_REQUIRED\`, offer package install help using the broker-provided install plan, verify it, then rerun the same request.
- If the broker returns \`HANDOFF_READY\`, keep the broker-selected downstream path as the source of truth.
- If \`handoff.localSkill.skillFilePath\` is present, read that \`SKILL.md\` from disk and execute it directly.
- Only invoke a downstream skill by name when it is already listed by the host.
- If the broker-selected downstream skill fails because the skill itself or its required runtime dependencies are broken or unusable, rerun the broker with the same request plus \`executionFailures\` describing that failed downstream candidate.
- Do not silently substitute a host-native fallback while retrying broker-owned downstream selection.
- If the broker returns \`WORKFLOW_STAGE_READY\` or \`WORKFLOW_BLOCKED\`, keep following the broker-owned workflow contract instead of switching to a host-native plan.
- If the broker returns \`PREPARE_FAILED\`, explain the failure clearly and do not silently substitute a native tool path.

## Runner Contract

${renderCommand(options.runnerCommand, debugPayload, true)}

${renderCommand(options.runnerCommand, markdownPayload)}

${renderCommand(options.runnerCommand, structuredPayload)}

${renderCommand(options.runnerCommand, workflowResumePayload)}

${renderCommand(options.runnerCommand, executionFailureRetryPayload)}
`;
}
