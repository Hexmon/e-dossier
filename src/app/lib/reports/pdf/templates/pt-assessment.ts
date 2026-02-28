import type { PtAssessmentPreview } from '@/types/reports';
import { drawSimpleTable } from '@/app/lib/reports/pdf/pdf-engine';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  generatedAt: Date;
};

function buildColumnDescriptors(data: PtAssessmentPreview) {
  const cols: Array<{ key: string; label: string }> = [];
  for (const task of data.tasks) {
    for (const attempt of task.attempts) {
      for (const grade of attempt.grades) {
        cols.push({
          key: `${task.taskId}:${attempt.attemptId}:${grade.gradeCode}`,
          label: `${task.title}\n${attempt.attemptCode}:${grade.gradeCode}`,
        });
      }
    }
  }
  return cols;
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  if (size <= 0) return [rows];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

export function renderPtAssessmentTemplate(
  doc: PDFKit.PDFDocument,
  data: PtAssessmentPreview,
  meta: ReportRenderMeta
) {
  const columns = buildColumnDescriptors(data);
  const pageInnerWidth = doc.page.width - 72;

  doc.font('Helvetica-Bold').fontSize(12).text('PHYSICAL ASSESSMENT TRAINING REPORT', 36, 30, {
    width: pageInnerWidth,
    align: 'center',
  });
  doc.font('Helvetica').fontSize(9);
  doc.text(`Course: ${data.course.code} (${data.course.title})`, 36, 48);
  doc.text(`Semester: ${data.semester}`, 36, 61);
  doc.text(`PT Type: ${data.ptType.title} (${data.ptType.code})`, 36, 74);
  doc.text(`Generated: ${meta.generatedAt.toISOString().slice(0, 10)}`, 36, 87);
  doc.text(`Version: ${meta.versionId}`, doc.page.width - 200, 48, { width: 160, align: 'right' });

  const baseWidths = [30, 58, 56, 110];
  const totalColWidth = 60;
  const variableWidth = pageInnerWidth - baseWidths.reduce((sum, value) => sum + value, 0) - totalColWidth;
  const columnWidth = Math.max(24, Math.floor(variableWidth / Math.max(columns.length, 1)));

  const visiblePerPage = Math.max(1, Math.floor(variableWidth / columnWidth));
  const columnChunks = chunkRows(columns, visiblePerPage);

  columnChunks.forEach((columnChunk, chunkIndex) => {
    if (chunkIndex > 0) {
      doc.addPage({ layout: 'landscape', margin: 36 });
      doc.font('Helvetica-Bold').fontSize(11).text('PHYSICAL ASSESSMENT TRAINING REPORT (contd.)', 36, 30, {
        width: doc.page.width - 72,
        align: 'center',
      });
      doc.font('Helvetica').fontSize(9);
      doc.text(`Version: ${meta.versionId}`, doc.page.width - 200, 48, { width: 160, align: 'right' });
    }

    const widths = [...baseWidths, ...columnChunk.map(() => columnWidth), totalColWidth];
    const header = ['S.No', 'TES No', 'Rank', 'Name', ...columnChunk.map((col) => col.label), 'Marks'];

    const rows = data.rows.map((row) => {
      const values = columnChunk.map((col) => {
        const cell = row.cells[col.key];
        return cell === null || cell === undefined ? '' : String(cell);
      });
      return [
        String(row.sNo),
        row.tesNo,
        row.rank,
        row.name,
        ...values,
        String(row.totalMarksScored),
      ];
    });

    const out = drawSimpleTable(doc, 36, 108, widths, [header, ...rows], {
      rowHeight: 18,
      fontSize: 7,
      headerRows: 1,
    });

    if (chunkIndex === columnChunks.length - 1) {
      let y = out.endY + 12;
      if (y > doc.page.height - 100) {
        doc.addPage({ layout: 'landscape', margin: 36 });
        y = 48;
      }
      doc.font('Helvetica').fontSize(10);
      doc.text(`Prepared By: ${meta.preparedBy}`, 36, y);
      doc.text(`Checked By: ${meta.checkedBy}`, 36, y + 15);
    }
  });
}
