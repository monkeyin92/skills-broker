import type { CapabilityProofFamily } from "../core/types.js";

export type SemanticResolverVerdict =
  | "direct_route"
  | "clarify"
  | "unsupported";

export type SemanticCandidate = {
  candidateId: string;
  proofFamily: CapabilityProofFamily;
  confidence: number;
};

export type SemanticResolverTopMatch = {
  candidateId: string;
  proofFamily: CapabilityProofFamily;
  confidence: number;
};

export type SemanticResolverResult = {
  verdict: SemanticResolverVerdict;
  topMatch?: SemanticResolverTopMatch;
};

export type ResolveSemanticCandidatesInput = {
  requestText: string;
  candidates: ReadonlyArray<SemanticCandidate>;
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function hasWebTargetSignal(requestText: string): boolean {
  return /(?:\bweb(?:page|pages)?\b|\bweb pages\b|\bwebsite\b|\bweb content\b|\bpage\b|\burl\b|\blink\b|网页|页面|网站|网址|链接)/i.test(
    requestText
  );
}

function hasMarkdownSignal(requestText: string): boolean {
  return /(?:\bmarkdown\b|\bmd\b|markdown|转成markdown|转为markdown|转换成markdown|生成markdown|输出markdown)/i.test(
    requestText
  );
}

function hasRouteVerb(requestText: string): boolean {
  return /(?:\bturn\b|\bconvert\b|\bsave\b|\bexport\b|\bfetch\b|\bextract\b|\brender\b|转成|转为|转换成|保存|导出|提取|抓取|整理)/i.test(
    requestText
  );
}

function hasNonMarkdownTarget(requestText: string): boolean {
  return /(?:\bpdf\b|\bhtml\b|\bjson\b|\bcsv\b|\bxml\b|\btext file\b|\bplain text\b|转成pdf|转为pdf|转成html|转为html|转成json|转为json|转成csv|转为csv|转成xml|转为xml)/i.test(
    requestText
  );
}

function hasPartialWebMarkdownSignals(requestText: string): boolean {
  if (hasNonMarkdownTarget(requestText)) {
    return false;
  }

  const webTarget = hasWebTargetSignal(requestText);
  const markdown = hasMarkdownSignal(requestText);
  const routeVerb = hasRouteVerb(requestText);

  return (
    (webTarget && markdown) ||
    (webTarget && routeVerb) ||
    (markdown && routeVerb)
  );
}

function isExplicitWebMarkdownRequest(requestText: string): boolean {
  if (hasNonMarkdownTarget(requestText)) {
    return false;
  }

  return (
    hasWebTargetSignal(requestText) &&
    hasMarkdownSignal(requestText) &&
    hasRouteVerb(requestText)
  );
}

function compareCandidates(
  left: SemanticCandidate,
  right: SemanticCandidate
): number {
  const scoreDelta = right.confidence - left.confidence;

  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  const confidenceDelta = right.confidence - left.confidence;

  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  return left.candidateId.localeCompare(right.candidateId);
}

export function selectSemanticTopMatch(
  candidates: ReadonlyArray<SemanticCandidate>
): SemanticResolverTopMatch | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const sorted = [...candidates].sort(compareCandidates);
  const topCandidate = sorted[0];

  return {
    candidateId: topCandidate.candidateId,
    proofFamily: topCandidate.proofFamily,
    confidence: topCandidate.confidence
  };
}

export function resolveSemanticCandidates(
  input: ResolveSemanticCandidatesInput
): SemanticResolverResult {
  const requestText = normalizeText(input.requestText);
  const topMatch = selectSemanticTopMatch(input.candidates);

  if (topMatch === undefined) {
    return {
      verdict: "unsupported"
    };
  }

  if (topMatch.proofFamily !== "web_content_to_markdown") {
    return {
      verdict: "unsupported"
    };
  }

  if (isExplicitWebMarkdownRequest(requestText)) {
    return {
      verdict: "direct_route",
      topMatch
    };
  }

  if (hasPartialWebMarkdownSignals(requestText)) {
    return {
      verdict: "clarify",
      topMatch
    };
  }

  return {
    verdict: "unsupported"
  };
}
