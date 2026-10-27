import html2pdf from 'html2pdf.js';

export interface PdfExportOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
  orientation?: 'portrait' | 'landscape';
  unit?: 'mm' | 'pt' | 'in';
  scale?: number;
}

const DEFAULT_MARGIN: [number, number, number, number] = [6, 8, 6, 8];

/**
 * Standardized PDF exporter for Rex ERP.
 * Solves:
 * - Font character overlaps (removes buggy letterRendering)
 * - Dark mode background bleed (enforces clean #ffffff background)
 * - Viewport scroll clipping (forces scrollY: 0, scrollX: 0)
 * - Multi-page table row slicing (proper pagebreak avoidance)
 */
export async function exportToPdf(
  elementOrId: HTMLElement | string,
  defaultFilename: string = 'Document.pdf',
  customOptions?: PdfExportOptions
): Promise<void> {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    console.error(`[exportToPdf] Element not found:`, elementOrId);
    return;
  }

  const filename = (customOptions?.filename || defaultFilename).endsWith('.pdf')
    ? (customOptions?.filename || defaultFilename)
    : `${customOptions?.filename || defaultFilename}.pdf`;

  const opt: any = {
    margin: customOptions?.margin ?? DEFAULT_MARGIN,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: customOptions?.scale ?? 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      scrollX: 0,
      backgroundColor: '#ffffff'
    },
    jsPDF: {
      unit: customOptions?.unit ?? 'mm',
      format: 'a4',
      orientation: customOptions?.orientation ?? 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: ['tr', '.print-no-break', '.print-avoid-break']
    }
  };

  await html2pdf().set(opt).from(element).save();
}

/**
 * Generate a Base64 Data URI string of the PDF for email attachments.
 */
export async function generatePdfDataUri(
  elementOrId: HTMLElement | string,
  filename: string = 'Document.pdf'
): Promise<string> {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    throw new Error(`Element not found for PDF generation`);
  }

  const opt: any = {
    margin: DEFAULT_MARGIN,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      scrollX: 0,
      backgroundColor: '#ffffff'
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: ['tr', '.print-no-break', '.print-avoid-break']
    }
  };

  const dataUri: string = await html2pdf().set(opt).from(element).output('datauristring');
  return dataUri;
}
