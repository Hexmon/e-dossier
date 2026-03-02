import archiver from 'archiver';
import { PassThrough } from 'node:stream';

export type ZipFileInput = {
  name: string;
  data: Buffer;
};

let encryptedZipFormatRegistered = false;

async function ensureEncryptedZipFormatRegistered() {
  if (encryptedZipFormatRegistered) return;
  const moduleValue = await import('archiver-zip-encrypted');
  const formatFactory = (moduleValue as { default?: unknown }).default ?? moduleValue;
  (
    archiver as unknown as {
      registerFormat: (name: string, module: unknown) => void;
    }
  ).registerFormat('zip-encrypted', formatFactory);
  encryptedZipFormatRegistered = true;
}

export async function buildZipBuffer(files: ZipFileInput[]): Promise<Buffer> {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    output.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  for (const file of files) {
    archive.append(file.data, { name: file.name });
  }

  await archive.finalize();
  return done;
}

export async function buildEncryptedZipBuffer(
  files: ZipFileInput[],
  password: string
): Promise<Buffer> {
  await ensureEncryptedZipFormatRegistered();

  const archive = (
    archiver as unknown as {
      create: (
        format: string,
        options: {
          zlib: { level: number };
          encryptionMethod: 'aes256';
          password: string;
        }
      ) => archiver.Archiver;
    }
  ).create('zip-encrypted', {
    zlib: { level: 9 },
    encryptionMethod: 'aes256',
    password,
  });
  const output = new PassThrough();
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    output.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  for (const file of files) {
    archive.append(file.data, { name: file.name });
  }

  await archive.finalize();
  return done;
}
