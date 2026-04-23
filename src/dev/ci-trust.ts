import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  formatCoarseBoundaryLine,
  formatCoarseBoundaryZhLine,
  OPERATOR_TRUTH_CONTRACT,
  formatFullLifecycleParityLine,
  formatFullLifecycleParityZhLine,
  formatPublishedLifecycleCommandsLine,
  formatPublishedLifecycleCommandsZhLine,
  formatSupportedHostsLine,
  formatSupportedHostsZhLine,
  formatWebsiteQaProofSurfaceLine,
  formatWebsiteQaProofSurfaceZhLine,
  formatThirdHostReadinessLine,
  formatThirdHostReadinessZhLine
} from "../core/operator-truth.js";
import {
  loadMaintainedBrokerFirstContract,
  type MaintainedBrokerFirstContract
} from "../core/maintained-broker-first.js";
import { BROKER_HOSTS, type BrokerHost } from "../core/types.js";
import {
  loadHostSkillCandidates,
  loadHostWorkflowRecipes
} from "../sources/host-skill-catalog.js";

export type CiTrustSurfaceKind =
  | "narrative"
  | "repo-proof"
  | "host"
  | "maintained-family"
  | "proven-family"
  | "workflow"
  | "source";

export type CiTrustRisk = "critical" | "high";

export type CiTrustLayer =
  | "docs"
  | "parity-test"
  | "installed-shell"
  | "ci"
  | "status"
  | "strict-doctor"
  | "catalog"
  | "boundary"
  | "integration"
  | "e2e"
  | "lifecycle"
  | "cli"
  | "doctor"
  | "runtime"
  | "host-parity"
  | "ranking"
  | "source";

export type CiTrustInventory = {
  supportedHosts: BrokerHost[];
  maintainedFamilies: string[];
  provenFamilies: string[];
  workflows: string[];
};

export type CiTrustProofSpec = {
  label: string;
  layer: CiTrustLayer;
  path: string;
  containsAll?: readonly string[];
  containsAny?: readonly string[];
};

export type CiTrustSurfaceSpec = {
  id: string;
  kind: CiTrustSurfaceKind;
  label: string;
  risk: CiTrustRisk;
  requiredLayers: readonly CiTrustLayer[];
  proofs: readonly CiTrustProofSpec[];
};

export type CiTrustIssue = {
  code:
    | "CI_TRUST_LAYER_MISSING"
    | "CI_TRUST_PROOF_MISSING"
    | "CI_TRUST_PROOF_SNIPPET_MISSING";
  surfaceId: string;
  layer: CiTrustLayer;
  path: string;
  message: string;
};

export type CiTrustProofResult = CiTrustProofSpec & {
  ok: boolean;
  reason: string;
};

export type CiTrustSurfaceResult = {
  id: string;
  kind: CiTrustSurfaceKind;
  label: string;
  risk: CiTrustRisk;
  requiredLayers: readonly CiTrustLayer[];
  coveredLayers: CiTrustLayer[];
  missingLayers: CiTrustLayer[];
  proofs: CiTrustProofResult[];
  issues: CiTrustIssue[];
};

export type CiTrustReport = {
  repoRoot: string;
  inventory: CiTrustInventory;
  surfaceResults: CiTrustSurfaceResult[];
  issues: CiTrustIssue[];
  totalSurfaces: number;
  passingSurfaces: number;
  failingSurfaces: number;
  hasIssues: boolean;
};

export type CiTrustOutputMode = "text" | "json";

type CiTrustOptions = {
  repoRoot?: string;
  inventory?: CiTrustInventory;
  surfaces?: CiTrustSurfaceSpec[];
  readText?: (absolutePath: string) => Promise<string>;
  pathExists?: (absolutePath: string) => Promise<boolean>;
};

type CiTrustCliOptions = CiTrustOptions & {
  args?: string[];
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
};

const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const HOST_LABELS: Record<BrokerHost, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  opencode: "OpenCode"
};

const MAINTAINED_FAMILY_SNIPPETS: Record<string, readonly string[]> = {
  requirements_analysis: ["requirements_analysis", "requirements analysis", "需求分析"],
  quality_assurance: ["quality_assurance", "website QA"],
  investigation: ["investigation", "investigation-to-fix"]
};

const PROVEN_FAMILY_SNIPPETS: Record<string, readonly string[]> = {
  website_qa: ["website_qa", "website QA"],
  web_content_to_markdown: ["web_content_to_markdown", "web markdown"],
  social_post_to_markdown: ["social_post_to_markdown", "social markdown"]
};

function proof(spec: CiTrustProofSpec): CiTrustProofSpec {
  return spec;
}

function hostSnippets(host: BrokerHost): string[] {
  return [host, HOST_LABELS[host]];
}

function titleCaseFromId(value: string): string {
  return value
    .split(/[-_]/g)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function maintainedFamilySnippets(family: string): string[] {
  return [...(MAINTAINED_FAMILY_SNIPPETS[family] ?? [family, titleCaseFromId(family)])];
}

function provenFamilySnippets(family: string): string[] {
  return [...(PROVEN_FAMILY_SNIPPETS[family] ?? [family, titleCaseFromId(family)])];
}

function workflowSnippets(workflowId: string): string[] {
  return [workflowId, titleCaseFromId(workflowId)];
}

async function defaultPathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function defaultReadText(pathname: string): Promise<string> {
  return readFile(pathname, "utf8");
}

function absolutePath(repoRoot: string, relativePath: string): string {
  return join(repoRoot, relativePath);
}

async function loadInventoryFromRepo(
  repoRoot: string
): Promise<CiTrustInventory> {
  const maintainedContract: MaintainedBrokerFirstContract =
    await loadMaintainedBrokerFirstContract(
      absolutePath(repoRoot, "config/maintained-broker-first-families.json")
    );
  const skillCandidates = await loadHostSkillCandidates(
    undefined,
    absolutePath(repoRoot, "config/host-skills.seed.json")
  );
  const workflowRecipes = await loadHostWorkflowRecipes(
    undefined,
    absolutePath(repoRoot, "config/host-skills.seed.json")
  );

  return {
    supportedHosts: [...BROKER_HOSTS],
    maintainedFamilies: maintainedContract.maintainedFamilies
      .map((entry) => entry.family)
      .sort(),
    provenFamilies: Array.from(
      new Set(
        skillCandidates.flatMap((candidate) =>
          candidate.query?.proofFamily === undefined
            ? []
            : [candidate.query.proofFamily]
        )
      )
    ).sort(),
    workflows: workflowRecipes.map((workflow) => workflow.id).sort()
  };
}

export async function inspectCiTrustInventory(
  repoRoot = process.cwd()
): Promise<CiTrustInventory> {
  return loadInventoryFromRepo(repoRoot);
}

export function buildCiTrustSurfaceSpecs(
  inventory: CiTrustInventory
): CiTrustSurfaceSpec[] {
  const docsSnippets = [
    formatSupportedHostsLine(),
    formatFullLifecycleParityLine(),
    formatPublishedLifecycleCommandsLine(),
    formatThirdHostReadinessLine(),
    formatCoarseBoundaryLine(),
    formatWebsiteQaProofSurfaceLine(),
    OPERATOR_TRUTH_CONTRACT.heroLane,
    OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
    OPERATOR_TRUTH_CONTRACT.thirdProvenFamily,
    ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
  ];
  const docsZhSnippets = [
    formatSupportedHostsZhLine(),
    formatFullLifecycleParityZhLine(),
    formatPublishedLifecycleCommandsZhLine(),
    formatThirdHostReadinessZhLine(),
    formatCoarseBoundaryZhLine(),
    formatWebsiteQaProofSurfaceZhLine(),
    OPERATOR_TRUTH_CONTRACT.heroLane,
    OPERATOR_TRUTH_CONTRACT.secondProvenFamily,
    OPERATOR_TRUTH_CONTRACT.thirdProvenFamily,
    ...OPERATOR_TRUTH_CONTRACT.lifecycleCommands
  ];

  const surfaces: CiTrustSurfaceSpec[] = [
    {
      id: "narrative:operator-truth",
      kind: "narrative",
      label: "Operator Truth Narrative",
      risk: "critical",
      requiredLayers: ["docs", "parity-test", "installed-shell", "ci"],
      proofs: [
        proof({
          layer: "docs",
          path: "README.md",
          label: "README operator truth",
          containsAll: docsSnippets
        }),
        proof({
          layer: "docs",
          path: "README.zh-CN.md",
          label: "README.zh-CN operator truth",
          containsAll: docsZhSnippets
        }),
        proof({
          layer: "docs",
          path: "STATUS.md",
          label: "STATUS operator truth",
          containsAll: docsSnippets
        }),
        proof({
          layer: "docs",
          path: "TODOS.md",
          label: "TODOS operator truth",
          containsAll: docsSnippets
        }),
        proof({
          layer: "parity-test",
          path: "tests/shared-home/operator-truth-parity.test.ts",
          label: "operator truth parity suite",
          containsAll: ["operator truth parity", "thirdProvenFamily"]
        }),
        proof({
          layer: "installed-shell",
          path: "tests/hosts/host-shell-install.test.ts",
          label: "installed shell truth parity",
          containsAll: [
            "### Hero lane: website QA",
            "The second proven family is web markdown. Keep it visible here after website QA, not as a competing first move.",
            "The next proven family is social markdown. Keep it visible after web markdown, not as a competing first move."
          ]
        }),
        proof({
          layer: "ci",
          path: CI_WORKFLOW_PATH,
          label: "narrative parity CI hook",
          containsAll: ["npm run test:ci:narrative-parity"]
        })
      ]
    },
    {
      id: "repo-proof:status-and-strict-doctor",
      kind: "repo-proof",
      label: "Repo Status And Strict Doctor Gate",
      risk: "critical",
      requiredLayers: ["status", "strict-doctor", "e2e", "ci"],
      proofs: [
        proof({
          layer: "status",
          path: "tests/shared-home/status.test.ts",
          label: "status board canonical tests",
          containsAll: ["evaluateStatusBoard", "STATUS_CANONICAL_BLOCK_MISSING"]
        }),
        proof({
          layer: "strict-doctor",
          path: "tests/cli/lifecycle-cli.test.ts",
          label: "strict doctor lifecycle CLI tests",
          containsAll: ["doctor --strict", "strict status issue"]
        }),
        proof({
          layer: "e2e",
          path: "tests/e2e/status-doctor-git.test.ts",
          label: "status doctor git smoke",
          containsAll: ["--strict"]
        }),
        proof({
          layer: "ci",
          path: CI_WORKFLOW_PATH,
          label: "strict doctor CI hook",
          containsAll: ["doctor --strict"]
        })
      ]
    },
    {
      id: "source:mcp-registry",
      kind: "source",
      label: "MCP Registry Explainability",
      risk: "high",
      requiredLayers: ["source", "ranking", "integration"],
      proofs: [
        proof({
          layer: "source",
          path: "tests/sources/mcp-registry.test.ts",
          label: "mcp registry validation tests",
          containsAll: ["registryValidation", "registryQueryCoverage"]
        }),
        proof({
          layer: "ranking",
          path: "tests/broker/rank.test.ts",
          label: "rank explainability tests",
          containsAll: ["validated MCP", "registryQueryCoverage"]
        }),
        proof({
          layer: "integration",
          path: "tests/integration/broker-flow.test.ts",
          label: "integration MCP explainability proof",
          containsAll: ["validated MCP", "registryQueryCoverage"]
        })
      ]
    },
    ...inventory.supportedHosts.map((host) => ({
      id: `host:${host}`,
      kind: "host" as const,
      label: `${HOST_LABELS[host]} Host Surface`,
      risk: "high" as const,
      requiredLayers: ["installed-shell", "lifecycle", "cli", "doctor"] as const,
      proofs: [
        proof({
          layer: "installed-shell",
          path: "tests/hosts/host-shell-install.test.ts",
          label: `${HOST_LABELS[host]} installed shell coverage`,
          containsAny: hostSnippets(host)
        }),
        proof({
          layer: "lifecycle",
          path: "tests/shared-home/update-lifecycle.test.ts",
          label: `${HOST_LABELS[host]} update lifecycle coverage`,
          containsAny: hostSnippets(host)
        }),
        proof({
          layer: "cli",
          path: "tests/cli/lifecycle-cli.test.ts",
          label: `${HOST_LABELS[host]} lifecycle CLI coverage`,
          containsAny: hostSnippets(host)
        }),
        proof({
          layer: "doctor",
          path: "tests/shared-home/doctor.test.ts",
          label: `${HOST_LABELS[host]} doctor coverage`,
          containsAny: hostSnippets(host)
        })
      ]
    })),
    ...inventory.maintainedFamilies.map((family) => ({
      id: `maintained-family:${family}`,
      kind: "maintained-family" as const,
      label: `Maintained Family ${titleCaseFromId(family)}`,
      risk: "high" as const,
      requiredLayers: ["catalog", "boundary", "integration", "e2e"] as const,
      proofs: [
        proof({
          layer: "catalog",
          path: "tests/core/maintained-broker-first.test.ts",
          label: `${family} catalog coverage`,
          containsAny: maintainedFamilySnippets(family)
        }),
        proof({
          layer: "boundary",
          path: "tests/hosts/host-shell-install.test.ts",
          label: `${family} installed-shell boundary coverage`,
          containsAny: maintainedFamilySnippets(family)
        }),
        proof({
          layer: "integration",
          path: "tests/integration/broker-flow.test.ts",
          label: `${family} integration coverage`,
          containsAny: maintainedFamilySnippets(family)
        }),
        proof({
          layer: "e2e",
          path: "tests/e2e/host-auto-routing-smoke.test.ts",
          label: `${family} host-routing smoke coverage`,
          containsAny: maintainedFamilySnippets(family)
        })
      ]
    })),
    ...inventory.provenFamilies.map((family) => ({
      id: `proven-family:${family}`,
      kind: "proven-family" as const,
      label: `Proven Family ${titleCaseFromId(family)}`,
      risk: "high" as const,
      requiredLayers: ["integration", "doctor", "e2e"] as const,
      proofs: [
        proof({
          layer: "integration",
          path: "tests/integration/broker-flow.test.ts",
          label: `${family} integration proof`,
          containsAny: provenFamilySnippets(family)
        }),
        proof({
          layer: "doctor",
          path: "tests/shared-home/doctor.test.ts",
          label: `${family} doctor proof`,
          containsAny: provenFamilySnippets(family)
        }),
        proof({
          layer: "e2e",
          path: "tests/e2e/shared-home-smoke.test.ts",
          label: `${family} shared-home smoke proof`,
          containsAny: provenFamilySnippets(family)
        })
      ]
    })),
    ...inventory.workflows.map((workflowId) => ({
      id: `workflow:${workflowId}`,
      kind: "workflow" as const,
      label: `Workflow ${titleCaseFromId(workflowId)}`,
      risk: "high" as const,
      requiredLayers: ["catalog", "runtime", "host-parity", "cli"] as const,
      proofs: [
        proof({
          layer: "catalog",
          path: "tests/sources/host-skill-catalog.test.ts",
          label: `${workflowId} catalog coverage`,
          containsAny: workflowSnippets(workflowId)
        }),
        proof({
          layer: "runtime",
          path: "tests/broker/workflow-runtime.test.ts",
          label: `${workflowId} runtime coverage`,
          containsAny: workflowSnippets(workflowId)
        }),
        proof({
          layer: "host-parity",
          path: "tests/e2e/workflow-host-smoke.test.ts",
          label: `${workflowId} host parity coverage`,
          containsAny: workflowSnippets(workflowId)
        }),
        proof({
          layer: "cli",
          path: "tests/cli/cli-contract.test.ts",
          label: `${workflowId} CLI coverage`,
          containsAny: workflowSnippets(workflowId)
        })
      ]
    }))
  ];

  return surfaces.sort((left, right) => left.id.localeCompare(right.id));
}

function evaluateSnippetCoverage(
  text: string,
  proofSpec: CiTrustProofSpec
): { ok: boolean; reason: string } {
  if (proofSpec.containsAll !== undefined) {
    const missing = proofSpec.containsAll.filter((snippet) => !text.includes(snippet));
    if (missing.length > 0) {
      return {
        ok: false,
        reason: `missing required snippets: ${missing.join(" | ")}`
      };
    }
  }

  if (proofSpec.containsAny !== undefined) {
    const matched = proofSpec.containsAny.some((snippet) => text.includes(snippet));
    if (!matched) {
      return {
        ok: false,
        reason: `missing any matching snippet: ${proofSpec.containsAny.join(" | ")}`
      };
    }
  }

  return {
    ok: true,
    reason: "ok"
  };
}

export async function evaluateCiTrustSurfaceSpecs(
  repoRoot: string,
  inventory: CiTrustInventory,
  surfaces: readonly CiTrustSurfaceSpec[],
  options: Pick<CiTrustOptions, "readText" | "pathExists"> = {}
): Promise<CiTrustReport> {
  const readText = options.readText ?? defaultReadText;
  const pathExists = options.pathExists ?? defaultPathExists;
  const textCache = new Map<string, string>();
  const allIssues: CiTrustIssue[] = [];
  const surfaceResults: CiTrustSurfaceResult[] = [];

  for (const surface of surfaces) {
    const proofResults: CiTrustProofResult[] = [];
    const matchedLayers = new Set<CiTrustLayer>();
    const issues: CiTrustIssue[] = [];

    for (const spec of surface.proofs) {
      const pathname = absolutePath(repoRoot, spec.path);
      const exists = await pathExists(pathname);

      if (!exists) {
        const issue: CiTrustIssue = {
          code: "CI_TRUST_PROOF_MISSING",
          surfaceId: surface.id,
          layer: spec.layer,
          path: spec.path,
          message: `${surface.id} is missing proof file ${spec.path}`
        };
        issues.push(issue);
        proofResults.push({
          ...spec,
          ok: false,
          reason: "missing file"
        });
        continue;
      }

      let text = textCache.get(pathname);
      if (text === undefined) {
        text = await readText(pathname);
        textCache.set(pathname, text);
      }

      const snippetResult = evaluateSnippetCoverage(text, spec);
      if (!snippetResult.ok) {
        const issue: CiTrustIssue = {
          code: "CI_TRUST_PROOF_SNIPPET_MISSING",
          surfaceId: surface.id,
          layer: spec.layer,
          path: spec.path,
          message: `${surface.id} proof ${spec.path} ${snippetResult.reason}`
        };
        issues.push(issue);
      } else {
        matchedLayers.add(spec.layer);
      }

      proofResults.push({
        ...spec,
        ok: snippetResult.ok,
        reason: snippetResult.reason
      });
    }

    const missingLayers = surface.requiredLayers.filter(
      (layer) => !matchedLayers.has(layer)
    );
    for (const layer of missingLayers) {
      const representativePath =
        surface.proofs.find((proofSpec) => proofSpec.layer === layer)?.path ?? "(none)";
      issues.push({
        code: "CI_TRUST_LAYER_MISSING",
        surfaceId: surface.id,
        layer,
        path: representativePath,
        message: `${surface.id} is missing required ${layer} coverage`
      });
    }

    allIssues.push(...issues);
    surfaceResults.push({
      id: surface.id,
      kind: surface.kind,
      label: surface.label,
      risk: surface.risk,
      requiredLayers: surface.requiredLayers,
      coveredLayers: Array.from(matchedLayers).sort(),
      missingLayers,
      proofs: proofResults,
      issues
    });
  }

  const failingSurfaces = surfaceResults.filter((surface) => surface.issues.length > 0)
    .length;

  return {
    repoRoot,
    inventory,
    surfaceResults,
    issues: allIssues,
    totalSurfaces: surfaceResults.length,
    passingSurfaces: surfaceResults.length - failingSurfaces,
    failingSurfaces,
    hasIssues: allIssues.length > 0
  };
}

export async function inspectCiTrustReport(
  options: CiTrustOptions = {}
): Promise<CiTrustReport> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const inventory = options.inventory ?? (await inspectCiTrustInventory(repoRoot));
  const surfaces = options.surfaces ?? buildCiTrustSurfaceSpecs(inventory);

  return evaluateCiTrustSurfaceSpecs(repoRoot, inventory, surfaces, {
    readText: options.readText,
    pathExists: options.pathExists
  });
}

function renderSurfaceLine(surface: CiTrustSurfaceResult): string {
  const status = surface.issues.length === 0 ? "ok" : "blind-spot";
  const layers = surface.requiredLayers
    .map((layer) => `${layer}:${surface.missingLayers.includes(layer) ? "missing" : "ok"}`)
    .join(", ");
  return `- [${surface.risk}] ${surface.id} (${surface.label}) => ${status}; ${layers}`;
}

export function renderCiTrustReport(
  report: CiTrustReport,
  outputMode: CiTrustOutputMode
): string {
  if (outputMode === "json") {
    return JSON.stringify(report);
  }

  const lines = [
    "skills-broker ci trust report",
    `Repo: ${report.repoRoot}`,
    `Inventory: hosts=${report.inventory.supportedHosts.length}, maintained_families=${report.inventory.maintainedFamilies.length}, proven_families=${report.inventory.provenFamilies.length}, workflows=${report.inventory.workflows.length}`,
    `Surfaces: ${report.passingSurfaces}/${report.totalSurfaces} green`
  ];

  lines.push("");
  lines.push("Coverage:");
  for (const surface of report.surfaceResults) {
    lines.push(renderSurfaceLine(surface));
  }

  if (report.issues.length > 0) {
    lines.push("");
    lines.push("Blind spots:");
    for (const issue of report.issues) {
      lines.push(`- ${issue.message}`);
    }
  } else {
    lines.push("");
    lines.push("Blind spots: none");
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

export async function runCiTrustCli(
  options: CiTrustCliOptions = {}
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const args = options.args ?? process.argv.slice(2);
  let outputMode: CiTrustOutputMode = "text";
  let repoRoot = options.repoRoot ?? process.cwd();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--json") {
      outputMode = "json";
      continue;
    }

    if (arg === "--repo-root") {
      repoRoot = readCliFlagValue(args, index, "--repo-root");
      index += 1;
      continue;
    }

    stderr.write(`unknown ci trust flag: ${arg}\n`);
    return 1;
  }

  try {
    const report = await inspectCiTrustReport({
      ...options,
      repoRoot
    });
    stdout.write(`${renderCiTrustReport(report, outputMode)}\n`);
    return report.hasIssues ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr.write(`${message}\n`);
    return 1;
  }
}
