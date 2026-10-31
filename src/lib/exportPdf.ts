import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ExportPdfOptions {
  filename?: string;
  scale?: number;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4';
  marginMm?: number | [number, number, number, number];
  preserveFullHeight?: boolean;
}

let cachedStyles: string[] | null = null;

/**
 * Collect all active style definitions and stylesheets from the document head.
 */
function collectDocumentStyles(): string[] {
  if (cachedStyles && cachedStyles.length > 0) return cachedStyles;
  const styles: string[] = [];

  // 1. Gather all CSS rules from loaded document stylesheets (inlines compiled Tailwind & custom CSS)
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules && rules.length > 0) {
          let sheetCss = '';
          for (let j = 0; j < rules.length; j++) {
            sheetCss += rules[j].cssText + '\n';
          }
          if (sheetCss) {
            styles.push(sheetCss);
            continue;
          }
        }
      } catch (e) {
        // Cross-origin stylesheet
        const href = sheet.href;
        if (href) {
          styles.push(`<link rel="stylesheet" href="${href}">`);
        }
      }
    }
  } catch (e) {
    console.warn('Error reading styleSheets:', e);
  }

  // 2. Gather all inline style tags
  document.querySelectorAll('style').forEach(s => {
    if (s.textContent && !styles.includes(s.textContent)) {
      styles.push(s.textContent);
    }
  });

  // 3. Gather external stylesheet absolute links
  document.querySelectorAll('link[rel="stylesheet"]').forEach(l => {
    const link = l as HTMLLinkElement;
    if (link.href) {
      styles.push(`<link rel="stylesheet" href="${link.href}">`);
    }
  });

  cachedStyles = styles;
  return styles;
}

/**
 * Pre-render helper: ensures all fonts and images inside element are loaded.
 */
async function ensureAssetsLoaded(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  const pending = images.filter(img => !img.complete);
  if (pending.length === 0) return;

  await Promise.all(
    pending.map(img => {
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 300);
      });
    })
  );
}

/**
 * Primary Exporter: Generates a 100% vector-accurate A4 PDF via the Node.js Puppeteer backend.
 * Falls back to client-side canvas engine if the backend is unreachable.
 */
export async function exportPdf(
  elementOrId: string | HTMLElement,
  filename: string = 'Document.pdf',
  options?: ExportPdfOptions
): Promise<void> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!element) {
    throw new Error(`Element "${elementOrId}" not found for PDF export.`);
  }

  await ensureAssetsLoaded(element);
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const orientation = options?.orientation || 'portrait';

  // 1. Try Node.js Puppeteer backend export (100% vector, exact preview match)
  try {
    const styles = collectDocumentStyles();
    const res = await fetch(`${API_URL}/export-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: element.outerHTML,
        styles,
        filename: safeFilename,
        orientation
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return;
    }
  } catch (err) {
    console.warn('Backend PDF export unavailable, falling back to client engine:', err);
  }

  // 2. Client-side fallback via html2canvas & jsPDF
  const pdf = await generateClientPdfDoc(element, options);
  pdf.save(safeFilename);
}

/**
 * Generates a PDF data URI (base64) string (e.g. for email attachments).
 */
export async function exportPdfDataUri(
  elementOrId: string | HTMLElement,
  options?: ExportPdfOptions
): Promise<string> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!element) {
    throw new Error(`Element "${elementOrId}" not found.`);
  }

  await ensureAssetsLoaded(element);

  // 1. Try Node Puppeteer backend
  try {
    const styles = collectDocumentStyles();
    const res = await fetch(`${API_URL}/export-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: element.outerHTML,
        styles,
        returnBase64: true,
        orientation: options?.orientation || 'portrait'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.base64) return data.base64;
    }
  } catch (err) {
    console.warn('Backend PDF dataUri failed, using client fallback:', err);
  }

  // 2. Client-side fallback
  const pdf = await generateClientPdfDoc(element, options);
  return pdf.output('datauristring');
}

/**
 * High-definition Print: renders a vector PDF via Node Puppeteer and opens the native browser print dialog.
 * Eliminates all CSS wrapping, scrollbar, and modal print bugs.
 */
export async function printPdf(
  elementOrId: string | HTMLElement,
  docTitle: string = 'Document'
): Promise<void> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!element) {
    window.print();
    return;
  }

  await ensureAssetsLoaded(element);

  try {
    const styles = collectDocumentStyles();
    const res = await fetch(`${API_URL}/export-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: element.outerHTML,
        styles,
        filename: `${docTitle}.pdf`
      })
    });

    if (res.ok) {
      const blob = await res.blob();
      const pdfUrl = URL.createObjectURL(blob);

      // Create an isolated print frame for the PDF
      let iframe = document.getElementById('__vector_pdf_print_frame__') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = '__vector_pdf_print_frame__';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      iframe.src = pdfUrl;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            window.open(pdfUrl, '_blank');
          }
        }, 300);
      };
      return;
    }
  } catch (err) {
    console.warn('Vector PDF print failed, falling back to window.print():', err);
  }

  window.print();
}

/**
 * Client-side fallback generator using html2canvas & jsPDF.
 */
export async function generateClientPdfDoc(
  element: HTMLElement,
  options?: ExportPdfOptions
): Promise<jsPDF> {
  const scale = options?.scale || 3;
  const orientation = options?.orientation || 'portrait';
  const isPortrait = orientation === 'portrait';

  const a4WidthMm = isPortrait ? 210 : 297;
  const a4HeightMm = isPortrait ? 297 : 210;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 794,
    onclone: (clonedDoc, clonedElement) => {
      clonedDoc.body.style.overflow = 'visible';
      clonedDoc.body.style.background = '#ffffff';

      clonedElement.style.visibility = 'visible';
      clonedElement.style.display = 'flex';
      clonedElement.style.flexDirection = 'column';
      clonedElement.style.margin = '0 auto';
      clonedElement.style.boxSizing = 'border-box';
      clonedElement.style.width = '794px';
      clonedElement.style.maxWidth = '794px';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.transform = 'none';

      const currentH = clonedElement.getBoundingClientRect().height;
      if (currentH < 1050) {
        clonedElement.style.minHeight = '1050px';
      }
    }
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const marginTop = 6;
  const marginBottom = 6;
  const marginLeft = 8;
  const marginRight = 8;

  const printableWidthMm = a4WidthMm - (marginLeft + marginRight);
  const printableHeightMm = a4HeightMm - (marginTop + marginBottom);

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const heightInMm = (canvasHeight * printableWidthMm) / canvasWidth;

  if (heightInMm <= printableHeightMm + 2) {
    const finalRenderHeightMm = Math.min(printableHeightMm, Math.max(heightInMm, printableHeightMm - 2));
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', marginLeft, marginTop, printableWidthMm, finalRenderHeightMm, undefined, 'FAST');
  } else {
    const pageCanvasHeight = Math.floor((printableHeightMm * canvasWidth) / printableWidthMm);
    const totalCanvasHeight = canvas.height;
    let currentY = 0;
    let pageIndex = 0;

    while (currentY < totalCanvasHeight) {
      if (pageIndex > 0) {
        pdf.addPage('a4', orientation);
      }

      const sliceHeight = Math.min(pageCanvasHeight, totalCanvasHeight - currentY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, currentY, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        const sliceHeightMm = (sliceHeight * printableWidthMm) / canvas.width;

        pdf.addImage(pageImgData, 'PNG', marginLeft, marginTop, printableWidthMm, sliceHeightMm, undefined, 'FAST');
      }

      currentY += sliceHeight;
      pageIndex++;
    }
  }

  return pdf;
}

export const generatePdfDoc = generateClientPdfDoc;
export const exportToPdf = exportPdf;
export const generatePdfDataUri = exportPdfDataUri;
