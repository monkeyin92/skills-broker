import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CANONICAL_BLOCK_PATTERN =
  /<!--\s*skills-broker-status:start\s*-->\s*```json\s*([\s\S]*?)\s*```\s*<!--\s*skills-broker-status:end\s*-->/m;

const VALID_STATUS_TOKENS = [
  "shipped_remote",
  "shipped_local",
  "in_progress",
  "planned",
  "delayed",
  "blocked"
] as const;

const VALID_PROOF_TYPES = ["commit", "file", "doc", "test"] as const;

type ValidStatusToken = (typeof VALID_STATUS_TOKENS)[number];
type ValidProofType = (typeof VALID_PROOF_TYPES)[number];

type CanonicalStatusBoard = {
  schemaVersion: 1;
  items: CanonicalStatusBoardItem[];
};

type CanonicalStatusBoardItem = {
  id: string;
  title: string;
  summary?: string;
  status: ValidStatusToken;
  proofs: StatusProof[];
};

export type StatusProof =
  | {
      type: "commit";
      ref: string;
      label?: string;
    }
  | {
      type: "file" | "doc" | "test";
      path: string;
      label?: string;
    };

export type StatusIssue = {
  code:
    | "STATUS_REPO_TARGET_INVALID"
    | "STATUS_CANONICAL_BLOCK_MISSING"
    | "STATUS_CANONICAL_BLOCK_INVALID"
    | "STATUS_SHIP_REF_UNRESOLVED"
    | "STATUS_REMOTE_REFRESH_FAILED"
    | "STATUS_PROOF_INVALID"
    | "STATUS_DECLARED_EVALUATED_MISMATCH";
  severity: "error" | "warning";
  strict: boolean;
  message: string;
  evidenceRefs: string[];
  itemId?: string;
};

export type StatusProofResult = {
  type: ValidProofType;
  label?: string;
  evidenceRef: string;
  localValid: boolean;
  remoteValid: "valid" | "invalid" | "unknown";
};

export type StatusItemResult = {
  id: string;
  title: string;
  summary?: string;
  declaredStatus: ValidStatusToken;
  evaluatedStatus: ValidStatusToken;
  proofs: StatusProofResult[];
};

export type DoctorStatusResult = {
  skipped: boolean;
  skipReason?: string;
  boardPath: string;
  repoTarget?: string;
  shippingRef?: string;
  remoteFreshness: {
    state: "local_tracking_ref" | "refreshed" | "unknown";
    detail: string;
  };
  issues: StatusIssue[];
  items: StatusItemResult[];
  hasStrictIssues: boolean;
};

export type EvaluateStatusBoardOptions = {
  cwd?: string;
  refreshRemote?: boolean;
  repoRootOverride?: string;
  shipRefOverride?: string;
  allowMissingRepoTarget?: boolean;
};

type ParsedBoard =
  | {
      ok: true;
      board: CanonicalStatusBoard;
    }
  | {
      ok: false;
      issue: StatusIssue;
    };

type RepoTargetResolution =
  | {
      ok: true;
      repoTarget: string;
    }
  | {
      ok: false;
      issue: StatusIssue;
    };

type ShipRefResolution = {
  shippingRef?: string;
  issue?: StatusIssue;
  attemptedRef?: string;
};

type RepoSnapshot = {
  headCommit: string;
  shippingRef?: string;
  aheadCount?: number;
  behindCount?: number;
  remoteFreshness: DoctorStatusResult["remoteFreshness"];
};

function isValidStatusToken(value: unknown): value is ValidStatusToken {
  return typeof value === "string" && VALID_STATUS_TOKENS.includes(value as ValidStatusToken);
}

function isValidProofType(value: unknown): value is ValidProofType {
  return typeof value === "string" && VALID_PROOF_TYPES.includes(value as ValidProofType);
}

function buildBoardPath(options: EvaluateStatusBoardOptions): string {
  if (options.repoRootOverride !== undefined) {
    return join(resolve(options.repoRootOverride), "STATUS.md");
  }

  return join(resolve(options.cwd ?? process.cwd()), "STATUS.md");
}

async function runGit(repoTarget: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repoTarget,
    encoding: "utf8"
  });

  return stdout.trim();
}

async function isCommitReachable(
  repoTarget: string,
  ancestorRef: string,
  descendantRef: string
): Promise<boolean> {
  try {
    await execFileAsync("git", ["merge-base", "--is-ancestor", ancestorRef, descendantRef], {
      cwd: repoTarget,
      encoding: "utf8"
    });
    return true;
  } catch {
    return false;
  }
}

async function treeContainsPath(
  repoTarget: string,
  treeish: string,
  pathname: string
): Promise<boolean> {
  try {
    await execFileAsync("git", ["cat-file", "-e", `${treeish}:${pathname}`], {
      cwd: repoTarget,
      encoding: "utf8"
    });
    return true;
  } catch {
    return false;
  }
}

async function resolveRepoTarget(
  options: EvaluateStatusBoardOptions
): Promise<RepoTargetResolution> {
  const targetDirectory = resolve(options.repoRootOverride ?? options.cwd ?? process.cwd());

  try {
    const repoTarget = await runGit(targetDirectory, ["rev-parse", "--show-toplevel"]);
    return {
      ok: true,
      repoTarget
    };
  } catch (error) {
    const issue: StatusIssue = {
      code: "STATUS_REPO_TARGET_INVALID",
      severity: "error",
      strict: true,
      message:
        options.repoRootOverride === undefined
          ? `Could not resolve a git repo from ${targetDirectory}`
          : `Could not resolve --repo-root ${targetDirectory} as a git repo`,
      evidenceRefs: [targetDirectory]
    };

    if (error instanceof Error && error.message.length > 0) {
      issue.message = `${issue.message}: ${error.message}`;
    }

    return {
      ok: false,
      issue
    };
  }
}

function buildSkippedStatusResult(
  boardPath: string,
  skipReason: string
): DoctorStatusResult {
  return {
    skipped: true,
    skipReason,
    boardPath,
    remoteFreshness: {
      state: "unknown",
      detail: "status board skipped"
    },
    issues: [],
    items: [],
    hasStrictIssues: false
  };
}

function invalidCanonicalIssue(
  boardPath: string,
  message: string,
  code: StatusIssue["code"] = "STATUS_CANONICAL_BLOCK_INVALID"
): StatusIssue {
  return {
    code,
    severity: "error",
    strict: true,
    message,
    evidenceRefs: [boardPath]
  };
}

function parseProof(rawProof: unknown, boardPath: string): StatusProof {
  if (typeof rawProof !== "object" || rawProof === null) {
    throw invalidCanonicalIssue(boardPath, "Canonical status proof must be an object");
  }

  const candidate = rawProof as Record<string, unknown>;
  if (!isValidProofType(candidate.type)) {
    throw invalidCanonicalIssue(
      boardPath,
      `Canonical status proof type must be one of ${VALID_PROOF_TYPES.join(", ")}`
    );
  }

  if (candidate.type === "commit") {
    if (typeof candidate.ref !== "string" || candidate.ref.length === 0) {
      throw invalidCanonicalIssue(boardPath, "Commit proofs require a non-empty ref");
    }

    return {
      type: "commit",
      ref: candidate.ref,
      ...(typeof candidate.label === "string" ? { label: candidate.label } : {})
    };
  }

  if (typeof candidate.path !== "string" || candidate.path.length === 0) {
    throw invalidCanonicalIssue(
      boardPath,
      `${candidate.type} proofs require a non-empty repo-relative path`
    );
  }

  return {
    type: candidate.type,
    path: candidate.path,
    ...(typeof candidate.label === "string" ? { label: candidate.label } : {})
  };
}

function parseBoardItem(rawItem: unknown, boardPath: string): CanonicalStatusBoardItem {
  if (typeof rawItem !== "object" || rawItem === null) {
    throw invalidCanonicalIssue(boardPath, "Canonical status items must be objects");
  }

  const candidate = rawItem as Record<string, unknown>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0) {
    throw invalidCanonicalIssue(boardPath, "Canonical status items require a non-empty id");
  }

  if (typeof candidate.title !== "string" || candidate.title.length === 0) {
    throw invalidCanonicalIssue(boardPath, `Status item ${candidate.id} requires a non-empty title`);
  }

  if (!isValidStatusToken(candidate.status)) {
    throw invalidCanonicalIssue(
      boardPath,
      `Status item ${candidate.id} must use one of ${VALID_STATUS_TOKENS.join(", ")}`
    );
  }

  if (!Array.isArray(candidate.proofs)) {
    throw invalidCanonicalIssue(boardPath, `Status item ${candidate.id} requires proofs[]`);
  }

  const proofs = candidate.proofs.map((proof) => parseProof(proof, boardPath));
  return {
    id: candidate.id,
    title: candidate.title,
    status: candidate.status,
    proofs,
    ...(typeof candidate.summary === "string" ? { summary: candidate.summary } : {})
  };
}

async function parseCanonicalStatusBoard(boardPath: string): Promise<ParsedBoard> {
  let contents: string;

  try {
    contents = await readFile(boardPath, "utf8");
  } catch {
    return {
      ok: false,
      issue: {
        code: "STATUS_CANONICAL_BLOCK_MISSING",
        severity: "error",
        strict: true,
        message: `Missing STATUS.md at ${boardPath}`,
        evidenceRefs: [boardPath]
      }
    };
  }

  const blockMatch = contents.match(CANONICAL_BLOCK_PATTERN);
  if (!blockMatch) {
    return {
      ok: false,
      issue: {
        code: "STATUS_CANONICAL_BLOCK_MISSING",
        severity: "error",
        strict: true,
        message: "STATUS.md is missing the canonical JSON block",
        evidenceRefs: [boardPath]
      }
    };
  }

  try {
    const parsed = JSON.parse(blockMatch[1]) as Record<string, unknown>;
    if (parsed.schemaVersion !== 1) {
      throw invalidCanonicalIssue(
        boardPath,
        "Canonical status block must declare schemaVersion: 1"
      );
    }

    if (!Array.isArray(parsed.items)) {
      throw invalidCanonicalIssue(boardPath, "Canonical status block requires items[]");
    }

    const items = parsed.items.map((item) => parseBoardItem(item, boardPath));
    const duplicateIds = new Set<string>();
    for (const item of items) {
      if (duplicateIds.has(item.id)) {
        throw invalidCanonicalIssue(boardPath, `Duplicate canonical status item id: ${item.id}`);
      }
      duplicateIds.add(item.id);
    }

    return {
      ok: true,
      board: {
        schemaVersion: 1,
        items
      }
    };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      return {
        ok: false,
        issue: error as StatusIssue
      };
    }

    const message = error instanceof Error ? error.message : "Invalid canonical status JSON";
    return {
      ok: false,
      issue: invalidCanonicalIssue(boardPath, message)
    };
  }
}

async function shouldSkipImplicitStatusBoard(
  boardPath: string,
  options: EvaluateStatusBoardOptions
): Promise<string | undefined> {
  if (options.repoRootOverride !== undefined) {
    return undefined;
  }

  try {
    const contents = await readFile(boardPath, "utf8");
    if (!CANONICAL_BLOCK_PATTERN.test(contents)) {
      return "Current repo does not opt into the canonical STATUS.md contract";
    }
  } catch {
    return "Current repo does not define STATUS.md";
  }

  return undefined;
}

async function resolveShippingRef(
  repoTarget: string,
  shipRefOverride: string | undefined
): Promise<ShipRefResolution> {
  if (shipRefOverride !== undefined) {
    try {
      await runGit(repoTarget, ["rev-parse", "--verify", `${shipRefOverride}^{commit}`]);
      return {
        shippingRef: shipRefOverride,
        attemptedRef: shipRefOverride
      };
    } catch (error) {
      return {
        attemptedRef: shipRefOverride,
        issue: {
          code: "STATUS_SHIP_REF_UNRESOLVED",
          severity: "error",
          strict: true,
          message:
            error instanceof Error
              ? `Could not resolve --ship-ref ${shipRefOverride}: ${error.message}`
              : `Could not resolve --ship-ref ${shipRefOverride}`,
          evidenceRefs: [shipRefOverride]
        }
      };
    }
  }

  const rawCandidates = [
    await runGit(repoTarget, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).catch(
      () => undefined
    ),
    await runGit(repoTarget, ["symbolic-ref", "refs/remotes/origin/HEAD"]).catch(() => undefined),
    "origin/main",
    "origin/master"
  ];

  const candidates = rawCandidates
    .map((candidate) => candidate?.replace(/^refs\/remotes\//, ""))
    .filter((candidate, index, items): candidate is string => {
      return candidate !== undefined && candidate.length > 0 && items.indexOf(candidate) === index;
    });

  for (const candidate of candidates) {
    try {
      await runGit(repoTarget, ["rev-parse", "--verify", `${candidate}^{commit}`]);
      return {
        shippingRef: candidate,
        attemptedRef: candidate
      };
    } catch {
      // Keep trying fallbacks until one resolves.
    }
  }

  return {
    attemptedRef: "@{u}"
  };
}

function inferRemoteName(shippingRef: string | undefined): string | undefined {
  if (shippingRef === undefined) {
    return undefined;
  }

  const slashIndex = shippingRef.indexOf("/");
  if (slashIndex <= 0) {
    return undefined;
  }

  return shippingRef.slice(0, slashIndex);
}

async function buildRepoSnapshot(
  repoTarget: string,
  shippingRef: string | undefined,
  refreshRemote: boolean
): Promise<{ snapshot: RepoSnapshot; issues: StatusIssue[] }> {
  const issues: StatusIssue[] = [];
  const remoteName = inferRemoteName(shippingRef);
  let remoteFreshness: DoctorStatusResult["remoteFreshness"] = {
    state: shippingRef === undefined ? "unknown" : "local_tracking_ref",
    detail:
      shippingRef === undefined
        ? "shipping ref unavailable"
        : `using local tracking ref for ${shippingRef}`
  };

  if (refreshRemote && remoteName !== undefined) {
    try {
      await execFileAsync("git", ["fetch", "--quiet", remoteName], {
        cwd: repoTarget,
        encoding: "utf8"
      });
      remoteFreshness = {
        state: "refreshed",
        detail: `fetched ${remoteName} before comparing ${shippingRef}`
      };
    } catch (error) {
      issues.push({
        code: "STATUS_REMOTE_REFRESH_FAILED",
        severity: "error",
        strict: true,
        message:
          error instanceof Error
            ? `Could not refresh remote truth from ${remoteName}: ${error.message}`
            : `Could not refresh remote truth from ${remoteName}`,
        evidenceRefs: [remoteName]
      });
      remoteFreshness = {
        state: "unknown",
        detail: `refresh failed for ${remoteName}`
      };
    }
  }

  const headCommit = await runGit(repoTarget, ["rev-parse", "HEAD"]);
  let aheadCount: number | undefined;
  let behindCount: number | undefined;

  if (shippingRef !== undefined) {
    try {
      const counts = await runGit(repoTarget, [
        "rev-list",
        "--left-right",
        "--count",
        `${shippingRef}...HEAD`
      ]);
      const [behind, ahead] = counts.split("\t").map((value) => Number.parseInt(value, 10));
      if (Number.isFinite(ahead) && Number.isFinite(behind)) {
        aheadCount = ahead;
        behindCount = behind;
      }
    } catch {
      // Preserve the snapshot even when ahead/behind cannot be computed.
    }
  }

  return {
    snapshot: {
      headCommit,
      shippingRef,
      aheadCount,
      behindCount,
      remoteFreshness
    },
    issues
  };
}

async function evaluateProof(
  repoTarget: string,
  shippingRef: string | undefined,
  remoteFreshness: DoctorStatusResult["remoteFreshness"]["state"],
  proof: StatusProof
): Promise<StatusProofResult> {
  if (proof.type === "commit") {
    const localValid = await runGit(repoTarget, ["rev-parse", "--verify", `${proof.ref}^{commit}`])
      .then(async () => isCommitReachable(repoTarget, proof.ref, "HEAD"))
      .catch(() => false);

    let remoteValid: StatusProofResult["remoteValid"] = "unknown";
    if (shippingRef !== undefined && remoteFreshness !== "unknown") {
      remoteValid = (await isCommitReachable(repoTarget, proof.ref, shippingRef))
        ? "valid"
        : "invalid";
    }

    return {
      type: "commit",
      label: proof.label,
      evidenceRef: `commit:${proof.ref}`,
      localValid,
      remoteValid
    };
  }

  const localValid = await treeContainsPath(repoTarget, "HEAD", proof.path);
  let remoteValid: StatusProofResult["remoteValid"] = "unknown";
  if (shippingRef !== undefined && remoteFreshness !== "unknown") {
    remoteValid = (await treeContainsPath(repoTarget, shippingRef, proof.path)) ? "valid" : "invalid";
  }

  return {
    type: proof.type,
    label: proof.label,
    evidenceRef: `${proof.type}:${proof.path}`,
    localValid,
    remoteValid
  };
}

function allLocalProofsValid(proofs: StatusProofResult[]): boolean {
  return proofs.every((proof) => proof.localValid);
}

function allRemoteProofsValid(
  proofs: StatusProofResult[]
): true | false | "unknown" {
  if (proofs.some((proof) => proof.remoteValid === "unknown")) {
    return "unknown";
  }

  return proofs.every((proof) => proof.remoteValid === "valid");
}

function evaluateDeclaredStatus(
  declaredStatus: ValidStatusToken,
  localProofsValid: boolean,
  remoteProofsValid: true | false | "unknown"
): ValidStatusToken {
  if (declaredStatus === "planned") {
    return "planned";
  }

  if (!localProofsValid) {
    return "planned";
  }

  if (declaredStatus === "shipped_remote") {
    if (remoteProofsValid === true) {
      return "shipped_remote";
    }

    if (remoteProofsValid === false) {
      return "shipped_local";
    }

    return "shipped_remote";
  }

  if (declaredStatus === "shipped_local") {
    return remoteProofsValid === true ? "shipped_remote" : "shipped_local";
  }

  return declaredStatus;
}

export async function evaluateStatusBoard(
  options: EvaluateStatusBoardOptions = {}
): Promise<DoctorStatusResult> {
  const boardPath = buildBoardPath(options);
  const repoTargetResolution = await resolveRepoTarget(options);

  if (!repoTargetResolution.ok) {
    if (options.allowMissingRepoTarget === true) {
      return buildSkippedStatusResult(
        boardPath,
        `No git repo detected from ${resolve(options.cwd ?? process.cwd())}`
      );
    }

    return {
      skipped: false,
      boardPath,
      remoteFreshness: {
        state: "unknown",
        detail: "repo target unavailable"
      },
      issues: [repoTargetResolution.issue],
      items: [],
      hasStrictIssues: true
    };
  }

  const repoTarget = repoTargetResolution.repoTarget;
  const resolvedBoardPath = join(repoTarget, "STATUS.md");
  const skipReason = await shouldSkipImplicitStatusBoard(resolvedBoardPath, options);
  if (skipReason !== undefined) {
    return buildSkippedStatusResult(resolvedBoardPath, skipReason);
  }

  const parsedBoard = await parseCanonicalStatusBoard(resolvedBoardPath);
  if (!parsedBoard.ok) {
    return {
      skipped: false,
      boardPath: resolvedBoardPath,
      repoTarget,
      remoteFreshness: {
        state: "local_tracking_ref",
        detail: "status board unavailable before git truth evaluation"
      },
      issues: [parsedBoard.issue],
      items: [],
      hasStrictIssues: true
    };
  }

  const shipRefResolution = await resolveShippingRef(repoTarget, options.shipRefOverride);
  const shippingRef = shipRefResolution.shippingRef;
  const requiresShippingRef =
    options.shipRefOverride !== undefined ||
    parsedBoard.board.items.some((item) => item.status === "shipped_remote");
  const shipRefIssues =
    shipRefResolution.issue === undefined
      ? []
      : [shipRefResolution.issue];
  if (requiresShippingRef && shippingRef === undefined && shipRefResolution.issue === undefined) {
    shipRefIssues.push({
      code: "STATUS_SHIP_REF_UNRESOLVED",
      severity: "error",
      strict: true,
      message: "Could not auto-resolve a shipping ref from the current branch or origin defaults",
      evidenceRefs: [shipRefResolution.attemptedRef ?? "@{u}"]
    });
  }
  const { snapshot, issues: snapshotIssues } = await buildRepoSnapshot(
    repoTarget,
    shippingRef,
    options.refreshRemote ?? false
  );

  const issues = [...shipRefIssues, ...snapshotIssues];
  const items: StatusItemResult[] = [];

  for (const item of parsedBoard.board.items) {
    const proofResults = await Promise.all(
      item.proofs.map((proof) =>
        evaluateProof(repoTarget, shippingRef, snapshot.remoteFreshness.state, proof)
      )
    );

    if (item.status !== "planned" && proofResults.length === 0) {
      issues.push({
        code: "STATUS_PROOF_INVALID",
        severity: "error",
        strict: true,
        message: `Status item ${item.id} requires at least one proof`,
        evidenceRefs: [`item:${item.id}`],
        itemId: item.id
      });
    }

    for (const proofResult of proofResults) {
      if (!proofResult.localValid) {
        issues.push({
          code: "STATUS_PROOF_INVALID",
          severity: "error",
          strict: true,
          message: `Status item ${item.id} proof is not valid on HEAD: ${proofResult.evidenceRef}`,
          evidenceRefs: [proofResult.evidenceRef],
          itemId: item.id
        });
      }
    }

    const localProofsValid = allLocalProofsValid(proofResults);
    const remoteProofsValid = allRemoteProofsValid(proofResults);
    const evaluatedStatus = evaluateDeclaredStatus(item.status, localProofsValid, remoteProofsValid);

    if (evaluatedStatus !== item.status) {
      issues.push({
        code: "STATUS_DECLARED_EVALUATED_MISMATCH",
        severity: "error",
        strict: true,
        message: `Status item ${item.id} declares ${item.status} but evaluates to ${evaluatedStatus}`,
        evidenceRefs: proofResults.map((proofResult) => proofResult.evidenceRef),
        itemId: item.id
      });
    }

    items.push({
      id: item.id,
      title: item.title,
      summary: item.summary,
      declaredStatus: item.status,
      evaluatedStatus,
      proofs: proofResults
    });
  }

  return {
    skipped: false,
    boardPath: resolvedBoardPath,
    repoTarget,
    shippingRef,
    remoteFreshness: snapshot.remoteFreshness,
    issues,
    items,
    hasStrictIssues: issues.some((issue) => issue.strict)
  };
}
