import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================================
// CSV EXPORT UTILITIES
// ============================================================================

/**
 * Escapes and formats a single value for RFC 4180 CSV compliance.
 * Handles commas, double quotes, newlines, and null/undefined values.
 */
export function formatCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val).trim();
  // If the cell contains commas, double quotes, or newlines, wrap in quotes and escape quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 compliant CSV string with UTF-8 BOM.
 * The BOM (\uFEFF) ensures Microsoft Excel, LibreOffice, and Google Sheets
 * open the file directly in UTF-8 without garbled characters or currency symbol issues.
 */
export function buildCsvString(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const headerLine = headers.map(formatCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(formatCsvCell).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Initiates an automatic browser download from a Blob and revokes the URL.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 150);
}

export interface CsvExportOptions {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export function exportToCsv(options: CsvExportOptions): { success: boolean; filename: string } {
  const { filename, headers, rows } = options;
  const csvContent = buildCsvString(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, filename);
  return { success: true, filename };
}

// ============================================================================
// PDF EXPORT UTILITIES
// ============================================================================

export interface PdfSummaryCard {
  label: string;
  value: string;
  subtext?: string;
}

export interface PdfExportOptions {
  filename: string;
  reportTitle: string;
  categoryTitle?: string;
  filters?: Record<string, string>;
  summaryCards?: PdfSummaryCard[];
  tableHeaders: string[];
  tableRows: (string | number | null | undefined)[][];
}

/**
 * Generates a clean, professional, multi-page PDF document using jsPDF and jspdf-autotable.
 */
export function exportToPdf(options: PdfExportOptions): { success: boolean; filename: string } {
  const {
    filename,
    reportTitle,
    categoryTitle = 'Analytics & Compliance Operations',
    filters = {},
    summaryCards = [],
    tableHeaders,
    tableRows
  } = options;

  // Standard A4 portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  const marginRight = 14;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // 1. Brand Header Band
  doc.setFillColor(139, 0, 139); // Primary #8b008b (Dark Magenta)
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Company & Platform Title
  let currentY = 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(139, 0, 139);
  doc.text('PeoplePay360', marginLeft, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Enterprise Human Resources & Payroll Operations Platform', marginLeft, currentY + 5);

  // Generation timestamp on right
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Generated: ${dateStr}, ${timeStr}`, pageWidth - marginRight, currentY, { align: 'right' });
  doc.text('Status: Official Record', pageWidth - marginRight, currentY + 5, { align: 'right' });

  // Divider
  currentY += 10;
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);

  // 3. Report Name & Category
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(reportTitle, marginLeft, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(categoryTitle, marginLeft, currentY + 4.5);

  // 4. Applied Filters Block
  currentY += 10;
  const activeFilters = Object.entries(filters).filter(([_, v]) => v && v !== 'All');
  const filterSummary = activeFilters.length > 0
    ? activeFilters.map(([k, v]) => `${k}: ${v}`).join('  |  ')
    : 'All Records (No Filters Applied)';

  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, 7.5, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Applied Filters:', marginLeft + 3, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(filterSummary, marginLeft + 28, currentY + 5);

  currentY += 12;

  // 5. KPI Summary Cards (if provided)
  if (summaryCards.length > 0) {
    const cardGap = 3;
    const cardWidth = (contentWidth - (summaryCards.length - 1) * cardGap) / summaryCards.length;
    const cardHeight = 15;

    summaryCards.forEach((card, idx) => {
      const cardX = marginLeft + idx * (cardWidth + cardGap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Card top accent line
      doc.setFillColor(139, 0, 139);
      doc.rect(cardX, currentY, cardWidth, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label.toUpperCase(), cardX + 3, currentY + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(card.value, cardX + 3, currentY + 10);

      if (card.subtext) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(card.subtext, cardX + 3, currentY + 13.5);
      }
    });

    currentY += cardHeight + 6;
  }

  // 6. Data Table via autoTable
  const safeRows = tableRows.map((r) => r.map((c) => (c === null || c === undefined ? '-' : String(c))));

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: safeRows.length > 0 ? safeRows : [['No records found matching the applied criteria.']],
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      lineColor: [241, 245, 249],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [139, 0, 139],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: marginLeft, right: marginRight, bottom: 18 },
    didDrawPage: (data) => {
      // Footer on all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pageNum = data.pageNumber;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('PeoplePay360 Operations • Confidential Document', marginLeft, pageHeight - 7);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - marginRight, pageHeight - 7, { align: 'right' });
    }
  });

  // Save the generated PDF directly in the browser
  doc.save(filename);
  return { success: true, filename };
}
