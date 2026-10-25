import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, CheckCircle2, Clock, AlertTriangle, ArrowRight, ExternalLink, 
  FileText, ShoppingBag, Receipt, Factory, Truck, DollarSign, Eye, 
  AlertCircle, ChevronRight, Layers, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

export interface QuotationStageSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  quotation: any;
  linkedOrder?: any;
  linkedWorkOrder?: any;
  linkedInvoice?: any;
  sampleGrns?: any[];
  totalAdvance?: number;
  latestReceipt?: any;
  onCreateSalesOrder?: () => void;
  onCreateWorkOrder?: () => void;
  onCreateInvoice?: () => void;
  onIssueReceipt?: () => void;
  onPreviewPdf?: () => void;
}

export const QuotationStageSnapshotModal: React.FC<QuotationStageSnapshotModalProps> = ({
  isOpen,
  onClose,
  group,
  quotation,
  linkedOrder,
  linkedWorkOrder,
  linkedInvoice,
  sampleGrns = [],
  totalAdvance = 0,
  latestReceipt,
  onCreateSalesOrder,
  onCreateWorkOrder,
  onCreateInvoice,
  onIssueReceipt,
  onPreviewPdf
}) => {
  const navigate = useNavigate();

  if (!isOpen || !quotation) return null;

  const quoNo = group?.quoNo || quotation.quotationNo || quotation.id;
  const customerName = group?.leadCompany || group?.leadName || quotation.customer || 'Customer';
  const totalAmount = Number(quotation.totalAmount || quotation.customAmount || 0);

  // Material Change / Alert check
  const materialAlert = 
    linkedWorkOrder?.materialAlert || 
    quotation.materialAlert || 
    linkedWorkOrder?.materialStatus || 
    quotation.materialStatus || 
    null;

  const hasMaterialChange = Boolean(
    (quotation.materialStatus && (
      quotation.materialStatus.toLowerCase().includes('substitut') ||
      quotation.materialStatus.toLowerCase().includes('change') ||
      quotation.materialStatus.toLowerCase().includes('shortage')
    )) ||
    (linkedWorkOrder?.materialStatus && (
      linkedWorkOrder.materialStatus.toLowerCase().includes('substitut') ||
      linkedWorkOrder.materialStatus.toLowerCase().includes('change') ||
      linkedWorkOrder.materialStatus.toLowerCase().includes('shortage')
    )) ||
    quotation.materialAlert ||
    linkedWorkOrder?.materialAlert
  );

  // Determine stage statuses
  // Stage 1: Quotation
  const stage1Status = quotation.status || 'Draft';
  const isStage1Complete = ['Approved', 'Accepted', 'Sent', 'In Production', 'Won', 'Completed'].includes(stage1Status);

  // Stage 2: Sales Order
  const isStage2Complete = Boolean(linkedOrder);

  // Stage 3: Advance Proforma / Receipt
  const isStage3Complete = Boolean(totalAdvance > 0 || (latestReceipt && latestReceipt.amount > 0));

  // Stage 4: Work Order (BOM & Routing)
  const isStage4Exists = Boolean(linkedWorkOrder);
  const isStage4Complete = linkedWorkOrder && (linkedWorkOrder.status === 'Completed' || linkedWorkOrder.status === 'Closed');

  // Stage 5: Partial / Full Dispatch (DN)
  const jobQty = Number(linkedWorkOrder?.jobQty || 1);
  const dispatchedQty = Number(linkedWorkOrder?.dispatchedQty || 0);
  const isStage5Started = dispatchedQty > 0;
  const isStage5Complete = dispatchedQty >= jobQty && jobQty > 0;

  // Stage 6: Final Tax Invoice
  const isStage6Exists = Boolean(linkedInvoice);
  const isStage6Complete = linkedInvoice && (linkedInvoice.status === 'paid' || linkedInvoice.status === 'Paid');

  // Compute Overall Active Stage Number (1-6)
  let currentStageNumber: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  let currentStageTitle = 'Quotation Review & Costing';

  if (isStage6Complete) {
    currentStageNumber = 6;
    currentStageTitle = 'Stage 6: Final Tax Invoice (Paid in Full)';
  } else if (isStage6Exists) {
    currentStageNumber = 6;
    currentStageTitle = 'Stage 6: Final Tax Invoice (Awaiting Payment)';
  } else if (isStage5Complete) {
    currentStageNumber = 5;
    currentStageTitle = 'Stage 5: Fully Dispatched (Awaiting Final Invoice)';
  } else if (isStage5Started) {
    currentStageNumber = 5;
    currentStageTitle = `Stage 5: Partial Dispatch (${dispatchedQty}/${jobQty} pcs Dispatched)`;
  } else if (isStage4Complete) {
    currentStageNumber = 4;
    currentStageTitle = 'Stage 4: Work Order Completed (Ready for Dispatch)';
  } else if (isStage4Exists) {
    currentStageNumber = 4;
    currentStageTitle = `Stage 4: Work Order in Production (${linkedWorkOrder?.status || 'In Progress'})`;
  } else if (isStage3Complete) {
    currentStageNumber = 3;
    currentStageTitle = 'Stage 3: Advance Payment Received (Ready for Work Order)';
  } else if (isStage2Complete) {
    currentStageNumber = 2;
    currentStageTitle = 'Stage 2: Sales Order Confirmed';
  } else {
    currentStageNumber = 1;
    currentStageTitle = `Stage 1: Quotation (${stage1Status})`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ice-blur bg-white/50 dark:bg-white/12 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface border border-theme-subtle shadow-2xl rounded-none overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-surface2/80 border-b border-theme-subtle flex items-start justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-surface text-primary border border-theme-subtle">
                #{quoNo}
              </span>
              <h3 className="text-base font-bold text-primary">
                Commercial & Production Lifecycle Snapshot
              </h3>
              <Badge variant="outline" className="text-xs font-mono font-bold border-theme-subtle">
                {currentStageTitle}
              </Badge>
            </div>
            <p className="text-xs text-secondary">
              Client: <strong className="text-primary">{customerName}</strong> • Quoted Value: <strong className="text-emerald-600 font-mono">{formatCurrency(totalAmount)}</strong> • Date: <span className="font-mono text-muted">{new Date(quotation.createdAt || Date.now()).toLocaleDateString()}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface2 transition-colors rounded-none"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* MATERIAL CHANGE ALERT BANNER IF APPLICABLE */}
        {hasMaterialChange && (
          <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/30 flex items-start gap-2.5">
            <div className="p-1 bg-rose-500 text-white rounded-none shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle size={14} />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[11px]">
                  Workshop Material Change / Substitution Active
                </span>
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
              </div>
              <p className="text-rose-700 dark:text-rose-300">
                {materialAlert || 'Alternative material or spec was substituted in the Work Order. Please review internal costing and stock issue.'}
              </p>
            </div>
          </div>
        )}

        {/* 6-STAGE WORKFLOW LIFECYCLE PROGRESS BAR */}
        <div className="px-5 py-3.5 bg-surface border-b border-theme-subtle shrink-0">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-muted mb-2">
            <span>6-Stage Core Workflow Progress</span>
            <span className="font-bold text-primary">Stage {currentStageNumber} of 6</span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {[
              { id: 1, label: 'Quotation', active: currentStageNumber >= 1, done: isStage1Complete },
              { id: 2, label: 'Sales Order', active: currentStageNumber >= 2, done: isStage2Complete },
              { id: 3, label: 'Advance', active: currentStageNumber >= 3, done: isStage3Complete },
              { id: 4, label: 'Work Order', active: currentStageNumber >= 4, done: isStage4Complete },
              { id: 5, label: 'Dispatch (DN)', active: currentStageNumber >= 5, done: isStage5Complete },
              { id: 6, label: 'Tax Invoice', active: currentStageNumber >= 6, done: isStage6Complete }
            ].map(stage => {
              const isCurrent = stage.id === currentStageNumber;
              return (
                <div key={stage.id} className="space-y-1">
                  <div className={`h-2 rounded-none transition-all ${
                    stage.done 
                      ? 'bg-emerald-600 dark:bg-emerald-500' 
                      : (isCurrent ? 'bg-primary ring-2 ring-primary/30 animate-pulse' : 'bg-surface2 border border-theme-subtle')
                  }`} />
                  <span className={`block text-[10px] truncate ${
                    isCurrent ? 'font-bold text-primary' : (stage.done ? 'text-secondary font-medium' : 'text-muted')
                  }`}>
                    {stage.id}. {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DETAILED CARDS FOR ALL 6 STAGES (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar">
          
          {/* STAGE 1: QUOTATION */}
          <div className={`p-3.5 border transition-all ${
            currentStageNumber === 1 ? 'border-primary/50 bg-primary/5' : 'border-theme-subtle bg-surface'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-none ${
                  isStage1Complete ? 'bg-emerald-600 text-white' : 'bg-surface2 text-primary border border-theme-subtle'
                }`}>
                  1
                </span>
                <div>
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    Stage 1: Quotation (QT)
                    <Badge variant={isStage1Complete ? 'outline' : 'secondary'} className="text-[10px] font-mono">
                      {stage1Status}
                    </Badge>
                  </h4>
                  <span className="text-[11px] text-muted">
                    Quotation No: <strong className="font-mono text-primary">{quoNo}</strong> • Value: <strong className="font-mono text-emerald-600">{formatCurrency(totalAmount)}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onPreviewPdf && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onPreviewPdf}
                    className="h-7 text-xs px-2.5 border-theme-subtle flex items-center gap-1"
                  >
                    <Eye size={12} />
                    <span>View PDF</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    navigate(`/crm/quotations/new/${group?.leadId}?quoteId=${quotation.id}`);
                  }}
                  className="h-7 text-xs px-2.5 border-theme-subtle"
                >
                  Edit in Builder
                </Button>
              </div>
            </div>
          </div>

          {/* STAGE 2: SALES ORDER */}
          <div className={`p-3.5 border transition-all ${
            currentStageNumber === 2 ? 'border-primary/50 bg-primary/5' : 'border-theme-subtle bg-surface'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-none ${
                  isStage2Complete ? 'bg-emerald-600 text-white' : 'bg-surface2 text-muted border border-theme-subtle'
                }`}>
                  2
                </span>
                <div>
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    Stage 2: Sales Order (SO)
                    {isStage2Complete ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-mono">
                        {linkedOrder.status || 'Confirmed'}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted uppercase font-mono">Pending Creation</span>
                    )}
                  </h4>
                  <span className="text-[11px] text-muted">
                    {isStage2Complete ? (
                      <>Order No: <strong className="font-mono text-primary">{linkedOrder.orderNo}</strong> • Date: <span className="font-mono">{new Date(linkedOrder.orderDate || linkedOrder.createdAt).toLocaleDateString()}</span></>
                    ) : (
                      'No Sales Order confirmed yet for this commercial quotation.'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isStage2Complete ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      navigate('/crm/sales-orders');
                    }}
                    className="h-7 text-xs px-2.5 border-theme-subtle flex items-center gap-1"
                  >
                    <ShoppingBag size={12} />
                    <span>View Sales Orders</span>
                  </Button>
                ) : (
                  onCreateSalesOrder && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onClose();
                        onCreateSalesOrder();
                      }}
                      className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1"
                    >
                      <ShoppingBag size={12} />
                      <span>Create Sales Order</span>
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* STAGE 3: ADVANCE PROFORMA / RECEIPT */}
          <div className={`p-3.5 border transition-all ${
            currentStageNumber === 3 ? 'border-primary/50 bg-primary/5' : 'border-theme-subtle bg-surface'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-none ${
                  isStage3Complete ? 'bg-emerald-600 text-white' : 'bg-surface2 text-muted border border-theme-subtle'
                }`}>
                  3
                </span>
                <div>
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    Stage 3: Advance Proforma (Advance)
                    {isStage3Complete ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-mono">
                        Received ({formatCurrency(totalAdvance)})
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted uppercase font-mono">Advance Pending</span>
                    )}
                  </h4>
                  <span className="text-[11px] text-muted">
                    {isStage3Complete ? (
                      <>Receipt Ref: <strong className="font-mono text-primary">{latestReceipt?.receiptNo || 'Payment Receipt'}</strong> • Total Advance: <strong className="font-mono text-emerald-600">{formatCurrency(totalAdvance)}</strong></>
                    ) : (
                      'Advance payment receipt not yet logged against this quotation.'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onIssueReceipt && (
                  <Button
                    size="sm"
                    variant={isStage3Complete ? 'outline' : 'primary'}
                    onClick={() => {
                      onClose();
                      onIssueReceipt();
                    }}
                    className={`h-7 text-xs px-2.5 flex items-center gap-1 ${
                      !isStage3Complete ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : 'border-theme-subtle'
                    }`}
                  >
                    <Receipt size={12} />
                    <span>{isStage3Complete ? 'Issue Another Receipt' : 'Issue Advance Receipt'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* STAGE 4: WORK ORDER (BOM & ROUTING) */}
          <div className={`p-3.5 border transition-all ${
            currentStageNumber === 4 ? 'border-primary/50 bg-primary/5' : 'border-theme-subtle bg-surface'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-none shrink-0 mt-0.5 ${
                  isStage4Complete 
                    ? 'bg-emerald-600 text-white' 
                    : (isStage4Exists ? 'bg-indigo-600 text-white' : 'bg-surface2 text-muted border border-theme-subtle')
                }`}>
                  4
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-primary">
                      Stage 4: Work Order (BOM & Sequential Routing)
                    </h4>
                    {isStage4Exists ? (
                      <Badge variant="outline" className={`text-[10px] font-mono ${
                        isStage4Complete ? 'text-emerald-600 border-emerald-500/30' : 'text-indigo-600 border-indigo-500/30'
                      }`}>
                        {linkedWorkOrder.status || 'In Production'}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted uppercase font-mono">Work Order Pending</span>
                    )}

                    {hasMaterialChange && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Material Substituted
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted">
                    {isStage4Exists ? (
                      <>
                        WO: <strong className="font-mono text-primary">{linkedWorkOrder.orderNo || linkedWorkOrder.id}</strong> • Job Qty: <strong className="font-mono">{jobQty} pcs</strong> • Progress: <strong className="font-mono">{linkedWorkOrder.progress || 0}%</strong>
                        {hasMaterialChange && (
                          <span className="block mt-1 text-rose-600 dark:text-rose-400 font-medium">
                            Alert: {materialAlert}
                          </span>
                        )}
                      </>
                    ) : (
                      'Production Work Order has not been dispatched to shop floor yet.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isStage4Exists ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      navigate(`/production/work-orders/${linkedWorkOrder.id}`);
                    }}
                    className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Factory size={12} />
                    <span>Open Work Order</span>
                  </Button>
                ) : (
                  onCreateWorkOrder && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onClose();
                        onCreateWorkOrder();
                      }}
                      className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1"
                    >
                      <Factory size={12} />
                      <span>Create Work Order</span>
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* STAGE 5: PARTIAL / FULL DISPATCH (DN) */}
          <div className={`p-3.5 border transition-all ${
            currentStageNumber === 5 ? 'border-primary/50 bg-primary/5' : 'border-theme-subtle bg-surface'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-none ${
                  isStage5Complete 
                    ? 'bg-emerald-600 text-white' 
                    : (isStage5Started ? 'bg-amber-500 text-white' : 'bg-surface2 text-muted border border-theme-subtle')
                }`}>
                  5
                </span>
                <div>
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    Stage 5: Partial / Full Dispatch (Delivery Notes)
                    {isStage5Complete ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-mono">
                        100% Dispatched
                      </Badge>
                    ) : isStage5Started ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 font-mono">
                        Partial ({dispatchedQty}/{jobQty} pcs)
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted uppercase font-mono">Pending Delivery</span>
                    )}
                  </h4>
                  <span className="text-[11px] text-muted">
                    {isStage5Started ? (
                      <>Dispatched: <strong className="font-mono text-primary">{dispatchedQty} / {jobQty} pcs</strong> • Remaining: <strong className="font-mono text-amber-600">{Math.max(0, jobQty - dispatchedQty)} pcs</strong></>
                    ) : (
                      'No Delivery Notes (DN) recorded yet for this manufacturing order.'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isStage4Exists && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      navigate(`/production/work-orders/${linkedWorkOrder.id}?tab=dispatches`);
                    }}
                    className="h-7 text-xs px-2.5 border-theme-subtle flex items-center gap-1"
                  >
                    <Truck size={12} />
                    <span>View Dispatches</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* STAGE 6: FINAL TAX INVOICE */}
          <div className={`p-3.5 border transition-all ${
            currentStageNumber === 6 ? 'border-primary/50 bg-primary/5' : 'border-theme-subtle bg-surface'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded-none ${
                  isStage6Complete 
                    ? 'bg-emerald-600 text-white' 
                    : (isStage6Exists ? 'bg-amber-500 text-white' : 'bg-surface2 text-muted border border-theme-subtle')
                }`}>
                  6
                </span>
                <div>
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    Stage 6: Final Tax Invoice & Settlement
                    {isStage6Complete ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-mono">
                        Paid in Full
                      </Badge>
                    ) : isStage6Exists ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 font-mono">
                        Invoice Issued ({linkedInvoice.status || 'Unpaid'})
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted uppercase font-mono">Invoice Pending</span>
                    )}
                  </h4>
                  <span className="text-[11px] text-muted">
                    {isStage6Exists ? (
                      <>Invoice No: <strong className="font-mono text-primary">{linkedInvoice.invoiceNo || linkedInvoice.id}</strong> • Total: <strong className="font-mono text-emerald-600">{formatCurrency(linkedInvoice.totalAmount || linkedInvoice.amount || totalAmount)}</strong></>
                    ) : (
                      'Final Tax Invoice will be generated upon dispatch completion.'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isStage6Exists ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClose();
                      navigate(`/finance/invoices?search=${encodeURIComponent(linkedInvoice.invoiceNo || linkedInvoice.id)}`);
                    }}
                    className="h-7 text-xs px-2.5 border-theme-subtle flex items-center gap-1"
                  >
                    <FileText size={12} />
                    <span>View Invoice</span>
                  </Button>
                ) : (
                  onCreateInvoice && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onCreateInvoice();
                      }}
                      className="h-7 text-xs px-2.5 border-theme-subtle text-emerald-600 flex items-center gap-1 font-bold"
                    >
                      <DollarSign size={12} />
                      <span>Generate Invoice</span>
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-surface2/70 border-t border-theme-subtle flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" />
            <span>Interactive 6-Stage Core Workflow Pipeline Snapshot</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs px-4 border-theme-subtle"
          >
            Close
          </Button>
        </div>

      </div>
    </div>
  );
};
