import React from 'react';
import { formatCurrency, resolveFileUrl } from '@/lib/utils';

export function toWords(num: number, currency = 'LKR'): string {
  const isUSD = String(currency || '').trim().toUpperCase() === 'USD' || currency === '$';
  const currencyUnit = isUSD ? 'US Dollars' : 'Rupees';

  if (isNaN(num) || num === 0) return `${currencyUnit} Zero and Cents Zero Only`;
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const g = ['','Thousand','Million','Billion','Trillion'];

  const makeGroup = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n] + ' '; }
    return str.trim();
  };

  const whole = Math.floor(Math.abs(num));
  const cents = Math.round((Math.abs(num) - whole) * 100);

  let result = '';
  let i = 0;
  let val = whole;
  if (val === 0) {
    result = 'Zero';
  } else {
    while (val > 0) {
      const chunk = val % 1000;
      if (chunk !== 0) {
        result = makeGroup(chunk) + (g[i] ? ' ' + g[i] : '') + (result ? ' ' + result : '');
      }
      val = Math.floor(val / 1000);
      i++;
    }
  }

  let words = `${currencyUnit} ${result.trim()}`;
  if (cents > 0) {
    let centsWord = '';
    if (cents > 19) {
      centsWord = b[Math.floor(cents / 10)] + (cents % 10 > 0 ? ' ' + a[cents % 10] : '');
    } else {
      centsWord = a[cents];
    }
    words += ` and Cents ${centsWord.trim()}`;
  } else {
    words += ' and Cents Zero';
  }
  return words + ' Only';
}

export function formatGazetteDate(dStr?: string): string {
  if (!dStr) return '-';
  const clean = dStr.trim();
  
  // Extract date part in case dStr contains time (e.g., "2026-10-13 00:00:00" or "2026-10-13T00:00:00.000Z")
  const datePart = clean.split(/[T\s]/)[0];
  
  // Check if datePart matches YYYY-MM-DD or YYYY/MM/DD -> format as DD-MM-YYYY
  const ymdMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return d.padStart(2, '0') + '-' + m.padStart(2, '0') + '-' + y;
  }

  // Check if datePart matches DD-MM-YYYY or MM-DD-YYYY or with slash
  const dmyMatch = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, p1, p2, y] = dmyMatch;
    return p1.padStart(2, '0') + '-' + p2.padStart(2, '0') + '-' + y;
  }

  // Fallback to Date object parsing (format as DD-MM-YYYY)
  const dateObj = new Date(clean);
  if (!isNaN(dateObj.getTime())) {
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return dd + '-' + mm + '-' + yyyy;
  }

  return clean;
}

export const TEMPLATES = [
  { id: 'government', name: 'Official Tax Invoice', description: 'Statutory Gazette Format (Gazette No. 2481/22)', color: '#000000', accent: '#000000' }
];

// Clean and deduplicate multi-line description lines (matching QuotationPrintView)
const cleanDescLines = (rawDesc: string) => {
  if (!rawDesc) return { titleLine: '', detailLines: '' };
  const lines = rawDesc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { titleLine: '', detailLines: '' };

  const titleLine = lines[0];
  const titleClean = titleLine.replace(/\s*\([^)]*\)/g, '').replace(/^[•\-*\s]+/, '').trim().toLowerCase();

  const remaining: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    const lineClean = l.replace(/^[•\-*\s]+/, '').trim().toLowerCase();
    if (lineClean === titleClean) {
      continue;
    }
    remaining.push(l);
  }

  return { titleLine, detailLines: remaining.join('\n') };
};

export interface InvoicePreviewProps {
  dueDate?: string;
  customerAddress?: string;
  customerPhone?: string;
  docNo?: string;
  date?: string;
  deliveryDate?: string;
  placeOfSupply?: string;
  additionalInfo?: string;
  quotationNo?: string;
  dispatchNo?: string;
  orderNo?: string;
  poNo?: string;
  customerPoNo?: string;
  customer?: any;
  customerVat?: string;
  items?: any[];
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  notes?: string;
  company?: any;
  modeOfPayment?: string;
  taxProfile?: any;
  taxProfileId?: string;
  attention?: string;
  bankDetails?: any;
  advanceDeducted?: number;
  receiptNos?: string;
  paymentTerms?: string;
  isTaxInclusive?: boolean;
  hideVatSeparately?: boolean;
  discount?: number;
  discountType?: 'percent' | 'amount';
  discountAmount?: number;
  grossAmount?: number;
  priceBasis?: 'FOB' | 'CIF' | string;
  [key: string]: any;
}

// ─── Print Preview (Gazette Extraordinary No. 2481/22 Annexure I Specimen) ────
export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  docNo,
  date,
  dueDate,
  deliveryDate, 
  placeOfSupply, 
  additionalInfo,
  quotationNo, 
  dispatchNo, 
  orderNo, 
  poNo, 
  customerPoNo,
  customer,
  customerAddress,
  customerPhone,
  customerVat, 
  items = [], 
  subtotal = 0, 
  taxAmount = 0, 
  total = 0, 
  notes, 
  company = {}, 
  modeOfPayment,
  taxProfile, 
  taxProfileId,
  attention,
  taxBreakdown,
  taxType,
  bankDetails,
  advanceDeducted = 0,
  receiptNos = '',
  paymentTerms,
  isProforma: isProformaProp = false,
  invoiceType = '',
  docTitle = '',
  isTaxInclusive = false,
  hideVatSeparately = false,
  discount = 0,
  discountType = 'percent',
  discountAmount = 0,
  grossAmount: propGrossAmount = 0,
  priceBasis: propPriceBasis,
  currency: propCurrency,
  exchangeRate: propExchangeRate
}) => {
  const rawPriceBasis = propPriceBasis || 
    (additionalInfo && /CIF/i.test(additionalInfo) ? 'CIF' : '') || 
    (additionalInfo && /FOB/i.test(additionalInfo) ? 'FOB' : '') || 
    'FOB';
  const effectivePriceBasis = String(rawPriceBasis).trim().toUpperCase();
  const effectiveTaxProfileId = taxProfileId || taxProfile?.id;
  const isForeignExport = Boolean(
    String(propCurrency || '').trim().toUpperCase() === 'USD' ||
    propCurrency === '$' ||
    effectiveTaxProfileId === 'tp_export_zero_rated' ||
    taxProfile?.name?.toLowerCase().includes('export') ||
    customer?.isForeign ||
    (customer as any)?.foreign ||
    (customer?.currency && String(customer.currency).trim().toUpperCase() === 'USD')
  );

  const rawCurrency = String(propCurrency || customer?.currency || (isForeignExport ? 'USD' : (company?.currency || 'LKR'))).trim().toUpperCase();
  const invoiceCurrency = isForeignExport && (rawCurrency === 'LKR' || !rawCurrency) ? 'USD' : rawCurrency;
  const isUSD = invoiceCurrency === 'USD' || invoiceCurrency === '$';
  const currSymbol = isUSD ? '$' : 'Rs.';
  const parsedDiscountAmount = Number(discountAmount || 0);
  const rawItemsTotal = items.reduce((sum: number, it: any) => sum + (Number(it.qty || 0) * Number(it.unitPrice || 0)), 0);
  const effectiveGrossAmount = Number(propGrossAmount) > 0 ? Number(propGrossAmount) : rawItemsTotal;
  const isFixedDiscount = discountType === 'amount' || (parsedDiscountAmount === 0 && Number(discount) > 100);
  const effectiveDiscountAmt = parsedDiscountAmount > 0 
    ? parsedDiscountAmount 
    : (isFixedDiscount
        ? Number(discount || 0)
        : (Number(discount || 0) > 0 && effectiveGrossAmount > 0 ? Number(((effectiveGrossAmount * Number(discount)) / 100).toFixed(2)) : 0));

  const purchaserAddress = customer?.address || customerAddress || customer?.deliveryAddress || customer?.billingAddress || '-';
  const purchaserPhone = customer?.phone || customerPhone || customer?.mobile || '-';
  const isProforma = Boolean(
    isProformaProp ||
    invoiceType === 'proforma' ||
    docTitle?.toLowerCase().includes('proforma') ||
    (docNo && (docNo.startsWith('PI-') || docNo.startsWith('PRO-') || docNo.includes('PROFORMA')))
  );

  const invoiceDateFormatted = formatGazetteDate(date);
  const supplyDateFormatted = deliveryDate && String(deliveryDate).trim()
    ? (/(week|weeks|day|days|month|months)/i.test(String(deliveryDate).trim()) 
        ? String(deliveryDate).trim() 
        : formatGazetteDate(String(deliveryDate).trim()))
    : formatGazetteDate(date);

  // Parse reference and additional info items into structured boxes
  const cleanPoNo = (poNo || customerPoNo || '').toString().trim();
  const infoItems: { label: string; value: string }[] = [];

  if (cleanPoNo) infoItems.push({ label: 'PO No.', value: String(cleanPoNo) });
  if (orderNo) infoItems.push({ label: 'Order No.', value: String(orderNo) });
  if (quotationNo) infoItems.push({ label: 'Quotation No.', value: String(quotationNo) });

  // Payment Due Date (Do NOT show on Proforma Invoices)
  if (!isProforma && invoiceType !== 'proforma') {
    let displayDueDate = '';
    if (dueDate) {
      displayDueDate = formatGazetteDate(dueDate);
    } else if (date) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + 30);
          displayDueDate = formatGazetteDate(d.toISOString());
        }
      } catch (e) {}
    }
    if (displayDueDate && displayDueDate !== '-') {
      infoItems.push({ label: 'Payment Due Date', value: displayDueDate });
    }
  }
  // Determine Payment Terms value (concise string: e.g. "Bank Wire / TT" or "Credit")
  let cleanPaymentTerms = '';
  if (paymentTerms && String(paymentTerms).trim() && !String(paymentTerms).trim().startsWith('{')) {
    cleanPaymentTerms = String(paymentTerms).trim();
    if (isProforma || invoiceType === 'proforma') {
      cleanPaymentTerms = cleanPaymentTerms
        .replace(/Advance Deposit \(\d+%\)\s*-\s*/i, '')
        .replace(/Advance Deposit\s*-\s*/i, '')
        .replace(/Advance Deposit \(\d+%\)/i, modeOfPayment || 'Bank Wire / TT');
    }
  } else if (isProforma || invoiceType === 'proforma') {
    cleanPaymentTerms = modeOfPayment || 'Bank Wire / TT';
  } else if (modeOfPayment && String(modeOfPayment).trim()) {
    cleanPaymentTerms = String(modeOfPayment).trim();
  } else {
    cleanPaymentTerms = 'Credit';
  }

  infoItems.push({
    label: 'Payment Terms',
    value: cleanPaymentTerms
  });

  if (isUSD && (isProforma || propPriceBasis)) {
    infoItems.push({
      label: 'Price Basis',
      value: effectivePriceBasis
    });
  }

  // Also parse any human-readable string in additionalInfo (strictly skip any raw JSON strings)
  const isRawJson = additionalInfo && (String(additionalInfo).trim().startsWith('{') || String(additionalInfo).includes('"isProforma"'));
  if (additionalInfo && String(additionalInfo).trim() && !isRawJson) {
    const rawParts = String(additionalInfo).split('|').map(p => p.trim()).filter(Boolean);
    for (const part of rawParts) {
      if (part.startsWith('{') || part.includes('"isProforma"')) continue;
      const colonIdx = part.indexOf(':');
      if (colonIdx > -1) {
        const rawLbl = part.slice(0, colonIdx).trim();
        const rawVal = part.slice(colonIdx + 1).trim();
        if (!rawVal || rawVal.startsWith('{')) continue;
        if (/payment\s*terms/i.test(rawLbl)) continue; // already set above
        const exists = infoItems.some(it => 
          it.label.toLowerCase() === rawLbl.toLowerCase() || 
          it.value.toLowerCase() === rawVal.toLowerCase()
        );
        if (!exists) {
          infoItems.push({ label: rawLbl, value: rawVal });
        }
      } else {
        const exists = infoItems.some(it => it.value.toLowerCase() === part.toLowerCase());
        if (!exists) {
          infoItems.push({ 
            label: 'Remarks', 
            value: part 
          });
        }
      }
    }
  }

  const paymentModeDisplay = modeOfPayment || 'Credit';
  const amountInWords = toWords(total, invoiceCurrency);

  // Proforma Order Total, Advance Breakdown & Balance Calculation
  const { proformaOrderTotal, proformaAdvancePercent, proformaBalanceDue } = React.useMemo(() => {
    if (!isProforma) {
      return { proformaOrderTotal: 0, proformaAdvancePercent: 0, proformaBalanceDue: 0 };
    }

    const currentTotal = Number(total || subtotal || 0);

    // 1. Try explicit grossAmount prop
    let fullTotal = Number(propGrossAmount || 0);

    // 2. Try sum of original amounts from items (either item.originalAmount or regex from item.details)
    if (!fullTotal || fullTotal <= currentTotal) {
      let sumOriginal = 0;
      let hasOriginal = false;
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it.originalAmount && Number(it.originalAmount) > 0) {
            sumOriginal += Number(it.originalAmount);
            hasOriginal = true;
          } else if (it.details && typeof it.details === 'string') {
            const m = it.details.match(/Original Item Value:\s*(?:[A-Za-z$]+\s*)?([\d,]+(?:\.\d+)?)/i);
            if (m && m[1]) {
              const val = parseFloat(m[1].replace(/,/g, ''));
              if (!isNaN(val) && val > 0) {
                sumOriginal += val;
                hasOriginal = true;
              }
            }
          }
        }
      }
      if (hasOriginal && sumOriginal > 0) {
        fullTotal = sumOriginal;
      }
    }

    // 3. Try parsing percentage from items details, notes or additionalInfo
    let detectedPercent: number | null = null;
    if (Array.isArray(items)) {
      for (const it of items) {
        if (it.advancePercent && Number(it.advancePercent) > 0) {
          detectedPercent = Number(it.advancePercent);
          break;
        }
        if (it.details && typeof it.details === 'string') {
          const m = it.details.match(/Advance Deposit\s*\((\d+(?:\.\d+)?)\s*%\)/i);
          if (m && m[1]) {
            detectedPercent = parseFloat(m[1]);
            break;
          }
        }
      }
    }

    if (!detectedPercent && notes && typeof notes === 'string') {
      const m = notes.match(/(\d+(?:\.\d+)?)\s*%\s*(?:advance|payment|deposit)/i) ||
                notes.match(/(?:advance|payment|deposit)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*%/i);
      if (m && m[1]) {
        detectedPercent = parseFloat(m[1]);
      }
    }

    if (!detectedPercent && additionalInfo && typeof additionalInfo === 'string') {
      const m = additionalInfo.match(/Advance:\s*(\d+(?:\.\d+)?)\s*%/i);
      if (m && m[1]) {
        detectedPercent = parseFloat(m[1]);
      }
    }

    // Also check if additionalInfo has "Order Total: <num>"
    if ((!fullTotal || fullTotal <= currentTotal) && additionalInfo && typeof additionalInfo === 'string') {
      const m = additionalInfo.match(/Order Total:\s*([\d,]+(?:\.\d+)?)/i);
      if (m && m[1]) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          fullTotal = val;
        }
      }
    }

    // 4. If fullTotal is not yet determined but detectedPercent exists:
    if ((!fullTotal || fullTotal <= currentTotal) && detectedPercent && detectedPercent > 0 && detectedPercent < 100) {
      fullTotal = Math.round((currentTotal / (detectedPercent / 100)) * 100) / 100;
    }

    // If still <= currentTotal or not found, fallback to currentTotal
    if (!fullTotal || fullTotal < currentTotal) {
      fullTotal = currentTotal;
    }

    // Calculate effective percentage
    let effPercent = detectedPercent;
    if (!effPercent) {
      effPercent = fullTotal > 0 ? Math.round((currentTotal / fullTotal) * 100) : 100;
    }

    const balanceDue = Math.max(0, Math.round((fullTotal - currentTotal) * 100) / 100);

    return {
      proformaOrderTotal: fullTotal,
      proformaAdvancePercent: effPercent,
      proformaBalanceDue: balanceDue
    };
  }, [isProforma, propGrossAmount, items, total, subtotal, notes, additionalInfo]);

  // VAT Rate determination - ensures statutory 18% is displayed
  let displayVatRate: number | string | null = null;

  if (taxProfile) {
    if (taxProfile.tax2_name === 'VAT' && Number(taxProfile.tax2_rate) > 0) {
      displayVatRate = taxProfile.tax2_rate;
    } else if (taxProfile.tax1_name === 'VAT' && Number(taxProfile.tax1_rate) > 0) {
      displayVatRate = taxProfile.tax1_rate;
    } else if (Number(taxProfile.tax2_rate) > 0) {
      displayVatRate = taxProfile.tax2_rate;
    } else if (Number(taxProfile.tax1_rate) > 0) {
      displayVatRate = taxProfile.tax1_rate;
    }
  }

  if ((!displayVatRate || Number(displayVatRate) === 0) && taxBreakdown) {
    if (Number(taxBreakdown.vatRate) > 0) displayVatRate = taxBreakdown.vatRate;
    else if (Number(taxBreakdown.tax2Rate) > 0) displayVatRate = taxBreakdown.tax2Rate;
    else if (Number(taxBreakdown.tax1Rate) > 0) displayVatRate = taxBreakdown.tax1Rate;
  }

  // Derive mathematically from taxAmount and subtotal if not provided
  if ((!displayVatRate || Number(displayVatRate) === 0) && subtotal > 0 && taxAmount > 0) {
    const rawRate = (taxAmount / subtotal) * 100;
    const roundedRate = Math.round(rawRate * 10) / 10;
    if (roundedRate > 0) {
      displayVatRate = roundedRate;
    }
  }

  // Fallback to statutory rate (18% in Sri Lanka) unless strictly non-taxable / zero tax explicitly chosen
  if (!displayVatRate || Number(displayVatRate) === 0) {
    if (Number(company?.vat_percentage) > 0) {
      displayVatRate = company.vat_percentage;
    } else {
      // Default to statutory 18% VAT rate for all standard supply invoices
      displayVatRate = 18;
    }
  }

  const vatRateLabel = `VAT Amount (Total Value of Supply @ ${displayVatRate}%):`;

  let activeBank: any = null;
  if (bankDetails && bankDetails !== 'none') {
    if (typeof bankDetails === 'string') {
      try { 
        activeBank = JSON.parse(bankDetails); 
      } catch (e) {
        // bankDetails might be an ID string like 'bank_hnb'
      }
    } else if (typeof bankDetails === 'object') {
      activeBank = bankDetails;
    }
  }

  if (!activeBank && bankDetails !== 'none') {
    const rawBankSettings = company?.company_bank_details;
    if (rawBankSettings) {
      try {
        const parsed = typeof rawBankSettings === 'string' ? JSON.parse(rawBankSettings) : rawBankSettings;
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof bankDetails === 'string' && bankDetails) {
            activeBank = parsed.find((b: any) => b.id === bankDetails);
          }
          if (!activeBank) {
            if (isUSD) {
              activeBank = parsed.find((b: any) => (b.swiftCode && (b.bankName?.toLowerCase().includes('usd') || b.accountName?.toLowerCase().includes('usd') || b.branchName?.toLowerCase().includes('foreign')))) ||
                           parsed.find((b: any) => b.swiftCode) ||
                           parsed.find((b: any) => b.isDefault) || 
                           parsed[0];
            } else {
              activeBank = parsed.find((b: any) => b.isDefault) || parsed[0];
            }
          }
        }
      } catch (e) {}
    }
  }

  // Fallback to legacy default if no settings exist and not explicitly set to 'none'
  if (!activeBank && bankDetails !== 'none') {
    activeBank = {
      bankName: company?.bankName || company?.companyBankName || 'Hatton National Bank',
      branchName: 'Negombo',
      accountName: company?.name || company?.company_name || 'Rex Industries (Pvt) Ltd',
      accountNumber: company?.accountNo || company?.companyAccountNo || '011010078028',
      swiftCode: 'HNBLLKLX'
    };
  }

    // Check whether tax1 (SSCL) and tax2 (VAT) are hidden (absorbed) or shown separately
  const hasTax1 = Boolean(taxProfile && Number(taxProfile.tax1_rate) > 0);
  const hasTax2 = Boolean(taxProfile && Number(taxProfile.tax2_rate) > 0);

  const isVatAbsorbedByProfile = Boolean(
    effectiveTaxProfileId === 'tp_vat18_absorbed' ||
    effectiveTaxProfileId === 'tp_opt1_absorbed' ||
    (hasTax2 && taxProfile?.tax2_show_separately === 0)
  );

  const isHideVat = Boolean(
    hideVatSeparately ||
    taxBreakdown?.hideVatSeparately ||
    isVatAbsorbedByProfile
  );

  const isSsclHidden = Boolean(hasTax1 && (taxProfile?.tax1_show_separately === 0 || isHideVat));
  const isVatHidden = Boolean(hasTax2 ? (taxProfile?.tax2_show_separately === 0 || isHideVat) : isHideVat);
  const isSsclSeparate = Boolean(hasTax1 && taxProfile?.tax1_show_separately === 1 && !isHideVat);
  const isVatSeparate = Boolean(!isHideVat && (hasTax2 ? taxProfile?.tax2_show_separately === 1 : (taxAmount > 0)));

  const t1Rate = Number(taxProfile?.tax1_rate || taxBreakdown?.tax1Rate || 2.5);
  const t2Rate = Number(taxProfile?.tax2_rate || taxBreakdown?.tax2Rate || displayVatRate || 18);

  // Multiplier for line items & supply value when taxes are absorbed
  let itemMultiplier = 1;
  let unitPriceDivisor = 1;
  if (isTaxInclusive) {
    if (isSsclHidden && !isVatHidden) {
      // Option 2: VAT separate, SSCL absorbed into supply value
      unitPriceDivisor = 1 + t2Rate / 100;
      itemMultiplier = 1;
    } else if (isSsclSeparate && isVatSeparate) {
      // Option 3: Both separate
      unitPriceDivisor = taxProfile?.tax2_compound ? ((1 + t1Rate / 100) * (1 + t2Rate / 100)) : (1 + (t1Rate + t2Rate) / 100);
      itemMultiplier = 1;
    } else {
      // Both absorbed or VAT absorbed: entered prices already include taxes
      unitPriceDivisor = 1;
      itemMultiplier = 1;
    }
  } else {
    if (isSsclHidden && isVatHidden) {
      // Option 1: Both SSCL & VAT absorbed into unit prices & supply value
      itemMultiplier = taxProfile?.tax2_compound ? ((1 + t1Rate/100) * (1 + t2Rate/100)) : (1 + (t1Rate + t2Rate)/100);
    } else if (!hasTax1 && isVatHidden) {
      // VAT ONLY absorbed (No SSCL): unit prices absorb the VAT (e.g. 18%)
      itemMultiplier = 1 + t2Rate / 100;
    } else if (hasTax1 && isVatHidden) {
      // Both taxes absorbed into price
      itemMultiplier = taxProfile?.tax2_compound ? ((1 + t1Rate/100) * (1 + t2Rate/100)) : (1 + (t1Rate + t2Rate)/100);
    } else if (isSsclHidden && !isVatHidden) {
      // Option 2 or Option 4: If SSCL is included in the base or absorbed, item multiplier for base price
      const isOpt4Included = taxProfile?.id === 'tp_opt4_sscl_included_vat_sep' || taxProfile?.name?.toLowerCase().includes('sscl included');
      // For Option 4: prices entered ALREADY include SSCL, so do NOT multiply prices again!
      itemMultiplier = isOpt4Included ? 1 : (1 + t1Rate/100);
    } else {
      // Option 3: Base unit prices, both taxes separate
      itemMultiplier = 1;
    }
  }

  const borderColor = '#000000';
  const borderWidth = '1.2px';
  const tableBorder = `${borderWidth} solid ${borderColor}`;

  const minRows = activeBank ? 3 : 4;
  const emptyRowsCount = Math.max(0, minRows - items.length);

  // Check whether tax is shown separately (if not shown separately, title should be "INVOICE" instead of "TAX INVOICE")
  const isTaxShownSeparately = Boolean(
    (isVatSeparate && (Number(taxBreakdown?.tax2Amount) > 0 || taxAmount > 0)) ||
    (isSsclSeparate && Number(taxBreakdown?.tax1Amount) > 0)
  );

  const invoiceTitle = isProforma ? 'PROFORMA INVOICE' : (isTaxShownSeparately ? 'TAX INVOICE' : 'INVOICE');
  const invoiceDocLabel = isProforma ? 'Proforma Invoice No. :' : (isTaxShownSeparately ? 'Tax Invoice No. :' : 'Invoice No. :');
  const logoSrc = resolveFileUrl(company?.company_logo || company?.logo || company?.companyLogo || '') || '/rex-logo.png';

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden !important; }
          #invoice-preview, #invoice-preview * { visibility: visible !important; }
          #invoice-preview {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
          }
          .print-no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div 
        id="invoice-preview" 
        style={{ 
          fontFamily: "'Inter', Arial, Helvetica, sans-serif", 
          background: '#ffffff', 
          color: '#000000', 
          fontSize: '11px', 
          lineHeight: 1.35, 
          padding: '8mm 10mm', 
          maxWidth: '760px', 
          width: '100%', 
          minHeight: 'auto', 
          margin: '0 auto', 
          boxSizing: 'border-box' 
        }}
      >
      {/* ── 1. HEADER: Logo on the Left, Title on the Right ── */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '14px',
        minHeight: '48px',
        width: '100%'
      }}>
        {/* Left: Company Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logoSrc} 
            alt="Company Logo" 
            style={{ maxHeight: '50px', maxWidth: '190px', objectFit: 'contain' }} 
            crossOrigin="anonymous"
          />
        </div>

        {/* Right: INVOICE / TAX INVOICE title in boxed border */}
        <div style={{ 
          border: tableBorder, 
          padding: '5px 28px', 
          fontSize: '15px', 
          fontWeight: '800', 
          letterSpacing: '0.8px', 
          textTransform: 'uppercase',
          textAlign: 'center'
        }}>
          {invoiceTitle}
        </div>
      </div>

      {/* ── 2. TOP SECTION TABLE GRID ── */}
      <div style={{ border: tableBorder, borderBottom: 'none' }}>
        
        {/* ROW 1: Date of Invoice & Tax Invoice No. / Invoice No. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '6px 10px', borderRight: tableBorder }}>
            <span style={{ fontWeight: '700' }}>Date of Invoice:</span>{' '}
            <span>{invoiceDateFormatted}</span>
          </div>
          <div style={{ padding: '6px 10px' }}>
            <span style={{ fontWeight: '700' }}>{invoiceDocLabel}</span>{' '}
            <span style={{ fontWeight: '700' }}>{docNo}</span>
          </div>
        </div>

        {/* ROW 2: Supplier Details & Purchaser Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: tableBorder, minHeight: '130px' }}>
          {/* Supplier Details (Top Left) */}
          <div style={{ padding: '8px 10px', borderRight: tableBorder, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Supplier's TIN :</span>
                <span style={{ flex: 1 }}>{company.company_tin || company.tin || company.company_vat || company.vat || '114106470-7000'}</span>
              </div>
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Supplier's Name :</span>
                <span style={{ flex: 1 }}>{company.company_name || company.companyName || company.name || 'Rex Industries (Pvt) Ltd'}</span>
              </div>
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Address :</span>
                <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{company.company_address || company.companyAddress || company.address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka'}</span>
              </div>
            </div>
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Telephone No.:*</span>
              <span style={{ flex: 1 }}>{company.company_phone || company.companyPhone || company.phone || '+94 31 2233117 / 2233315'}</span>
            </div>
          </div>

          {/* Purchaser Details (Top Right) */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Purchaser's TIN :</span>
                <span style={{ flex: 1 }}>{customerVat || customer?.vat || customer?.tin || '-'}</span>
              </div>
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Purchaser's Name :</span>
                <span style={{ fontWeight: '700', flex: 1 }}>
                  {(() => {
                    const rawCompany = customer?.company || customer?.name || '-';
                    const cName = customer?.name;
                    if (customer?.company && cName && rawCompany.toLowerCase().includes(`(${cName.toLowerCase()})`)) {
                      return rawCompany.replace(new RegExp(`\\s*\\(${cName}\\)`, 'i'), '').trim();
                    }
                    return rawCompany;
                  })()}
                </span>
              </div>
              <div style={{ marginBottom: '3px', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Address :</span>
                <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{purchaserAddress}</span>
              </div>
            </div>
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: '700', flexShrink: 0, marginRight: '4px' }}>Telephone No.:*</span>
              <span style={{ flex: 1 }}>{purchaserPhone}</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Date of Supply, Place of Supply & Dispatch No. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '6px 10px', borderRight: tableBorder }}>
            <span style={{ fontWeight: '700' }}>Date of Supply :</span>{' '}
            <span>{supplyDateFormatted}</span>
          </div>
          <div style={{ padding: '6px 10px', borderRight: tableBorder }}>
            <span style={{ fontWeight: '700' }}>Place of Supply :*</span>{' '}
            <span>Negombo</span>
          </div>
          <div style={{ padding: '6px 10px' }}>
            <span style={{ fontWeight: '700' }}>Dispatch No. :*</span>{' '}
            <span style={{ fontWeight: '800', fontFamily: 'monospace', color: '#000000' }}>{dispatchNo || 'Direct Delivery'}</span>
          </div>
        </div>

        {/* ROW 4: Additional Information if any */}
        <div style={{ padding: '4px 10px', borderBottom: tableBorder }}>
          <div style={{ fontWeight: '700', fontSize: '9px', marginBottom: infoItems.length > 0 ? '3px' : '0' }}>
            Additional Information if any:*
          </div>
          {infoItems.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {infoItems.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    flex: '1 1 calc(20% - 4px)',
                    minWidth: '100px',
                    border: '1px solid #000000', 
                    padding: '2px 6px', 
                    background: '#ffffff',
                    borderRadius: '2px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ 
                    fontSize: '8px', 
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    color: '#444444',
                    letterSpacing: '0.3px',
                    lineHeight: 1.1 
                  }}>
                    {item.label}
                  </div>
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '10px', 
                    color: '#000000',
                    marginTop: '1px',
                    wordBreak: 'break-word',
                    lineHeight: 1.2
                  }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span>-</span>
          )}
        </div>
      </div>

      {/* ── 3. ITEMS & TOTALS TABLE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: tableBorder, borderTop: 'none' }}>
        <thead>
          <tr style={{ borderBottom: tableBorder }}>
            <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '700', borderRight: tableBorder, width: '12%' }}>
              Reference*
            </th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder, width: '46%' }}>
              Description of Goods or Services
            </th>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '700', borderRight: tableBorder, width: '14%' }}>
              Quantity
            </th>
            <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '700', borderRight: tableBorder, width: '14%' }}>
              {isUSD && isProforma ? <>Unit Price<br/>({effectivePriceBasis})</> : <>Unit<br/>Price</>}
            </th>
            <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '700', width: '14%' }}>
              {isProforma || isVatHidden
                ? <>Amount<br/>({currSymbol})</>
                : <>Amount<br/>Excluding VAT<br/>({currSymbol})</>}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const rawUnitPrice = Number(item.unitPrice || 0);
            const lineUnitPriceExclVat = isTaxInclusive ? (rawUnitPrice / unitPriceDivisor) : (rawUnitPrice * itemMultiplier);
            const lineExclVat = Number(item.qty || 0) * lineUnitPriceExclVat;
            const rawDesc = item.description || item.productName || item.name || '';
            const { titleLine, detailLines } = cleanDescLines(rawDesc);

            return (
              <tr key={idx} style={{ borderBottom: tableBorder }}>
                <td style={{ padding: '8px 4px', textAlign: 'center', borderRight: tableBorder, verticalAlign: 'top' }}>
                  {item.reference || (idx + 1)}
                </td>
                <td style={{ padding: '8px 10px', borderRight: tableBorder, verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                  <div style={{ fontWeight: '700', fontSize: '11px', color: '#0f172a', lineHeight: 1.3 }}>
                    {titleLine || rawDesc}
                  </div>
                  {detailLines && (
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '3px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {detailLines}
                    </div>
                  )}
                  {item.details && !detailLines?.includes(item.details) && (
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '3px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {item.details}
                    </div>
                  )}
                  {item.specifications && (!item.details || !item.details.includes(item.specifications)) && (!detailLines || !detailLines.includes(item.specifications)) && (
                    <div style={{ fontSize: '9.5px', color: '#475569', marginTop: '2px', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                      <span style={{ fontWeight: '600' }}>Specifications:</span> {item.specifications}
                    </div>
                  )}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: tableBorder, verticalAlign: 'top' }}>
                  {Number(item.qty).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', borderRight: tableBorder, verticalAlign: 'top' }}>
                  {lineUnitPriceExclVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                  {lineExclVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}

          {/* Padding rows */}
          {Array.from({ length: emptyRowsCount }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ borderBottom: tableBorder, height: '28px' }}>
              <td style={{ borderRight: tableBorder }}>&nbsp;</td>
              <td style={{ borderRight: tableBorder }}>&nbsp;</td>
              <td style={{ borderRight: tableBorder }}>&nbsp;</td>
              <td style={{ borderRight: tableBorder }}>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}

          {/* PROFORMA INVOICE TOTALS BREAKDOWN */}
          {isProforma ? (
            <>
              {/* 1. Total Order / Supply Value */}
              <tr style={{ borderBottom: tableBorder }}>
                <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
                  {`Total Order / Supply Value (${invoiceCurrency}):`}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
                  {proformaOrderTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* 2. Advance Requested */}
              <tr style={{ borderBottom: tableBorder, backgroundColor: '#eff6ff' }}>
                <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', color: '#1d4ed8', borderRight: tableBorder }}>
                  {`Advance Payment Requested ${proformaAdvancePercent ? `(${proformaAdvancePercent}%)` : ''}:`}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '800', color: '#1d4ed8' }}>
                  {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* 3. Remaining Balance */}
              <tr style={{ borderBottom: tableBorder, backgroundColor: '#f8fafc' }}>
                <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', color: '#334155', borderRight: tableBorder }}>
                  Remaining Balance Payable (Upon Delivery / Completion):
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                  {proformaBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </>
          ) : (
            <>
              {/* GROSS ITEMS TOTAL & DISCOUNT (if discount applied) */}
              {effectiveDiscountAmt > 0 && (
                <>
                  <tr style={{ borderBottom: tableBorder, backgroundColor: '#fcfcfc' }}>
                    <td colSpan={4} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', borderRight: tableBorder }}>
                      Subtotal (Gross Item Total):
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>
                      {(isTaxInclusive ? effectiveGrossAmount : (effectiveGrossAmount * itemMultiplier)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: tableBorder, backgroundColor: '#fff5f5' }}>
                    <td colSpan={4} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600', color: '#b91c1c', borderRight: tableBorder }}>
                      {`Less: Special Discount ${discountType === 'percent' && Number(discount) > 0 ? `(${discount}%)` : ''}:`}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>
                      {`- ${effectiveDiscountAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                </>
              )}

              {/* TOTAL VALUE OF SUPPLY */}
              <tr style={{ borderBottom: tableBorder }}>
                <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
                  {isVatHidden ? 'Total Value of Supply (VAT Included):' : (effectiveDiscountAmt > 0 ? 'Total Net Value of Supply:' : 'Total Value of Supply:')}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
                  {(isTaxInclusive ? subtotal : (subtotal * itemMultiplier)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Option 3: SSCL Amount (Separate line) - Strictly suppressed on Proforma */}
              {isSsclSeparate && Number(taxBreakdown?.tax1Amount) > 0 && (
                <tr style={{ borderBottom: tableBorder }}>
                  <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
                    {`${taxProfile?.tax1_name || 'SSCL'} Amount (Total Value of Supply @ ${t1Rate}%):`}
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
                    {Number(taxBreakdown.tax1Amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* Option 2 & 3: VAT Amount (Separate line) - Strictly suppressed on Proforma */}
              {isVatSeparate && (Number(taxBreakdown?.tax2Amount) > 0 || taxAmount > 0) && (
                <tr style={{ borderBottom: tableBorder }}>
                  <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
                    {vatRateLabel}
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
                    {Number(taxBreakdown?.tax2Amount || taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* TOTAL CONSIDERATION */}
              <tr style={{ borderBottom: tableBorder }}>
                <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
                  {isVatHidden ? 'Total Amount / Consideration (VAT Included):' : 'Total Amount/consideration including VAT:'}
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
                  {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* ADVANCE DEDUCTION & NET BALANCE DUE */}
              {advanceDeducted > 0 && (
                <>
                  <tr style={{ borderBottom: tableBorder, backgroundColor: '#fcfcfc' }}>
                    <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
                      {`Less: Advance Payment Received ${receiptNos ? `(${receiptNos})` : ''}:`}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700', color: '#047857' }}>
                      {`- ${Number(advanceDeducted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: tableBorder, backgroundColor: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '800', borderRight: tableBorder }}>
                      Net Balance Payable / Due:
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '800', fontSize: '13px', color: '#1e293b' }}>
                      {Math.max(0, total - advanceDeducted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </>
              )}
            </>
          )}

          {/* TOTAL AMOUNT IN WORDS */}
          <tr style={{ borderBottom: tableBorder }}>
            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left' }}>
              <span style={{ fontWeight: '700' }}>{isProforma ? 'Total Advance Payable in words:*' : 'Total Amount in words:*'}</span>{' '}
              <span>{amountInWords}</span>
              {isProforma && proformaBalanceDue > 0 && (
                <div style={{ marginTop: '3px', fontSize: '10.5px', color: '#0f172a' }}>
                  <span style={{ fontWeight: '700' }}>Remaining Balance Payable in words:</span>{' '}
                  <span style={{ fontStyle: 'italic', fontWeight: '600' }}>{toWords(proformaBalanceDue, invoiceCurrency)}</span>
                </div>
              )}
              {!isProforma && advanceDeducted > 0 && (
                <div style={{ marginTop: '3px', fontSize: '10.5px', color: '#0f172a' }}>
                  <span style={{ fontWeight: '700' }}>Net Balance Payable in words:</span>{' '}
                  <span style={{ fontStyle: 'italic', fontWeight: '600' }}>{toWords(Math.max(0, total - advanceDeducted), invoiceCurrency)}</span>
                </div>
              )}
            </td>
          </tr>

          {/* MODE OF PAYMENT */}
          <tr style={{ borderBottom: tableBorder }}>
            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left' }}>
              <span style={{ fontWeight: '700' }}>Mode of Payment:*</span>{' '}
              <span>{paymentModeDisplay}</span>
            </td>
          </tr>

          {/* SPECIAL INSTRUCTIONS & TERMS OF PAYMENT */}
          {(() => {
            const rawNotes = notes && String(notes).trim() && !String(notes).trim().startsWith('{') ? String(notes).trim() : '';
            const isAutoGeneratedProformaNotice = /Proforma Invoice for \d+% payment against Sales Order.*Kindly arrange payment to the bank account/i.test(rawNotes)
              || /^Advance payment for manufacturing commencement$/i.test(rawNotes);

            let proformaInstructions: string[] = [];
            if (isProforma) {
              if (rawNotes && !isAutoGeneratedProformaNotice) {
                proformaInstructions = rawNotes.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
              } else {
                if (isUSD) {
                  proformaInstructions = [
                    `Terms of Payment - T/T (${cleanPaymentTerms})`,
                    `All the Bank Charges (Buyer's and Seller's) will be paid by the buyer`,
                    `Currency - USD ($)`
                  ];
                } else {
                  proformaInstructions = [
                    `** Cheques to be written in Favour of Rex Industries (PVT) LTD`,
                    `Terms of Payment - ${cleanPaymentTerms}`,
                    `Currency - LKR (Rs.)`
                  ];
                }
              }
            }

            if (!isProforma && (!rawNotes || isAutoGeneratedProformaNotice)) return null;

            return (
              <tr style={{ borderBottom: activeBank ? tableBorder : 'none' }}>
                <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left', backgroundColor: '#fcfcfc' }}>
                  <div style={{ fontWeight: '700', fontSize: '10.5px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#0f172a' }}>
                    {isProforma ? 'Special Instructions & Terms of Payment:' : 'Special Instructions / Remarks:'}
                  </div>
                  {isProforma && proformaInstructions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#1e293b', fontSize: '10.5px', lineHeight: '1.4' }}>
                      {proformaInstructions.map((line, lIdx) => {
                        const isChequeNotice = line.includes('Cheques to be written in Favour of');
                        const isTermsOfPayment = line.startsWith('Terms of Payment');
                        const isCurrencyLine = line.startsWith('Currency -');
                        const isBankCharges = line.includes('Bank Charges');

                        return (
                          <div key={lIdx} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ color: '#64748b', fontSize: '9px' }}>•</span>
                            <span>
                              {isChequeNotice ? (
                                <strong style={{ color: '#0f172a' }}>{line}</strong>
                              ) : isTermsOfPayment ? (
                                <>
                                  <strong style={{ color: '#0f172a' }}>Terms of Payment - </strong>
                                  <span>{line.replace(/^Terms of Payment\s*[-:]\s*/i, '')}</span>
                                </>
                              ) : isCurrencyLine ? (
                                <>
                                  <strong style={{ color: '#0f172a' }}>Currency - </strong>
                                  <span>{line.replace(/^Currency\s*[-:]\s*/i, '')}</span>
                                </>
                              ) : isBankCharges ? (
                                <span style={{ fontWeight: '600' }}>{line}</span>
                              ) : (
                                <span>{line}</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ color: '#1e293b' }}>{rawNotes}</span>
                  )}
                </td>
              </tr>
            );
          })()}

          {/* BANK REMITTANCE DETAILS */}
          {activeBank && (
            <tr>
              <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left', backgroundColor: '#fafafa' }}>
                <div style={{ fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: '#111' }}>
                  {isUSD ? 'Bank Details for Foreign Remittance (USD Wire Transfer):' : 'Bank Details for Remittance / Direct Deposit:'}
                </div>
                <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse', lineHeight: '1.4' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '15%', fontWeight: 700, color: '#333', padding: '2px 0' }}>Bank:</td>
                      <td style={{ width: '35%', fontWeight: 600, padding: '2px 0' }}>{activeBank.bankName}</td>
                      <td style={{ width: '18%', fontWeight: 700, color: '#333', padding: '2px 0' }}>Branch:</td>
                      <td style={{ width: '32%', fontWeight: 600, padding: '2px 0' }}>{activeBank.branchName || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#333', padding: '2px 0' }}>Account Name:</td>
                      <td style={{ fontWeight: 600, padding: '2px 0' }}>{activeBank.accountName || company.name || 'Rex Industries (Pvt) Ltd'}</td>
                      <td style={{ fontWeight: 700, color: '#333', padding: '2px 0' }}>Account No:</td>
                      <td style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '11.5px', padding: '2px 0' }}>{activeBank.accountNumber}</td>
                    </tr>
                    {activeBank.swiftCode && (
                      <tr>
                        <td style={{ fontWeight: 700, color: '#333', padding: '2px 0' }}>SWIFT Code:</td>
                        <td colSpan={3} style={{ fontFamily: 'monospace', fontWeight: 600, padding: '2px 0' }}>{activeBank.swiftCode}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── 3. SIGNATURE SECTION ── */}
      {isProforma ? (
        <div 
          className="print-no-break"
          style={{ 
            marginTop: '28px', 
            textAlign: 'center',
            fontSize: '10px',
            fontStyle: 'italic',
            fontWeight: 600,
            color: '#555555',
            letterSpacing: '0.4px',
            pageBreakInside: 'avoid',
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 0'
          }}
        >
          This is a computer generated document, no signature required.
        </div>
      ) : (
        <div 
          className="print-no-break"
          style={{ 
            marginTop: '28px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end',
            fontSize: '10px',
            pageBreakInside: 'avoid',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Prepared By */}
          <div style={{ textAlign: 'center', width: '31%' }}>
            <div style={{ height: '42px' }}></div>
            <div style={{ borderTop: '1px dotted #000000', margin: '0 4px', paddingTop: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#000000' }}>
                Prepared By
              </div>
              <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>
                Accounts / Finance Dept.
              </div>
            </div>
          </div>

          {/* Authorized Signature */}
          <div style={{ textAlign: 'center', width: '31%' }}>
            <div style={{ height: '42px' }}></div>
            <div style={{ borderTop: '1px dotted #000000', margin: '0 4px', paddingTop: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#000000' }}>
                Authorized Signature
              </div>
              <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>
                Official Signature &amp; Stamp
              </div>
            </div>
          </div>

          {/* Customer Signature */}
          <div style={{ textAlign: 'center', width: '31%' }}>
            <div style={{ height: '42px' }}></div>
            <div style={{ borderTop: '1px dotted #000000', margin: '0 4px', paddingTop: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', color: '#000000' }}>
                Customer Signature
              </div>
              <div style={{ fontSize: '9px', color: '#555', marginTop: '1px' }}>
                Received in Good Condition / Stamp &amp; Date
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};


