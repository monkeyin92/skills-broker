import { runBroker, type RunBrokerResult } from "./broker/run";

export type RunBrokerCliInput = {
  task: string;
  url: string;
};

export type RunBrokerCliOutput = RunBrokerResult;

export async function runBrokerCli(
  input: RunBrokerCliInput
): Promise<RunBrokerCliOutput> {
  const response = await runBroker(input);

  process.stdout.write(JSON.stringify(response));
  return response;
}
