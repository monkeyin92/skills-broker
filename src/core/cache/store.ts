import { rename, readFile, unlink, writeFile } from "node:fs/promises";

export class FileBackedCacheStore<
  TRecord extends { card: { fetchedAt: string } }
> {
  constructor(private readonly filePath: string) {}

  async read(): Promise<TRecord | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as TRecord;
    } catch (error) {
      if (isMissingFileError(error) || error instanceof SyntaxError) {
        return null;
      }

      throw error;
    }
  }

  async write(record: TRecord): Promise<void> {
    const temporaryFilePath = `${this.filePath}.tmp`;

    await writeFile(temporaryFilePath, JSON.stringify(record, null, 2), "utf8");
    await rename(temporaryFilePath, this.filePath);
  }

  async delete(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch (error) {
      if (isMissingFileError(error)) {
        return;
      }

      throw error;
    }
  }
}

function isMissingFileError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}
