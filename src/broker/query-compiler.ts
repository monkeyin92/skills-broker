import type { BrokerEnvelope } from "../core/envelope.js";
import type {
  BrokerHost,
  BrokerIntent,
  CapabilityQuery,
  QueryBackedBrokerRequest
} from "../core/types.js";

type QuerySynthesisInput = {
  host: BrokerHost;
  requestText: string;
};

export type CompileEnvelopeRequestResult =
  | {
      kind: "compiled";
      capabilityQuery: CapabilityQuery;
    }
  | {
      kind: "ambiguous";
    }
  | {
      kind: "unsupported";
    };

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

const CAPABILITY_QUERY_FAMILY_ALIASES = {
  website_qa: "quality_assurance"
} as const satisfies Record<string, string>;

function mergeUniqueStrings(
  ...collections: Array<string[] | undefined>
): string[] | undefined {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (let index = 0; index < collections.length; index += 1) {
    const collection = collections[index];

    if (collection === undefined) {
      continue;
    }

    for (let valueIndex = 0; valueIndex < collection.length; valueIndex += 1) {
      const value = collection[valueIndex];

      if (seen.has(value)) {
        continue;
      }

      seen.add(value);
      merged.push(value);
    }
  }

  return merged.length === 0 ? undefined : merged;
}

function firstUrl(urls: string[] | undefined): string | undefined {
  return urls?.[0];
}

function firstQueryUrl(query: CapabilityQuery): string | undefined {
  const target = query.targets?.find((candidate) => candidate.type === "url");

  return target?.value;
}

function extractFirstUrlFromText(text: string): string | undefined {
  const match = text.match(/https?:\/\/\S+/i);

  if (match === null) {
    return undefined;
  }

  return match[0].replace(/[)\]}>.,!?;:，。！？；：]+$/u, "");
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
  return /(?:\bturn\b|\bconvert\b|\bsave\b|\bfetch\b|\bgrab\b|\bextract\b|\bpull\b|\bexport\b|\brender\b|转成|转为|转换|导出|提取|抓取|保存)/i.test(
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
  return /(?:\bwebpages?\b|\bweb page\b|\bwebsite\b|\bweb content\b|\barticles?\b|\burls?\b)/i.test(
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

function hasIdeaBuildSignal(requestText: string): boolean {
  return /(?:做一个|做个|弄一个|弄个|搞一个|搞个|加一个|加个|整一个|整个|来一个|来个)/i.test(
    requestText
  );
}

function hasIdeaProductSurfaceSignal(requestText: string): boolean {
  return /(?:产品|工具|功能|体验|界面|入口|提示|进度|workflow|skill|mcp|插件|app\b|应用|客户端|桌面|mac\b|菜单栏|dock|cli\b|codex|claude code)/i.test(
    requestText
  );
}

function hasIdeaConceptSignal(requestText: string): boolean {
  return /(?:如果|要是|假如|不如|就像|像.+一样|这样就|这样可以|就不用|不用再|省得)/i.test(
    requestText
  );
}

function hasOrdinaryTextTaskSignal(requestText: string): boolean {
  return /(?:\bsummar(?:ize|y)\b|\bexplain\b|\btranslate\b|\brewrite\b|总结|解释|翻译|改写)/i.test(
    requestText
  );
}

function looksLikeIdeaWorkflowRequest(requestText: string): boolean {
  return (
    !hasOrdinaryTextTaskSignal(requestText) &&
    (hasStrongIdeaSignal(requestText) ||
      (hasWeakIdeaSignal(requestText) && hasIdeaWorkflowSignal(requestText)) ||
      (hasIdeaBuildSignal(requestText) &&
        hasIdeaProductSurfaceSignal(requestText) &&
        (hasIdeaWorkflowSignal(requestText) || hasIdeaConceptSignal(requestText))))
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
  url: string | undefined,
  capabilityQuery: CapabilityQuery
): QueryBackedBrokerRequest {
  const request: QueryBackedBrokerRequest = {
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

function canonicalizeCapabilityQueryJobFamilies(
  jobFamilies: string[] | undefined
): string[] | undefined {
  if (jobFamilies === undefined) {
    return undefined;
  }

  return mergeUniqueStrings(
    jobFamilies.map(
      (family) =>
        CAPABILITY_QUERY_FAMILY_ALIASES[
          family as keyof typeof CAPABILITY_QUERY_FAMILY_ALIASES
        ] ?? family
    )
  );
}

function inferStructuredQueryTargets(
  query: CapabilityQuery,
  canonicalJobFamilies: string[] | undefined
): CapabilityQuery["targets"] {
  if (query.targets !== undefined && query.targets.length > 0) {
    return query.targets;
  }

  const inferredUrl = extractFirstUrlFromText(query.requestText);

  if (
    inferredUrl !== undefined &&
    canonicalJobFamilies?.includes("quality_assurance") === true
  ) {
    return [
      {
        type: "website",
        value: inferredUrl
      }
    ];
  }

  return query.targets;
}

function canonicalizeCapabilityQuery(query: CapabilityQuery): CapabilityQuery {
  const canonicalJobFamilies = canonicalizeCapabilityQueryJobFamilies(query.jobFamilies);
  const canonicalTargets = inferStructuredQueryTargets(query, canonicalJobFamilies);

  return {
    ...query,
    jobFamilies: canonicalJobFamilies,
    targets: canonicalTargets
  };
}

export function synthesizeWebContentCapabilityQuery(
  input: QuerySynthesisInput,
  url: string | undefined
): CapabilityQuery {
  return {
    kind: "capability_request",
    goal: "convert web content to markdown",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: ["content_acquisition", "web_content_conversion"],
    targets:
      url === undefined
        ? undefined
        : [
            {
              type: "url",
              value: url
            }
          ],
    artifacts: ["markdown"]
  };
}

function buildSocialPostCapabilityQuery(
  input: QuerySynthesisInput,
  url: string | undefined
): CapabilityQuery {
  return {
    kind: "capability_request",
    goal: "convert social post to markdown",
    host: input.host,
    requestText: input.requestText,
    jobFamilies: ["content_acquisition", "social_content_conversion"],
    targets:
      url === undefined
        ? undefined
        : [
            {
              type: "url",
              value: url
            }
          ],
    artifacts: ["markdown"]
  };
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

function buildCapabilityDiscoveryCapabilityQuery(
  input: BrokerEnvelope,
  url: string | undefined
): CapabilityQuery {
  const requestText = normalizeText(input.requestText);
  let taskQuery: CapabilityQuery | undefined;

  if (looksLikeSocialPost(requestText, url)) {
    taskQuery = buildSocialPostCapabilityQuery(input, url);
  } else if (looksLikeWebContent(requestText, url)) {
    taskQuery = synthesizeWebContentCapabilityQuery(input, url);
  } else if (looksLikeRequirementsAnalysisRequest(requestText)) {
    taskQuery = buildRequirementsAnalysisCapabilityQuery(input);
  } else if (looksLikeInvestigationRequest(requestText, url)) {
    taskQuery = buildInvestigationCapabilityQuery(input, url);
  } else if (looksLikeWebsiteQaRequest(requestText, url)) {
    taskQuery = buildWebsiteQaCapabilityQuery(input, url);
  } else if (looksLikeIdeaWorkflowRequest(requestText)) {
    taskQuery = buildIdeaWorkflowCapabilityQuery(input);
  }

  return {
    kind: "capability_request",
    goal:
      taskQuery === undefined
        ? "discover or install a capability for the requested task"
        : `discover or install a capability to ${taskQuery.goal}`,
    host: input.host,
    requestText: input.requestText,
    jobFamilies: mergeUniqueStrings(
      ["capability_acquisition"],
      taskQuery?.jobFamilies
    ),
    targets: taskQuery?.targets ?? [
      {
        type: "problem_statement",
        value: input.requestText
      }
    ],
    artifacts: mergeUniqueStrings(
      ["recommendation", "installation_plan"],
      taskQuery?.artifacts
    )
  };
}

export function compileCapabilityQueryRequest(
  query: CapabilityQuery
): QueryBackedBrokerRequest {
  const canonicalQuery = canonicalizeCapabilityQuery(query);
  const url = firstQueryUrl(canonicalQuery);
  const compatibilityIntent = deriveCompatibilityIntent(canonicalQuery);

  return buildBrokerRequest(
    compatibilityIntent === "capability_discovery_or_install" ? undefined : url,
    canonicalQuery
  );
}

export function deriveCompatibilityIntent(
  query: CapabilityQuery
): BrokerIntent {
  const url = firstQueryUrl(query);
  const capabilityWorkflowFamilies = [
    "requirements_analysis",
    "idea_brainstorming",
    "quality_assurance",
    "investigation"
  ];
  const explicitCapabilityDiscovery =
    query.preferredCapability !== undefined ||
    hasQueryFamily(query, "capability_acquisition") ||
    hasQueryArtifact(query, "installation_plan");

  if (explicitCapabilityDiscovery) {
    return "capability_discovery_or_install";
  }

  if (
    hasQueryArtifact(query, "markdown") &&
    (hasQueryFamily(query, "social_content_conversion") || isSocialUrl(url))
  ) {
    return "social_post_to_markdown";
  }

  if (
    hasQueryArtifact(query, "markdown") &&
    (hasQueryFamily(query, "web_content_conversion") ||
      hasQueryFamily(query, "content_acquisition") ||
      url !== undefined)
  ) {
    return "web_content_to_markdown";
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
    return "capability_discovery_or_install";
  }

  throw new Error(`Unsupported broker capability query: ${query.requestText}`);
}

export function compileEnvelopeRequest(
  input: BrokerEnvelope
): CompileEnvelopeRequestResult {
  const requestText = normalizeText(input.requestText);
  const url = firstUrl(input.urls) ?? extractFirstUrlFromText(input.requestText);

  if (looksLikeCapabilityDiscovery(requestText)) {
    return {
      kind: "compiled",
      capabilityQuery: buildCapabilityDiscoveryCapabilityQuery(input, url)
    };
  }

  if (looksLikeIdeaWorkflowRequest(requestText)) {
    return {
      kind: "compiled",
      capabilityQuery: buildIdeaWorkflowCapabilityQuery(input)
    };
  }

  if (looksLikeUnsupportedConversionTarget(requestText, url)) {
    return { kind: "unsupported" };
  }

  if (looksLikeSocialPost(requestText, url)) {
    return {
      kind: "compiled",
      capabilityQuery: buildSocialPostCapabilityQuery(input, url)
    };
  }

  if (looksLikeWebContent(requestText, url)) {
    return {
      kind: "compiled",
      capabilityQuery: synthesizeWebContentCapabilityQuery(input, url)
    };
  }

  if (looksLikeRequirementsAnalysisRequest(requestText)) {
    return {
      kind: "compiled",
      capabilityQuery: buildRequirementsAnalysisCapabilityQuery(input)
    };
  }

  if (looksLikeInvestigationRequest(requestText, url)) {
    return {
      kind: "compiled",
      capabilityQuery: buildInvestigationCapabilityQuery(input, url)
    };
  }

  if (looksLikeWebsiteQaRequest(requestText, url)) {
    return {
      kind: "compiled",
      capabilityQuery: buildWebsiteQaCapabilityQuery(input, url)
    };
  }

  if (looksAmbiguous(requestText)) {
    return { kind: "ambiguous" };
  }

  if (hasWeakIdeaSignal(requestText) && !hasOrdinaryTextTaskSignal(requestText)) {
    return { kind: "ambiguous" };
  }

  return { kind: "unsupported" };
}
