import {
  runBroker,
  type RunBrokerOptions,
  type RunBrokerResult
} from "./broker/run";
import type { NormalizeRequestInput } from "./core/request";

export type RunBrokerCliInput = {
  task: NormalizeRequestInput["task"];
  url: NormalizeRequestInput["url"];
};

export type RunBrokerCliOutput = RunBrokerResult;

export async function runBrokerCli(
  input: RunBrokerCliInput,
  options: RunBrokerOptions = {}
): Promise<RunBrokerCliOutput> {
  const response = await runBroker(input, options);

  process.stdout.write(JSON.stringify(response));
  return response;
}
