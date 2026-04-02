import { execFile, type ExecFileOptions } from "node:child_process";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function resolveNpmCliPath(nodePath = process.execPath): string {
  if (typeof process.env.npm_execpath === "string" && process.env.npm_execpath.length > 0) {
    return process.env.npm_execpath;
  }

  return join(dirname(dirname(nodePath)), "lib", "node_modules", "npm", "bin", "npm-cli.js");
}

export function execNpm(args: string[], options?: ExecFileOptions) {
  return execFileAsync(process.execPath, [resolveNpmCliPath(), ...args], options);
}
