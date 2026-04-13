import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';

export const ROOT = process.cwd();

type PackageJson = {
  name?: string;
  version?: string;
  engines?: {
    node?: string;
  };
};

export type BuildMetadata = {
  name: string;
  version: string;
  nodeRange: string;
  requiredNodeMajor: number;
  gitSha: string;
  createdAt: string;
};

export async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function requirePath(targetPath: string, hint: string) {
  if (!(await pathExists(targetPath))) {
    throw new Error(`${targetPath} is missing. ${hint}`);
  }
}

export async function prepareCleanDir(targetPath: string) {
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(targetPath, { recursive: true });
}

export async function copyIfPresent(sourcePath: string, destinationPath: string) {
  if (!(await pathExists(sourcePath))) return false;
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { recursive: true });
  return true;
}

export async function createArchive(sourceDir: string, archivePath: string) {
  await mkdir(path.dirname(archivePath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(archivePath);
    const archive = archiver('tar', {
      gzip: true,
      gzipOptions: { level: 9 },
    });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize().catch(reject);
  });
}

export async function writeSha256File(archivePath: string) {
  const archiveBuffer = await readFile(archivePath);
  const checksum = createHash('sha256').update(archiveBuffer).digest('hex');
  const checksumPath = `${archivePath}.sha256`;
  await writeFile(checksumPath, `${checksum}  ${path.basename(archivePath)}\n`, 'utf8');
  return checksumPath;
}

export async function writeJson(targetPath: string, data: unknown) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function parseRequiredNodeMajor(nodeRange: string) {
  const match = nodeRange.match(/(\d+)/);
  return match ? Number(match[1]) : 20;
}

function getGitSha() {
  const result = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return 'unknown';
  }
  return result.stdout.trim() || 'unknown';
}

export async function readBuildMetadata(): Promise<BuildMetadata> {
  const packageJsonPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;
  const nodeRange = pkg.engines?.node ?? '>=20';

  return {
    name: pkg.name ?? 'e-dossier',
    version: pkg.version ?? '0.0.0',
    nodeRange,
    requiredNodeMajor: parseRequiredNodeMajor(nodeRange),
    gitSha: getGitSha(),
    createdAt: new Date().toISOString(),
  };
}
