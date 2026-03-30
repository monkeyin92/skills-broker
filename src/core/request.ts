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

  if (looksAmbiguous(requestText)) {
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
