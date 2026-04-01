import type { BrokerEnvelope } from "./envelope.js";
import type { BrokerRequest, CapabilityQuery } from "./types.js";

type LegacyNormalizeRequestInput = {
  task: string;
  url: string;
};

export type NormalizeRequestInput =
  | LegacyNormalizeRequestInput
  | BrokerEnvelope;

export class UnsupportedBrokerRequestError extends Error {
  readonly code = "UNSUPPORTED_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "UnsupportedBrokerRequestError";
  }
}

export class AmbiguousBrokerRequestError extends Error {
  readonly code = "AMBIGUOUS_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "AmbiguousBrokerRequestError";
  }
}

function isLegacyInput(
  input: NormalizeRequestInput
): input is LegacyNormalizeRequestInput {
  return "task" in input;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function firstUrl(urls: string[] | undefined): string | undefined {
  return urls?.[0];
}

function firstQueryUrl(query: CapabilityQuery): string | undefined {
  const target = query.targets?.find((candidate) => candidate.type === "url");

  return target?.value;
}

function isSocialUrl(url: string | undefined): boolean {
  if (url === undefined) {
    return false;
  }

  return /(?:^|\/\/)(?:x\.com|twitter\.com|t\.co)\//i.test(url);
}

function hasCapabilityKeywords(requestText: string): boolean {
  return /(?:\bskill\b|\bmcp\b|\bplugin\b|\bcapability\b)/i.test(requestText);
}

function hasCapabilityDiscoveryVerb(requestText: string): boolean {
  return /(?:\bfind\b|\bdiscover\b|\bsearch\b|\binstall\b|\brecommend\b|\bget\b)/i.test(
    requestText
  );
}

function looksLikeCapabilityDiscovery(requestText: string): boolean {
  return hasCapabilityKeywords(requestText) && hasCapabilityDiscoveryVerb(requestText);
}

function hasSocialSignal(requestText: string): boolean {
  return /(?:\btweet\b|\bthread\b|\bstatus\b|\btoot\b|\bx post\b|\btwitter\b|\bx\.com\b|\bthreads\.net\b|\bbluesky\b)/i.test(
    requestText
  );
}

function hasRoutingVerb(requestText: string): boolean {
  return /(?:\bturn\b|\bconvert\b|\bsave\b|\bfetch\b|\bgrab\b|\bextract\b|\bpull\b|\bexport\b|\brender\b)/i.test(
    requestText
  );
}

function hasMarkdownTarget(requestText: string): boolean {
  return /(?:\bmarkdown\b|\bas md\b|\bto md\b|\binto md\b)/i.test(requestText);
}

function hasNonMarkdownTarget(requestText: string): boolean {
  return /(?:\bpdf\b|\bplain text\b|\btext file\b|\bhtml\b|\bjson\b|\bcsv\b|\bxml\b)/i.test(
    requestText
  );
}

function looksLikeSocialPost(
  requestText: string,
  url: string | undefined
): boolean {
  return (
    hasRoutingVerb(requestText) &&
    hasMarkdownTarget(requestText) &&
    (isSocialUrl(url) || hasSocialSignal(requestText))
  );
}

function hasWebContentSignal(requestText: string): boolean {
  return /(?:\bwebpage\b|\bweb page\b|\bwebsite\b|\bweb content\b|\barticle\b|\burl\b)/i.test(
    requestText
  );
}

function hasAmbiguousContentSignal(requestText: string): boolean {
  return /(?:\blink\b|\bpost\b|\bpage\b|\barticle\b|\burl\b|\bwebpage\b|\bwebsite\b|\btweet\b|\bthread\b)/i.test(
    requestText
  );
}

function hasWebsiteTargetSignal(
  requestText: string,
  url: string | undefined
): boolean {
  return (
    (url !== undefined && !isSocialUrl(url)) ||
    /(?:\bwebsite\b|\bsite\b|\bweb app\b|\bwebapp\b|\bweb page\b|\bwebpage\b|\bpage\b|网站|站点|网页|页面)/i.test(
      requestText
    )
  );
}

function hasQaSignal(requestText: string): boolean {
  return /(?:\bqa\b|\bquality(?:\s|-)?check(?:ing)?\b|\bquality assurance\b|\btest(?:ing)?\b|\baudit\b|质量|测试|测下|检测)/i.test(
    requestText
  );
}

function hasRequirementSignal(requestText: string): boolean {
  return /(?:需求|requirement(?:s)?\b|\bprd\b|\bproblem statement\b|\bproduct spec\b|\bspecification\b)/i.test(
    requestText
  );
}

function hasStrongIdeaSignal(requestText: string): boolean {
  return /(?:我有一个想法[:：]|i have an idea[:：]|product idea[:：]|startup idea[:：]|想做一个产品|想做个产品|从想法到上线)/i.test(
    requestText
  );
}

function hasWeakIdeaSignal(requestText: string): boolean {
  return /(?:\bidea\b|想法|点子)/i.test(requestText);
}

function hasIdeaWorkflowSignal(requestText: string): boolean {
  return /(?:workflow|ship|launch|build|implement|plan|review|上线|落地|实现|评审|开发)/i.test(
    requestText
  );
}

function hasOrdinaryTextTaskSignal(requestText: string): boolean {
  return /(?:\bsummar(?:ize|y)\b|\bexplain\b|\btranslate\b|\brewrite\b|总结|解释|翻译|改写)/i.test(
    requestText
  );
}

function hasInvestigationSignal(requestText: string): boolean {
  return /(?:\binvestigat(?:e|ing|ion)\b|\bdebug(?:ging)?\b|\broot cause\b|\btroubleshoot(?:ing)?\b|排查|调查|定位|根因|排障)/i.test(
    requestText
  );
}

function hasFailureSignal(requestText: string): boolean {
  return /(?:\bfailure\b|\berror\b|\bbroken\b|\bcrash(?:ed|ing)?\b|\boutage\b|\bbug\b|\bissue\b|故障|报错|异常|挂了|坏了|失败)/i.test(
    requestText
  );
}

function hasCodebaseTargetSignal(requestText: string): boolean {
  return /(?:\bcodebase\b|\brepo(?:sitory)?\b|\bservice\b|\bsystem\b|\bapi\b|代码库|仓库|服务|系统|接口)/i.test(
    requestText
  );
}

function hasRequirementsWorkflowSignal(requestText: string): boolean {
  return /(?:分析|评审|审查|漏洞|风险|缺口|缺陷|\banaly[sz]e\b|\banalysis\b|\breview\b|\bthink through\b|\bgaps?\b|\bholes?\b|\brisks?\b|\bdesign doc(?:ument)?\b)/i.test(
    requestText
  );
}

function hasDesignDocSignal(requestText: string): boolean {
  return /(?:设计文档|\bdesign doc(?:ument)?\b)/i.test(requestText);
}

function looksLikeWebsiteQaRequest(
  requestText: string,
  url: string | undefined
): boolean {
  return (
    hasQaSignal(requestText) &&
    hasWebsiteTargetSignal(requestText, url) &&
    !hasMarkdownTarget(requestText) &&
    !hasNonMarkdownTarget(requestText)
  );
}

function looksLikeRequirementsAnalysisRequest(requestText: string): boolean {
  return (
    hasRequirementSignal(requestText) &&
    hasRequirementsWorkflowSignal(requestText) &&
    !hasMarkdownTarget(requestText) &&
    !hasNonMarkdownTarget(requestText)
  );
}

function looksLikeInvestigationRequest(
  requestText: string,
  url: string | undefined
): boolean {
  return (
    hasInvestigationSignal(requestText) &&
    (hasFailureSignal(requestText) ||
      hasWebsiteTargetSignal(requestText, url) ||
      hasCodebaseTargetSignal(requestText)) &&
    !hasMarkdownTarget(requestText) &&
    !hasNonMarkdownTarget(requestText)
  );
}

function looksLikeUnsupportedConversionTarget(
  requestText: string,
  url: string | undefined
): boolean {
  return (
    hasRoutingVerb(requestText) &&
    hasNonMarkdownTarget(requestText) &&
    (url !== undefined ||
      hasSocialSignal(requestText) ||
      hasWebContentSignal(requestText))
  );
}

function looksLikeWebContent(
  requestText: string,
  url: string | undefined
): boolean {
  return (
    hasRoutingVerb(requestText) &&
    hasMarkdownTarget(requestText) &&
    ((hasWebContentSignal(requestText) && !isSocialUrl(url)) ||
      (url !== undefined && !isSocialUrl(url)))
  );
}

function looksAmbiguous(requestText: string): boolean {
  return (
    hasRoutingVerb(requestText) &&
    !hasMarkdownTarget(requestText) &&
    !hasNonMarkdownTarget(requestText) &&
    hasAmbiguousContentSignal(requestText)
  );
}

function buildBrokerRequest(
  intent: BrokerRequest["intent"],
  url?: string,
  capabilityQuery?: CapabilityQuery
): BrokerRequest {
  const request: BrokerRequest = {
    intent,
    outputMode: "markdown_only",
    capabilityQuery
  };

  if (url !== undefined) {
    request.url = url;
  }

  return request;
}

function hasQueryFamily(query: CapabilityQuery, family: string): boolean {
  return query.jobFamilies?.includes(family) ?? false;
}

function hasQueryArtifact(query: CapabilityQuery, artifact: string): boolean {
  return query.artifacts?.includes(artifact) ?? false;
}

function buildWebsiteQaCapabilityQuery(
  input: BrokerEnvelope,
  url: string | undefined
): CapabilityQuery {
  return {
    kind: "capability_request",
    goal: "qa a website",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: ["quality_assurance"],
    targets:
      url === undefined
        ? undefined
        : [
            {
              type: "website",
              value: url
            }
          ],
    artifacts: ["qa_report"]
  };
}

function buildRequirementsAnalysisCapabilityQuery(
  input: BrokerEnvelope
): CapabilityQuery {
  const normalizedRequestText = normalizeText(input.requestText);
  const wantsDesignDoc = hasDesignDocSignal(normalizedRequestText);

  return {
    kind: "capability_request",
    goal: wantsDesignDoc
      ? "analyze a product requirement and produce a design doc"
      : "analyze a product requirement and identify gaps",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: ["requirements_analysis"],
    targets: [
      {
        type: "problem_statement",
        value: input.requestText
      }
    ],
    artifacts: wantsDesignDoc ? ["design_doc", "analysis"] : ["analysis"]
  };
}

function buildInvestigationCapabilityQuery(
  input: BrokerEnvelope,
  url: string | undefined
): CapabilityQuery {
  const normalizedRequestText = normalizeText(input.requestText);
  const hasWebsiteTarget = hasWebsiteTargetSignal(normalizedRequestText, url);
  const hasCodebaseTarget = hasCodebaseTargetSignal(normalizedRequestText);

  return {
    kind: "capability_request",
    goal: hasWebsiteTarget
      ? "investigate a site failure and identify root cause"
      : hasCodebaseTarget
        ? "investigate a codebase issue and identify root cause"
        : "investigate a failure and identify root cause",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: ["investigation"],
    targets:
      url !== undefined && !isSocialUrl(url)
        ? [
            {
              type: "website",
              value: url
            }
          ]
        : hasCodebaseTarget
          ? [
              {
                type: "codebase",
                value: input.requestText
              }
            ]
          : [
              {
                type: "problem_statement",
                value: input.requestText
              }
            ],
    artifacts: ["analysis", "recommendation"]
  };
}

function buildIdeaWorkflowCapabilityQuery(
  input: BrokerEnvelope
): CapabilityQuery {
  return {
    kind: "capability_request",
    goal: "turn a product idea into a reviewed execution plan",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: [
      "idea_brainstorming",
      "requirements_analysis",
      "strategy_review",
      "engineering_review"
    ],
    targets: [
      {
        type: "problem_statement",
        value: input.requestText
      }
    ],
    artifacts: ["design_doc", "analysis", "execution_plan"]
  };
}

function normalizeCapabilityQueryRequest(
  query: CapabilityQuery
): BrokerRequest {
  const url = firstQueryUrl(query);
  const capabilityWorkflowFamilies = [
    "capability_acquisition",
    "requirements_analysis",
    "idea_brainstorming",
    "quality_assurance",
    "investigation"
  ];

  if (
    hasQueryArtifact(query, "markdown") &&
    (hasQueryFamily(query, "social_content_conversion") || isSocialUrl(url))
  ) {
    return buildBrokerRequest("social_post_to_markdown", url, query);
  }

  if (
    hasQueryArtifact(query, "markdown") &&
    (hasQueryFamily(query, "web_content_conversion") ||
      hasQueryFamily(query, "content_acquisition") ||
      url !== undefined)
  ) {
    return buildBrokerRequest("web_content_to_markdown", url, query);
  }

  if (
    query.preferredCapability !== undefined ||
    capabilityWorkflowFamilies.some((family) => hasQueryFamily(query, family)) ||
    hasQueryArtifact(query, "design_doc") ||
    hasQueryArtifact(query, "analysis") ||
    hasQueryArtifact(query, "qa_report") ||
    hasQueryArtifact(query, "recommendation") ||
    hasQueryArtifact(query, "installation_plan")
  ) {
    return buildBrokerRequest("capability_discovery_or_install", undefined, query);
  }

  throw new UnsupportedBrokerRequestError(
    `Unsupported broker capability query: ${query.requestText}`
  );
}

function normalizeEnvelopeRequest(input: BrokerEnvelope): BrokerRequest {
  if (input.capabilityQuery !== undefined) {
    return normalizeCapabilityQueryRequest(input.capabilityQuery);
  }

  const requestText = normalizeText(input.requestText);
  const url = firstUrl(input.urls);

  if (looksLikeCapabilityDiscovery(requestText)) {
    return buildBrokerRequest("capability_discovery_or_install");
  }

  if (hasStrongIdeaSignal(requestText) || (hasWeakIdeaSignal(requestText) && hasIdeaWorkflowSignal(requestText))) {
    return buildBrokerRequest(
      "capability_discovery_or_install",
      undefined,
      buildIdeaWorkflowCapabilityQuery(input)
    );
  }

  if (looksLikeUnsupportedConversionTarget(requestText, url)) {
    throw new UnsupportedBrokerRequestError(
      `Unsupported broker request: ${input.requestText}`
    );
  }

  if (looksLikeSocialPost(requestText, url)) {
    return buildBrokerRequest("social_post_to_markdown", url);
  }

  if (looksLikeWebContent(requestText, url)) {
    return buildBrokerRequest("web_content_to_markdown", url);
  }

  if (looksLikeRequirementsAnalysisRequest(requestText)) {
    return buildBrokerRequest(
      "capability_discovery_or_install",
      undefined,
      buildRequirementsAnalysisCapabilityQuery(input)
    );
  }

  if (looksLikeInvestigationRequest(requestText, url)) {
    return buildBrokerRequest(
      "capability_discovery_or_install",
      undefined,
      buildInvestigationCapabilityQuery(input, url)
    );
  }

  if (looksLikeWebsiteQaRequest(requestText, url)) {
    return buildBrokerRequest(
      "capability_discovery_or_install",
      undefined,
      buildWebsiteQaCapabilityQuery(input, url)
    );
  }

  if (looksAmbiguous(requestText)) {
    throw new AmbiguousBrokerRequestError(
      `Ambiguous broker request: ${input.requestText}`
    );
  }

  if (hasWeakIdeaSignal(requestText) && !hasOrdinaryTextTaskSignal(requestText)) {
    throw new AmbiguousBrokerRequestError(
      `Ambiguous broker request: ${input.requestText}`
    );
  }

  throw new UnsupportedBrokerRequestError(
    `Unsupported broker request: ${input.requestText}`
  );
}

export function normalizeRequest(
  input: NormalizeRequestInput
): BrokerRequest {
  if (isLegacyInput(input)) {
    const normalizedTask = input.task.trim();

    if (normalizedTask !== "turn this webpage into markdown") {
      throw new UnsupportedBrokerRequestError(
        `Unsupported broker task: ${input.task}`
      );
    }

    return buildBrokerRequest("web_content_to_markdown", input.url);
  }

  return normalizeEnvelopeRequest(input);
}
