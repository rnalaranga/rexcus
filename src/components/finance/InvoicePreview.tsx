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
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> MM/DD/YYYY
      const [y, m, d] = parts;
      return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
    }
    if (parts[2].length === 4 && parts[0].length <= 2 && parts[1].length <= 2) {
      // Already formatted with 4-digit year at end
      return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
    }
  }
  const dateObj = new Date(clean);
  if (isNaN(dateObj.getTime())) return clean;
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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
  attention 
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

  // VAT Rate label
  const vatRate = taxProfile?.tax2_rate || taxProfile?.tax1_rate;
  const vatRateLabel = vatRate 
    ? `VAT Amount (Total Value of Supply @ ${vatRate}%):`
    : `VAT Amount (Total Value of Supply @ VAT Rate):`;

  const borderColor = '#000000';
  const borderWidth = '1.2px';
  const tableBorder = `${borderWidth} solid ${borderColor}`;

  const minRows = 5;
  const emptyRowsCount = Math.max(0, minRows - items.length);

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
      {/* ── 1. TITLE: Prominently titled "TAX INVOICE" in a centered box ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
        <div style={{ 
          border: tableBorder, 
          padding: '4px 32px', 
          fontSize: '15px', 
          fontWeight: '800', 
          letterSpacing: '0.8px', 
          textTransform: 'uppercase',
          textAlign: 'center'
        }}>
          TAX INVOICE
        </div>
      </div>

      {/* ── 2. TOP SECTION TABLE GRID ── */}
      <div style={{ border: tableBorder, borderBottom: 'none' }}>
        
        {/* ROW 1: Date of Invoice & Tax Invoice No. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: tableBorder }}>
          <div style={{ padding: '6px 10px', borderRight: tableBorder }}>
            <span style={{ fontWeight: '700' }}>Date of Invoice:</span>{' '}
            <span>{invoiceDateFormatted}</span>
          </div>
          <div style={{ padding: '6px 10px' }}>
            <span style={{ fontWeight: '700' }}>Tax Invoice No. :</span>{' '}
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
                <span>{company.vat || company.tin || '-'}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Supplier's Name :</span>{' '}
                <span>{company.name || 'Rex Industries (Pvt) Ltd'}</span>
              </div>
              <div style={{ marginBottom: '3px' }}>
                <span style={{ fontWeight: '700' }}>Address :</span>{' '}
                <span>{company.address || '-'}</span>
              </div>
            </div>
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontWeight: '700' }}>Telephone No.:*</span>{' '}
              <span>{company.phone || '-'}</span>
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
              Amount<br/>Excluding VAT<br/>(Rs.)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const lineExclVat = Number(item.qty || 0) * Number(item.unitPrice || 0);
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
                  {Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              Total Value of Supply:
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
              {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* VAT AMOUNT */}
          <tr style={{ borderBottom: tableBorder }}>
            <td colSpan={4} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: '700', borderRight: tableBorder }}>
              {vatRateLabel}
            </td>
            <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>
              {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

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
          <tr>
            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'left' }}>
              <span style={{ fontWeight: '700' }}>Mode of Payment:*</span>{' '}
              <span>{paymentModeDisplay}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};


