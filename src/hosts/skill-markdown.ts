import type { BrokerHost } from "../core/types.js";

type HostShellSkillMarkdownOptions = {
  host: BrokerHost;
  invocationMode: "auto" | "explicit";
  runnerCommand: string;
  maintainedBoundaryExamples?: readonly string[];
};

const BROKER_FIRST_EXAMPLES = [
  "测下这个网站的质量：https://www.baidu.com",
  "QA 这个网站 https://example.com",
  "检查这个网站质量",
  "我有一个想法：做一个自动串起评审和发版的工具",
  "帮我做需求分析并产出设计文档",
  "帮我看看这个需求有没有漏洞",
  "把这个页面转成 markdown: https://example.com/a",
  "convert this webpage to markdown https://example.com/a",
  "find a skill or MCP for website QA",
  "有没有现成 skill 能做这个网站 QA",
  "investigate this site failure with a reusable workflow"
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

function renderExamples(examples: readonly string[]): string {
  return examples.map((example) => `- "${example}"`).join("\n");
}

function renderCommand(runnerCommand: string, payload: object, debug = false): string {
  const prefix = debug ? `${runnerCommand} --debug` : runnerCommand;
  return `\`\`\`bash
${prefix} '${JSON.stringify(payload)}'
\`\`\``;
}

function mergeExamples(
  maintainedBoundaryExamples: readonly string[] | undefined
): readonly string[] {
  return [
    ...new Set([
      ...(maintainedBoundaryExamples ?? []),
      ...BROKER_FIRST_EXAMPLES
    ])
  ];
}

export function buildHostShellSkillMarkdown(
  options: HostShellSkillMarkdownOptions
): string {
  const brokerFirstExamples = mergeExamples(options.maintainedBoundaryExamples);
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

Do not decide whether the request is QA, markdown conversion, requirements analysis, investigation, or capability discovery at the host layer. That selection belongs to the broker after handoff.

## Broker-First (\`broker_first\`)

Use the broker first when the user is asking for:

- a specialized reusable workflow
- capability lookup or install help
- external capability execution instead of ordinary model-native work

Examples:

${renderExamples(brokerFirstExamples)}

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
- If the broker returns \`NO_CANDIDATE\`, offer capability discovery or install help.
- If the broker returns \`WORKFLOW_STAGE_READY\` or \`WORKFLOW_BLOCKED\`, keep following the broker-owned workflow contract instead of switching to a host-native plan.
- If the broker returns \`PREPARE_FAILED\`, explain the failure clearly and do not silently substitute a native tool path.

## Runner Contract

${renderCommand(options.runnerCommand, markdownPayload)}

${renderCommand(options.runnerCommand, debugPayload, true)}

${renderCommand(options.runnerCommand, structuredPayload)}

${renderCommand(options.runnerCommand, workflowResumePayload)}
`;
}
