import archiver from 'archiver';
import { PassThrough } from 'node:stream';

export type ZipFileInput = {
  name: string;
  data: Buffer;
};

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
