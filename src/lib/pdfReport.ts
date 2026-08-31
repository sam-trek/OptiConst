import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportRow {
  label: string;
  value: string;
  formula?: string;
}

export interface ReportOptions {
  title: string;
  inputMode: string;
  parameters: ReportRow[];
  results: ReportRow[];
  warnings: string[];
  /** PNG data URL, e.g. from Plotly's `Plotly.toImage(div, {format:'png'})`. */
  chartImageDataUrl?: string;
}

/** Builds and triggers a client-side download of a one-click PDF report. */
export function downloadReport(opts: ReportOptions): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(opts.title, margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 100);
  doc.text(`Generated ${new Date().toLocaleString()} · Input mode: ${opts.inputMode}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 20;

  autoTable(doc, {
    startY: y,
    head: [['Input parameter', 'Value']],
    body: opts.parameters.map((p) => [p.label, p.value]),
    theme: 'grid',
    headStyles: { fillColor: [14, 128, 116] },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
  y = doc.lastAutoTable.finalY + 20;

  autoTable(doc, {
    startY: y,
    head: [['Result', 'Value', 'Formula used']],
    body: opts.results.map((r) => [r.label, r.value, r.formula ?? '']),
    theme: 'grid',
    headStyles: { fillColor: [14, 128, 116] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
  });
  // @ts-expect-error jspdf-autotable augments doc with lastAutoTable at runtime
  y = doc.lastAutoTable.finalY + 20;

  if (opts.chartImageDataUrl) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = imgWidth * 0.4;
    if (y + imgHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.addImage(opts.chartImageDataUrl, 'PNG', margin, y, imgWidth, imgHeight);
    y += imgHeight + 20;
  }

  if (opts.warnings.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Data-quality warnings', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const w of opts.warnings) {
      const lines = doc.splitTextToSize(`- ${w}`, doc.internal.pageSize.getWidth() - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12;
    }
  }

  const filename = `OptiConst_Report_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`;
  doc.save(filename);
}
