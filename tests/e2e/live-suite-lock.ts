import { promises as fs } from "fs";
import os from "os";
import path from "path";

const LOCK_PATH = path.join(os.tmpdir(), "e-dossier-live-suite.lock");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function acquireLiveSuiteLock(options?: {
  timeoutMs?: number;
  pollMs?: number;
}) {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollMs = options?.pollMs ?? 500;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const handle = await fs.open(LOCK_PATH, "wx");
      await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));

      return async () => {
        await handle.close();
        await fs.rm(LOCK_PATH, { force: true });
      };
    } catch (error: any) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      await sleep(pollMs);
    }
  }

  throw new Error(`Timed out waiting for live suite lock at ${LOCK_PATH}.`);
}
