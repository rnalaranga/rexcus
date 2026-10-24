import React, { useRef } from 'react';
import { Printer, Download, X, FileText, ExternalLink, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoicePreview } from '@/components/finance/InvoicePreview';
import { useTaxProfiles } from '@/hooks/useFinance';
import { formatCurrency, formatDate } from '@/lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Props {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const ProformaInvoicePrintModal: React.FC<Props> = ({
  invoice,
  isOpen,
  onClose,
  settings
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: taxProfiles = [] } = useTaxProfiles();

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const opt: any = {
      margin: 10,
      filename: `Proforma_Invoice_${invoice.invoiceNo || invoice.id || 'PI'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printRef.current).save();
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
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
                Total: {formatCurrency(Number(invoice.total || invoice.amount || 0))} • Date: {formatDate(invoice.date)}
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
              date={invoice.date}
              deliveryDate={invoice.deliveryDate || invoice.date}
              placeOfSupply={invoice.placeOfSupply || ''}
              additionalInfo={invoice.additionalInfo || ''}
              quotationNo={invoice.quotationNo || ''}
              orderNo={invoice.orderNo || ''}
              customer={{
                name: invoice.customerName || invoice.customer || '',
                company: invoice.customerCompany || invoice.customerName || invoice.customer || '',
                address: invoice.deliveryAddress || invoice.customerAddress || '',
                phone: invoice.customerPhone || '',
                email: invoice.customerEmail || '',
                vat: invoice.customerVat || ''
              }}
              customerVat={invoice.customerVat || ''}
              items={items}
              subtotal={Number(invoice.subtotal || invoice.amount || invoice.total || 0)}
              taxAmount={Number(invoice.taxAmount || 0)}
              total={Number(invoice.total || invoice.amount || 0)}
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
  );
};
