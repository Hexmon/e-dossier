import type { PtAssessmentPreview, PtAssessmentRow } from '@/types/reports';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  generatedAt: Date;
};

type TaskGroup = {
  taskId: string;
  title: string;
  entries: Array<{ key: string; attemptCode: string; gradeCode: string }>;
};

const PAGE_MARGIN = 24;
const ROWS_PER_PAGE = 10;
const HEADER_TOP_1 = 34;
const HEADER_TOP_2 = 66;
const TABLE_Y = 96;
const ROW_H1 = 26; // PPT group header
const ROW_H2 = 96; // Task title band
const ROW_H3 = 30; // Attempt/E-G-S/Mks band
const DATA_ROW_H = 46;
const FIXED_COL_WIDTHS = {
  sno: 34,
  tesNo: 46,
  rank: 46,
  name: 130,
  total: 50,
};
const TASK_SUB_COL_W = 20;
const TABLE_LINE_W = 0.8;

function toTermLabel(semester: number): string {
  switch (semester) {
    case 1:
      return 'FIRST TERM';
    case 2:
      return 'SECOND TERM';
    case 3:
      return 'THIRD TERM';
    case 4:
      return 'FOURTH TERM';
    case 5:
      return 'FIFTH TERM';
    case 6:
      return 'SIXTH TERM';
    default:
      return `${semester} TERM`;
  }
}

function makeTaskGroups(data: PtAssessmentPreview): TaskGroup[] {
  const groups: TaskGroup[] = [];
  for (const task of data.tasks) {
    const entries: TaskGroup['entries'] = [];
    for (const attempt of task.attempts) {
      for (const grade of attempt.grades) {
        entries.push({
          key: `${task.taskId}:${attempt.attemptId}:${grade.gradeCode}`,
          attemptCode: attempt.attemptCode,
          gradeCode: grade.gradeCode,
        });
      }
    }
    groups.push({
      taskId: task.taskId,
      title: task.title.toUpperCase(),
      entries,
    });
  }
  return groups;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function drawRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).stroke();
}

function drawLine(doc: PDFKit.PDFDocument, x1: number, y1: number, x2: number, y2: number) {
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
}

function textInBox(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: { align?: 'left' | 'center' | 'right'; bold?: boolean; size?: number } = {}
) {
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8.5);
  doc.text(text, x + 2, y + 2, {
    width: Math.max(0, width - 4),
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    lineBreak: false,
    ellipsis: true,
  });
}

function textVerticalCenter(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: { bold?: boolean; size?: number } = {}
) {
  const fontSize = opts.size ?? 8.5;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  const trimmed = (text ?? '').toString();
  const textWidth = doc.widthOfString(trimmed);

  doc.save();
  doc.translate(x + width / 2, y + height / 2);
  doc.rotate(-90);
  // Draw a single vertical line of text without wrapped layout to avoid implicit page flow.
  doc.text(trimmed, -textWidth / 2, -fontSize / 2, {
    lineBreak: false,
    ellipsis: true,
  });
  doc.restore();
}

function buildTaskCellValues(row: PtAssessmentRow | undefined, group: TaskGroup) {
  if (!row || !group.entries.length) return { attempt: '', grade: '', marks: '' };
  const entriesWithValues = group.entries
    .map((entry) => ({ entry, value: row.cells[entry.key] }))
    .filter((item) => item.value !== null && item.value !== undefined) as Array<{
      entry: TaskGroup['entries'][number];
      value: number;
    }>;

  if (!entriesWithValues.length) return { attempt: '', grade: '', marks: '' };

  const attempts = Array.from(new Set(entriesWithValues.map((item) => item.entry.attemptCode)));
  const grades = Array.from(new Set(entriesWithValues.map((item) => item.entry.gradeCode)));
  const marks = entriesWithValues.reduce((sum, item) => sum + item.value, 0);

  return {
    attempt: attempts.join('/'),
    grade: grades.join('/'),
    marks: String(marks),
  };
}

function drawPageHeader(doc: PDFKit.PDFDocument, semester: number) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  doc.font('Helvetica-Bold').fontSize(20).text('ASSESSMENT : PHY TRG', PAGE_MARGIN, HEADER_TOP_1, {
    width: contentWidth,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(18).text(toTermLabel(semester), PAGE_MARGIN, HEADER_TOP_2, {
    width: contentWidth,
    align: 'center',
  });
}

function drawPageFooter(doc: PDFKit.PDFDocument, versionId: string) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  // Keep footer inside printable bounds; writing below bottom margin can trigger an implicit new page.
  const footerY = doc.page.height - PAGE_MARGIN - 10;
  doc.font('Helvetica').fontSize(7).text(`Version: ${versionId}`, PAGE_MARGIN, footerY, {
    width: contentWidth,
    align: 'right',
    lineBreak: false,
  });
}

function drawMatrixPage(
  doc: PDFKit.PDFDocument,
  taskGroups: TaskGroup[],
  rows: PtAssessmentRow[],
  rowStartIndex: number
) {
  const x = PAGE_MARGIN;
  const headerTotal = ROW_H1 + ROW_H2 + ROW_H3;
  const dataRowCount = ROWS_PER_PAGE;
  const taskGroupW = TASK_SUB_COL_W * 3;
  const taskAreaW = taskGroups.length * taskGroupW;

  const tableW =
    FIXED_COL_WIDTHS.sno +
    FIXED_COL_WIDTHS.tesNo +
    FIXED_COL_WIDTHS.rank +
    FIXED_COL_WIDTHS.name +
    taskAreaW +
    FIXED_COL_WIDTHS.total;
  const tableH = headerTotal + dataRowCount * DATA_ROW_H;

  const xs = {
    tableStart: x,
    snoStart: x,
    tesStart: x + FIXED_COL_WIDTHS.sno,
    rankStart: x + FIXED_COL_WIDTHS.sno + FIXED_COL_WIDTHS.tesNo,
    nameStart: x + FIXED_COL_WIDTHS.sno + FIXED_COL_WIDTHS.tesNo + FIXED_COL_WIDTHS.rank,
    taskStart: x + FIXED_COL_WIDTHS.sno + FIXED_COL_WIDTHS.tesNo + FIXED_COL_WIDTHS.rank + FIXED_COL_WIDTHS.name,
    totalStart:
      x +
      FIXED_COL_WIDTHS.sno +
      FIXED_COL_WIDTHS.tesNo +
      FIXED_COL_WIDTHS.rank +
      FIXED_COL_WIDTHS.name +
      taskAreaW,
    tableEnd:
      x +
      FIXED_COL_WIDTHS.sno +
      FIXED_COL_WIDTHS.tesNo +
      FIXED_COL_WIDTHS.rank +
      FIXED_COL_WIDTHS.name +
      taskAreaW +
      FIXED_COL_WIDTHS.total,
  };

  doc.lineWidth(TABLE_LINE_W);
  drawRect(doc, xs.tableStart, TABLE_Y, tableW, tableH);

  drawLine(doc, xs.tesStart, TABLE_Y, xs.tesStart, TABLE_Y + tableH);
  drawLine(doc, xs.rankStart, TABLE_Y, xs.rankStart, TABLE_Y + tableH);
  drawLine(doc, xs.nameStart, TABLE_Y, xs.nameStart, TABLE_Y + tableH);
  drawLine(doc, xs.taskStart, TABLE_Y, xs.taskStart, TABLE_Y + tableH);
  drawLine(doc, xs.totalStart, TABLE_Y, xs.totalStart, TABLE_Y + tableH);

  const yH1 = TABLE_Y + ROW_H1;
  const yH2 = TABLE_Y + ROW_H1 + ROW_H2;
  const yHeaderBottom = TABLE_Y + headerTotal;

  if (taskAreaW > 0) {
    drawLine(doc, xs.taskStart, yH1, xs.totalStart, yH1);
    drawLine(doc, xs.taskStart, yH2, xs.totalStart, yH2);
  }
  drawLine(doc, xs.tableStart, yHeaderBottom, xs.tableEnd, yHeaderBottom);

  for (let i = 1; i < dataRowCount; i += 1) {
    const y = yHeaderBottom + i * DATA_ROW_H;
    drawLine(doc, xs.tableStart, y, xs.tableEnd, y);
  }

  textVerticalCenter(doc, 'S. No', xs.snoStart, TABLE_Y, FIXED_COL_WIDTHS.sno, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'TES No', xs.tesStart, TABLE_Y, FIXED_COL_WIDTHS.tesNo, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'RANK', xs.rankStart, TABLE_Y, FIXED_COL_WIDTHS.rank, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'NAME', xs.nameStart, TABLE_Y, FIXED_COL_WIDTHS.name, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(
    doc,
    'MKS SCORED',
    xs.totalStart,
    TABLE_Y,
    FIXED_COL_WIDTHS.total,
    headerTotal,
    { bold: true, size: 10 }
  );

  if (taskGroups.length > 0) {
    textInBox(doc, 'PPT', xs.taskStart, TABLE_Y, taskAreaW, ROW_H1, { bold: true, size: 11 });

    for (let i = 0; i < taskGroups.length; i += 1) {
      const gx = xs.taskStart + i * taskGroupW;
      if (i > 0) drawLine(doc, gx, TABLE_Y, gx, TABLE_Y + tableH);
      drawLine(doc, gx + TASK_SUB_COL_W, yH1, gx + TASK_SUB_COL_W, TABLE_Y + tableH);
      drawLine(doc, gx + TASK_SUB_COL_W * 2, yH1, gx + TASK_SUB_COL_W * 2, TABLE_Y + tableH);

      textVerticalCenter(doc, taskGroups[i]?.title ?? '', gx, yH1, taskGroupW, ROW_H2, { bold: true, size: 9 });
      textVerticalCenter(doc, 'Attempt', gx, yH2, TASK_SUB_COL_W, ROW_H3, { bold: true, size: 8.8 });
      textVerticalCenter(doc, 'E / G / S', gx + TASK_SUB_COL_W, yH2, TASK_SUB_COL_W, ROW_H3, { bold: true, size: 8.8 });
      textVerticalCenter(doc, 'Mks', gx + TASK_SUB_COL_W * 2, yH2, TASK_SUB_COL_W, ROW_H3, { bold: true, size: 8.8 });
    }
  }

  for (let rowIndex = 0; rowIndex < dataRowCount; rowIndex += 1) {
    const sourceRow = rows[rowIndex];
    const y = yHeaderBottom + rowIndex * DATA_ROW_H;
    const displayNo = rowStartIndex + rowIndex + 1;

    textInBox(doc, String(displayNo), xs.snoStart, y, FIXED_COL_WIDTHS.sno, DATA_ROW_H, { size: 12, align: 'center' });
    textInBox(doc, sourceRow?.tesNo ?? '', xs.tesStart, y, FIXED_COL_WIDTHS.tesNo, DATA_ROW_H, { size: 11 });
    textInBox(doc, sourceRow?.rank ?? '', xs.rankStart, y, FIXED_COL_WIDTHS.rank, DATA_ROW_H, { size: 10 });
    textInBox(doc, sourceRow?.name ?? '', xs.nameStart, y, FIXED_COL_WIDTHS.name, DATA_ROW_H, { size: 10, align: 'left' });

    for (let i = 0; i < taskGroups.length; i += 1) {
      const groupX = xs.taskStart + i * taskGroupW;
      const values = buildTaskCellValues(sourceRow, taskGroups[i]!);
      textInBox(doc, values.attempt, groupX, y, TASK_SUB_COL_W, DATA_ROW_H, { size: 10 });
      textInBox(doc, values.grade, groupX + TASK_SUB_COL_W, y, TASK_SUB_COL_W, DATA_ROW_H, { size: 10 });
      textInBox(doc, values.marks, groupX + TASK_SUB_COL_W * 2, y, TASK_SUB_COL_W, DATA_ROW_H, { size: 10 });
    }

    textInBox(doc, sourceRow ? String(sourceRow.totalMarksScored) : '', xs.totalStart, y, FIXED_COL_WIDTHS.total, DATA_ROW_H, {
      size: 11,
    });
  }
}

export function renderPtAssessmentTemplate(
  doc: PDFKit.PDFDocument,
  data: PtAssessmentPreview,
  meta: ReportRenderMeta
) {
  const allTaskGroups = makeTaskGroups(data);
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const fixedWidth =
    FIXED_COL_WIDTHS.sno +
    FIXED_COL_WIDTHS.tesNo +
    FIXED_COL_WIDTHS.rank +
    FIXED_COL_WIDTHS.name +
    FIXED_COL_WIDTHS.total;
  const taskGroupWidth = TASK_SUB_COL_W * 3;
  const maxTaskGroupsPerPage = Math.max(1, Math.floor((contentWidth - fixedWidth) / taskGroupWidth));
  const taskChunks = chunk(allTaskGroups, maxTaskGroupsPerPage);
  const rows = data.rows;

  let firstPage = true;
  for (const taskChunk of taskChunks) {
    const totalPagesForRows = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

    for (let pageIndex = 0; pageIndex < totalPagesForRows; pageIndex += 1) {
      if (!firstPage) doc.addPage();
      firstPage = false;

      drawPageHeader(doc, data.semester);

      const start = pageIndex * ROWS_PER_PAGE;
      const slice = rows.slice(start, start + ROWS_PER_PAGE);
      drawMatrixPage(doc, taskChunk, slice, start);
      drawPageFooter(doc, meta.versionId);
    }
  }
}
