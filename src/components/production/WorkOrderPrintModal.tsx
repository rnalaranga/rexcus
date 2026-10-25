import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X, FileText, Factory } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WorkOrderPrintView } from './WorkOrderPrintView';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface WorkOrderPrintModalProps {
  workOrder: any | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: any;
}

export const WorkOrderPrintModal: React.FC<WorkOrderPrintModalProps> = ({
  workOrder,
  isOpen,
  onClose,
  settings
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !workOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const el = document.getElementById('work-order-print-section');
    if (!el) return;
    const opt: any = {
      margin: [5, 5, 5, 5],
      filename: `Job_Traveler_${workOrder.id || 'WO'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-surface border border-theme shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-theme-subtle bg-surface2 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Factory size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-primary tracking-tight">
                  Shop-Floor Job Traveler &amp; Routing Card
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-rex-500/10 text-rex-500 border border-rex-500/30 font-semibold uppercase">
                  {workOrder.id}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                {workOrder.productName || workOrder.partName || 'Work Order'} &bull; Qty: {workOrder.quantity || workOrder.qty || 1} {workOrder.uom || 'Nos'}
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
              Print Job Traveler
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
            <WorkOrderPrintView workOrder={workOrder} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  ,
    document.body
  );
};
