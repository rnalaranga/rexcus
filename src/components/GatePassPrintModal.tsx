import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GatePassPrintView } from './GatePassPrintView';
import { printElement } from '@/lib/printElement';
import { exportPdf } from '@/lib/exportPdf';

interface GatePassPrintModalProps {
  gatePass: any | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const GatePassPrintModal: React.FC<GatePassPrintModalProps> = ({
  gatePass,
  isOpen,
  onClose,
  settings
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !gatePass) return null;

  const gpNum = gatePass.id || gatePass.gatePassNo || 'GP';

  const handlePrint = () => {
    printElement('gatepass-print-section', `Gate_Pass_${gpNum}`);
  };

  const handleDownloadPDF = async () => {
    await exportPdf('gatepass-print-section', `Gate_Pass_${gpNum}.pdf`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-surface border border-theme shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface2 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Truck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-primary tracking-tight">
                  Security Gate Pass / Goods Dispatch Note
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-semibold uppercase">
                  {gpNum}
                </span>
                {gatePass.orderNo && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/30">
                    SO: {gatePass.orderNo}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                {gatePass.customerName || gatePass.customerCompany || 'Consignee'} &bull; Carrier: {gatePass.carrier || 'Hand Delivery'} {gatePass.vehicleNo ? `(${gatePass.vehicleNo})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="text-xs font-bold"
            >
              Print Gate Pass
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadPDF}
              className="text-xs"
            >
              Download PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted hover:text-primary hover:bg-surface3 transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Document Scroll Preview */}
        <div className="flex-1 bg-[#525659] p-4 sm:p-8 overflow-y-auto flex justify-center custom-scrollbar">
          <div ref={printRef} className="shadow-2xl bg-white">
            <GatePassPrintView gatePass={gatePass} settings={settings} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
