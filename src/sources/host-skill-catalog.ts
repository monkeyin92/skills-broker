import { readFile } from "node:fs/promises";
import type { CapabilityCandidate } from "../core/capability-card.js";
import {
  CAPABILITY_PACKAGE_LAYOUTS,
  type BrokerIntent,
  type CapabilityPackageRef
} from "../core/types.js";

type HostSkillCatalog = {
  packages?: CapabilityPackageRef[];
  skills?: CapabilityCandidate[];
};

const PACKAGE_INSTALL_STATES = new Set(["installed", "available"]);
const PACKAGE_ACQUISITIONS = new Set([
  "local_skill_bundle",
  "published_package",
  "broker_native",
  "mcp_bundle"
]);
const PACKAGE_LAYOUTS = new Set<string>(CAPABILITY_PACKAGE_LAYOUTS);

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
  value: unknown
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
}

function validateHostSkillCatalog(
  filePath: string,
  value: unknown
): HostSkillCatalog {
  if (!isRecord(value)) {
    fail(filePath, "root", "expected an object");
  }

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
      validateSkillEntry(filePath, `skills[${index}]`, entry);
    });
  }

  return value as HostSkillCatalog;
}

export async function loadHostSkillCandidates(
  intent: BrokerIntent,
  catalogFilePath: string
): Promise<CapabilityCandidate[]> {
  const catalog = await readHostSkillCatalog(catalogFilePath);
  const packageMap = new Map(
    (catalog.packages ?? []).map((pkg) => [pkg.packageId, pkg] as const)
  );

  return (catalog.skills ?? []).filter(
    (candidate) => candidate.kind === "skill" && candidate.intent === intent
  ).map((candidate) => {
    const packageId =
      candidate.package?.packageId ??
      (typeof candidate.sourceMetadata?.packageId === "string"
        ? candidate.sourceMetadata.packageId
        : undefined);

    if (packageId === undefined) {
      return candidate;
    }

    const packageRef = packageMap.get(packageId);

    if (packageRef === undefined) {
      return candidate;
    }

    return {
      ...candidate,
      package: {
        ...packageRef,
        ...candidate.package
      }
    };
  });
}

async function readHostSkillCatalog(
  filePath: string
): Promise<HostSkillCatalog> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  return validateHostSkillCatalog(filePath, parsed);
}
