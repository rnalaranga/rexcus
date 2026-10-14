import React from 'react';
import { formatCurrency } from '@/lib/utils';

export function toWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Rupees Zero and Cents Zero Only';
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

  let words = `Rupees ${result.trim()}`;
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
  
  // Check if datePart matches YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return m.padStart(2, '0') + '-' + d.padStart(2, '0') + '-' + y;
  }

  // Check if datePart matches MM-DD-YYYY or DD-MM-YYYY or with slash
  const dmyMatch = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, p1, p2, y] = dmyMatch;
    return p1.padStart(2, '0') + '-' + p2.padStart(2, '0') + '-' + y;
  }

  // Fallback to Date object parsing
  const dateObj = new Date(clean);
  if (!isNaN(dateObj.getTime())) {
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return mm + '-' + dd + '-' + yyyy;
  }

  return clean;
}

export const TEMPLATES = [
  { id: 'government', name: 'Official Tax Invoice', description: 'Statutory Gazette Format (Gazette No. 2481/22)', color: '#000000', accent: '#000000' }
];

export interface InvoicePreviewProps {
  docNo?: string;
  date?: string;
  deliveryDate?: string;
  placeOfSupply?: string;
  additionalInfo?: string;
  quotationNo?: string;
  dispatchNo?: string;
  orderNo?: string;
  poNo?: string;
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
  attention?: string;
  bankDetails?: any;
  [key: string]: any;
}

// ─── Print Preview (Gazette Extraordinary No. 2481/22 Annexure I Specimen) ────
export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  docNo, 
  date, 
  deliveryDate, 
  placeOfSupply, 
  additionalInfo,
  quotationNo, 
  dispatchNo, 
  orderNo, 
  poNo, 
  customer, 
  customerVat, 
  items = [], 
  subtotal = 0, 
  taxAmount = 0, 
  total = 0, 
  notes, 
  company = {}, 
  modeOfPayment,
  taxProfile, 
  attention,
  taxBreakdown,
  taxType,
  bankDetails
}) => {
  const invoiceDateFormatted = formatGazetteDate(date);
  const supplyDateFormatted = formatGazetteDate(deliveryDate || date);

  // Parse reference and additional info items into structured boxes
  const infoItems: { label: string; value: string }[] = [];

  if (poNo) infoItems.push({ label: 'PO No.', value: String(poNo) });
  if (orderNo) infoItems.push({ label: 'Order No.', value: String(orderNo) });
  if (quotationNo) infoItems.push({ label: 'Quotation No.', value: String(quotationNo) });
  if (dispatchNo) infoItems.push({ label: 'Dispatch No.', value: String(dispatchNo) });
  if (notes && String(notes).trim()) {
    const trimmedNotes = String(notes).trim();
    const isPaymentWord = /^(credit|cash|cheque|bank\s*transfer|advance)$/i.test(trimmedNotes);
    infoItems.push({ 
      label: isPaymentWord ? 'Payment Terms' : 'Notes / Remarks', 
      value: trimmedNotes 
    });
  }

  // Also parse any string in additionalInfo (e.g. from DB or user input)
  if (additionalInfo && String(additionalInfo).trim()) {
    const rawParts = String(additionalInfo).split('|').map(p => p.trim()).filter(Boolean);
    for (const part of rawParts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx > -1) {
        const rawLbl = part.slice(0, colonIdx).trim();
        const rawVal = part.slice(colonIdx + 1).trim();
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
          const isPaymentWord = /^(credit|cash|cheque|bank\s*transfer|advance)$/i.test(part);
          infoItems.push({ 
            label: isPaymentWord ? 'Payment Terms' : 'Remarks', 
            value: part 
          });
        }
      }
    }
  }

  const paymentModeDisplay = modeOfPayment || 'Credit';
  const amountInWords = toWords(total);

  // VAT Rate determination - ensures percentage is always displayed
  let displayVatRate: number | string | null = null;

  if (taxProfile) {
    if (taxProfile.tax2_name === 'VAT' && taxProfile.tax2_rate) {
      displayVatRate = taxProfile.tax2_rate;
    } else if (taxProfile.tax1_name === 'VAT' && taxProfile.tax1_rate) {
      displayVatRate = taxProfile.tax1_rate;
    } else if (taxProfile.tax2_rate) {
      displayVatRate = taxProfile.tax2_rate;
    } else if (taxProfile.tax1_rate) {
      displayVatRate = taxProfile.tax1_rate;
    }
  }

  if (!displayVatRate && taxBreakdown) {
    if (taxBreakdown.vatRate) displayVatRate = taxBreakdown.vatRate;
    else if (taxBreakdown.tax2Rate) displayVatRate = taxBreakdown.tax2Rate;
    else if (taxBreakdown.tax1Rate) displayVatRate = taxBreakdown.tax1Rate;
  }

  // Derive mathematically from taxAmount and subtotal if not provided
  if (!displayVatRate && subtotal > 0 && taxAmount > 0) {
    const rawRate = (taxAmount / subtotal) * 100;
    const roundedRate = Math.round(rawRate * 10) / 10;
    if (roundedRate > 0) {
      displayVatRate = roundedRate;
    }
  }

  // Fallback to settings or standard statutory rate (18% in Sri Lanka)
  if (displayVatRate === null || displayVatRate === undefined) {
    if (company?.vat_percentage) {
      displayVatRate = company.vat_percentage;
    } else if (taxAmount > 0) {
      displayVatRate = 18;
    } else if (taxAmount === 0 && (taxType === 'none' || !taxProfile)) {
      displayVatRate = 0;
    } else {
      displayVatRate = 18;
    }
  }

  const vatRateLabel = `VAT Amount (Total Value of Supply @ ${displayVatRate}%):`;

  let activeBank: any = null;
  if (bankDetails && bankDetails !== 'none') {
    if (typeof bankDetails === 'string') {
      try { activeBank = JSON.parse(bankDetails); } catch (e) {}
    } else if (typeof bankDetails === 'object') {
      activeBank = bankDetails;
    }
  } else if (bankDetails !== 'none' && company?.company_bank_details) {
    try {
      const parsed = JSON.parse(company.company_bank_details);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeBank = parsed.find((b: any) => b.isDefault) || parsed[0];
      }
    } catch (e) {}
  }

    // Check whether tax1 (SSCL) and tax2 (VAT) are hidden (absorbed) or shown separately
  const hasTax1 = Boolean(taxProfile && Number(taxProfile.tax1_rate) > 0);
  const hasTax2 = Boolean(taxProfile && Number(taxProfile.tax2_rate) > 0);

  const isSsclHidden = Boolean(hasTax1 && taxProfile.tax1_show_separately === 0);
  const isVatHidden = Boolean(hasTax2 && taxProfile.tax2_show_separately === 0);
  const isSsclSeparate = Boolean(hasTax1 && taxProfile.tax1_show_separately === 1);
  const isVatSeparate = Boolean(hasTax2 ? taxProfile.tax2_show_separately === 1 : (taxAmount > 0));

  const t1Rate = Number(taxProfile?.tax1_rate || taxBreakdown?.tax1Rate || 2.5);
  const t2Rate = Number(taxProfile?.tax2_rate || taxBreakdown?.tax2Rate || displayVatRate || 18);

  // Multiplier for line items & supply value when taxes are absorbed
  let itemMultiplier = 1;
  if (isSsclHidden && isVatHidden) {
    // Option 1: Both SSCL & VAT absorbed into unit prices & supply value
    itemMultiplier = taxProfile?.tax2_compound ? ((1 + t1Rate/100) * (1 + t2Rate/100)) : (1 + (t1Rate + t2Rate)/100);
  } else if (isSsclHidden && !isVatHidden) {
    // Option 2: SSCL absorbed into prices & supply value, VAT separate
    itemMultiplier = 1 + t1Rate/100;
  } else {
    // Option 3: Base unit prices, both taxes separate
    itemMultiplier = 1;
  }

  const borderColor = '#000000';
  const borderWidth = '1.2px';
  const tableBorder = `${borderWidth} solid ${borderColor}`;

  const minRows = 5;
  const emptyRowsCount = Math.max(0, minRows - items.length);

  // Check whether tax is shown separately (if not shown separately, title should be "INVOICE" instead of "TAX INVOICE")
  const isTaxShownSeparately = Boolean(
    (isVatSeparate && (Number(taxBreakdown?.tax2Amount) > 0 || taxAmount > 0)) ||
    (isSsclSeparate && Number(taxBreakdown?.tax1Amount) > 0)
  );
  const invoiceTitle = isTaxShownSeparately ? 'TAX INVOICE' : 'INVOICE';
  const invoiceDocLabel = isTaxShownSeparately ? 'Tax Invoice No. :' : 'Invoice No. :';
  const logoSrc = company?.company_logo || company?.logo || company?.companyLogo;

  return (
    <div 
      id="invoice-preview" 
      style={{ 
        fontFamily: "'Inter', Arial, Helvetica, sans-serif", 
        background: '#ffffff', 
        color: '#000000', 
        fontSize: '11px', 
        lineHeight: 1.4, 
        padding: '12mm 15mm', 
        width: '210mm', 
        minHeight: '297mm', 
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
          {logoSrc ? (
            <img 
              src={logoSrc} 
              alt="Company Logo" 
              style={{ maxHeight: '50px', maxWidth: '190px', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '900', 
              color: '#dc2626', 
              fontFamily: 'Impact, Arial Black, sans-serif',
              letterSpacing: '-1px',
              lineHeight: 1
            }}>
              REX
            </div>
          )}
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
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Supplier's TIN :</span>{' '}
                <span>{company.company_tin || company.tin || company.company_vat || company.vat || '114106470-7000'}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Supplier's Name :</span>{' '}
                <span>{company.company_name || company.companyName || company.name || 'Rex Industries (Pvt) Ltd'}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Address :</span>{' '}
                <span style={{ whiteSpace: 'pre-wrap' }}>{company.company_address || company.companyAddress || company.address || 'No. 451/2, Chilaw Road, Kattuwa, Negombo, 11500, Sri Lanka'}</span>
              </div>
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontWeight: '700' }}>Telephone No.:*</span>{' '}
              <span>{company.company_phone || company.companyPhone || company.phone || '+94 31 2233117 / 2233315'}</span>
            </div>
          </div>

          {/* Purchaser Details (Top Right) */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Purchaser's TIN :</span>{' '}
                <span>{customerVat || customer?.vat || customer?.tin || '-'}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Purchaser's Name :</span>{' '}
                <span style={{ fontWeight: '700' }}>
                  {customer?.company || customer?.name || '-'}
                  {customer?.name && customer?.company && customer?.name !== customer?.company ? ` (${customer.name})` : ''}
                  {attention ? ` - Attn: ${attention}` : ''}
                </span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Address :</span>{' '}
                <span style={{ whiteSpace: 'pre-wrap' }}>{customer?.address || '-'}</span>
              </div>
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontWeight: '700' }}>Telephone No.:*</span>{' '}
              <span>{customer?.phone || '-'}</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Date of Supply & Place of Supply */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '6px 10px', borderRight: tableBorder }}>
            <span style={{ fontWeight: '700' }}>Date of Supply :</span>{' '}
            <span>{supplyDateFormatted}</span>
          </div>
          <div style={{ padding: '6px 10px' }}>
            <span style={{ fontWeight: '700' }}>Place of Supply :*</span>{' '}
            <span>{placeOfSupply || '-'}</span>
          </div>
        </div>

        {/* ROW 4: Additional Information if any */}
        <div style={{ padding: '6px 10px', borderBottom: tableBorder }}>
          <div style={{ fontWeight: '700', marginBottom: infoItems.length > 0 ? '6px' : '0' }}>
            Additional Information if any:*
          </div>
          {infoItems.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {infoItems.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    flex: '1 1 calc(25% - 6px)',
                    minWidth: '120px',
                    border: '1px solid #000000', 
                    padding: '4px 8px', 
                    background: '#ffffff',
                    borderRadius: '2px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ 
                    fontSize: '8.5px', 
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    color: '#444444',
                    letterSpacing: '0.4px',
                    lineHeight: 1.1 
                  }}>
                    {item.label}
                  </div>
                  <div style={{ 
                    fontWeight: '700', 
                    fontSize: '11px', 
                    color: '#000000',
                    marginTop: '2px',
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
              Unit<br/>Price
            </th>
            <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: '700', width: '14%' }}>
              {isSsclHidden && isVatHidden
                ? <>Amount<br/>(Taxes Incl.)<br/>(Rs.)</>
                : isSsclHidden
                  ? <>Amount<br/>Excl. VAT (incl. SSCL)<br/>(Rs.)</>
                  : <>Amount<br/>Excluding VAT<br/>(Rs.)</>}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const lineExclVat = Number(item.qty || 0) * (Number(item.unitPrice || 0) * itemMultiplier);
            return (
              <tr key={idx} style={{ borderBottom: tableBorder }}>
                <td style={{ padding: '8px 4px', textAlign: 'center', borderRight: tableBorder, verticalAlign: 'top' }}>
                  {item.reference || (idx + 1)}
                </td>
                <td style={{ padding: '8px 10px', borderRight: tableBorder, verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                  {item.description}
                </td>
                <td style={{ padding: '8px 6px', textAlign: 'center', borderRight: tableBorder, verticalAlign: 'top' }}>
                  {Number(item.qty).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'right', borderRight: tableBorder, verticalAlign: 'top' }}>
                  {(Number(item.unitPrice) * itemMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* TOTAL VALUE OF SUPPLY */}
          <tr style={{ borderBottom: tableBorder }}>
            <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
              {isSsclHidden && isVatHidden 
                ? 'Total Value of Supply (VAT & SSCL Inclusive):'
                : isSsclHidden 
                  ? 'Total Value of Supply (inclusive of SSCL):' 
                  : 'Total Value of Supply:'}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
              {(subtotal * itemMultiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* Option 3: SSCL Amount (Separate line) */}
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

          {/* Option 2 & 3: VAT Amount (Separate line) */}
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

          {/* TOTAL CONSIDERATION INCLUDING VAT */}
          <tr style={{ borderBottom: tableBorder }}>
            <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
              Total Amount/consideration including VAT:
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* TOTAL AMOUNT IN WORDS */}
          <tr style={{ borderBottom: tableBorder }}>
            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left' }}>
              <span style={{ fontWeight: '700' }}>Total Amount in words:*</span>{' '}
              <span>{amountInWords}</span>
            </td>
          </tr>

          {/* MODE OF PAYMENT */}
          <tr style={{ borderBottom: activeBank ? tableBorder : 'none' }}>
            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left' }}>
              <span style={{ fontWeight: '700' }}>Mode of Payment:*</span>{' '}
              <span>{paymentModeDisplay}</span>
            </td>
          </tr>

          {/* BANK REMITTANCE DETAILS */}
          {activeBank && (
            <tr>
              <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left', backgroundColor: '#fafafa' }}>
                <div style={{ fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: '#111' }}>
                  Bank Details for Remittance / Direct Deposit:
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
    </div>
  );
};


