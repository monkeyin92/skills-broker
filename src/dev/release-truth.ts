import { spawn } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CiTrustReport } from "./ci-trust.js";
import {
  evaluateStatusBoard,
  type DoctorStatusResult,
  type StatusIssue,
  type StatusItemResult
} from "../shared-home/status.js";

export type ReleaseGateRailId =
  | "ci_blind_spot"
  | "narrative_parity"
  | "strict_doctor";

export type ReleaseGateRailStatus = "passed" | "failed";

export type ReleaseGateRailResult = {
  id: ReleaseGateRailId;
  label: string;
  status: ReleaseGateRailStatus;
  command: string;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  details?: Record<string, unknown>;
};

export type ReleaseGateVerdict = {
  command: "gate";
  repoRoot: string;
  ok: boolean;
  failingRails: ReleaseGateRailId[];
  rails: ReleaseGateRailResult[];
  shippingRef?: string;
  remoteFreshness?: DoctorStatusResult["remoteFreshness"];
  strictDoctor?: {
    hasStrictIssues: boolean;
    issueCodes: string[];
    adoptionHealth: "inactive" | "green" | "blocked";
    websiteQaVerdict: "blocked" | "in_progress" | "proven";
  };
};

export type ReleasePromotion = {
  id: string;
  title: string;
  from: "shipped_local";
  to: "shipped_remote";
};

export type ReleasePromotionResult = {
  command: "promote";
  repoRoot: string;
  boardPath: string;
  ok: boolean;
  wrote: boolean;
  shippingRef?: string;
  remoteFreshness: DoctorStatusResult["remoteFreshness"];
  promotions: ReleasePromotion[];
  blockingIssues: StatusIssue[];
  statusIssues: StatusIssue[];
};

type ReleaseTruthCliCommand = "gate" | "promote";

type StrictDoctorJson = {
  status: DoctorStatusResult;
  brokerFirstGate: {
    hasStrictIssues: boolean;
  };
  adoptionHealth: {
    status: "inactive" | "green" | "blocked";
  };
  websiteQaLoop: {
    verdict: "blocked" | "in_progress" | "proven";
  };
};

export type ReleaseTruthCommandSpec = {
  id: ReleaseGateRailId;
  label: string;
  executable: string;
  args: string[];
  cwd: string;
  command: string;
};

export type ReleaseTruthCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type ReleaseTruthCliOptions = {
  args?: string[];
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  repoRoot?: string;
  commandRunner?: (
    spec: ReleaseTruthCommandSpec
  ) => Promise<ReleaseTruthCommandResult>;
};

type InspectReleaseGateOptions = {
  repoRoot?: string;
  shipRefOverride?: string;
  commandRunner?: (
    spec: ReleaseTruthCommandSpec
  ) => Promise<ReleaseTruthCommandResult>;
};

type PromoteReleaseTruthOptions = {
  repoRoot?: string;
  shipRefOverride?: string;
};

type CanonicalStatusBoardDocument = {
  schemaVersion: 1;
  items: Array<Record<string, unknown>>;
};

const CANONICAL_BLOCK_PATTERN =
  /<!--\s*skills-broker-status:start\s*-->\s*```json\s*([\s\S]*?)\s*```\s*<!--\s*skills-broker-status:end\s*-->/m;

const PROMOTION_BLOCKING_CODES = new Set<StatusIssue["code"]>([
  "STATUS_REPO_TARGET_INVALID",
  "STATUS_CANONICAL_BLOCK_MISSING",
  "STATUS_CANONICAL_BLOCK_INVALID",
  "STATUS_SHIP_REF_UNRESOLVED",
  "STATUS_REMOTE_REFRESH_FAILED",
  "STATUS_PROOF_INVALID"
]);

function stringifyCommand(executable: string, args: string[]): string {
  return [executable, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

async function defaultRunCommand(
  spec: ReleaseTruthCommandSpec
): Promise<ReleaseTruthCommandResult> {
  return await new Promise((resolveResult) => {
    const child = spawn(spec.executable, spec.args, {
      cwd: spec.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      stderr += error.message;
      resolveResult({
        exitCode: 1,
        stdout,
        stderr
      });
    });
    child.on("close", (code) => {
      resolveResult({
        exitCode: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}

function parseJson<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function parseStrictDoctorRail(
  stdout: string
): {
  shippingRef?: string;
  remoteFreshness?: DoctorStatusResult["remoteFreshness"];
  summary?: ReleaseGateVerdict["strictDoctor"];
} {
  const parsed = parseJson<StrictDoctorJson>(stdout);
  if (parsed === undefined) {
    return {};
  }

  return {
    shippingRef: parsed.status.shippingRef,
    remoteFreshness: parsed.status.remoteFreshness,
    summary: {
      hasStrictIssues:
        parsed.status.hasStrictIssues || parsed.brokerFirstGate.hasStrictIssues,
      issueCodes: parsed.status.issues.map((issue) => issue.code),
      adoptionHealth: parsed.adoptionHealth.status,
      websiteQaVerdict: parsed.websiteQaLoop.verdict
    }
  };
}

function buildReleaseGateRailResult(
  spec: ReleaseTruthCommandSpec,
  result: ReleaseTruthCommandResult
): ReleaseGateRailResult {
  if (spec.id === "ci_blind_spot") {
    const report = parseJson<CiTrustReport>(result.stdout);
    return {
      id: spec.id,
      label: spec.label,
      status: result.exitCode === 0 ? "passed" : "failed",
      command: spec.command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      details:
        report === undefined
          ? undefined
          : {
              totalSurfaces: report.totalSurfaces,
              passingSurfaces: report.passingSurfaces,
              failingSurfaces: report.failingSurfaces,
              hasIssues: report.hasIssues
            }
    };
  }

  if (spec.id === "strict_doctor") {
    const strictDoctor = parseStrictDoctorRail(result.stdout);
    return {
      id: spec.id,
      label: spec.label,
      status: result.exitCode === 0 ? "passed" : "failed",
      command: spec.command,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      details:
        strictDoctor.summary === undefined
          ? undefined
          : {
              shippingRef: strictDoctor.shippingRef,
              remoteFreshness: strictDoctor.remoteFreshness,
              ...strictDoctor.summary
            }
    };
  }

  return {
    id: spec.id,
    label: spec.label,
    status: result.exitCode === 0 ? "passed" : "failed",
    command: spec.command,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

export function buildReleaseGateRailSpecs(
  repoRoot = process.cwd(),
  shipRefOverride?: string
): ReleaseTruthCommandSpec[] {
  const resolvedRepoRoot = resolve(repoRoot);
  const nodeExecutable = process.execPath;
  const registerTsNodePath = resolve(resolvedRepoRoot, "scripts", "register-ts-node.mjs");
  const ciTrustScriptPath = resolve(resolvedRepoRoot, "scripts", "ci-trust-report.mjs");
  const lifecycleCliPath = resolve(resolvedRepoRoot, "src", "bin", "skills-broker.ts");
  const vitestEntryPath = resolve(resolvedRepoRoot, "node_modules", "vitest", "vitest.mjs");

  const ciBlindSpotArgs = [
    "--import",
    registerTsNodePath,
    ciTrustScriptPath,
    "--json",
    "--repo-root",
    resolvedRepoRoot
  ];
  const narrativeParityArgs = [
    vitestEntryPath,
    "--run",
    "tests/shared-home/operator-truth-parity.test.ts",
    "tests/hosts/host-shell-install.test.ts"
  ];
  const strictDoctorArgs = [
    "--import",
    registerTsNodePath,
    lifecycleCliPath,
    "doctor",
    "--json",
    "--strict",
    "--refresh-remote",
    "--repo-root",
    resolvedRepoRoot
  ];

  if (shipRefOverride !== undefined) {
    strictDoctorArgs.push("--ship-ref", shipRefOverride);
  }

  return [
    {
      id: "ci_blind_spot",
      label: "CI Blind-Spot Report",
      executable: nodeExecutable,
      args: ciBlindSpotArgs,
      cwd: resolvedRepoRoot,
      command: stringifyCommand("node", [
        "--import",
        "./scripts/register-ts-node.mjs",
        "./scripts/ci-trust-report.mjs",
        "--json",
        "--repo-root",
        resolvedRepoRoot
      ])
    },
    {
      id: "narrative_parity",
      label: "Narrative Parity Suite",
      executable: nodeExecutable,
      args: narrativeParityArgs,
      cwd: resolvedRepoRoot,
      command: stringifyCommand("node", [
        "./node_modules/vitest/vitest.mjs",
        "--run",
        "tests/shared-home/operator-truth-parity.test.ts",
        "tests/hosts/host-shell-install.test.ts"
      ])
    },
    {
      id: "strict_doctor",
      label: "Strict Repo Doctor",
      executable: nodeExecutable,
      args: strictDoctorArgs,
      cwd: resolvedRepoRoot,
      command: stringifyCommand("node", [
        "--import",
        "./scripts/register-ts-node.mjs",
        "./src/bin/skills-broker.ts",
        "doctor",
        "--json",
        "--strict",
        "--refresh-remote",
        "--repo-root",
        resolvedRepoRoot,
        ...(shipRefOverride === undefined ? [] : ["--ship-ref", shipRefOverride])
      ])
    }
  ];
}

function buildPromotion(statusItem: StatusItemResult): ReleasePromotion {
  return {
    id: statusItem.id,
    title: statusItem.title,
    from: "shipped_local",
    to: "shipped_remote"
  };
}

function buildShipRefRequiredIssue(): StatusIssue {
  return {
    code: "STATUS_SHIP_REF_UNRESOLVED",
    severity: "error",
    strict: true,
    message: "Proof promotion requires a resolved shipping ref",
    evidenceRefs: ["shipping-ref"]
  };
}

function isPromotionEligible(statusItem: StatusItemResult): boolean {
  return (
    statusItem.declaredStatus === "shipped_local" &&
    statusItem.evaluatedStatus === "shipped_remote"
  );
}

function isBlockingPromotionIssue(
  issue: StatusIssue,
  eligiblePromotionIds: Set<string>
): boolean {
  if (PROMOTION_BLOCKING_CODES.has(issue.code)) {
    return true;
  }

  if (issue.code === "STATUS_DECLARED_EVALUATED_MISMATCH") {
    return issue.itemId === undefined || !eligiblePromotionIds.has(issue.itemId);
  }

  return false;
}

async function readCanonicalStatusBoardDocument(
  boardPath: string
): Promise<{
  rawContents: string;
  board: CanonicalStatusBoardDocument;
}> {
  const rawContents = await readFile(boardPath, "utf8");
  const blockMatch = rawContents.match(CANONICAL_BLOCK_PATTERN);

  if (!blockMatch) {
    throw new Error(`STATUS canonical block is missing from ${boardPath}`);
  }

  const parsedBoard = JSON.parse(blockMatch[1]) as Record<string, unknown>;
  if (parsedBoard.schemaVersion !== 1 || !Array.isArray(parsedBoard.items)) {
    throw new Error(`STATUS canonical block in ${boardPath} is not writable schemaVersion: 1 JSON`);
  }

  return {
    rawContents,
    board: {
      schemaVersion: 1,
      items: parsedBoard.items as Array<Record<string, unknown>>
    }
  };
}

function renderCanonicalStatusBoard(board: CanonicalStatusBoardDocument): string {
  return [
    "<!-- skills-broker-status:start -->",
    "```json",
    JSON.stringify(board, null, 2),
    "```",
    "<!-- skills-broker-status:end -->"
  ].join("\n");
}

function applyPromotionsToStatusBoard(
  rawContents: string,
  board: CanonicalStatusBoardDocument,
  promotions: ReleasePromotion[]
): string {
  if (promotions.length === 0) {
    return rawContents;
  }

  const promotedIds = new Set(promotions.map((promotion) => promotion.id));
  const updatedBoard: CanonicalStatusBoardDocument = {
    schemaVersion: 1,
    items: board.items.map((item) => {
      if (typeof item.id !== "string" || !promotedIds.has(item.id)) {
        return item;
      }

      return {
        ...item,
        status: "shipped_remote"
      };
    })
  };

  return rawContents.replace(
    CANONICAL_BLOCK_PATTERN,
    renderCanonicalStatusBoard(updatedBoard)
  );
}

async function writeFileAtomically(path: string, contents: string): Promise<void> {
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, contents, "utf8");
  await rename(tempPath, path);
}

export async function inspectReleaseGate(
  options: InspectReleaseGateOptions = {}
): Promise<ReleaseGateVerdict> {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const commandRunner = options.commandRunner ?? defaultRunCommand;
  const railSpecs = buildReleaseGateRailSpecs(repoRoot, options.shipRefOverride);
  const rails: ReleaseGateRailResult[] = [];
  let shippingRef: string | undefined;
  let remoteFreshness: DoctorStatusResult["remoteFreshness"] | undefined;
  let strictDoctorSummary: ReleaseGateVerdict["strictDoctor"];

  for (const railSpec of railSpecs) {
    const railResult = await commandRunner(railSpec);
    const parsedRailResult = buildReleaseGateRailResult(railSpec, railResult);
    rails.push(parsedRailResult);

    if (railSpec.id === "strict_doctor") {
      const parsedDoctor = parseStrictDoctorRail(railResult.stdout);
      shippingRef = parsedDoctor.shippingRef;
      remoteFreshness = parsedDoctor.remoteFreshness;
      strictDoctorSummary = parsedDoctor.summary;
    }
  }

  const failingRails = rails
    .filter((rail) => rail.status === "failed")
    .map((rail) => rail.id);

  return {
    command: "gate",
    repoRoot,
    ok: failingRails.length === 0,
    failingRails,
    rails,
    shippingRef,
    remoteFreshness,
    strictDoctor: strictDoctorSummary
  };
}

export async function promoteReleaseTruth(
  options: PromoteReleaseTruthOptions = {}
): Promise<ReleasePromotionResult> {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const statusResult = await evaluateStatusBoard({
    repoRootOverride: repoRoot,
    refreshRemote: true,
    shipRefOverride: options.shipRefOverride
  });
  const promotions = statusResult.items.filter(isPromotionEligible).map(buildPromotion);
  const eligiblePromotionIds = new Set(promotions.map((promotion) => promotion.id));
  const blockingIssues = [...statusResult.issues.filter((issue) =>
    isBlockingPromotionIssue(issue, eligiblePromotionIds)
  )];

  if (statusResult.shippingRef === undefined) {
    blockingIssues.push(buildShipRefRequiredIssue());
  }

  const result: ReleasePromotionResult = {
    command: "promote",
    repoRoot,
    boardPath: statusResult.boardPath,
    ok: blockingIssues.length === 0,
    wrote: false,
    shippingRef: statusResult.shippingRef,
    remoteFreshness: statusResult.remoteFreshness,
    promotions,
    blockingIssues,
    statusIssues: statusResult.issues
  };

  if (!result.ok || promotions.length === 0) {
    return result;
  }

  const document = await readCanonicalStatusBoardDocument(statusResult.boardPath);
  const updatedContents = applyPromotionsToStatusBoard(
    document.rawContents,
    document.board,
    promotions
  );

  if (updatedContents === document.rawContents) {
    return result;
  }

  await writeFileAtomically(statusResult.boardPath, updatedContents);
  return {
    ...result,
    wrote: true
  };
}

export function renderReleaseGateVerdict(
  verdict: ReleaseGateVerdict,
  outputMode: "text" | "json"
): string {
  if (outputMode === "json") {
    return JSON.stringify(verdict, null, 2);
  }

  const lines = [
    "skills-broker release gate",
    `Repo: ${verdict.repoRoot}`,
    `Verdict: ${verdict.ok ? "pass" : "fail"}`,
    `Shipping ref: ${verdict.shippingRef ?? "unresolved"}`,
    `Remote freshness: ${
      verdict.remoteFreshness === undefined
        ? "unknown"
        : `${verdict.remoteFreshness.state} (${verdict.remoteFreshness.detail})`
    }`,
    ""
  ];

  lines.push("Rails:");
  for (const rail of verdict.rails) {
    lines.push(
      `- [${rail.status}] ${rail.id} (${rail.label}) exit=${rail.exitCode}`
    );
  }

  lines.push("");
  lines.push(
    `Failing rails: ${
      verdict.failingRails.length === 0
        ? "none"
        : verdict.failingRails.join(", ")
    }`
  );

  if (verdict.strictDoctor !== undefined) {
    lines.push(
      `Strict doctor summary: adoption=${verdict.strictDoctor.adoptionHealth}, websiteQa=${verdict.strictDoctor.websiteQaVerdict}, strictIssues=${verdict.strictDoctor.hasStrictIssues ? "yes" : "no"}`
    );
  }

  return lines.join("\n");
}

export function renderReleasePromotionResult(
  result: ReleasePromotionResult,
  outputMode: "text" | "json"
): string {
  if (outputMode === "json") {
    return JSON.stringify(result, null, 2);
  }

  const verdict = result.ok
    ? result.promotions.length === 0
      ? "noop"
      : result.wrote
        ? "promoted"
        : "ready"
    : "blocked";
  const lines = [
    "skills-broker proof promotion",
    `Repo: ${result.repoRoot}`,
    `Verdict: ${verdict}`,
    `Board: ${result.boardPath}`,
    `Shipping ref: ${result.shippingRef ?? "unresolved"}`,
    `Remote freshness: ${result.remoteFreshness.state} (${result.remoteFreshness.detail})`,
    ""
  ];

  lines.push("Promotions:");
  if (result.promotions.length === 0) {
    lines.push("- none");
  } else {
    for (const promotion of result.promotions) {
      lines.push(`- ${promotion.id}: ${promotion.from} -> ${promotion.to}`);
    }
  }

  lines.push("");
  lines.push("Blocking issues:");
  if (result.blockingIssues.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of result.blockingIssues) {
      lines.push(`- ${issue.code}: ${issue.message}`);
    }
  }

  return lines.join("\n");
}

function readCliFlagValue(args: string[], index: number, flagName: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`Missing value for ${flagName}`);
  }

  return value;
}

export async function runReleaseTruthCli(
  options: ReleaseTruthCliOptions = {}
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const args = options.args ?? process.argv.slice(2);
  let command: ReleaseTruthCliCommand = "gate";
  let commandExplicit = false;
  let outputMode: "text" | "json" = "text";
  let repoRoot = options.repoRoot ?? process.cwd();
  let shipRefOverride: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "gate" || arg === "promote") {
      if (commandExplicit) {
        stderr.write(`multiple release truth commands provided: ${command}, ${arg}\n`);
        return 1;
      }

      command = arg;
      commandExplicit = true;
      continue;
    }

    if (arg === "--json") {
      outputMode = "json";
      continue;
    }

    if (arg === "--repo-root") {
      repoRoot = readCliFlagValue(args, index, "--repo-root");
      index += 1;
      continue;
    }

    if (arg === "--ship-ref") {
      shipRefOverride = readCliFlagValue(args, index, "--ship-ref");
      index += 1;
      continue;
    }

    stderr.write(`unknown release truth flag: ${arg}\n`);
    return 1;
  }

  try {
    if (command === "gate") {
      const verdict = await inspectReleaseGate({
        repoRoot,
        shipRefOverride,
        commandRunner: options.commandRunner
      });
      stdout.write(`${renderReleaseGateVerdict(verdict, outputMode)}\n`);
      return verdict.ok ? 0 : 1;
    }

    const result = await promoteReleaseTruth({
      repoRoot,
      shipRefOverride
    });
    stdout.write(`${renderReleasePromotionResult(result, outputMode)}\n`);
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`${message}\n`);
    return 1;
  }
}
