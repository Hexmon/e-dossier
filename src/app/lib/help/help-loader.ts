import { cache } from 'react';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const HELP_DOCS_ROOT = path.join(process.cwd(), 'docs', 'help');

export const loadHelpMarkdown = cache(async (filename: string): Promise<string> => {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const fullPath = path.join(HELP_DOCS_ROOT, safeFilename);
  return fs.readFile(fullPath, 'utf8');
});
