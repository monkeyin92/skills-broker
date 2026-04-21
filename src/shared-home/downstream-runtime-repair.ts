import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BROKER_HOSTS, type BrokerHost } from "../core/types.js";

const BAOYU_URL_TO_MARKDOWN_SKILL = "baoyu-url-to-markdown";
const BAOYU_FETCH_CLI_RELATIVE_PATH = join(
  "scripts",
  "node_modules",
  "baoyu-fetch",
  "dist",
  "cli.js"
);
const FIXED_SYNC_WORKER_FRAGMENT =
  'fileURLToPath(new URL("../../jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js", import.meta.url))';
const BROKEN_SYNC_WORKER_ASSIGNMENT =
  /var syncWorkerFile = [^\n]*xhr-sync-worker\.js"\) : null;/;
const FIXED_SYNC_WORKER_ASSIGNMENT = `var syncWorkerFile = __require("url").${FIXED_SYNC_WORKER_FRAGMENT};`;

export type DownstreamRuntimeRepairResult = {
  repairedFiles: string[];
  warnings: string[];
};

function brokerManagedSkillDirectory(
  brokerHomeDirectory: string,
  host: BrokerHost,
  skillName: string
): string {
  return join(brokerHomeDirectory, "downstream", host, "skills", skillName);
}

function maybeRepairBaoyuFetchCli(source: string): {
  changed: boolean;
  repairedSource: string;
  warning?: string;
} {
  if (source.includes(FIXED_SYNC_WORKER_FRAGMENT)) {
    return {
      changed: false,
      repairedSource: source
    };
  }

  if (!source.includes("xhr-sync-worker.js")) {
    return {
      changed: false,
      repairedSource: source
    };
  }

  if (!BROKEN_SYNC_WORKER_ASSIGNMENT.test(source)) {
    return {
      changed: false,
      repairedSource: source,
      warning:
        "baoyu-url-to-markdown: found xhr-sync-worker.js reference in baoyu-fetch/dist/cli.js but could not normalize it automatically"
    };
  }

  return {
    changed: true,
    repairedSource: source.replace(
      BROKEN_SYNC_WORKER_ASSIGNMENT,
      FIXED_SYNC_WORKER_ASSIGNMENT
    )
  };
}

async function repairBaoyuFetchCliForHostSkill(input: {
  brokerHomeDirectory: string;
  host: BrokerHost;
  skillName: string;
}): Promise<DownstreamRuntimeRepairResult> {
  const cliPath = join(
    brokerManagedSkillDirectory(
      input.brokerHomeDirectory,
      input.host,
      input.skillName
    ),
    BAOYU_FETCH_CLI_RELATIVE_PATH
  );

  try {
    const source = await readFile(cliPath, "utf8");
    const repair = maybeRepairBaoyuFetchCli(source);

    if (repair.warning !== undefined) {
      return {
        repairedFiles: [],
        warnings: [repair.warning]
      };
    }

    if (!repair.changed) {
      return {
        repairedFiles: [],
        warnings: []
      };
    }

    await writeFile(cliPath, repair.repairedSource, "utf8");

    return {
      repairedFiles: [cliPath],
      warnings: []
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT" || nodeError.code === "ENOTDIR") {
      return {
        repairedFiles: [],
        warnings: []
      };
    }

    return {
      repairedFiles: [],
      warnings: [
        `baoyu-url-to-markdown: failed to inspect or repair baoyu-fetch runtime at ${cliPath}: ${nodeError.message}`
      ]
    };
  }
}

export async function repairBrokerManagedDownstreamRuntimes(
  brokerHomeDirectory: string
): Promise<DownstreamRuntimeRepairResult> {
  const repairedFiles: string[] = [];
  const warnings: string[] = [];

  for (const host of BROKER_HOSTS) {
    const result = await repairBaoyuFetchCliForHostSkill({
      brokerHomeDirectory,
      host,
      skillName: BAOYU_URL_TO_MARKDOWN_SKILL
    });

    repairedFiles.push(...result.repairedFiles);
    warnings.push(...result.warnings);
  }

  return {
    repairedFiles,
    warnings
  };
}
