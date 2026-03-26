import fs from 'node:fs';
import path from 'node:path';
import type { FinalResultCompilationPreview } from '@/types/reports';

type ReportRenderMeta = {
  versionId: string;
  generatedAt: Date;
  preparedBy: string;
  checkedBy: string;
};

const PAGE_MARGIN = 20;
const FIRST_PAGE_TABLE_START_Y = 104;
const CONTINUATION_TABLE_START_Y = 22;
const HEADER_TITLE_HEIGHT = 54;
const HEADER_LABEL_HEIGHT = 14;
const HEADER_CREDITS_HEIGHT = 14;
const DATA_ROW_HEIGHT = 18;
const FOOTER_HEIGHT = 82;

function semesterToRoman(semester: number): string {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
  };
  return map[semester] ?? String(semester);
}

function semesterWord(semester: number): string {
  const map: Record<number, string> = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
  };
  return map[semester] ?? String(semester);
}

function resolveReportBranchTag(data: FinalResultCompilationPreview): 'C' | 'E' | 'M' {
  const unique = Array.from(new Set(data.rows.map((row) => row.branchTag).filter(Boolean)));
  if (unique.length === 1 && (unique[0] === 'C' || unique[0] === 'E' || unique[0] === 'M')) {
    return unique[0];
  }
  return data.rows[0]?.branchTag ?? 'C';
}

function resolveImagePath(candidates: string[]) {
  for (const relativePath of candidates) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
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
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size ?? 8);
  doc.text(text, x + 2, y + 2, {
    width: Math.max(0, width - 4),
    height: Math.max(0, height - 4),
    align: opts.align ?? 'center',
    lineBreak: true,
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
  const label = text.trim();
  const fontSize = opts.size ?? 7.4;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  doc.save();
  doc.translate(x + width / 2, y + height / 2);
  doc.rotate(-90);
  doc.text(label, -height / 2 + 2, -fontSize / 2, {
    width: Math.max(0, height - 4),
    align: 'center',
    lineBreak: false,
  });
  doc.restore();
}

function drawInstitutionHeader(doc: PDFKit.PDFDocument, data: FinalResultCompilationPreview) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const semRoman = semesterToRoman(data.semester);
  const semWord = semesterWord(data.semester);
  const branchTag = resolveReportBranchTag(data);

  const leftLogo = resolveImagePath([
    'public/images/army_logo.jpeg',
    'public/images/jnu_logo.png',
    'public/images/jnu_logo.jpg',
  ]);
  const rightLogo = resolveImagePath([
    'public/images/eme_logo.jpeg',
    'public/images/brigadier_logo.jpeg',
    'public/images/Military-College-Of-Electronics-Mechanical-Engineering.jpg',
  ]);

  if (leftLogo) {
    doc.image(leftLogo, PAGE_MARGIN, 18, { fit: [52, 52] });
  }
  if (rightLogo) {
    doc.image(rightLogo, doc.page.width - PAGE_MARGIN - 50, 18, { fit: [48, 48] });
  }

  doc.font('Helvetica-Bold').fontSize(12).text('MILITARY COLLEGE OF ELECTRONICS & MECHANICAL ENGINEERING', PAGE_MARGIN, 22, {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica-Bold').fontSize(12).text('CADETS TRAINING WING', PAGE_MARGIN, 40, {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  doc.font('Helvetica-Bold').fontSize(12).text(
    `SEMESTER-${semRoman} (${semWord}) RESULT OF COURSE SER NO ${data.course.code}(${branchTag})`,
    PAGE_MARGIN,
    58,
    {
      width: contentWidth,
      align: 'center',
      underline: true,
    }
  );
}

function drawFooter(doc: PDFKit.PDFDocument, startY: number, meta: ReportRenderMeta) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const sectionWidth = contentWidth / 6;
  const labels = [
    '(CCO, CTW)',
    '(Cdr, CTW)',
    '(JNU)',
    '(JNU)',
    '(Dy Comdt & CI, MCEME)',
    '(Comdt, MCEME)',
  ];

  doc.font('Helvetica').fontSize(8);
  doc.text(`Prepared by : ${meta.preparedBy}`, PAGE_MARGIN, startY);
  doc.text(`Checked by : ${meta.checkedBy}`, PAGE_MARGIN, startY + 13);

  const signatureY = startY + 42;
  for (let i = 0; i < labels.length; i += 1) {
    const x = PAGE_MARGIN + i * sectionWidth;
    drawLine(doc, x + 8, signatureY, x + sectionWidth - 8, signatureY);
    doc.text(labels[i] ?? '', x, signatureY + 5, {
      width: sectionWidth,
      align: 'center',
      lineBreak: false,
    });
  }
}

function flattenSubjectComponents(data: FinalResultCompilationPreview) {
  return data.subjectColumns.flatMap((column) =>
    column.components.map((component) => ({
      ...component,
      subjectCode: column.subjectCode,
      subjectName: column.subjectName,
      groupSize: column.components.length,
    }))
  );
}

function buildColumnWidths(doc: PDFKit.PDFDocument, data: FinalResultCompilationPreview) {
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const componentCount = flattenSubjectComponents(data).length;

  const base = {
    serNo: 28,
    tesNo: 42,
    name: 98,
    enrolmentNo: 112,
    certNo: 92,
    prevPoints: 38,
    prevCgpa: 38,
    semPoints: 38,
    semSgpa: 38,
    uptoPoints: 38,
    uptoCgpa: 38,
  };

  const fixedSum =
    base.serNo +
    base.tesNo +
    base.name +
    base.enrolmentNo +
    base.certNo +
    base.prevPoints +
    base.prevCgpa +
    base.semPoints +
    base.semSgpa +
    base.uptoPoints +
    base.uptoCgpa;

  const remaining = Math.max(0, contentWidth - fixedSum);
  const perSubjectComponent = componentCount > 0 ? Math.max(20, Math.floor(remaining / componentCount)) : 0;
  const consumed = fixedSum + perSubjectComponent * componentCount;
  const correction = contentWidth - consumed;

  return {
    ...base,
    subjectComponent: perSubjectComponent,
    correction,
  };
}

function formatCgpa(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toFixed(2);
}

function drawTablePage(
  doc: PDFKit.PDFDocument,
  data: FinalResultCompilationPreview,
  rows: FinalResultCompilationPreview['rows'],
  y0: number
) {
  const widths = buildColumnWidths(doc, data);
  const previousSemesterLabel = data.semester > 1 ? String(data.semester - 1) : '0';
  const x0 = PAGE_MARGIN;
  const componentColumns = flattenSubjectComponents(data);
  const columnWidths: number[] = [
    widths.serNo,
    widths.tesNo,
    widths.name,
    widths.enrolmentNo,
    widths.certNo,
    widths.prevPoints,
    widths.prevCgpa,
    ...componentColumns.map(() => widths.subjectComponent),
    widths.semPoints,
    widths.semSgpa,
    widths.uptoPoints,
    widths.uptoCgpa + widths.correction,
  ];
  const xBoundaries = [x0];
  for (const width of columnWidths) {
    xBoundaries.push(xBoundaries[xBoundaries.length - 1] + width);
  }

  const totalHeaderHeight = HEADER_TITLE_HEIGHT + HEADER_LABEL_HEIGHT + HEADER_CREDITS_HEIGHT;
  const tableWidth = doc.page.width - PAGE_MARGIN * 2;
  const tableHeight = totalHeaderHeight + rows.length * DATA_ROW_HEIGHT;
  const labelStartY = y0 + HEADER_TITLE_HEIGHT;
  const creditsStartY = labelStartY + HEADER_LABEL_HEIGHT;
  const bodyStartY = y0 + totalHeaderHeight;
  const previousStartIndex = 5;
  const subjectStartIndex = 7;
  const tailStartIndex = subjectStartIndex + componentColumns.length;
  const innerDividerIndices = new Set<number>([
    previousStartIndex + 1,
    tailStartIndex + 1,
    tailStartIndex + 3,
  ]);

  let subjectOffset = 0;
  for (const subjectColumn of data.subjectColumns) {
    for (let componentIndex = 1; componentIndex < subjectColumn.components.length; componentIndex += 1) {
      innerDividerIndices.add(subjectStartIndex + subjectOffset + componentIndex);
    }
    subjectOffset += subjectColumn.components.length;
  }

  drawRect(doc, x0, y0, tableWidth, tableHeight);
  for (let i = 1; i < xBoundaries.length - 1; i += 1) {
    const x = xBoundaries[i] ?? x0;
    drawLine(doc, x, innerDividerIndices.has(i) ? labelStartY : y0, x, y0 + tableHeight);
  }

  drawLine(doc, x0, labelStartY, x0 + tableWidth, labelStartY);
  drawLine(doc, x0, creditsStartY, x0 + tableWidth, creditsStartY);
  drawLine(doc, x0, bodyStartY, x0 + tableWidth, bodyStartY);

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const y = bodyStartY + rowIndex * DATA_ROW_HEIGHT;
    drawLine(doc, x0, y, x0 + tableWidth, y);
  }

  const fixedHeaders = ['Ser No', 'TES No', 'Name', 'Enrollment Number', 'Cert Ser No'];
  for (let i = 0; i < fixedHeaders.length; i += 1) {
    textInBox(doc, fixedHeaders[i] ?? '', xBoundaries[i]!, y0, columnWidths[i]!, totalHeaderHeight, {
      bold: true,
      size: 7.1,
    });
  }

  textInBox(
    doc,
    `Upto Semester ${previousSemesterLabel}\nCumulative Grade Point\nAverage (CGPA)`,
    xBoundaries[previousStartIndex]!,
    y0,
    columnWidths[previousStartIndex]! + columnWidths[previousStartIndex + 1]!,
    HEADER_TITLE_HEIGHT,
    { bold: true, size: 6.7 }
  );
  textInBox(doc, 'Points', xBoundaries[previousStartIndex]!, labelStartY, columnWidths[previousStartIndex]!, HEADER_LABEL_HEIGHT, {
    bold: true,
    size: 6.5,
  });
  textInBox(
    doc,
    '{CGPA}',
    xBoundaries[previousStartIndex + 1]!,
    labelStartY,
    columnWidths[previousStartIndex + 1]!,
    HEADER_LABEL_HEIGHT,
    { bold: true, size: 6.5 }
  );
  textInBox(
    doc,
    `(${data.previousSemesterCreditsReference || '-'})`,
    xBoundaries[previousStartIndex + 1]!,
    creditsStartY,
    columnWidths[previousStartIndex + 1]!,
    HEADER_CREDITS_HEIGHT,
    { bold: true, size: 6.2 }
  );

  let subjectCursor = xBoundaries[subjectStartIndex]!;
  for (const subjectColumn of data.subjectColumns) {
    const groupWidth = subjectColumn.components.length * widths.subjectComponent;
    textVerticalCenter(doc, subjectColumn.subjectName.toUpperCase(), subjectCursor, y0, groupWidth, HEADER_TITLE_HEIGHT, {
      bold: true,
      size: 6.5,
    });
    for (const component of subjectColumn.components) {
      textInBox(doc, `${component.kind}`, subjectCursor, labelStartY, widths.subjectComponent, HEADER_LABEL_HEIGHT, {
        bold: true,
        size: 6.5,
      });
      textInBox(doc, `(${component.credits})`, subjectCursor, creditsStartY, widths.subjectComponent, HEADER_CREDITS_HEIGHT, {
        bold: true,
        size: 6.2,
      });
      subjectCursor += widths.subjectComponent;
    }
  }

  textInBox(
    doc,
    'Credits =====>',
    xBoundaries[3]!,
    creditsStartY,
    xBoundaries[5]! - xBoundaries[3]!,
    HEADER_CREDITS_HEIGHT,
    { align: 'left', bold: true, size: 6.5 }
  );

  textInBox(
    doc,
    `Semester ${data.semester}\nSemester Grade Point\nAverage (SGPA)`,
    xBoundaries[tailStartIndex]!,
    y0,
    columnWidths[tailStartIndex]! + columnWidths[tailStartIndex + 1]!,
    HEADER_TITLE_HEIGHT,
    { bold: true, size: 6.7 }
  );
  textInBox(doc, 'Points', xBoundaries[tailStartIndex]!, labelStartY, columnWidths[tailStartIndex]!, HEADER_LABEL_HEIGHT, {
    bold: true,
    size: 6.5,
  });
  textInBox(
    doc,
    '{SGPA}',
    xBoundaries[tailStartIndex + 1]!,
    labelStartY,
    columnWidths[tailStartIndex + 1]!,
    HEADER_LABEL_HEIGHT,
    { bold: true, size: 6.5 }
  );
  textInBox(
    doc,
    `(${data.semesterCreditsTotal || '-'})`,
    xBoundaries[tailStartIndex + 1]!,
    creditsStartY,
    columnWidths[tailStartIndex + 1]!,
    HEADER_CREDITS_HEIGHT,
    { bold: true, size: 6.2 }
  );

  textInBox(
    doc,
    `Upto Semester ${data.semester}\nCumulative Grade Point\nAverage (CGPA)`,
    xBoundaries[tailStartIndex + 2]!,
    y0,
    columnWidths[tailStartIndex + 2]! + columnWidths[tailStartIndex + 3]!,
    HEADER_TITLE_HEIGHT,
    { bold: true, size: 6.7 }
  );
  textInBox(doc, 'Points', xBoundaries[tailStartIndex + 2]!, labelStartY, columnWidths[tailStartIndex + 2]!, HEADER_LABEL_HEIGHT, {
    bold: true,
    size: 6.5,
  });
  textInBox(
    doc,
    '{CGPA}',
    xBoundaries[tailStartIndex + 3]!,
    labelStartY,
    columnWidths[tailStartIndex + 3]!,
    HEADER_LABEL_HEIGHT,
    { bold: true, size: 6.5 }
  );
  textInBox(
    doc,
    `(${data.uptoSemesterCreditsReference || '-'})`,
    xBoundaries[tailStartIndex + 3]!,
    creditsStartY,
    columnWidths[tailStartIndex + 3]!,
    HEADER_CREDITS_HEIGHT,
    { bold: true, size: 6.2 }
  );

  rows.forEach((row, rowIndex) => {
    const y = bodyStartY + rowIndex * DATA_ROW_HEIGHT;
    const fixedValues = [
      String(row.sNo),
      row.tesNo,
      row.name,
      row.enrolmentNumber,
      row.certSerialNo,
      String(row.previousCumulativePoints),
      formatCgpa(row.previousCumulativeCgpa),
    ];

    for (let i = 0; i < fixedValues.length; i += 1) {
      textInBox(doc, fixedValues[i] ?? '', xBoundaries[i]!, y, columnWidths[i]!, DATA_ROW_HEIGHT, {
        align: i === 2 || i === 3 || i === 4 ? 'left' : 'center',
        size: 7.1,
      });
    }

    componentColumns.forEach((component, componentIndex) => {
      const idx = subjectStartIndex + componentIndex;
      textInBox(doc, row.subjectGrades[component.key] ?? '', xBoundaries[idx]!, y, columnWidths[idx]!, DATA_ROW_HEIGHT, {
        align: 'center',
        size: 7.1,
      });
    });

    const tailValues = [
      String(row.semesterPoints),
      formatCgpa(row.semesterSgpa),
      String(row.uptoSemesterPoints),
      formatCgpa(row.uptoSemesterCgpa),
    ];

    for (let i = 0; i < tailValues.length; i += 1) {
      const idx = tailStartIndex + i;
      textInBox(doc, tailValues[i] ?? '', xBoundaries[idx]!, y, columnWidths[idx]!, DATA_ROW_HEIGHT, {
        align: 'center',
        size: 7.1,
      });
    }
  });

  return {
    tableBottomY: y0 + tableHeight,
  };
}

function rowsCapacity(doc: PDFKit.PDFDocument, tableStartY: number, reserveAfterTable: number) {
  const available = doc.page.height - PAGE_MARGIN - reserveAfterTable - tableStartY;
  const body = available - HEADER_TITLE_HEIGHT - HEADER_LABEL_HEIGHT - HEADER_CREDITS_HEIGHT;
  return Math.max(1, Math.floor(body / DATA_ROW_HEIGHT));
}

export function renderFinalResultCompilationTemplate(
  doc: PDFKit.PDFDocument,
  data: FinalResultCompilationPreview,
  meta: ReportRenderMeta
) {
  const allRows = data.rows.length
    ? data.rows
    : [
        {
          ocId: 'none',
          sNo: 1,
          tesNo: '-',
          name: 'No records',
          branchTag: 'C' as const,
          enrolmentNumber: '',
          certSerialNo: '',
          previousCumulativePoints: 0,
          previousCumulativeCredits: 0,
          previousCumulativeCgpa: null,
          semesterPoints: 0,
          semesterCredits: data.semesterCreditsTotal,
          semesterSgpa: null,
          uptoSemesterPoints: 0,
          uptoSemesterCredits: 0,
          uptoSemesterCgpa: null,
          subjectGrades: {},
        },
      ];

  const pages: Array<{ rows: typeof allRows; isLast: boolean }> = [];
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < allRows.length) {
    const startY = pageIndex === 0 ? FIRST_PAGE_TABLE_START_Y : CONTINUATION_TABLE_START_Y;
    const capNormal = rowsCapacity(doc, startY, 0);
    const capLast = rowsCapacity(doc, startY, FOOTER_HEIGHT);
    const remaining = allRows.length - cursor;
    let isLast = false;
    let take = 0;

    if (remaining <= capLast) {
      isLast = true;
      take = remaining;
    } else if (remaining <= capNormal) {
      take = Math.max(1, remaining - capLast);
    } else {
      take = capNormal;
    }

    pages.push({
      rows: allRows.slice(cursor, cursor + take),
      isLast,
    });
    cursor += take;
    pageIndex += 1;
  }

  pages.forEach((page, idx) => {
    if (idx > 0) doc.addPage();
    if (idx === 0) {
      drawInstitutionHeader(doc, data);
    }

    const startY = idx === 0 ? FIRST_PAGE_TABLE_START_Y : CONTINUATION_TABLE_START_Y;
    const { tableBottomY } = drawTablePage(doc, data, page.rows, startY);

    if (page.isLast) {
      const footerY = Math.min(tableBottomY + 12, doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT + 12);
      drawFooter(doc, footerY, meta);
    }
  });
}
