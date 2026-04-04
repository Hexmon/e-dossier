import type { PtAssessmentPreview } from '@/types/reports';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  generatedAt: Date;
};

type CombinedTaskGroup = {
  key: string;
  ptTypeId: string;
  ptTypeCode: string;
  taskId: string;
  taskTitle: string;
};

type CombinedTypeGroup = {
  key: string;
  label: string;
  span: number;
};

type CombinedRow = {
  ocId: string;
  sNo: number;
  tesNo: string;
  rank: string;
  name: string;
  totalMarksScored: number;
  cells: Record<string, { attemptCode: string | null; gradeCode: string | null; marks: number | null }>;
};

const EMPTY_TASK_ID = '__no_task__';
const EMPTY_TASK_TITLE = 'NO TASKS';
const PAGE_MARGIN = 24;
const MIN_PAGE_WIDTH = 1190;
const MIN_PAGE_HEIGHT = 842;
const TITLE_Y = PAGE_MARGIN;
const SUBTITLE_Y = TITLE_Y + 28;
const TABLE_Y = SUBTITLE_Y + 36;
const FOOTER_GAP = 16;
const ROW_H1 = 28;
const ROW_H2 = 96;
const ROW_H3 = 34;
const DATA_ROW_H = 26;
const FIXED_COL_WIDTHS = {
  sno: 40,
  tesNo: 70,
  rank: 56,
  name: 180,
  total: 72,
};
const TASK_SUB_COL_W = 44;
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

function buildCombinedMatrix(data: PtAssessmentPreview) {
  const taskGroups = data.sections.flatMap((section) =>
    (section.tasks.length ? section.tasks : [{ taskId: EMPTY_TASK_ID, title: EMPTY_TASK_TITLE }]).map((task) => ({
      key: `${section.ptType.id}:${task.taskId}`,
      ptTypeId: section.ptType.id,
      ptTypeCode: section.ptType.code.toUpperCase(),
      taskId: task.taskId,
      taskTitle: task.title.toUpperCase(),
    })),
  );

  const rowsByOc = new Map<string, CombinedRow>();
  for (const section of data.sections) {
    for (const row of section.rows) {
      const combined = rowsByOc.get(row.ocId) ?? {
        ocId: row.ocId,
        sNo: row.sNo,
        tesNo: row.tesNo,
        rank: row.rank,
        name: row.name,
        totalMarksScored: 0,
        cells: {},
      };

      combined.totalMarksScored += row.totalMarksScored;
      for (const task of section.tasks) {
        combined.cells[`${section.ptType.id}:${task.taskId}`] = row.cells[task.taskId] ?? {
          attemptCode: null,
          gradeCode: null,
          marks: null,
        };
      }
      rowsByOc.set(row.ocId, combined);
    }
  }

  return {
    taskGroups,
    rows: Array.from(rowsByOc.values()).sort((left, right) => left.sNo - right.sNo),
  };
}

function buildVisibleTypeGroups(taskGroups: CombinedTaskGroup[]): CombinedTypeGroup[] {
  return taskGroups.reduce<CombinedTypeGroup[]>((groups, task) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.key === task.ptTypeId) {
      lastGroup.span += 3;
      return groups;
    }

    groups.push({
      key: task.ptTypeId,
      label: task.ptTypeCode,
      span: 3,
    });
    return groups;
  }, []);
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
  opts: {
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: number;
    lineBreak?: boolean;
  } = {},
) {
  const fontSize = opts.size ?? 8.5;
  const lineBreak = opts.lineBreak ?? true;
  const contentWidth = Math.max(0, width - 6);
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  const rendered = (text ?? '').toString();
  const textHeight = doc.heightOfString(rendered, {
    width: contentWidth,
    align: opts.align ?? 'center',
    lineBreak,
  });
  const contentY = y + Math.max(2, (height - Math.min(height - 4, textHeight)) / 2);

  doc.text(rendered, x + 3, contentY, {
    width: contentWidth,
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    lineBreak,
    ellipsis: !lineBreak,
  });
}

function textVerticalCenter(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: { bold?: boolean; size?: number } = {},
) {
  const fontSize = opts.size ?? 8.5;
  const rendered = (text ?? '').toString();
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  const textWidth = doc.widthOfString(rendered, { lineBreak: false });
  doc.save();
  doc.translate(x + width / 2, y + height / 2);
  doc.rotate(-90);
  doc.text(rendered, -textWidth / 2, -fontSize / 2, {
    lineBreak: false,
    ellipsis: true,
  });
  doc.restore();
}

function getTableWidth(taskCount: number) {
  return (
    FIXED_COL_WIDTHS.sno +
    FIXED_COL_WIDTHS.tesNo +
    FIXED_COL_WIDTHS.rank +
    FIXED_COL_WIDTHS.name +
    taskCount * TASK_SUB_COL_W * 3 +
    FIXED_COL_WIDTHS.total
  );
}

function getTableHeight(rowCount: number) {
  return ROW_H1 + ROW_H2 + ROW_H3 + Math.max(1, rowCount) * DATA_ROW_H;
}

export function getPtAssessmentPdfPageSize(data: PtAssessmentPreview): [number, number] {
  const matrix = buildCombinedMatrix(data);
  const width = Math.max(MIN_PAGE_WIDTH, PAGE_MARGIN * 2 + getTableWidth(matrix.taskGroups.length));
  const height = Math.max(MIN_PAGE_HEIGHT, TABLE_Y + getTableHeight(matrix.rows.length) + FOOTER_GAP + PAGE_MARGIN);
  return [Math.ceil(width), Math.ceil(height)];
}

function drawPageHeader(doc: PDFKit.PDFDocument, semester: number) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  doc.font('Helvetica-Bold').fontSize(20).text('ASSESSMENT : PHY TRG', PAGE_MARGIN, TITLE_Y, {
    width: contentWidth,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(18).text(toTermLabel(semester), PAGE_MARGIN, SUBTITLE_Y, {
    width: contentWidth,
    align: 'center',
  });
}

function drawPageFooter(doc: PDFKit.PDFDocument, versionId: string) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const footerY = doc.page.height - PAGE_MARGIN - 10;
  doc.font('Helvetica').fontSize(7).text(`Version: ${versionId}`, PAGE_MARGIN, footerY, {
    width: contentWidth,
    align: 'right',
    lineBreak: false,
  });
}

export function renderPtAssessmentTemplate(
  doc: PDFKit.PDFDocument,
  data: PtAssessmentPreview,
  meta: ReportRenderMeta,
) {
  const matrix = buildCombinedMatrix(data);
  const visibleTypeGroups = buildVisibleTypeGroups(matrix.taskGroups);
  const dataRowCount = Math.max(1, matrix.rows.length);
  const headerTotal = ROW_H1 + ROW_H2 + ROW_H3;
  const taskGroupW = TASK_SUB_COL_W * 3;
  const taskAreaW = matrix.taskGroups.length * taskGroupW;
  const tableW = getTableWidth(matrix.taskGroups.length);
  const tableH = getTableHeight(matrix.rows.length);
  const yH1 = TABLE_Y + ROW_H1;
  const yH2 = TABLE_Y + ROW_H1 + ROW_H2;
  const yHeaderBottom = TABLE_Y + headerTotal;

  const xs = {
    tableStart: PAGE_MARGIN,
    snoStart: PAGE_MARGIN,
    tesStart: PAGE_MARGIN + FIXED_COL_WIDTHS.sno,
    rankStart: PAGE_MARGIN + FIXED_COL_WIDTHS.sno + FIXED_COL_WIDTHS.tesNo,
    nameStart: PAGE_MARGIN + FIXED_COL_WIDTHS.sno + FIXED_COL_WIDTHS.tesNo + FIXED_COL_WIDTHS.rank,
    taskStart:
      PAGE_MARGIN + FIXED_COL_WIDTHS.sno + FIXED_COL_WIDTHS.tesNo + FIXED_COL_WIDTHS.rank + FIXED_COL_WIDTHS.name,
    totalStart:
      PAGE_MARGIN +
      FIXED_COL_WIDTHS.sno +
      FIXED_COL_WIDTHS.tesNo +
      FIXED_COL_WIDTHS.rank +
      FIXED_COL_WIDTHS.name +
      taskAreaW,
    tableEnd: PAGE_MARGIN + tableW,
  };

  doc.lineWidth(TABLE_LINE_W);
  drawPageHeader(doc, data.semester);

  drawRect(doc, xs.tableStart, TABLE_Y, tableW, tableH);
  drawLine(doc, xs.tesStart, TABLE_Y, xs.tesStart, TABLE_Y + tableH);
  drawLine(doc, xs.rankStart, TABLE_Y, xs.rankStart, TABLE_Y + tableH);
  drawLine(doc, xs.nameStart, TABLE_Y, xs.nameStart, TABLE_Y + tableH);
  drawLine(doc, xs.taskStart, TABLE_Y, xs.taskStart, TABLE_Y + tableH);
  drawLine(doc, xs.totalStart, TABLE_Y, xs.totalStart, TABLE_Y + tableH);

  if (taskAreaW > 0) {
    drawLine(doc, xs.taskStart, yH1, xs.totalStart, yH1);
    drawLine(doc, xs.taskStart, yH2, xs.totalStart, yH2);
  }
  drawLine(doc, xs.tableStart, yHeaderBottom, xs.tableEnd, yHeaderBottom);

  for (let i = 1; i < dataRowCount; i += 1) {
    const y = yHeaderBottom + i * DATA_ROW_H;
    drawLine(doc, xs.tableStart, y, xs.tableEnd, y);
  }

  textVerticalCenter(doc, 'S.No', xs.snoStart, TABLE_Y, FIXED_COL_WIDTHS.sno, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'TES No', xs.tesStart, TABLE_Y, FIXED_COL_WIDTHS.tesNo, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'Rank', xs.rankStart, TABLE_Y, FIXED_COL_WIDTHS.rank, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'Name', xs.nameStart, TABLE_Y, FIXED_COL_WIDTHS.name, headerTotal, { bold: true, size: 10 });
  textVerticalCenter(doc, 'Marks Scored', xs.totalStart, TABLE_Y, FIXED_COL_WIDTHS.total, headerTotal, {
    bold: true,
    size: 10,
  });

  let typeOffset = xs.taskStart;
  for (const group of visibleTypeGroups) {
    const width = group.span * TASK_SUB_COL_W;
    textInBox(doc, group.label, typeOffset, TABLE_Y, width, ROW_H1, {
      align: 'center',
      bold: true,
      size: 11,
      lineBreak: false,
    });
    typeOffset += width;
  }

  for (let i = 0; i < matrix.taskGroups.length; i += 1) {
    const task = matrix.taskGroups[i];
    const gx = xs.taskStart + i * taskGroupW;
    if (i > 0) drawLine(doc, gx, TABLE_Y, gx, TABLE_Y + tableH);
    drawLine(doc, gx + TASK_SUB_COL_W, yH1, gx + TASK_SUB_COL_W, TABLE_Y + tableH);
    drawLine(doc, gx + TASK_SUB_COL_W * 2, yH1, gx + TASK_SUB_COL_W * 2, TABLE_Y + tableH);

    textVerticalCenter(doc, task?.taskTitle ?? '', gx, yH1, taskGroupW, ROW_H2, { bold: true, size: 8.5 });
    textVerticalCenter(doc, 'Attempt', gx, yH2, TASK_SUB_COL_W, ROW_H3, { bold: true, size: 8 });
    textVerticalCenter(doc, 'E/G/S', gx + TASK_SUB_COL_W, yH2, TASK_SUB_COL_W, ROW_H3, { bold: true, size: 8 });
    textVerticalCenter(doc, 'Mks', gx + TASK_SUB_COL_W * 2, yH2, TASK_SUB_COL_W, ROW_H3, { bold: true, size: 8 });
  }

  for (let rowIndex = 0; rowIndex < dataRowCount; rowIndex += 1) {
    const sourceRow = matrix.rows[rowIndex];
    const y = yHeaderBottom + rowIndex * DATA_ROW_H;

    textInBox(doc, sourceRow ? String(sourceRow.sNo) : '', xs.snoStart, y, FIXED_COL_WIDTHS.sno, DATA_ROW_H, {
      align: 'center',
      size: 9,
      lineBreak: false,
    });
    textInBox(doc, sourceRow?.tesNo ?? '', xs.tesStart, y, FIXED_COL_WIDTHS.tesNo, DATA_ROW_H, {
      align: 'center',
      size: 9,
      lineBreak: false,
    });
    textInBox(doc, sourceRow?.rank ?? '', xs.rankStart, y, FIXED_COL_WIDTHS.rank, DATA_ROW_H, {
      align: 'center',
      size: 9,
      lineBreak: false,
    });
    textInBox(doc, sourceRow?.name ?? '', xs.nameStart, y, FIXED_COL_WIDTHS.name, DATA_ROW_H, {
      align: 'left',
      size: 9,
      lineBreak: false,
    });

    for (let i = 0; i < matrix.taskGroups.length; i += 1) {
      const groupX = xs.taskStart + i * taskGroupW;
      const cell = sourceRow?.cells[matrix.taskGroups[i]!.key];
      textInBox(doc, cell?.attemptCode ?? '', groupX, y, TASK_SUB_COL_W, DATA_ROW_H, {
        align: 'center',
        size: 8.5,
        lineBreak: false,
      });
      textInBox(doc, cell?.gradeCode ?? '', groupX + TASK_SUB_COL_W, y, TASK_SUB_COL_W, DATA_ROW_H, {
        align: 'center',
        size: 8.5,
        lineBreak: false,
      });
      textInBox(
        doc,
        cell?.marks !== null && cell?.marks !== undefined ? String(cell.marks) : '',
        groupX + TASK_SUB_COL_W * 2,
        y,
        TASK_SUB_COL_W,
        DATA_ROW_H,
        {
          align: 'center',
          size: 8.5,
          lineBreak: false,
        },
      );
    }

    textInBox(
      doc,
      sourceRow?.totalMarksScored !== undefined ? String(sourceRow.totalMarksScored) : '',
      xs.totalStart,
      y,
      FIXED_COL_WIDTHS.total,
      DATA_ROW_H,
      {
        align: 'center',
        size: 9,
        lineBreak: false,
      },
    );
  }

  drawPageFooter(doc, meta.versionId);
}
