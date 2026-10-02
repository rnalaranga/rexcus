import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Building2, Calendar, FileText,
  Calculator, AlertCircle, Printer, Eye, Palette, ChevronDown,
  CheckCircle2, Phone, Mail, Hash, X
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCustomers, useInventory } from '@/hooks/useData';
import { useTaxes, useTaxProfiles } from '@/hooks/useFinance';
import { createInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useDialog } from '@/components/ui/DialogProvider';

// ─── Template Definitions ────────────────────────────────────────────────────

export function toWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const g = ['','Thousand','Million','Billion'];
  const makeGroup = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n] + ' '; }
    return str.trim();
  };
  let result = '';
  let i = 0;
  let val = Math.floor(Math.abs(num));
  while (val > 0) {
    const chunk = val % 1000;
    if (chunk !== 0) {
      result = makeGroup(chunk) + ' ' + g[i] + ' ' + result;
    }
    val = Math.floor(val / 1000);
    i++;
  }
  return result.trim() + ' Only';
}

export const TEMPLATES = [
  { id: 'government', name: 'VAT Separate', description: 'Standard Tax Invoice (VAT added to total)', color: '#000000', accent: '#000000' },
  { id: 'government_inclusive', name: 'VAT Included', description: 'Tax Invoice (Prices inclusive of VAT)', color: '#000000', accent: '#000000' }
];

const docInputClass = "w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500/50 transition-colors";
const tableInputClass = "w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-blue-500 focus:bg-surface px-2 py-1 text-xs outline-none transition-all";

// ─── Print Preview ────────────────────────────────────────────────────────────
export const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, ssclAmount, vatAmount, selectedProfile }) => {

  if (template.startsWith('government')) {
    const isInclusive = template === 'government_inclusive';
    const borderColor = '#64748b'; // Not too dark
    
    return (
      <div id="invoice-preview" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#1a1a1a', fontSize: 11, lineHeight: 1.5, padding: '10mm', width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
        
        {/* MAIN OUTER BORDER */}
        <div style={{ border: `1.2px solid ${borderColor}` }}>
          
          {/* TITLE */}
          <div style={{ textAlign: 'center', padding: '10px', borderBottom: `1.2px solid ${borderColor}`, fontSize: 24, fontWeight: '800' }}>
            Tax Invoice
          </div>

          {/* DATE & INVOICE NO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.2px solid ${borderColor}` }}>
            <div style={{ padding: '6px 12px', borderRight: `1.2px solid ${borderColor}`, display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Date of Invoice</span>
              <span>:</span>
              <span>{date.split('-').reverse().join('-')}</span>
            </div>
            <div style={{ padding: '6px 12px', display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Tax Invoice No.</span>
              <span>:</span>
              <span>{docNo}</span>
            </div>
          </div>

          {/* SUPPLIER & PURCHASER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.2px solid ${borderColor}`, minHeight: '140px' }}>
            {/* Supplier */}
            <div style={{ padding: '8px 12px', borderRight: `1.2px solid ${borderColor}` }}>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  {company.vat && (
                    <tr>
                      <td style={{ fontWeight: '700', width: '100px', verticalAlign: 'top' }}>Supplier's TIN</td>
                      <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                      <td style={{ fontWeight: '700', verticalAlign: 'top' }}>{company.vat}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>Supplier's Name</td>
                    <td style={{ verticalAlign: 'top' }}>:</td>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>{company.name || 'Your Company'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Address</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8, whiteSpace: 'pre-wrap' }}>{company.address}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Telephone No</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>{company.phone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Purchaser */}
            <div style={{ padding: '8px 12px' }}>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  {customerVat && (
                    <tr>
                      <td style={{ fontWeight: '700', width: '100px', verticalAlign: 'top' }}>Purchaser's TIN</td>
                      <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                      <td style={{ fontWeight: '700', verticalAlign: 'top' }}>{customerVat}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>Purchaser's Name</td>
                    <td style={{ verticalAlign: 'top' }}>:</td>
                    <td style={{ fontWeight: '700', verticalAlign: 'top' }}>
                      {customer?.company || customer?.name || '-'}
                      {customer?.name && customer?.company && <><br/>{customer.name}</>}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Address</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8, whiteSpace: 'pre-wrap' }}>{customer?.address || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', verticalAlign: 'top', paddingTop: 8 }}>Telephone No</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>:</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 8 }}>{customer?.phone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DELIVERY & PLACE OF SUPPLY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1.2px solid ${borderColor}` }}>
            <div style={{ padding: '6px 12px', borderRight: `1.2px solid ${borderColor}`, display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Date of Deliver</span>
              <span>:</span>
              <span>{deliveryDate ? deliveryDate.split('-').reverse().join('-') : '-'}</span>
            </div>
            <div style={{ padding: '6px 12px', display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: '700' }}>Place Of Supply</span>
              <span>:</span>
              <span>{placeOfSupply || '-'}</span>
            </div>
          </div>

          {/* ADDITIONAL INFO */}
          <div style={{ padding: '8px 12px', borderBottom: `1.2px solid ${borderColor}` }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Additional Information if any</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '90px' }}>Quotation no</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td>{quotationNo || '-'}</td>
                  </tr>
                  <tr>
                    <td>ORDER NO</td>
                    <td>:</td>
                    <td>{orderNo || '-'}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ border: 'none', width: '100%', fontSize: 11 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '90px' }}>Dispatch no</td>
                    <td style={{ width: '15px' }}>:</td>
                    <td>{dispatchNo || '-'}</td>
                  </tr>
                  <tr>
                    <td>Po no</td>
                    <td>:</td>
                    <td>{poNo || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1.2px solid ${borderColor}` }}>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, width: '40px' }}>Reference</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>Description of Goods Or Services</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, width: '70px' }}>Quantity</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, width: '90px' }}>Unit Price</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: '700', width: '100px' }}>
                  {isInclusive ? <>Amount<br/>Inclusive VAT</> : <>Amount<br/>Excluding VAT</>}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const lineVal = item.qty * item.unitPrice;
                const lineTax = lineVal * (getTaxRate(item.taxRateId) / 100);
                const displayVal = isInclusive ? lineVal + lineTax : lineVal;
                return (
                  <tr key={idx}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, verticalAlign: 'top' }}>{idx + 1}.</td>
                    <td style={{ padding: '8px', borderRight: `1.2px solid ${borderColor}`, whiteSpace: 'pre-wrap', verticalAlign: 'top', fontWeight: '700' }}>{item.description}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, verticalAlign: 'top' }}>{Number(item.qty).toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}`, verticalAlign: 'top' }}>{Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', verticalAlign: 'top' }}>{displayVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              {/* Extra spacing row to push totals down slightly */}
              <tr>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px', borderRight: `1.2px solid ${borderColor}` }}></td>
                <td style={{ padding: '15px 8px' }}></td>
              </tr>
            </tbody>
          </table>

          {/* TOTALS */}
          <div style={{ borderTop: `1.2px solid ${borderColor}` }}>
            {!isInclusive && (
              <>
                <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                  <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>
                    Sub Total <span style={{ marginLeft: '10px', fontSize: 9 }}>LKR</span>
                  </div>
                  <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                    {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {selectedProfile?.tax2_name && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile.tax1_name} <span style={{ marginLeft: '20px' }}>{selectedProfile.tax1_rate} %</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {ssclAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {taxType !== 'none' && (
                  <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
                    <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', borderRight: `1.2px solid ${borderColor}` }}>
                      {selectedProfile?.tax2_name || selectedProfile?.tax1_name || 'Tax'} <span style={{ marginLeft: '20px' }}>{taxType === 'line_items' ? 'As per items' : `${selectedProfile?.tax2_name ? selectedProfile.tax2_rate : selectedProfile?.tax1_rate} %`}</span>
                    </div>
                    <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right' }}>
                      {(selectedProfile?.tax2_name ? vatAmount : taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </>
            )}
            <div style={{ display: 'flex', borderBottom: `1.2px solid ${borderColor}` }}>
              <div style={{ flex: 1, padding: '6px 12px', textAlign: 'right', fontWeight: '700', borderRight: `1.2px solid ${borderColor}` }}>
                Grand Total <span style={{ marginLeft: '10px', fontSize: 9 }}>LKR</span>
              </div>
              <div style={{ width: '100px', padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>
                {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* IN WORDS */}
          <div style={{ padding: '6px 12px', borderBottom: `1.2px solid ${borderColor}`, fontWeight: '700', fontSize: 10 }}>
            LKR {toWords(total)} Only
          </div>

          {/* PAYMENT MODE */}
          <div style={{ padding: '6px 12px', borderBottom: `1.2px solid ${borderColor}`, display: 'flex', gap: '20px' }}>
            <span style={{ fontWeight: '700' }}>Mode of payment :</span>
            <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>Credit</span>
          </div>

          {/* FOOTER AREA */}
          <div style={{ padding: '12px' }}>
            <div style={{ fontWeight: '700', marginBottom: '8px' }}>Cheque to be written in favor of {company.name}</div>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Bank details</div>
            <table style={{ border: 'none', fontSize: 11, marginBottom: '10px' }}>
              <tbody>
                <tr><td style={{ width: '100px' }}>Account Name</td><td style={{ width: '15px' }}>:</td><td>{company.name}</td></tr>
                {company.bankName && <tr><td>Bank</td><td>:</td><td>{company.bankName}</td></tr>}
                {company.accountNo && <tr><td>Account No</td><td>:</td><td>{company.accountNo}</td></tr>}
                {company.branch && <tr><td>Branch</td><td>:</td><td>{company.branch}</td></tr>}
              </tbody>
            </table>
            
            <div>Thanking You</div>
            <div style={{ marginBottom: '40px' }}>Yours faithfully</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px', marginTop: '50px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1.2px dotted #1a1a1a', paddingTop: '4px', paddingLeft: '20px', paddingRight: '20px' }}>Manager/Authorized Officer</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1.2px dotted #1a1a1a', paddingTop: '4px', paddingLeft: '20px', paddingRight: '20px' }}>Signature of Recipient</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
  const tmpl = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
  const headerBg = template === 'modern' ? `linear-gradient(135deg, ${tmpl.color} 0%, #1e3a5f 100%)` : template === 'elegant' ? '#f8fafc' : '#fff';
  const headerText = template === 'elegant' ? tmpl.color : '#fff';
  const borderColor = tmpl.accent + '33';

  return (
    <div id="invoice-preview" style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', color: '#1a1a2e', fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ background: headerBg, padding: '28px 32px', borderBottom: `3px solid ${tmpl.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {company.logo && <img src={company.logo} alt="Logo" style={{ height: 40, marginBottom: 8 }} />}
            <div style={{ color: headerText, fontWeight: 800, fontSize: 18 }}>{company.name || 'Your Company'}</div>
            <div style={{ color: headerText + 'cc', fontSize: 10 }}>{company.address}</div>
            <div style={{ color: headerText + 'cc', fontSize: 10 }}>{company.phone ? `Tel: ${company.phone}` : ''}</div>
            <div style={{ color: headerText + 'cc', fontSize: 10 }}>{company.email ? `Email: ${company.email}` : ''}</div>
            {company.vat && <div style={{ color: headerText + 'cc', fontSize: 10 }}>VAT: {company.vat}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: tmpl.accent, fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>INVOICE</div>
            <div style={{ color: headerText + 'cc', fontWeight: 700, fontSize: 13, marginTop: 4 }}>{docNo}</div>
            <div style={{ color: headerText + 'aa', fontSize: 10, marginTop: 2 }}>Date: {date}</div>
            <div style={{ color: headerText + 'aa', fontSize: 10 }}>Due: {dueDate}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '20px 32px', display: 'flex', gap: 32, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tmpl.accent, textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
          {customer ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{customer.name}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.company}</div>
              {customer.email && <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.email}</div>}
              {customer.phone && <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.phone}</div>}
              {customer.address && <div style={{ color: '#6b7280', fontSize: 10 }}>{customer.address}</div>}
              {(customerVat || customer.vat) && <div style={{ color: '#6b7280', fontSize: 10 }}>VAT: {customerVat || customer.vat}</div>}
            </>
          ) : <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No customer selected</div>}
        </div>
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: tmpl.accent, textTransform: 'uppercase', marginBottom: 6 }}>Payment Info</div>
          {company.bankName && <div style={{ fontSize: 10, color: '#6b7280' }}>Bank: {company.bankName}</div>}
          {company.accountNo && <div style={{ fontSize: 10, color: '#6b7280' }}>Acc: {company.accountNo}</div>}
          {company.brNumber && <div style={{ fontSize: 10, color: '#6b7280' }}>BR: {company.brNumber}</div>}
        </div>
      </div>
      <div style={{ padding: '16px 32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: tmpl.accent + '15', borderBottom: `2px solid ${tmpl.accent}` }}>
              {['#', 'Description', 'Qty', 'Unit Price', 'Tax', 'Amount'].map((h, i) => (
                <th key={i} style={{ padding: '8px 6px', textAlign: (i >= 4 ? 'right' : i === 2 ? 'center' : 'left') as any, fontWeight: 700, color: tmpl.accent, textTransform: 'uppercase' as any, letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const tax = taxRates.find((t: any) => t.id === item.taxRateId);
              const line = item.qty * item.unitPrice;
              const lineTax = line * (getTaxRate(item.taxRateId) / 100);
              return (
                <tr key={item.id} style={{ borderBottom: `1px solid ${borderColor}`, background: idx % 2 === 0 ? 'transparent' : '#f9fafb' }}>
                  <td style={{ padding: '7px 6px', color: '#9ca3af' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 6px', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{item.description || '—'}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#6b7280' }}>{tax ? `${tax.name} (${tax.rate}%)` : '—'}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(line + lineTax)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '0 32px 20px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          {([['Subtotal', subtotal], ['Tax', taxAmount]] as [string, number][]).map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
              <span style={{ color: '#6b7280' }}>{label}</span>
              <span style={{ fontFamily: 'monospace' }}>{formatCurrency(val)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: tmpl.accent, borderRadius: 6, marginTop: 6 }}>
            <span style={{ color: '#fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</span>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'monospace' }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      {notes && (
        <div style={{ padding: '0 32px 20px' }}>
          <div style={{ padding: '12px 16px', background: tmpl.accent + '0d', borderLeft: `3px solid ${tmpl.accent}`, borderRadius: '0 4px 4px 0' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: tmpl.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Notes & Terms</div>
            <div style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{notes}</div>
          </div>
        </div>
      )}
      <div style={{ borderTop: `1px solid ${borderColor}`, padding: '12px 32px', textAlign: 'center', color: '#9ca3af', fontSize: 9 }}>
        {company.tagline || 'Thank you for your business!'}
      </div>
    </div>
  );
};

// ─── Template Picker Modal ────────────────────────────────────────────────────
const TemplatePicker: React.FC<{ current: string; onChange: (id: string) => void; onClose: () => void }> = ({ current, onChange, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-surface border border-theme rounded-2xl shadow-glass p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2"><Palette size={16} className="text-rex-500" /> Print Template</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-surface2 rounded-lg text-muted"><X size={14} /></button>
      </div>
      <div className="space-y-2">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => { onChange(t.id); onClose(); }}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${current === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-theme-subtle hover:border-theme hover:bg-surface2'}`}
          >
            <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: t.color }}>
              <div className="w-4 h-0.5 rounded-full" style={{ background: t.accent }} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-primary">{t.name}</div>
              <div className="text-[10px] text-muted">{t.description}</div>
            </div>
            {current === t.id && <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const InvoiceBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const { data: taxRates } = useTaxes();
  const { data: taxProfiles } = useTaxProfiles();
  const { data: inventory } = useInventory();
  const { toast, showError } = useDialog();

  const [docNo] = useState('INV-' + Date.now().toString().slice(-4));
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [taxType, setTaxType] = useState('none');
  const [template, setTemplate] = useState('government');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [company, setCompany] = useState<any>({});
    const [deliveryDate, setDeliveryDate] = useState(date);
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [quotationNo, setQuotationNo] = useState('');
  const [dispatchNo, setDispatchNo] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [poNo, setPoNo] = useState('');
  const [customerVat, setCustomerVat] = useState('');
const [items, setItems] = useState([{ id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);

  const selectedCustomer = customers.find(c => c.id === customerId);

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.name} (${c.company})`, group: c.segment || 'Customers', extra: c.email || '' }));
  const itemOptions = inventory.map(i => ({ value: i.id, label: `${i.sku} - ${i.name}`, group: i.category || 'Products', extra: `Stock: ${i.qtyOnHand}` }));

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings`)
      .then(r => r.json())
      .then(s => setCompany({ name: s.companyName || 'Your Company', address: s.companyAddress || '', phone: s.companyPhone || '', email: s.companyEmail || '', vat: s.companyVat || '', brNumber: s.companyBr || '', bankName: s.companyBankName || '', accountNo: s.companyAccountNo || '', tagline: s.invoiceTagline || 'Thank you for your business!', logo: s.companyLogo || '' }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      const days = Number(selectedCustomer.creditDays) || 0;
      setDueDate(new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0]);
      setCustomerVat(selectedCustomer.vat || '');
    } else {
      setCustomerVat('');
    }
  }, [selectedCustomer?.id, date]);

  const handleAddItem = () => setItems([...items, { id: crypto.randomUUID(), inventoryId: '', description: '', qty: 1, unitPrice: 0, taxRateId: '' }]);
  const handleRemoveItem = (id: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const handleChangeItem = (id: string, field: string, value: any) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      const u = { ...i, [field]: value };
      if (field === 'inventoryId') {
        const inv = inventory.find(x => x.id === value);
        if (inv) { u.description = inv.name; u.unitPrice = Number(inv.unitPrice) || 0; }
      }
      return u;
    }));
  };

  const getTaxRate = (id: string) => { const t = taxRates.find((x: any) => x.id === id); return t ? Number(t.rate) : 0; };
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  
  let taxAmount = 0;
  let ssclAmount = 0;
  let vatAmount = 0;
  
  const selectedProfile = taxProfiles?.find((p: any) => p.id === taxType);
  if (selectedProfile) {
    const t1 = Number(selectedProfile.tax1_rate) / 100;
    const t2 = Number(selectedProfile.tax2_rate) / 100;
    
    ssclAmount = subtotal * t1;
    if (selectedProfile.tax2_compound) {
      vatAmount = (subtotal + ssclAmount) * t2;
    } else {
      vatAmount = subtotal * t2;
    }
    taxAmount = ssclAmount + vatAmount;
  } else if (taxType === 'line_items') {
    taxAmount = items.reduce((s, i) => s + i.qty * i.unitPrice * (getTaxRate(i.taxRateId) / 100), 0);
  }
  
  const total = subtotal + taxAmount;
  const creditWarning = selectedCustomer && Number(selectedCustomer.creditLimit) > 0 && (Number(selectedCustomer.totalRevenue || 0) + total > Number(selectedCustomer.creditLimit));

  const handleSave = async () => {
    if (!customerId) return showError('Please select a customer.');
    if (items.some(i => !i.description)) return showError('Please enter a description for all items.');
    try {
      const res = await createInvoice({ id: docNo, customerId, date, dueDate: dueDate || null, items: JSON.stringify(items), subtotal, taxAmount, total, amount: total, notes, status: 'Unpaid', deliveryDate: deliveryDate || null, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customerVat, taxType });
      if ((res as any).error) throw new Error((res as any).error);
      toast('Invoice posted successfully!', 'success');
      navigate('/finance/invoices');
    } catch (e: any) { showError(e.message || 'Failed to post invoice.'); }
  };

  const handlePrint = () => {
    const content = document.getElementById('invoice-preview');
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${docNo}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;display:flex;justify-content:center}@page{size:A4;margin:0}@media print{body{margin:0;width:210mm;height:297mm}}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close(); win.focus(); win.print();
  };

  const previewProps = { template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer: selectedCustomer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates, taxType, ssclAmount, vatAmount, selectedProfile };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden relative animate-fade-in">

      {/* ── TOP BAR (matches QuotationBuilder style) ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface/60 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/finance/invoices')} className="p-2 hover:bg-surface2 rounded-lg transition-colors text-muted hover:text-primary">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary tracking-tight">Invoice Builder</h1>
            <p className="text-[11px] text-muted mt-0.5">{selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.company}` : 'New Invoice'}</p>
          </div>
        </div>

        {/* Center — Invoice No badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md font-bold border border-blue-500/20">{docNo}</span>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplatePicker(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <Palette size={14} /> Template <ChevronDown size={11} />
          </button>
          <button onClick={() => setShowPreview(p => !p)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${showPreview ? 'bg-surface2 border-blue-500/50 text-blue-500' : 'border-theme-subtle text-muted hover:text-primary hover:bg-surface2'}`}>
            <Eye size={14} /> Preview
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-theme-subtle text-muted hover:text-primary hover:bg-surface2 transition-colors">
            <Printer size={14} /> Print
          </button>
          <Button variant="primary" icon={Save} onClick={handleSave} className="text-xs">
            Post Invoice
          </Button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      {showPreview ? (
        /* Preview Mode — Full screen white paper */
        <div className="flex-1 overflow-y-auto bg-slate-200/60 dark:bg-zinc-800/60 p-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto mb-4">
            <p className="text-xs text-muted uppercase tracking-widest font-semibold">
              Preview — {TEMPLATES.find(t => t.id === template)?.name} Template
            </p>
            <button onClick={() => setShowPreview(false)} className="flex items-center gap-1.5 text-xs text-muted hover:text-primary px-3 py-1.5 rounded-lg border border-theme-subtle hover:bg-surface transition-colors">
              <X size={12} /> Close Preview
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-3xl mx-auto text-black">
            <InvoicePreview {...previewProps} />
          </div>
        </div>
      ) : (
        /* Builder Mode — Full-width like QuotationBuilder */
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Row 1 — Bill To + Invoice Details (side by side, full width) */}
          <div className="grid grid-cols-3 gap-5">
            {/* Bill To */}
            <GlassCard className="col-span-2 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Building2 size={16} className="text-blue-500" /> Bill To — Customer
                </h2>
                <button type="button" onClick={() => navigate('/crm/customers')} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 border border-blue-500/30 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">
                  <Plus size={10} /> Add New Customer
                </button>
              </div>

              {/* Search row */}
              <div className="mb-3">
                <label className="block text-[10px] font-bold text-muted uppercase mb-1.5">Select Customer</label>
                <SearchableSelect value={customerId} onChange={setCustomerId} options={customerOptions} placeholder="Search customer…" />
              </div>

              {/* Customer detail card — only shown when selected */}
              {selectedCustomer && (
                <div className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-black text-sm">{(selectedCustomer.company || selectedCustomer.name || '?')[0].toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{selectedCustomer.company || selectedCustomer.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      {selectedCustomer.name && selectedCustomer.company && (
                        <span className="text-[10px] text-muted">{selectedCustomer.name}</span>
                      )}
                      {selectedCustomer.email && (
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Mail size={9} className="text-blue-400" />{selectedCustomer.email}
                        </span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Phone size={9} className="text-blue-400" />{selectedCustomer.phone}
                        </span>
                      )}
                      {Number(selectedCustomer.creditDays) > 0 && (
                        <span className="text-[10px] text-emerald-500 font-semibold">Net {selectedCustomer.creditDays} Days</span>
                      )}
                    </div>
                  </div>
                  {/* VAT field */}
                  <div className="flex-shrink-0 w-44">
                    <label className="text-[9px] font-bold text-muted uppercase block mb-1">Purchaser VAT / TIN</label>
                    <input
                      type="text"
                      value={customerVat}
                      onChange={e => setCustomerVat(e.target.value)}
                      placeholder="VAT number…"
                      className="w-full bg-surface border border-theme-subtle px-2 py-1.5 rounded-md text-xs outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Warnings */}
              {(selectedCustomer?.requiresAdvance || creditWarning) && (
                <div className="mt-2 space-y-1.5">
                  {selectedCustomer?.requiresAdvance && (
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-xs">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <span><strong>Advance Payment Required</strong> — Collect upfront before processing.</span>
                    </div>
                  )}
                  {creditWarning && (
                    <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>⚠ Exceeds credit limit of {formatCurrency(selectedCustomer!.creditLimit)}.</span>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>

            {/* Invoice Details */}
            <GlassCard className="p-4 flex flex-col">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-blue-500" /> Details & References
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Invoice Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Due Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={docInputClass} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Delivery Date</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Place of Supply</label>
                    <input type="text" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="e.g. Negombo" className={docInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-theme-subtle pt-2 mt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Quotation No</label>
                    <input type="text" value={quotationNo} onChange={e => setQuotationNo(e.target.value)} placeholder="AHSQ-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Dispatch No</label>
                    <input type="text" value={dispatchNo} onChange={e => setDispatchNo(e.target.value)} placeholder="DN-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">Order No (SO)</label>
                    <input type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="SO-..." className={docInputClass} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted uppercase mb-1">PO No</label>
                    <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="PO-..." className={docInputClass} />
                  </div>
                </div>

                <div className="border-t border-theme-subtle pt-2 mt-1">
                  <label className="block text-[10px] font-bold text-muted uppercase mb-1">Notes / Terms</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${docInputClass} resize-none`} placeholder="Payment terms, delivery, etc." />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Row 2 — Line Items (full width) */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-theme-subtle flex items-center justify-between bg-surface/40">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <FileText size={16} className="text-blue-500" /> Line Items
              </h2>
              <span className="text-[10px] font-mono text-muted">{items.length} line{items.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-subtle bg-surface2/30">
                    <th className="px-5 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-8">#</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-52">Product / Service</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider">Description</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-20 text-center">Qty</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-32">Unit Price (Rs)</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-32">Tax</th>
                    <th className="px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider text-right w-32">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lineAmt = item.qty * item.unitPrice;
                    const lineTax = lineAmt * (getTaxRate(item.taxRateId) / 100);
                    return (
                      <tr key={item.id} className={`border-b border-theme-subtle last:border-0 group hover:bg-surface2/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-surface2/10'}`}>
                        <td className="px-5 py-2 text-[10px] text-muted font-mono">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <SearchableSelect value={item.inventoryId} onChange={val => handleChangeItem(item.id, 'inventoryId', val)} options={itemOptions} placeholder="Select or skip..." className="text-xs" />
                        </td>
                        <td className="px-2 py-2">
                          <textarea value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} placeholder="Description…\n(Multiple lines allowed)" className={`${tableInputClass} resize-none overflow-hidden min-h-[40px] leading-relaxed`} rows={2} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="1" value={item.qty} onChange={e => handleChangeItem(item.id, 'qty', Number(e.target.value))} className={`${tableInputClass} text-center`} />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => handleChangeItem(item.id, 'unitPrice', Number(e.target.value))} className={`${tableInputClass} font-mono`} />
                        </td>
                        <td className="px-2 py-2">
                          <select value={item.taxRateId} onChange={e => handleChangeItem(item.id, 'taxRateId', e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-blue-500 px-2 py-1 text-xs outline-none transition-all">
                            <option value="">No Tax</option>
                            {taxRates.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right text-xs font-mono font-semibold text-primary">{formatCurrency(lineAmt + lineTax)}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleRemoveItem(item.id)} disabled={items.length === 1} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-20 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-theme-subtle flex items-center justify-between">
              <Button variant="ghost" size="sm" icon={Plus} onClick={handleAddItem} className="text-blue-500 border-blue-500/30 hover:bg-blue-500/10 text-xs">
                Add Line Item
              </Button>
              <div className="text-[10px] text-muted">
                Tab through cells to navigate quickly
              </div>
            </div>
          </GlassCard>

          {/* Row 3 — Totals Summary (right-aligned wide card) */}
          <div className="flex justify-end">
            <GlassCard className="p-6 bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20 w-96">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 mb-5">
                <Calculator size={16} /> Invoice Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(subtotal)}</span>
                </div>
                {selectedProfile?.tax2_name ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{selectedProfile.tax1_name}</span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(ssclAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{selectedProfile.tax2_name}</span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(vatAmount)}</span>
                    </div>
                  </>
                ) : taxType !== 'none' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">{selectedProfile?.tax1_name || 'Tax'}</span>
                    <span className="font-mono text-sm text-amber-500">{formatCurrency(taxAmount)}</span>
                  </div>
                ) : null}
                <div className="pt-4 border-t border-blue-500/30 flex justify-between items-center">
                  <span className="text-base font-black text-primary uppercase tracking-wide">Grand Total</span>
                  <span className="text-3xl font-black text-blue-600 font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            </GlassCard>
          </div>

        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && <TemplatePicker current={template} onChange={setTemplate} onClose={() => setShowTemplatePicker(false)} />}
    </div>
  );
};
