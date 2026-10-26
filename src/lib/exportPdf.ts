import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  filename?: string;
  scale?: number; // Canvas resolution multiplier (default: 3 for 300+ DPI offset print quality)
  orientation?: 'portrait' | 'landscape';
  format?: 'a4';
  marginMm?: number | [number, number, number, number]; // [top, right, bottom, left]
  preserveFullHeight?: boolean; // If true, ensures single page fills A4 height
}

/**
 * Pre-render helper: ensures all fonts and images inside element are 100% loaded.
 */
async function ensureAssetsLoaded(element: HTMLElement): Promise<void> {
  // 1. Wait for document fonts
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // Continue even if font ready check fails
    }
  }

  // 2. Wait for all <img> elements inside to complete loading
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 800);
      });
    })
  );
}

/**
 * Core engine to build a high-definition, razor-sharp jsPDF instance from any DOM element.
 */
export async function generatePdfDoc(
  elementOrId: string | HTMLElement,
  options?: ExportPdfOptions
): Promise<jsPDF> {
  const element = typeof elementOrId === 'string' 
    ? document.getElementById(elementOrId) 
    : elementOrId;

  if (!element) {
    throw new Error(`Element with id "${elementOrId}" not found for PDF export.`);
  }

  // Wait for all fonts and images to be ready
  await ensureAssetsLoaded(element);

  // High-fidelity capture settings: scale 3 produces ~300 DPI on standard 96 DPI displays
  const scale = options?.scale || 3;
  const orientation = options?.orientation || 'portrait';
  const isPortrait = orientation === 'portrait';

  // Standard A4 dimensions in mm
  const a4WidthMm = isPortrait ? 210 : 297;
  const a4HeightMm = isPortrait ? 297 : 210;

  // Render element to high-res canvas with html2canvas
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth || 794,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Ensure body and containers are unconstrained
      clonedDoc.body.style.overflow = 'visible';
      clonedDoc.body.style.background = '#ffffff';

      // 2. Standardize target element styling to A4 proportions
      clonedElement.style.visibility = 'visible';
      clonedElement.style.display = 'flex';
      clonedElement.style.flexDirection = 'column';
      clonedElement.style.margin = '0 auto';
      clonedElement.style.boxSizing = 'border-box';
      clonedElement.style.width = '794px';
      clonedElement.style.maxWidth = '794px';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.transform = 'none';

      // 3. For single page corporate documents (quotations, invoices, receipts, GRN),
      // ensure the document fills the A4 page height and anchors the footer cleanly at bottom.
      const shouldFillPage = options?.preserveFullHeight !== false;
      if (shouldFillPage && clonedElement.scrollHeight < 1050) {
        clonedElement.style.minHeight = '1050px';
        
        // Find inner border box if present
        const innerBox = clonedElement.firstElementChild as HTMLElement;
        if (innerBox && (innerBox.classList.contains('border') || innerBox.style.border)) {
          innerBox.style.minHeight = '1040px';
          innerBox.style.display = 'flex';
          innerBox.style.flexDirection = 'column';
          innerBox.style.justifyContent = 'space-between';
        }
      }
    }
  });

  // Setup jsPDF in A4 portrait / landscape
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation
  });

  const pdfPageWidth = a4WidthMm;
  const pdfPageHeight = a4HeightMm;

  // Standard elegant margins: 4mm top/bottom, 4mm left/right
  let marginTop = 4;
  let marginBottom = 4;
  let marginLeft = 4;
  let marginRight = 4;

  if (typeof options?.marginMm === 'number') {
    marginTop = marginBottom = marginLeft = marginRight = options.marginMm;
  } else if (Array.isArray(options?.marginMm) && options.marginMm.length === 4) {
    [marginTop, marginRight, marginBottom, marginLeft] = options.marginMm;
  }

  const printableWidthMm = pdfPageWidth - (marginLeft + marginRight);
  const printableHeightMm = pdfPageHeight - (marginTop + marginBottom);

  // Height of 1 A4 printable page in canvas pixels
  const a4Aspect = printableHeightMm / printableWidthMm;
  const pageCanvasHeight = Math.floor(canvas.width * a4Aspect);

  // Check if content fits in a single page or requires multiple pages
  const totalCanvasHeight = canvas.height;
  const isSinglePage = totalCanvasHeight <= pageCanvasHeight * 1.05;

  if (isSinglePage) {
    // Single page: render with crisp PNG
    const imgData = canvas.toDataURL('image/png');
    const renderHeightMm = Math.min(printableHeightMm, (totalCanvasHeight * printableWidthMm) / canvas.width);
    
    pdf.addImage(
      imgData,
      'PNG',
      marginLeft,
      marginTop,
      printableWidthMm,
      renderHeightMm,
      undefined,
      'FAST'
    );
  } else {
    // Multi-page document: slice canvas cleanly into A4 segments
    let currentY = 0;
    let pageIndex = 0;

    while (currentY < totalCanvasHeight) {
      if (pageIndex > 0) {
        pdf.addPage('a4', orientation);
      }

      const sliceHeight = Math.min(pageCanvasHeight, totalCanvasHeight - currentY);

      // Create temporary sub-canvas for this page slice
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

        pdf.addImage(
          pageImgData,
          'PNG',
          marginLeft,
          marginTop,
          printableWidthMm,
          sliceHeightMm,
          undefined,
          'FAST'
        );
      }

      currentY += sliceHeight;
      pageIndex++;
    }
  }

  return pdf;
}

/**
 * Export and directly download a high-definition PDF file.
 */
export async function exportPdf(
  elementOrId: string | HTMLElement,
  filename: string = 'Document.pdf',
  options?: ExportPdfOptions
): Promise<void> {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const pdf = await generatePdfDoc(elementOrId, options);
  pdf.save(safeFilename);
}

/**
 * Generate a PDF as a data URI string (e.g. for email attachments).
 */
export async function exportPdfDataUri(
  elementOrId: string | HTMLElement,
  options?: ExportPdfOptions
): Promise<string> {
  const pdf = await generatePdfDoc(elementOrId, options);
  return pdf.output('datauristring');
}
