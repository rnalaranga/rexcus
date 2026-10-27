import { printPdf } from './exportPdf';

/**
 * Universal utility to reliably print an HTML element.
 * Uses high-precision vector PDF rendering via Node Puppeteer backend first,
 * with graceful fallback to an isolated iframe print with clean colors and typography.
 */
export async function printElement(elementId: string, docTitle: string = 'Document') {
  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`[printElement] Element #${elementId} not found, falling back to window.print()`);
    window.print();
    return;
  }

  // 1. Primary: True vector PDF print via Node backend (Chromium engine)
  try {
    await printPdf(el, docTitle);
    return;
  } catch (e) {
    console.warn('Vector PDF print failed, falling back to iframe print:', e);
  }

  // 2. Fallback: isolated iframe print
  let iframe = document.getElementById('__isolated_print_frame__') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = '__isolated_print_frame__';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  ${styles}
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      width: 100% !important;
      height: auto !important;
      font-family: Arial, Helvetica, sans-serif !important;
    }
    #print-section,
    #invoice-preview,
    #grn-print-section,
    #gatepass-print-section,
    #sales-order-print-section,
    #work-order-print-section,
    #receipt-print-section,
    #gin-print-section,
    #product-quote-print-container,
    .printable-document {
      width: 100% !important;
      max-width: 794px !important;
      margin: 0 auto !important;
      padding: 0 !important;
      position: static !important;
      display: block !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    table {
      border-collapse: collapse !important;
    }
    tr, .print-no-break, .print-avoid-break {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>
  ${el.outerHTML}
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      window.print();
    }
  }, 250);
}
