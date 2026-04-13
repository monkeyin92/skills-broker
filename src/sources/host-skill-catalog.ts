import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  toCapabilityCard,
  type CapabilityCandidate
} from "../core/capability-card.js";
import {
  workflowStageCapabilityIdentity,
  type WorkflowRecipe,
  type WorkflowStage,
  type WorkflowStageCapability
} from "../core/workflow.js";
import {
  CAPABILITY_PACKAGE_LAYOUTS,
  type BrokerIntent,
  type CapabilityPackageRef
} from "../core/types.js";

type HostWorkflowRecipeEntry = CapabilityCandidate & {
  startStageId: string;
  stages: WorkflowStage[];
};

type HostSkillCatalog = {
  packages?: CapabilityPackageRef[];
  skills?: CapabilityCandidate[];
  workflows?: HostWorkflowRecipeEntry[];
};

function mergePackageProbe(
  base: CapabilityPackageRef["probe"] | undefined,
  override: CapabilityPackageRef["probe"] | undefined
): CapabilityPackageRef["probe"] | undefined {
  if (base === undefined && override === undefined) {
    return undefined;
  }

  return {
    ...base,
    ...override,
    layouts: override?.layouts ?? base?.layouts ?? ["single_skill_directory"],
    manifestFiles: override?.manifestFiles ?? base?.manifestFiles,
    manifestNames: override?.manifestNames ?? base?.manifestNames,
    aliases: override?.aliases ?? base?.aliases
  };
}

function mergePackageRef(
  base: Partial<CapabilityPackageRef> | undefined,
  override: Partial<CapabilityPackageRef> | undefined
): Partial<CapabilityPackageRef> | undefined {
  if (base === undefined) {
    return override;
  }

  if (override === undefined) {
    return base;
  }

  return {
    ...base,
    ...override,
    probe: mergePackageProbe(base.probe, override.probe)
  };
}

const PACKAGE_INSTALL_STATES = new Set(["installed", "available"]);
const PACKAGE_ACQUISITIONS = new Set([
  "local_skill_bundle",
  "published_package",
  "broker_native",
  "mcp_bundle"
]);
const PACKAGE_LAYOUTS = new Set<string>(CAPABILITY_PACKAGE_LAYOUTS);
const MANAGED_HOST_CATALOG_BASENAME = "host-skills.seed.json";
const MANAGED_HOST_CATALOG_SUFFIX = `/config/${MANAGED_HOST_CATALOG_BASENAME}`;

export class HostSkillCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostSkillCatalogValidationError";
  }
}

function fail(filePath: string, path: string, reason: string): never {
  throw new HostSkillCatalogValidationError(
    `Invalid host skill catalog at ${filePath} (${path}): ${reason}.`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBrokerManagedHostCatalog(filePath: string): boolean {
  return normalizePath(resolve(filePath)).endsWith(MANAGED_HOST_CATALOG_SUFFIX);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function packageIdFromCapabilityId(
  capabilityId: string | undefined
): string | undefined {
  if (capabilityId === undefined || !capabilityId.includes(".")) {
    return undefined;
  }

  const [packageId] = capabilityId.split(".", 1);

  return packageId;
}

function subskillIdFromCapabilityId(
  capabilityId: string | undefined
): string | undefined {
  if (capabilityId === undefined || !capabilityId.includes(".")) {
    return undefined;
  }

  return capabilityId.split(".").slice(1).join(".");
}

type ValidateSkillEntryOptions = {
  requireExplicitIdentity?: boolean;
};

function validateOptionalStringArray(
  filePath: string,
  path: string,
  value: unknown
): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    fail(filePath, path, "expected an array of strings");
  }

  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      fail(filePath, `${path}[${index}]`, "expected a non-empty string");
    }
  });
}

function validatePackageProbe(
  filePath: string,
  path: string,
  value: unknown
): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  if (!Array.isArray(value.layouts) || value.layouts.length === 0) {
    fail(filePath, `${path}.layouts`, "expected a non-empty array");
  }

  value.layouts.forEach((layout, index) => {
    if (typeof layout !== "string" || !PACKAGE_LAYOUTS.has(layout)) {
      fail(
        filePath,
        `${path}.layouts[${index}]`,
        `expected one of ${Array.from(PACKAGE_LAYOUTS).join(", ")}`
      );
    }
  });

  validateOptionalStringArray(filePath, `${path}.manifestFiles`, value.manifestFiles);
  validateOptionalStringArray(filePath, `${path}.manifestNames`, value.manifestNames);
  validateOptionalStringArray(filePath, `${path}.aliases`, value.aliases);
}

function validateLeafProbe(
  filePath: string,
  path: string,
  value: unknown
): void {
  if (value === undefined) {
    return;
  }

  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  validateOptionalStringArray(filePath, `${path}.manifestFiles`, value.manifestFiles);
  validateOptionalStringArray(filePath, `${path}.manifestNames`, value.manifestNames);
  validateOptionalStringArray(filePath, `${path}.aliases`, value.aliases);
}

function validatePackageEntry(
  filePath: string,
  path: string,
  value: unknown
): void {
  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  if (typeof value.packageId !== "string" || value.packageId.trim().length === 0) {
    fail(filePath, `${path}.packageId`, "expected a non-empty string");
  }

  if (typeof value.label !== "string" || value.label.trim().length === 0) {
    fail(filePath, `${path}.label`, "expected a non-empty string");
  }

  if (
    typeof value.installState !== "string" ||
    !PACKAGE_INSTALL_STATES.has(value.installState)
  ) {
    fail(filePath, `${path}.installState`, "expected installed or available");
  }

  if (
    typeof value.acquisition !== "string" ||
    !PACKAGE_ACQUISITIONS.has(value.acquisition)
  ) {
    fail(
      filePath,
      `${path}.acquisition`,
      `expected one of ${Array.from(PACKAGE_ACQUISITIONS).join(", ")}`
    );
  }

  validatePackageProbe(filePath, `${path}.probe`, value.probe);
}

function validateSkillEntry(
  filePath: string,
  path: string,
  value: unknown,
  options: ValidateSkillEntryOptions = {}
): void {
  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    fail(filePath, `${path}.id`, "expected a non-empty string");
  }

  if (typeof value.kind !== "string" || !["skill", "mcp"].includes(value.kind)) {
    fail(filePath, `${path}.kind`, "expected skill or mcp");
  }

  if (typeof value.label !== "string" || value.label.trim().length === 0) {
    fail(filePath, `${path}.label`, "expected a non-empty string");
  }

  if (typeof value.intent !== "string" || value.intent.trim().length === 0) {
    fail(filePath, `${path}.intent`, "expected a non-empty string");
  }

  if (value.package !== undefined) {
    if (!isRecord(value.package)) {
      fail(filePath, `${path}.package`, "expected an object");
    }

    if (
      value.package.packageId !== undefined &&
      (typeof value.package.packageId !== "string" ||
        value.package.packageId.trim().length === 0)
    ) {
      fail(filePath, `${path}.package.packageId`, "expected a non-empty string");
    }

    validatePackageProbe(filePath, `${path}.package.probe`, value.package.probe);
  }

  if (value.leaf !== undefined) {
    if (!isRecord(value.leaf)) {
      fail(filePath, `${path}.leaf`, "expected an object");
    }

    for (const key of ["capabilityId", "packageId", "subskillId"] as const) {
      const field = value.leaf[key];

      if (
        field !== undefined &&
        (typeof field !== "string" || field.trim().length === 0)
      ) {
        fail(filePath, `${path}.leaf.${key}`, "expected a non-empty string");
      }
    }

    validateLeafProbe(filePath, `${path}.leaf.probe`, value.leaf.probe);
  }

  if (options.requireExplicitIdentity === true) {
    if (!isRecord(value.package)) {
      fail(
        filePath,
        `${path}.package.packageId`,
        "broker-managed catalogs require an explicit packageId"
      );
    }

    if (
      typeof value.package.packageId !== "string" ||
      value.package.packageId.trim().length === 0
    ) {
      fail(
        filePath,
        `${path}.package.packageId`,
        "broker-managed catalogs require an explicit packageId"
      );
    }

    if (!isRecord(value.leaf)) {
      fail(
        filePath,
        `${path}.leaf.capabilityId`,
        "broker-managed catalogs require explicit leaf identity"
      );
    }

    for (const key of ["capabilityId", "packageId", "subskillId"] as const) {
      if (
        typeof value.leaf[key] !== "string" ||
        value.leaf[key].trim().length === 0
      ) {
        fail(
          filePath,
          `${path}.leaf.${key}`,
          `broker-managed catalogs require an explicit ${key}`
        );
      }
    }
  }
}

function validateWorkflowStageCapability(
  filePath: string,
  path: string,
  value: unknown
): void {
  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  for (const key of [
    "packageId",
    "capabilityId",
    "subskillId",
    "implementationId"
  ] as const) {
    if (typeof value[key] !== "string" || value[key].trim().length === 0) {
      fail(filePath, `${path}.${key}`, "expected a non-empty string");
    }
  }

  const identity = workflowStageCapabilityIdentity(
    value as WorkflowStageCapability
  );
  const capabilityPackageId = packageIdFromCapabilityId(identity.capabilityId);
  const capabilitySubskillId = subskillIdFromCapabilityId(identity.capabilityId);

  if (
    capabilityPackageId !== undefined &&
    capabilityPackageId !== identity.packageId
  ) {
    fail(
      filePath,
      `${path}.capabilityId`,
      "expected capabilityId to stay inside packageId"
    );
  }

  if (
    capabilitySubskillId !== undefined &&
    capabilitySubskillId !== identity.subskillId
  ) {
    fail(
      filePath,
      `${path}.subskillId`,
      "expected subskillId to match capabilityId"
    );
  }

  if (value.package !== undefined) {
    if (!isRecord(value.package)) {
      fail(filePath, `${path}.package`, "expected an object");
    }

    if (
      value.package.packageId !== undefined &&
      value.package.packageId !== identity.packageId
    ) {
      fail(
        filePath,
        `${path}.package.packageId`,
        "expected package.packageId to match capability.packageId"
      );
    }
  }

  validateLeafProbe(filePath, `${path}.probe`, value.probe);
}

function validateWorkflowStage(
  filePath: string,
  path: string,
  value: unknown
): void {
  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    fail(filePath, `${path}.id`, "expected a non-empty string");
  }

  if (typeof value.label !== "string" || value.label.trim().length === 0) {
    fail(filePath, `${path}.label`, "expected a non-empty string");
  }

  if (
    typeof value.kind !== "string" ||
    !["capability", "host_native"].includes(value.kind)
  ) {
    fail(filePath, `${path}.kind`, "expected capability or host_native");
  }

  if (
    value.nextStageId !== undefined &&
    value.nextStageId !== null &&
    (typeof value.nextStageId !== "string" || value.nextStageId.trim().length === 0)
  ) {
    fail(filePath, `${path}.nextStageId`, "expected a non-empty string or null");
  }

  validateOptionalStringArray(
    filePath,
    `${path}.producesArtifacts`,
    value.producesArtifacts
  );
  validateOptionalStringArray(
    filePath,
    `${path}.requiresArtifacts`,
    value.requiresArtifacts
  );
  validateOptionalStringArray(
    filePath,
    `${path}.requiredCompletedStageIds`,
    value.requiredCompletedStageIds
  );

  if (value.instructions !== undefined && typeof value.instructions !== "string") {
    fail(filePath, `${path}.instructions`, "expected a string");
  }

  if (value.kind === "capability") {
    validateWorkflowStageCapability(filePath, `${path}.capability`, value.capability);
  }
}

function validateWorkflowTopology(
  filePath: string,
  path: string,
  workflow: HostWorkflowRecipeEntry
): void {
  const stageIds = new Set<string>();
  const artifactRefs = new Set<string>();

  workflow.stages.forEach((stage, index) => {
    if (stageIds.has(stage.id)) {
      fail(filePath, `${path}.stages[${index}].id`, "duplicate stage id");
    }

    stageIds.add(stage.id);

    for (const artifact of stage.producesArtifacts ?? []) {
      artifactRefs.add(artifact);
    }
  });

  if (!stageIds.has(workflow.startStageId)) {
    fail(filePath, `${path}.startStageId`, "expected a known stage id");
  }

  workflow.stages.forEach((stage, index) => {
    if (stage.nextStageId !== undefined && stage.nextStageId !== null) {
      if (!stageIds.has(stage.nextStageId)) {
        fail(
          filePath,
          `${path}.stages[${index}].nextStageId`,
          "expected a known stage id"
        );
      }
    }

    stage.requiredCompletedStageIds?.forEach((stageId, requiredIndex) => {
      if (!stageIds.has(stageId)) {
        fail(
          filePath,
          `${path}.stages[${index}].requiredCompletedStageIds[${requiredIndex}]`,
          "expected a known stage id"
        );
      }
    });

    stage.requiresArtifacts?.forEach((artifact, artifactIndex) => {
      if (!artifactRefs.has(artifact)) {
        fail(
          filePath,
          `${path}.stages[${index}].requiresArtifacts[${artifactIndex}]`,
          "expected a known artifact ref"
        );
      }
    });
  });
}

function validateWorkflowEntry(
  filePath: string,
  path: string,
  value: unknown,
  options: ValidateSkillEntryOptions = {}
): void {
  validateSkillEntry(filePath, path, value, options);

  if (!isRecord(value)) {
    fail(filePath, path, "expected an object");
  }

  if (
    !isRecord(value.implementation) ||
    value.implementation.type !== "broker_workflow"
  ) {
    fail(
      filePath,
      `${path}.implementation.type`,
      "expected broker_workflow"
    );
  }

  if (
    typeof value.startStageId !== "string" ||
    value.startStageId.trim().length === 0
  ) {
    fail(filePath, `${path}.startStageId`, "expected a non-empty string");
  }

  if (!Array.isArray(value.stages) || value.stages.length === 0) {
    fail(filePath, `${path}.stages`, "expected a non-empty array");
  }

  value.stages.forEach((stage, index) => {
    validateWorkflowStage(filePath, `${path}.stages[${index}]`, stage);
  });

  validateWorkflowTopology(filePath, path, value as HostWorkflowRecipeEntry);
}

function validateHostSkillCatalog(
  filePath: string,
  value: unknown
): HostSkillCatalog {
  if (!isRecord(value)) {
    fail(filePath, "root", "expected an object");
  }

  const requireExplicitIdentity = isBrokerManagedHostCatalog(filePath);

  if (value.packages !== undefined) {
    if (!Array.isArray(value.packages)) {
      fail(filePath, "packages", "expected an array");
    }

    value.packages.forEach((entry, index) => {
      validatePackageEntry(filePath, `packages[${index}]`, entry);
    });
  }

  if (value.skills !== undefined) {
    if (!Array.isArray(value.skills)) {
      fail(filePath, "skills", "expected an array");
    }

    value.skills.forEach((entry, index) => {
      validateSkillEntry(filePath, `skills[${index}]`, entry, {
        requireExplicitIdentity
      });
    });
  }

  if (value.workflows !== undefined) {
    if (!Array.isArray(value.workflows)) {
      fail(filePath, "workflows", "expected an array");
    }

    value.workflows.forEach((entry, index) => {
      validateWorkflowEntry(filePath, `workflows[${index}]`, entry, {
        requireExplicitIdentity
      });
    });
  }

  return value as HostSkillCatalog;
}

function hostCatalogPackageMap(
  catalog: HostSkillCatalog
): Map<string, CapabilityPackageRef> {
  return new Map((catalog.packages ?? []).map((pkg) => [pkg.packageId, pkg] as const));
}

function candidatePackageId(
  candidate: Pick<CapabilityCandidate, "package" | "leaf" | "sourceMetadata">
): string | undefined {
  return (
    candidate.package?.packageId ??
    candidate.leaf?.packageId ??
    (typeof candidate.sourceMetadata?.packageId === "string"
      ? candidate.sourceMetadata.packageId
      : undefined)
  );
}

function buildHostSkillCandidates(
  catalog: HostSkillCatalog,
  intent: BrokerIntent | undefined
): CapabilityCandidate[] {
  const packageMap = hostCatalogPackageMap(catalog);

  return (catalog.skills ?? [])
    .filter(
      (candidate) =>
        candidate.kind === "skill" &&
        (intent === undefined || candidate.intent === intent)
    )
    .map((candidate) => {
      const packageId = candidatePackageId(candidate);

      if (packageId === undefined) {
        return candidate;
      }

      const packageRef = packageMap.get(packageId);

      if (packageRef === undefined) {
        return candidate;
      }

      return {
        ...candidate,
        package: mergePackageRef(packageRef, candidate.package)
      };
    });
}

function buildHostWorkflowRecipes(
  catalog: HostSkillCatalog,
  intent: BrokerIntent | undefined
): WorkflowRecipe[] {
  const packageMap = new Map(
    (catalog.packages ?? []).map((pkg) => [pkg.packageId, pkg] as const)
  );

  return (catalog.workflows ?? [])
    .filter((workflow) => intent === undefined || workflow.intent === intent)
    .map((workflow) => {
      const packageId = candidatePackageId(workflow);
      const mergedPackage =
        packageId === undefined
          ? workflow.package
          : mergePackageRef(packageMap.get(packageId), workflow.package);
      const card = toCapabilityCard({
        ...workflow,
        package: mergedPackage
      });
      const normalizeStageCapability = (
        stage: WorkflowStage
      ): WorkflowStageCapability | undefined => {
        if (stage.capability === undefined) {
          return undefined;
        }

        const stageCard = toCapabilityCard({
          id: `${card.id}:${stage.id}`,
          kind: "skill",
          label: stage.label,
          intent: card.compatibilityIntent,
          package: mergePackageRef(packageMap.get(stage.capability.packageId), {
            ...stage.capability.package,
            packageId: stage.capability.packageId
          }),
          leaf: {
            ...workflowStageCapabilityIdentity(stage.capability),
            packageId: stage.capability.packageId,
            probe: stage.capability.probe
          },
          query: card.query,
          implementation: {
            id: stage.capability.implementationId,
            type: "local_skill",
            ownerSurface: card.implementation.ownerSurface
          }
        });

        return {
          ...workflowStageCapabilityIdentity({
            ...stage.capability,
            packageId: stageCard.package.packageId,
            capabilityId: stageCard.leaf.capabilityId,
            subskillId: stageCard.leaf.subskillId
          }),
          implementationId: stageCard.implementation.id,
          package: stageCard.package,
          probe: stageCard.leaf.probe
        };
      };

      return {
        id: card.id,
        label: card.label,
        compatibilityIntent: card.compatibilityIntent,
        package: card.package,
        leaf: card.leaf,
        query: card.query,
        implementation: {
          id: card.implementation.id,
          type: "broker_workflow",
          ownerSurface: card.implementation.ownerSurface
        },
        startStageId: workflow.startStageId,
        stages: workflow.stages.map((stage) => ({
          ...stage,
          capability: normalizeStageCapability(stage)
        })),
        sourceMetadata: workflow.sourceMetadata
      };
    });
}

export type HostDiscoverySnapshot = {
  skillCandidates: CapabilityCandidate[];
  workflowRecipes: WorkflowRecipe[];
};

export async function loadHostSkillCandidates(
  intent: BrokerIntent | undefined,
  catalogFilePath: string
): Promise<CapabilityCandidate[]> {
  const catalog = await readHostSkillCatalog(catalogFilePath);

  return buildHostSkillCandidates(catalog, intent);
}

async function readHostSkillCatalog(
  filePath: string
): Promise<HostSkillCatalog> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  return validateHostSkillCatalog(filePath, parsed);
}

export async function loadHostWorkflowRecipes(
  intent: BrokerIntent | undefined,
  catalogFilePath: string
): Promise<WorkflowRecipe[]> {
  const catalog = await readHostSkillCatalog(catalogFilePath);

  return buildHostWorkflowRecipes(catalog, intent);
}

export async function loadHostDiscoverySnapshot(
  intent: BrokerIntent | undefined,
  catalogFilePath: string
): Promise<HostDiscoverySnapshot> {
  const catalog = await readHostSkillCatalog(catalogFilePath);
  const errors: unknown[] = [];
  let skillCandidates: CapabilityCandidate[] = [];
  let workflowRecipes: WorkflowRecipe[] = [];

  try {
    skillCandidates = buildHostSkillCandidates(catalog, intent);
  } catch (error) {
    errors.push(error);
  }

  try {
    workflowRecipes = buildHostWorkflowRecipes(catalog, intent);
  } catch (error) {
    errors.push(error);
  }

  if (errors.length === 2) {
    throw new AggregateError(
      errors,
      `Failed to load any host discovery sources from ${catalogFilePath}.`
    );
  }

  return {
    skillCandidates,
    workflowRecipes
  };
}
