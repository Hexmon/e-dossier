import * as XLSX from 'xlsx';

type ExportSheet = {
  name: string;
  rows: Array<Record<string, string | number | null>>;
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_\.]+/g, '-').replace(/-+/g, '-');
}

export function downloadExcelFile(fileName: string, sheets: ExportSheet[]) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const safeRows = sheet.rows.length ? sheet.rows : [{ Note: 'No data' }];
    const worksheet = XLSX.utils.json_to_sheet(safeRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  triggerDownload(
    new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    sanitizeFileName(fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
  );
}

export function downloadCsvFiles(baseName: string, sheets: ExportSheet[]) {
  for (const sheet of sheets) {
    const safeRows = sheet.rows.length ? sheet.rows : [{ Note: 'No data' }];
    const worksheet = XLSX.utils.json_to_sheet(safeRows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      sanitizeFileName(`${baseName}-${sheet.name}.csv`)
    );
  }
}
