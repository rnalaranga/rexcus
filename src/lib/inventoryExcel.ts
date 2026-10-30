import * as XLSX from 'xlsx';

export interface ImportInventoryItemRow {
  type: string;
  category: string;
  subCategory?: string;
  name: string;
  sku: string;
  description: string;
  materialGrade?: string;
  materialShape?: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  unitCost: number;
  location?: string;
  reorderLevel?: number;
}

export const SAMPLE_IMPORT_ROWS: ImportInventoryItemRow[] = [
  {
    type: 'raw_material',
    category: 'Round & Hex Bars',
    subCategory: 'SS Bright Round',
    name: 'SS 304 Round Bar Ø25mm',
    sku: 'RM-SS-RB-025',
    description: 'Precision drawn bright finish round bar, 3000mm length',
    materialGrade: 'SS 304',
    materialShape: 'Round Bar',
    quantity: 45,
    uom: 'pcs',
    unitPrice: 3850,
    unitCost: 2950,
    location: 'Rack B-03',
    reorderLevel: 10
  },
  {
    type: 'raw_material',
    category: 'Plates & Sheets',
    subCategory: 'MS Plate',
    name: 'MS Plate 12mm (IS-2062)',
    sku: 'RM-MS-PLT-12',
    description: 'Hot rolled mild steel structural plate 4x8 ft',
    materialGrade: 'MS IS-2062',
    materialShape: 'Plate / Sheet',
    quantity: 18,
    uom: 'sheet',
    unitPrice: 32000,
    unitCost: 26500,
    location: 'Plate Bay 1',
    reorderLevel: 5
  },
  {
    type: 'raw_material',
    category: 'Fasteners & Hardware',
    subCategory: 'Socket Head Cap Screws',
    name: 'M8 x 35mm SS304 Allen Bolt',
    sku: 'FST-SC-M8-35',
    description: 'Grade A2-70 Stainless Steel Hex Socket Head Cap Screw DIN 912',
    materialGrade: 'SS 304',
    materialShape: 'Component / Custom',
    quantity: 500,
    uom: 'pcs',
    unitPrice: 65,
    unitCost: 42,
    location: 'Bin F-12',
    reorderLevel: 100
  },
  {
    type: 'raw_material',
    category: 'Tools, Inserts & Cutters',
    subCategory: 'CNC Milling Inserts',
    name: 'APMT 1135 PDER Milling Insert',
    sku: 'TLS-INS-APMT1135',
    description: 'Carbide milling insert for steel & stainless finishing',
    materialGrade: 'D2 Tool Steel',
    materialShape: 'Component / Custom',
    quantity: 60,
    uom: 'pcs',
    unitPrice: 850,
    unitCost: 620,
    location: 'Tool Crib T-02',
    reorderLevel: 20
  },
  {
    type: 'raw_material',
    category: 'Pipes & Hollow Tubes',
    subCategory: 'Square Hollow Section (SHS)',
    name: 'MS Square Pipe 50x50x2.5mm',
    sku: 'RM-MS-SHS-50',
    description: 'Structural square hollow steel section, 6m length',
    materialGrade: 'MS IS-2062',
    materialShape: 'Hollow Pipe / Tube',
    quantity: 30,
    uom: 'pcs',
    unitPrice: 6400,
    unitCost: 5100,
    location: 'Pipe Rack C-01',
    reorderLevel: 8
  }
];

/**
 * Downloads a complete, styled Microsoft Excel (.xlsx) file template
 */
export function downloadInventoryExcelTemplate(availableCategories: string[] = []) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Data Template
  const headers = [
    'Type',
    'Category',
    'SubCategory',
    'Name',
    'SKU',
    'Description',
    'MaterialGrade',
    'MaterialShape',
    'Quantity',
    'UOM',
    'UnitPrice',
    'UnitCost',
    'Location',
    'ReorderLevel'
  ];

  const dataRows = SAMPLE_IMPORT_ROWS.map(r => [
    r.type,
    r.category,
    r.subCategory || '',
    r.name,
    r.sku,
    r.description,
    r.materialGrade || '',
    r.materialShape || '',
    r.quantity,
    r.uom,
    r.unitPrice,
    r.unitCost,
    r.location || '',
    r.reorderLevel || 0
  ]);

  const wsData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 18 }, // Type
    { wch: 28 }, // Category
    { wch: 26 }, // SubCategory
    { wch: 32 }, // Name
    { wch: 18 }, // SKU
    { wch: 45 }, // Description
    { wch: 20 }, // MaterialGrade
    { wch: 20 }, // MaterialShape
    { wch: 12 }, // Quantity
    { wch: 10 }, // UOM
    { wch: 14 }, // UnitPrice
    { wch: 14 }, // UnitCost
    { wch: 18 }, // Location
    { wch: 14 }  // ReorderLevel
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Items_Import_Template');

  // Sheet 2: Reference Guide & Instructions
  const cats = availableCategories.length > 0 ? availableCategories : [
    'Raw Metals & Alloys',
    'Plates & Sheets',
    'Round & Hex Bars',
    'Pipes & Hollow Tubes',
    'Fasteners & Hardware',
    'Tools, Inserts & Cutters',
    'Engineering Plastics & Polymers',
    'Electrical & Automation',
    'Hydraulics & Pneumatics',
    'Bearings & Bushings',
    'Chemicals, Lubricants & Paints',
    'Welding Consumables & Gases',
    'Packaging & Shipping',
    'Machining & Fabrication Service',
    'General Maintenance Supplies'
  ];

  const guideRows = [
    ['REX INDUSTRIES ERP - ITEM IMPORT GUIDE & INSTRUCTIONS'],
    [''],
    ['FIELD', 'REQUIRED', 'ALLOWED VALUES / EXAMPLES', 'NOTES'],
    ['Type', 'Yes', 'raw_material | finished_product | service | company_asset', 'Defaults to raw_material if left blank'],
    ['Category', 'Yes', 'Choose from the Available Categories list on the right', 'Matches categories in the Material Categories Manager'],
    ['SubCategory', 'No', 'e.g. Mild Steel (MS), SS Bright Round, Hex Bolts', 'Optional family or subgroup'],
    ['Name', 'Yes', 'e.g. SS 304 Round Bar Ø25mm', 'Full descriptive name of the item'],
    ['SKU', 'Recommended', 'e.g. RM-SS-RB-025', 'Unique item code. If blank, auto-generated.'],
    ['Description', 'No', 'Detailed specifications, dimensions, heat treatment', 'Appears on quotations, work orders, & delivery notes'],
    ['MaterialGrade', 'No', 'SS 304, SS 316, MS IS-2062, EN8, EN19, EN24, Aluminum 6061', 'For engineering metals & machining'],
    ['MaterialShape', 'No', 'Round Bar, Plate / Sheet, Hexagonal Bar, Hollow Pipe / Tube', 'Used for linear cutting calculations & remnant tracking'],
    ['Quantity', 'Yes', 'Number (e.g. 50)', 'Initial stock quantity on hand'],
    ['UOM', 'Yes', 'pcs, kg, m, mm, sheet, ft, ltr, set, job, hr', 'Unit of Measurement'],
    ['UnitPrice', 'Recommended', 'Number (e.g. 1500)', 'Standard selling or quotation price (LKR)'],
    ['UnitCost', 'Recommended', 'Number (e.g. 1000)', 'Standard purchasing / material cost (LKR)'],
    ['Location', 'No', 'e.g. Rack A-01, Warehouse 2', 'Physical bin or rack location in factory'],
    ['ReorderLevel', 'No', 'Number (e.g. 10)', 'Low stock alert threshold'],
    [''],
    ['AVAILABLE RAW MATERIAL CATEGORIES IN YOUR SYSTEM:'],
    ...cats.map((c, idx) => [`${idx + 1}.`, c])
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 45 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Instructions & Reference');

  // Trigger browser download
  XLSX.writeFile(wb, 'Rex_Inventory_Import_Template.xlsx');
}

/**
 * Downloads standard CSV template
 */
export function downloadInventoryCsvTemplate() {
  const headers = [
    'Type',
    'Category',
    'SubCategory',
    'Name',
    'SKU',
    'Description',
    'MaterialGrade',
    'MaterialShape',
    'Quantity',
    'UOM',
    'UnitPrice',
    'UnitCost',
    'Location',
    'ReorderLevel'
  ];

  const rows = SAMPLE_IMPORT_ROWS.map(r => [
    `"${r.type}"`,
    `"${r.category}"`,
    `"${r.subCategory || ''}"`,
    `"${r.name.replace(/"/g, '""')}"`,
    `"${r.sku}"`,
    `"${r.description.replace(/"/g, '""')}"`,
    `"${r.materialGrade || ''}"`,
    `"${r.materialShape || ''}"`,
    r.quantity,
    `"${r.uom}"`,
    r.unitPrice,
    r.unitCost,
    `"${r.location || ''}"`,
    r.reorderLevel || 0
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Rex_Inventory_Import_Template.csv';
  a.click();
}

/**
 * Parses either an Excel (.xlsx / .xls) or CSV file into structured items
 */
export async function parseInventoryImportFile(file: File): Promise<ImportInventoryItemRow[]> {
  const buffer = await file.arrayBuffer();
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (!rawData || rawData.length < 2) {
      throw new Error('Excel sheet is empty or contains no data rows.');
    }

    const headerRow = rawData[0].map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    
    // Find index of column by potential header names
    const findCol = (...names: string[]) => {
      for (const n of names) {
        const clean = n.toLowerCase().replace(/[^a-z0-9]/g, '');
        const idx = headerRow.findIndex(h => h.includes(clean));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const typeIdx = findCol('type');
    const catIdx = findCol('category');
    const subCatIdx = findCol('subcategory', 'subcat');
    const nameIdx = findCol('name', 'itemname', 'productname', 'title');
    const skuIdx = findCol('sku', 'code', 'partno', 'itemcode');
    const descIdx = findCol('description', 'desc', 'spec', 'specification');
    const gradeIdx = findCol('materialgrade', 'grade');
    const shapeIdx = findCol('materialshape', 'shape');
    const qtyIdx = findCol('quantity', 'qty', 'stock');
    const uomIdx = findCol('uom', 'unit');
    const priceIdx = findCol('unitprice', 'price', 'sellingprice');
    const costIdx = findCol('unitcost', 'cost', 'purchaseprice');
    const locIdx = findCol('location', 'bin', 'rack');
    const reorderIdx = findCol('reorderlevel', 'reorder', 'minqty');

    const items: ImportInventoryItemRow[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const name = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : (row[3] ? String(row[3]).trim() : (row[1] ? String(row[1]).trim() : ''));
      if (!name) continue;

      let typeStr = typeIdx !== -1 && row[typeIdx] !== undefined ? String(row[typeIdx]).trim().toLowerCase().replace(/\s+/g, '_') : (row[0] ? String(row[0]).trim().toLowerCase() : 'raw_material');
      if (!['raw_material', 'finished_product', 'service', 'company_asset'].includes(typeStr)) {
        typeStr = typeStr.includes('product') || typeStr.includes('finish') ? 'finished_product' : 'raw_material';
      }

      const category = catIdx !== -1 && row[catIdx] !== undefined ? String(row[catIdx]).trim() : (row[1] ? String(row[1]).trim() : 'Raw Metals & Alloys');
      const subCategory = subCatIdx !== -1 && row[subCatIdx] !== undefined ? String(row[subCatIdx]).trim() : '';
      const sku = skuIdx !== -1 && row[skuIdx] !== undefined ? String(row[skuIdx]).trim() : '';
      const description = descIdx !== -1 && row[descIdx] !== undefined ? String(row[descIdx]).trim() : '';
      const materialGrade = gradeIdx !== -1 && row[gradeIdx] !== undefined ? String(row[gradeIdx]).trim() : '';
      const materialShape = shapeIdx !== -1 && row[shapeIdx] !== undefined ? String(row[shapeIdx]).trim() : '';
      const quantity = qtyIdx !== -1 && row[qtyIdx] !== undefined ? (Number(row[qtyIdx]) || 0) : (Number(row[8]) || 0);
      const uom = uomIdx !== -1 && row[uomIdx] !== undefined ? String(row[uomIdx]).trim() : 'pcs';
      const unitPrice = priceIdx !== -1 && row[priceIdx] !== undefined ? (Number(row[priceIdx]) || 0) : 0;
      const unitCost = costIdx !== -1 && row[costIdx] !== undefined ? (Number(row[costIdx]) || 0) : 0;
      const location = locIdx !== -1 && row[locIdx] !== undefined ? String(row[locIdx]).trim() : '';
      const reorderLevel = reorderIdx !== -1 && row[reorderIdx] !== undefined ? (Number(row[reorderIdx]) || 0) : 0;

      items.push({
        type: typeStr,
        category,
        subCategory,
        name,
        sku,
        description,
        materialGrade,
        materialShape,
        quantity,
        uom,
        unitPrice,
        unitCost,
        location,
        reorderLevel
      });
    }

    return items;
  }

  // Fallback for CSV: decode with UTF-8 or Windows-1252
  let text = '';
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    text = utf8Decoder.decode(buffer);
  } catch {
    const winDecoder = new TextDecoder('windows-1252');
    text = winDecoder.decode(buffer);
  }

  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing headers.');
  }

  // Parse header
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuote && line[j + 1] === '"') {
          cur += '"';
          j++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerCells = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasNewHeader = headerCells.some(h => h.includes('category') || h.includes('materialgrade'));

  const items: ImportInventoryItemRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length < 2) continue;

    if (hasNewHeader) {
      // New format: Type, Category, SubCategory, Name, SKU, Description, MaterialGrade, MaterialShape, Quantity, UOM, UnitPrice, UnitCost, Location, ReorderLevel
      const name = row[3] || row[1] || '';
      if (!name) continue;

      let typeStr = (row[0] || 'raw_material').toLowerCase().replace(/\s+/g, '_');
      if (!['raw_material', 'finished_product', 'service', 'company_asset'].includes(typeStr)) {
        typeStr = 'raw_material';
      }

      items.push({
        type: typeStr,
        category: row[1] || 'Raw Metals & Alloys',
        subCategory: row[2] || '',
        name,
        sku: row[4] || '',
        description: row[5] || '',
        materialGrade: row[6] || '',
        materialShape: row[7] || '',
        quantity: Number(row[8]) || 0,
        uom: row[9] || 'pcs',
        unitPrice: Number(row[10]) || 0,
        unitCost: Number(row[11]) || 0,
        location: row[12] || '',
        reorderLevel: Number(row[13]) || 0
      });
    } else {
      // Legacy CSV format: Type, Name, SKU, Description, UnitPrice, UnitCost, Quantity, UOM, Location, ReorderLevel
      const name = row[1] || '';
      if (!name) continue;

      let typeStr = (row[0] || 'raw_material').toLowerCase().replace(/\s+/g, '_');
      if (!['raw_material', 'finished_product', 'service', 'company_asset'].includes(typeStr)) {
        typeStr = 'raw_material';
      }

      items.push({
        type: typeStr,
        category: 'Raw Metals & Alloys',
        name,
        sku: row[2] || '',
        description: row[3] || '',
        unitPrice: Number(row[4]) || 0,
        unitCost: Number(row[5]) || 0,
        quantity: Number(row[6]) || 0,
        uom: row[7] || 'pcs',
        location: row[8] || '',
        reorderLevel: Number(row[9]) || 0
      });
    }
  }

  return items;
}
