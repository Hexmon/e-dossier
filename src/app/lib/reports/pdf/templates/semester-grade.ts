import type { SemesterGradePreview } from '@/types/reports';
import { drawSimpleTable } from '@/app/lib/reports/pdf/pdf-engine';

type ReportRenderMeta = {
  versionId: string;
  preparedBy: string;
  checkedBy: string;
  generatedAt: Date;
};

function drawHeader(doc: PDFKit.PDFDocument, data: SemesterGradePreview, meta: ReportRenderMeta) {
  const pageWidth = doc.page.width;

  doc.font('Helvetica-Bold').fontSize(13).text('SEMESTER GRADE REPORT', 36, 36, {
    width: pageWidth - 72,
    align: 'center',
  });

  doc.font('Helvetica').fontSize(9);
  doc.text(`Course: ${data.course.code}`, 36, 58);
  doc.text(`Semester: ${data.semester}`, 36, 71);
  doc.text(`Year: ${data.year}`, 36, 84);
  doc.text(`Version: ${meta.versionId}`, pageWidth - 220, 58, { width: 184, align: 'right' });

  const identityRows = [
    ['Name of Cadet', data.oc.name],
    ['OC No', data.oc.ocNo],
    ['JNU Enrollment No', data.oc.jnuEnrollmentNo ?? ''],
    ['Branch', data.oc.branch ?? ''],
  ];

  drawSimpleTable(doc, 36, 102, [150, pageWidth - 72 - 150], identityRows, {
    rowHeight: 20,
    fontSize: 9,
    headerRows: 0,
  });
}

export function renderSemesterGradeTemplate(
  doc: PDFKit.PDFDocument,
  data: SemesterGradePreview,
  meta: ReportRenderMeta
) {
  drawHeader(doc, data, meta);

  const subjectRows = data.subjects.map((subject) => [
    String(subject.sNo),
    subject.subject,
    String(subject.credits),
    subject.letterGrade ?? '',
  ]);

  const subjectTable = drawSimpleTable(
    doc,
    36,
    192,
    [44, 350, 82, 82],
    [['S.No', 'Subject', 'Credits', 'Letter Grade'], ...subjectRows],
    {
      rowHeight: 18,
      fontSize: 8,
      headerRows: 1,
    }
  );

  let y = subjectTable.endY + 14;
  if (y > doc.page.height - 160) {
    doc.addPage();
    y = 48;
  }

  const summaryRows = [
    ['CURRENT SEMESTER', '', 'CUMULATIVE UPTO SELECTED SEM'],
    [`Total Credits: ${data.currentSemester.totalCredits}`, '', `Total Credits: ${data.cumulative.totalCredits}`],
    [`Total Grades: ${data.currentSemester.totalGrades.toFixed(2)}`, '', `Total Grades: ${data.cumulative.totalGrades.toFixed(2)}`],
    [`SGPA: ${data.currentSemester.sgpa?.toFixed(2) ?? '-'}`, '', `CGPA: ${data.cumulative.cgpa?.toFixed(2) ?? '-'}`],
  ];

  const summaryOut = drawSimpleTable(doc, 36, y, [200, 30, 240], summaryRows, {
    rowHeight: 20,
    fontSize: 9,
    headerRows: 1,
  });

  y = summaryOut.endY + 12;

  doc.font('Helvetica-Bold').fontSize(10).text(`Total Valid Credits Earned: ${data.totalValidCreditsEarned}`, 36, y);
  y += 18;

  doc.font('Helvetica').fontSize(10);
  doc.text(`Date: ${meta.generatedAt.toISOString().slice(0, 10)}`, 36, y);
  doc.text(`Prepared By: ${meta.preparedBy}`, 36, y + 14);
  doc.text(`Checked By: ${meta.checkedBy}`, 36, y + 28);
}
