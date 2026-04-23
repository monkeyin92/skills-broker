import { execFile, type ExecFileOptions } from "node:child_process";
import { promisify } from "node:util";
import { resolveNpmCliPath } from "../../src/dev/local-verification";

const execFileAsync = promisify(execFile);

export { resolveNpmCliPath };

export function execNpm(args: string[], options?: ExecFileOptions) {
  const env = (options?.env as NodeJS.ProcessEnv | undefined) ?? process.env;
  return execFileAsync(process.execPath, [resolveNpmCliPath(process.execPath, env), ...args], options);
}
