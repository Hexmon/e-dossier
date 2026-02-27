import type { ConsolidatedSessionalPreview } from '@/types/reports';
import { drawSimpleTable } from '@/app/lib/reports/pdf/pdf-engine';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  generatedAt: Date;
};

const PAGE_MARGIN = 36;

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

function tableValue(value: number | null): string {
  return value === null ? '' : String(value);
}

function drawPageHeading(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  sectionTitle: 'Theory' | 'Practical',
  credits: number | null,
  meta: ReportRenderMeta
) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const yTop = 28;

  doc.font('Helvetica-Bold').fontSize(12).text('MILITARY COLLEGE OF ELECTRONICS & MECHANICAL ENGINEERING', PAGE_MARGIN, yTop, {
    width,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(12).text('CADETS TRAINING WING', PAGE_MARGIN, yTop + 18, {
    width,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(12).text('CONSOLIDATED SESSIONAL MARKSHEET', PAGE_MARGIN, yTop + 36, {
    width,
    align: 'center',
  });

  const courseLabel = `COURSE ${data.course.code}-SEM-${semesterToRoman(data.semester)}`;
  doc.font('Helvetica-Bold').fontSize(10).text(courseLabel, PAGE_MARGIN, yTop + 64);
  doc.font('Helvetica').fontSize(9).text(`Version: ${meta.versionId}`, doc.page.width - PAGE_MARGIN - 180, yTop + 64, {
    width: 180,
    align: 'right',
  });

  doc.font('Helvetica-Bold').fontSize(10).text(`SUB : ${data.subject.name} (${sectionTitle})`, PAGE_MARGIN, yTop + 84);
  doc.font('Helvetica-Bold').fontSize(10).text(`Credits: ${credits ?? '-'}`, doc.page.width - PAGE_MARGIN - 160, yTop + 84, {
    width: 160,
    align: 'right',
  });
  doc.font('Helvetica').fontSize(10).text(`Instr : ${data.subject.instructorName ?? '-'}`, PAGE_MARGIN, yTop + 100);

  doc.font('Helvetica').fontSize(8).text(`Generated: ${meta.generatedAt.toISOString().slice(0, 10)}`, doc.page.width - PAGE_MARGIN - 200, yTop + 100, {
    width: 200,
    align: 'right',
  });

  return yTop + 122;
}

function drawTheoryTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  rows: ConsolidatedSessionalPreview['theoryRows']
) {
  const widths = [38, 60, 176, 54, 56, 56, 56, 56, 56, 56, 62];
  const headers = [
    ['S.No', 'GC No', 'Name', 'Branch', 'Ph Test I', 'Ph Test II', 'Tutorial', 'Total', 'Final', 'Total', 'Letter Grade'],
    ['', '', '', '', '(20)', '(20)', '(10)', '(50)', '(50)', '(100)', ''],
  ];

  const bodyRows =
    rows.length > 0
      ? rows.map((row) => [
          String(row.sNo),
          row.ocNo,
          row.ocName,
          row.branch ?? '',
          tableValue(row.phaseTest1Obtained),
          tableValue(row.phaseTest2Obtained),
          tableValue(row.tutorialObtained),
          tableValue(row.sessionalObtained),
          tableValue(row.finalObtained),
          tableValue(row.totalObtained),
          row.letterGrade ?? '',
        ])
      : [['-', '-', 'No records found', '-', '-', '-', '-', '-', '-', '-', '-']];

  const tableRows = [...headers, ...bodyRows];
  return drawSimpleTable(doc, PAGE_MARGIN, startY, widths, tableRows, {
    rowHeight: 18,
    fontSize: 8,
    headerRows: 2,
  }).endY;
}

function drawPracticalTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  rows: ConsolidatedSessionalPreview['practicalRows']
) {
  const widths = [42, 66, 230, 70, 120, 80];
  const headers = [
    ['S.No', 'GC No', 'Name', 'Branch', 'Practical', 'Letter Grade'],
  ];

  const bodyRows =
    rows.length > 0
      ? rows.map((row) => [
          String(row.sNo),
          row.ocNo,
          row.ocName,
          row.branch ?? '',
          tableValue(row.practicalObtained),
          row.letterGrade ?? '',
        ])
      : [['-', '-', 'No records found', '-', '-', '-']];

  const tableRows = [...headers, ...bodyRows];
  return drawSimpleTable(doc, PAGE_MARGIN, startY, widths, tableRows, {
    rowHeight: 18,
    fontSize: 8,
    headerRows: 1,
  }).endY;
}

function drawSummaryBox(
  doc: PDFKit.PDFDocument,
  y: number,
  items: Array<{ grade: string; count: number }>
) {
  const x = doc.page.width - PAGE_MARGIN - 140;
  const rows = [
    ['Grade', 'Count'],
    ...items.map((item) => [item.grade, String(item.count)]),
    ['Total', String(items.reduce((sum, item) => sum + item.count, 0))],
  ];

  doc.font('Helvetica-Bold').fontSize(9).text('SUMMARY', x, y - 12, { width: 120, align: 'center' });
  return drawSimpleTable(doc, x, y, [72, 48], rows, {
    rowHeight: 16,
    fontSize: 8,
    headerRows: 1,
  }).endY;
}

function drawPreparedChecked(
  doc: PDFKit.PDFDocument,
  y: number,
  meta: ReportRenderMeta
) {
  doc.font('Helvetica').fontSize(10);
  doc.text(`Prepared By : ${meta.preparedBy}`, PAGE_MARGIN, y + 4);
  doc.text(`Checked by  : ${meta.checkedBy}`, PAGE_MARGIN, y + 24);
  doc.font('Helvetica-Bold').text('CCO CTW', PAGE_MARGIN, y + 54);
}

function renderSectionPage(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  meta: ReportRenderMeta,
  section: 'Theory' | 'Practical'
) {
  const credits = section === 'Theory' ? data.subject.theoryCredits : data.subject.practicalCredits;
  let y = drawPageHeading(doc, data, section, credits, meta);

  if (section === 'Theory') {
    y = drawTheoryTable(doc, y, data.theoryRows);
    const summaryY = drawSummaryBox(doc, y + 12, data.theorySummary);
    drawPreparedChecked(doc, Math.max(y + 20, summaryY + 8), meta);
    return;
  }

  y = drawPracticalTable(doc, y, data.practicalRows);
  const summaryY = drawSummaryBox(doc, y + 12, data.practicalSummary);
  drawPreparedChecked(doc, Math.max(y + 20, summaryY + 8), meta);
}

export function renderConsolidatedSessionalTemplate(
  doc: PDFKit.PDFDocument,
  data: ConsolidatedSessionalPreview,
  meta: ReportRenderMeta
) {
  if (data.subject.hasTheory) {
    renderSectionPage(doc, data, meta, 'Theory');
  }

  if (data.subject.hasPractical) {
    if (data.subject.hasTheory) {
      doc.addPage();
    }
    renderSectionPage(doc, data, meta, 'Practical');
  }
}
