import { runReleaseTruthCli } from "../src/dev/release-truth.ts";

const exitCode = await runReleaseTruthCli();
process.exitCode = exitCode;
