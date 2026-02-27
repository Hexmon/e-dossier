import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';

export type PdfLayout = 'portrait' | 'landscape';

export type EncryptedPdfOptions = {
  password: string;
  title: string;
  layout?: PdfLayout;
};

export type PdfRenderResult = {
  buffer: Buffer;
  checksumSha256: string;
};

let afmFallbackPatched = false;

function findPdfkitDataDirFromPnpm(baseDir: string): string | null {
  const pnpmStore = path.join(baseDir, 'node_modules', '.pnpm');
  if (!fs.existsSync(pnpmStore)) return null;

  try {
    const entries = fs.readdirSync(pnpmStore).filter((entry) => entry.startsWith('pdfkit@'));
    for (const entry of entries) {
      const candidate = path.join(pnpmStore, entry, 'node_modules', 'pdfkit', 'js', 'data');
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveAfmFallbackPath(filePath: string): string | null {
  const baseName = path.basename(filePath);
  const directCandidates = [
    filePath.replace('/ROOT/', '/root/'),
    filePath.replace('/root/', '/ROOT/'),
  ];

  for (const candidate of directCandidates) {
    if (candidate !== filePath && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const dataDirs = [
    findPdfkitDataDirFromPnpm(process.cwd()),
    findPdfkitDataDirFromPnpm('/root'),
    findPdfkitDataDirFromPnpm('/ROOT'),
  ].filter((value): value is string => Boolean(value));

  for (const dir of dataDirs) {
    const candidate = path.join(dir, baseName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function ensureAfmPathFallbackPatched() {
  if (afmFallbackPatched) return;
  const originalReadFileSync = fs.readFileSync.bind(fs);

  const patched: typeof fs.readFileSync = ((file: fs.PathOrFileDescriptor, options?: unknown) => {
    if (typeof file !== 'string') {
      return originalReadFileSync(file, options as never);
    }

    const isPdfkitAfmFile = file.includes('/pdfkit/js/data/') && file.endsWith('.afm');
    if (!isPdfkitAfmFile || fs.existsSync(file)) {
      return originalReadFileSync(file, options as never);
    }

    const fallbackPath = resolveAfmFallbackPath(file);
    if (!fallbackPath) {
      return originalReadFileSync(file, options as never);
    }
    return originalReadFileSync(fallbackPath, options as never);
  }) as typeof fs.readFileSync;

  (fs as { readFileSync: typeof fs.readFileSync }).readFileSync = patched;
  afmFallbackPatched = true;
}

export async function renderEncryptedPdf(
  options: EncryptedPdfOptions,
  renderer: (doc: PDFKit.PDFDocument) => void
): Promise<PdfRenderResult> {
  ensureAfmPathFallbackPatched();
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    layout: options.layout ?? 'portrait',
    info: {
      Title: options.title,
      Creator: 'e-dossier',
      Producer: 'e-dossier',
    },
    userPassword: options.password,
    ownerPassword: randomUUID(),
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: true,
      documentAssembly: false,
    },
  });

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  renderer(doc);
  doc.end();

  const buffer = await done;
  const checksumSha256 = createHash('sha256').update(buffer).digest('hex');

  return { buffer, checksumSha256 };
}

export function drawSimpleTable(
  doc: PDFKit.PDFDocument,
  startX: number,
  startY: number,
  widths: number[],
  rows: string[][],
  opts: { rowHeight?: number; fontSize?: number; headerRows?: number } = {}
) {
  const rowHeight = opts.rowHeight ?? 20;
  const fontSize = opts.fontSize ?? 9;
  const headerRows = opts.headerRows ?? 1;

  let y = startY;

  doc.fontSize(fontSize);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    let x = startX;
    const isHeader = rowIndex < headerRows;

    for (let colIndex = 0; colIndex < widths.length; colIndex += 1) {
      const width = widths[colIndex] ?? 80;
      const value = row[colIndex] ?? '';

      doc.rect(x, y, width, rowHeight).stroke();
      if (isHeader) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }

      doc.text(String(value), x + 4, y + 5, {
        width: width - 8,
        height: rowHeight - 8,
        align: 'left',
        ellipsis: true,
      });

      x += width;
    }

    y += rowHeight;
  }

  return { endY: y };
}
