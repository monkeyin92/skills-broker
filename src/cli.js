export async function runBrokerCli(_input) {
  const response = {
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "broker pipeline not wired yet"
    }
  };

  process.stdout.write(JSON.stringify(response));
  return response;
}
