export type RunBrokerCliInput = {
  task: string;
  url: string;
};

export type RunBrokerCliOutput = {
  ok: false;
  error: {
    code: "NOT_IMPLEMENTED";
    message?: string;
  };
};

export async function runBrokerCli(
  _input: RunBrokerCliInput
): Promise<RunBrokerCliOutput> {
  const response: RunBrokerCliOutput = {
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "broker pipeline not wired yet"
    }
  };

  process.stdout.write(JSON.stringify(response));
  return response;
}
