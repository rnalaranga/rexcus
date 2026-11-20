import ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ExportToExcelOptions {
  fileName: string;
  sheetName?: string;
  companyName?: string;
  reportTitle: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows: Record<string, any>[];
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/rex-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportToExcel({
  fileName,
  sheetName = 'Report',
  companyName = 'REX INDUSTRIES (PVT) LTD',
  reportTitle,
  subtitle,
  columns,
  rows,
}: ExportToExcelOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 6 }],
  });

  const colCount = Math.max(columns.length, 4);

  // Reserve top 5 rows for branded header + logo
  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 20;
  sheet.getRow(3).height = 18;
  sheet.getRow(4).height = 16;
  sheet.getRow(5).height = 10;

  // Embed REX Logo if available
  const logoBase64 = await fetchLogoBase64();
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 110, height: 55 },
    });
  }

  // Company Name & Report Title
  sheet.mergeCells(1, 3, 1, colCount);
  const companyCell = sheet.getCell(1, 3);
  companyCell.value = companyName;
  companyCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  companyCell.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.mergeCells(2, 3, 2, colCount);
  const titleCell = sheet.getCell(2, 3);
  titleCell.value = reportTitle;
  titleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1D4ED8' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.mergeCells(3, 3, 3, colCount);
  const subCell = sheet.getCell(3, 3);
  subCell.value = subtitle || `Generated on ${new Date().toLocaleString()}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.mergeCells(4, 3, 4, colCount);
  const genCell = sheet.getCell(4, 3);
  genCell.value = `Exported: ${new Date().toLocaleString()}`;
  genCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  genCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Table Header Row (Row 6)
  const headerRow = sheet.getRow(6);
  headerRow.height = 24;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Data Rows (starting Row 7)
  rows.forEach((rowData, rIdx) => {
    const row = sheet.getRow(7 + rIdx);
    row.height = 20;
    const isEven = rIdx % 2 === 1;
    columns.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = rowData[col.key] ?? '';
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      if (col.numFmt) {
        cell.numFmt = col.numFmt;
      }
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Auto-fit column widths
  columns.forEach((col, idx) => {
    const maxDataLen = rows.reduce((max, r) => {
      const len = String(r[col.key] ?? '').length;
      return len > max ? len : max;
    }, col.header.length);
    sheet.getColumn(idx + 1).width = col.width || Math.min(Math.max(maxDataLen + 4, 12), 42);
  });

  // Generate & Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
