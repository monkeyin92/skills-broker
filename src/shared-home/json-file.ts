import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJsonFile<T>(
  filePath: string
): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeJsonFile<T>(
  filePath: string,
  value: T
): Promise<void> {
  const temporaryFilePath = `${filePath}.${process.pid}.tmp`;

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(
    temporaryFilePath,
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
  await rename(temporaryFilePath, filePath);
}
