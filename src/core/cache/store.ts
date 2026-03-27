import { readFile, unlink, writeFile } from "node:fs/promises";

export type CachedCardRecord<TCard extends { fetchedAt: string }> = {
  card: TCard;
};

export class FileBackedCacheStore<TCard extends { fetchedAt: string }> {
  constructor(private readonly filePath: string) {}

  async read(): Promise<CachedCardRecord<TCard> | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as CachedCardRecord<TCard>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async write(record: CachedCardRecord<TCard>): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(record, null, 2), "utf8");
  }

  async delete(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      throw error;
    }
  }
}
