import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, FileText, ExternalLink, Calendar, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoicePreview } from '@/components/finance/InvoicePreview';
import { useTaxProfiles } from '@/hooks/useFinance';
import { useCustomers, useLeads } from '@/hooks/useData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { printElement } from '@/lib/printElement';
import { exportPdf } from '@/lib/exportPdf';

interface Props {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
  order?: any;
  onDelete?: (invoice: any) => void;
}

export const ProformaInvoicePrintModal: React.FC<Props> = ({
  invoice,
  isOpen,
  onClose,
  settings,
  order,
  onDelete
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: taxProfiles = [] } = useTaxProfiles();
  const { data: allCustomers = [] } = useCustomers();
  const { data: allLeads = [] } = useLeads();

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    printElement('invoice-preview', `Proforma_Invoice_${invoice.invoiceNo || invoice.id || 'PI'}`);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    await exportPdf(printRef.current, `Proforma_Invoice_${invoice.invoiceNo || invoice.id || 'PI'}.pdf`);
  };

  // Resolve numeric values safely
  const invoiceSubtotal = Number(invoice.subtotal || invoice.amount || invoice.total || 0);
  const invoiceTaxAmount = Number(invoice.taxAmount || 0);
  const invoiceTotal = Number(invoice.total || (invoiceSubtotal + invoiceTaxAmount) || invoice.amount || 0);
  const invoiceDate = invoice.date || invoice.createdAt || new Date().toISOString().slice(0, 10);
  const deliveryDate = invoice.deliveryDate || invoiceDate;

  // Match customer for reliable fallback
  const matchedCust = allCustomers.find((c: any) => c.id === invoice.customerId || c.id === invoice.leadId) ||
                      allLeads.find((l: any) => l.id === invoice.customerId || l.id === invoice.leadId);

  const customerData = {
    name: invoice.customer?.name || invoice.customerName || invoice.customer || invoice.customerCompany || matchedCust?.name || 'Valued Customer',
    company: invoice.customer?.company || invoice.customerCompany || invoice.customerName || invoice.customer || matchedCust?.company || matchedCust?.name || '',
    address: invoice.customer?.address || invoice.customerAddress || invoice.deliveryAddress || matchedCust?.address || '',
    phone: invoice.customer?.phone || invoice.customerPhone || matchedCust?.phone || '',
    email: invoice.customer?.email || invoice.customerEmail || matchedCust?.email || '',
    vat: invoice.customer?.vat || invoice.customerVat || matchedCust?.vat || matchedCust?.tin || ''
  };

  // Parse items safely
  let items: any[] = [];
  if (Array.isArray(invoice.items)) {
    items = invoice.items;
  } else if (typeof invoice.items === 'string') {
    try {
      items = JSON.parse(invoice.items);
    } catch (e) {
      items = [];
    }
  }

  // If items is empty but invoice has value, generate advance deposit line item
  if (items.length === 0 && (invoiceSubtotal > 0 || invoiceTotal > 0)) {
    const advLineAmount = invoiceSubtotal > 0 ? invoiceSubtotal : invoiceTotal;
    const desc = invoice.productName ? `Advance Deposit Payment - ${invoice.productName}` : `Advance Deposit Payment - Sales Order #${invoice.orderNo || ''}`;
    const spec = invoice.productSku ? `SKU: ${invoice.productSku}` : (invoice.notes || 'Advance payment for manufacturing commencement');
    items = [
      {
        id: 'item-adv-1',
        reference: 'ADV-1',
        description: desc,
        details: spec ? `Item Specification & Scope:\n${spec}` : '',
        specifications: spec,
        qty: 1,
        unitPrice: advLineAmount,
        amount: advLineAmount
      }
    ];
  }

  // Parse bank details safely
  let bankDetails: any = null;
  if (invoice.bankDetails) {
    if (typeof invoice.bankDetails === 'object') {
      bankDetails = invoice.bankDetails;
    } else if (typeof invoice.bankDetails === 'string') {
      try {
        bankDetails = JSON.parse(invoice.bankDetails);
      } catch (e) {}
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="bg-surface border border-theme-subtle rounded-none shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-3.5 bg-surface2/70 border-b border-theme-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-primary tracking-tight">
                  Proforma Invoice {invoice.invoiceNo || invoice.id}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold uppercase">
                  Advance PI
                </span>
              </div>
              <p className="text-[11px] text-muted font-mono mt-0.5">
                Total: {formatCurrency(invoiceTotal)} • Date: {formatDate(invoiceDate)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="h-7 text-xs px-2.5 rounded-none"
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadPDF}
              className="h-7 text-xs px-2.5 rounded-none"
            >
              Download PDF
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                onClick={() => onDelete(invoice)}
                className="h-7 text-xs px-2.5 rounded-none text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                title="Delete Proforma Invoice"
              >
                Delete PI
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface3 rounded-none transition-colors ml-1"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Preview Scroll Area */}
        <div className="flex-1 bg-[#525659] p-4 sm:p-8 overflow-y-auto flex justify-center custom-scrollbar">
          <div ref={printRef} className="shadow-2xl bg-white">
            <InvoicePreview
              isProforma={true}
              invoiceType="proforma"
              docTitle="PROFORMA INVOICE"
              docNo={invoice.invoiceNo || invoice.id}
              date={invoiceDate}
              deliveryDate={deliveryDate}
              placeOfSupply={invoice.placeOfSupply || 'Negombo, Sri Lanka'}
              paymentTerms={invoice.paymentTerms || `Advance Deposit (${invoice.advancePercent || 30}%) - ${invoice.modeOfPayment || 'Bank Wire / TT'}`}
              additionalInfo={(invoice.additionalInfo && !String(invoice.additionalInfo).trim().startsWith('{')) ? invoice.additionalInfo : ''}
              quotationNo={invoice.quotationNo || ''}
              orderNo={invoice.orderNo || ''}
              customer={customerData}
              customerVat={customerData.vat || invoice.customerVat || ''}
              items={items}
              subtotal={invoiceSubtotal}
              taxAmount={invoiceTaxAmount}
              total={invoiceTotal}
              notes={invoice.notes || ''}
              company={settings}
              modeOfPayment={invoice.modeOfPayment || 'Bank Wire / TT'}
              attention={invoice.attention || ''}
              bankDetails={bankDetails}
              taxProfileId={invoice.taxProfileId}
              taxProfile={taxProfiles?.find((p: any) => p.id === invoice.taxProfileId)}
              taxBreakdown={invoice.taxBreakdown ? (typeof invoice.taxBreakdown === 'string' ? JSON.parse(invoice.taxBreakdown) : invoice.taxBreakdown) : null}
              taxType={invoice.taxType || (invoice.taxProfileId ? 'profile' : 'none')}
            />
          </div>
        </div>
      </div>
    </div>
  ,
    document.body
  );
};
