import fs from 'node:fs';
import path from 'node:path';
import type { SemesterGradePreview } from '@/types/reports';
import { drawSimpleTable } from '@/app/lib/reports/pdf/pdf-engine';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  generatedAt: Date;
};

const PAGE_MARGIN = 36;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;

function distributeWidths(total: number, ratios: number[]) {
  const ratioSum = ratios.reduce((sum, value) => sum + value, 0);
  const widths = ratios.map((ratio) => Math.floor((total * ratio) / ratioSum));
  const used = widths.reduce((sum, value) => sum + value, 0);
  widths[widths.length - 1] += total - used;
  return widths;
}

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

function toBranchLabel(branch: string | null | undefined) {
  const normalized = String(branch ?? '').toUpperCase();
  if (normalized === 'E') return 'Electronics';
  if (normalized === 'M') return 'Mechanical';
  if (normalized === 'O') return 'O Branch';
  return normalized || '-';
}

function resolveImagePath(candidates: string[]) {
  for (const relativePath of candidates) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

function drawCenteredUnderlineText(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number,
  opts: { font: string; fontSize: number }
) {
  doc.font(opts.font).fontSize(opts.fontSize);
  const width = doc.widthOfString(text);
  const x = (doc.page.width - width) / 2;
  doc.text(text, x, y);
  doc.moveTo(x, y + opts.fontSize + 1).lineTo(x + width, y + opts.fontSize + 1).stroke();
}

function drawHeader(doc: PDFKit.PDFDocument, data: SemesterGradePreview, meta: ReportRenderMeta) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  const leftLogo = resolveImagePath([
    'public/images/jnu_logo.png',
    'public/images/jnu_logo.jpg',
    'public/images/jnu_logo.jpeg',
    'public/images/army_logo.jpeg',
  ]);
  const rightLogo = resolveImagePath([
    'public/images/eme_logo.jpeg',
    'public/images/eme_logo.png',
    'public/images/Military-College-Of-Electronics-Mechanical-Engineering.jpg',
  ]);

  if (leftLogo) {
    doc.image(leftLogo, PAGE_MARGIN, 20, { fit: [88, 88] });
  }
  if (rightLogo) {
    doc.image(rightLogo, pageWidth - PAGE_MARGIN - 86, 22, { fit: [82, 82] });
  }

  doc.font('Times-Bold').fontSize(30).text('Jawaharlal Nehru University', PAGE_MARGIN, 34, {
    width: contentWidth,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(20).text('NEW DELHI - 110067', PAGE_MARGIN, 73, {
    width: contentWidth,
    align: 'center',
  });
  doc.font('Helvetica-Bold').fontSize(11).text(
    '(Institution : Military College of Electronics and Mechanical Engineering, Secunderabad-500 015)',
    PAGE_MARGIN,
    103,
    { width: contentWidth, align: 'center' }
  );

  const semRoman = semesterToRoman(data.semester);
  const ocBranch = String(data.oc.branch ?? 'O').toUpperCase();

  doc.font('Helvetica-Bold').fontSize(14).text(
    `Serial No : ${data.course.code}/Sem-${semRoman}(${ocBranch})/01`,
    PAGE_MARGIN,
    138,
    { width: 320, align: 'left' }
  );
  doc.font('Helvetica-Bold').fontSize(14).text(
    `COURSE NO : ${data.course.code}(${ocBranch})`,
    pageWidth - PAGE_MARGIN - 320,
    138,
    { width: 320, align: 'right' }
  );

  drawCenteredUnderlineText(doc, 'SEMESTER GRADE REPORT', 175, {
    font: 'Helvetica-Bold',
    fontSize: 17,
  });
  drawCenteredUnderlineText(doc, 'BACHELOR OF TECHNOLOGY', 201, {
    font: 'Helvetica-Bold',
    fontSize: 17,
  });
  drawCenteredUnderlineText(doc, `SEMESTER ${semRoman}`, 227, {
    font: 'Helvetica-Bold',
    fontSize: 17,
  });

  doc.font('Helvetica').fontSize(8).text(`Version: ${meta.versionId}`, pageWidth - PAGE_MARGIN - 180, 18, {
    width: 180,
    align: 'right',
  });
}

function drawIdentityTables(doc: PDFKit.PDFDocument, data: SemesterGradePreview) {
  const tableWidth = doc.page.width - PAGE_MARGIN * 2;
  const half = tableWidth / 2;

  const cadetRows = [
    ['NAME OF CADET', 'JNU ENROLMENT NO'],
    [data.oc.name, data.oc.jnuEnrollmentNo ?? ''],
  ];
  drawSimpleTable(doc, PAGE_MARGIN, 262, [half, half], cadetRows, {
    rowHeight: 32,
    fontSize: 11,
    headerRows: 1,
  });

  const yearBranchRows = [
    ['Year', 'Branch'],
    [String(data.year), toBranchLabel(data.oc.branch)],
  ];
  drawSimpleTable(doc, PAGE_MARGIN, 330, [half, half], yearBranchRows, {
    rowHeight: 30,
    fontSize: 11,
    headerRows: 1,
  });
}

function drawSubjectsTable(doc: PDFKit.PDFDocument, data: SemesterGradePreview) {
  const rows = data.subjects.map((subject) => [
    `${subject.sNo}.`,
    subject.subject,
    String(subject.credits),
    subject.letterGrade ?? '',
  ]);

  const tableRows = [['S No', 'Subject', 'Credits', 'Letter Grade'], ...rows];

  const widths = distributeWidths(doc.page.width - PAGE_MARGIN * 2, [9, 59, 12, 20]);

  return drawSimpleTable(doc, PAGE_MARGIN, 396, widths, tableRows, {
    rowHeight: 19,
    fontSize: 9.5,
    headerRows: 1,
  });
}

function drawSummaryAndFooter(
  doc: PDFKit.PDFDocument,
  data: SemesterGradePreview,
  meta: ReportRenderMeta,
  startY: number
) {
  const semRoman = semesterToRoman(data.semester);

  const summaryRows = [
    ['CURRENT SEMESTER', '', '', `CUMULATIVE RECORD UPTO SEMESTER ${semRoman}`, '', ''],
    ['TOTAL CREDITS', 'TOTAL GRADES', 'SGPA', 'TOTAL CREDITS', 'TOTAL GRADES', 'CGPA'],
    [
      String(data.currentSemester.totalCredits),
      String(Math.round(data.currentSemester.totalGrades)),
      data.currentSemester.sgpa?.toFixed(2) ?? '-',
      String(data.cumulative.totalCredits),
      String(Math.round(data.cumulative.totalGrades)),
      data.cumulative.cgpa?.toFixed(2) ?? '-',
    ],
  ];

  const summaryWidths = distributeWidths(doc.page.width - PAGE_MARGIN * 2, [1, 1, 1, 1, 1, 1]);
  const summary = drawSimpleTable(doc, PAGE_MARGIN, startY, summaryWidths, summaryRows, {
    rowHeight: 21,
    fontSize: 9.5,
    headerRows: 2,
  });

  const footerHeightNeeded = 106;
  const pageBottomLimit = doc.page.height - PAGE_MARGIN;
  const naturalStartY = summary.endY + 8;
  const y = Math.min(naturalStartY, pageBottomLimit - footerHeightNeeded);

  doc.font('Helvetica').fontSize(10.5);
  doc.text(`Date    : ${meta.generatedAt.toISOString().slice(0, 10)}`, PAGE_MARGIN + 2, y);
  doc.text(`Prepared By : ${meta.preparedBy}`, PAGE_MARGIN + 2, y + 16);
  doc.text(`Checked By : ${meta.checkedBy}`, PAGE_MARGIN + 2, y + 32);

  doc.font('Helvetica-Bold').fontSize(14).text(
    `TOTAL VALID CREDITS EARNED: ${data.totalValidCreditsEarned}`,
    PAGE_MARGIN + CONTENT_WIDTH * 0.56,
    y + 12,
    { width: CONTENT_WIDTH * 0.42, align: 'center' }
  );

  const signY = y + 52;
  doc.font('Helvetica').fontSize(10.5);
  doc.text(`(${meta.checkedBy})`, PAGE_MARGIN + 2, signY);
  doc.text('Brig', PAGE_MARGIN + 2, signY + 13);
  doc.text('Cdr', PAGE_MARGIN + 2, signY + 26);
  doc.text('Cadets Training Wing', PAGE_MARGIN + 2, signY + 39);
  doc.text('Military College of EME', PAGE_MARGIN + 2, signY + 52);
}

export function renderSemesterGradeTemplate(
  doc: PDFKit.PDFDocument,
  data: SemesterGradePreview,
  meta: ReportRenderMeta
) {
  drawHeader(doc, data, meta);
  drawIdentityTables(doc, data);
  const subjectTable = drawSubjectsTable(doc, data);
  drawSummaryAndFooter(doc, data, meta, subjectTable.endY + 20);
}
