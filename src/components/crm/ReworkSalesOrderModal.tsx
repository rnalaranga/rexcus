import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  FileText,
  Calendar,
  Building,
  Package,
} from 'lucide-react';
import { createFinishedGoodsOrder, updateFinishedGoodsOrder } from '@/lib/api';
import { useTaxProfiles } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/utils';

export type ReworkBillingMode = 'tbd' | 'paid' | 'non_paid';

interface ReworkItemRow {
  id: string;
  selected: boolean;
  productId: string;
  productSku: string;
  description: string;
  originalQty: number;
  reworkQty: number;
  lineCost: number;
  uom: string;
}

interface ReworkSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceOrder: any | null;
  allOrders: any[];
  mode?: 'create' | 'update_billing';
  onSuccess: (createdOrUpdatedOrder?: any) => void;
}

const REWORK_REASON_PRESETS = [
  'Dimensional / Tolerance Adjustment',
  'Customer Design / Spec Change',
  'Welding / Fabrication Repair',
  'Machining / Thread / Bore Rework',
  'Surface Finish / Coating Issue',
  'Transit / Handling Damage',
  'Warranty / Fitment Issue',
];

/**
 * Extracts the core middle number from an existing Sales Order number:
 * - "SO-0000" -> "0000"
 * - "SO-1024" -> "1024"
 * - "SO-RE-0000-1" -> "0000"
 * - "SO-26-1005" -> "26-1005"
 */
export const extractBaseSoNumber = (rawOrderNo: string): string => {
  const clean = String(rawOrderNo || '').trim();
  // If already a rework SO-RE-<base>-<seq>
  const reworkMatch = clean.match(/^SO-RE-(.+)-(\d+)$/i);
  if (reworkMatch) {
    return reworkMatch[1];
  }
  // Standard SO-<base>
  const soMatch = clean.match(/^SO-(.+)$/i);
  if (soMatch) {
    return soMatch[1];
  }
  return clean || '0000';
};

/**
 * Generates the next sequential Rework SO number: SO-RE-<base>-1, SO-RE-<base>-2, ...
 */
export const generateNextReworkOrderNo = (sourceOrderNo: string, allOrders: any[]): string => {
  const baseNo = extractBaseSoNumber(sourceOrderNo);
  const prefix = `SO-RE-${baseNo}-`.toUpperCase();

  let maxSeq = 0;
  (allOrders || []).forEach((o: any) => {
    const oNo = String(o?.orderNo || '').trim().toUpperCase();
    if (oNo.startsWith(prefix)) {
      const tail = oNo.slice(prefix.length);
      const num = parseInt(tail, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  return `SO-RE-${baseNo}-${maxSeq + 1}`;
};

export const ReworkSalesOrderModal: React.FC<ReworkSalesOrderModalProps> = ({
  isOpen,
  onClose,
  sourceOrder,
  allOrders,
  mode = 'create',
  onSuccess,
}) => {
  const { data: taxProfiles = [] } = useTaxProfiles();
  const [reworkOrderNo, setReworkOrderNo] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  const [billingMode, setBillingMode] = useState<ReworkBillingMode>('tbd');
  const [taxProfileId, setTaxProfileId] = useState<string>('');
  const [reworkItemsList, setReworkItemsList] = useState<ReworkItemRow[]>([]);
  const [targetDeliveryDate, setTargetDeliveryDate] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currency = useMemo(() => {
    if (!sourceOrder) return 'LKR';
    return sourceOrder.currency || 'LKR';
  }, [sourceOrder]);

  useEffect(() => {
    if (!isOpen || !sourceOrder) return;
    setErrorMsg(null);

    let parsedItems: any[] = [];
    try {
      parsedItems =
        typeof sourceOrder.items === 'string'
          ? JSON.parse(sourceOrder.items || '[]')
          : Array.isArray(sourceOrder.items)
          ? sourceOrder.items
          : [];
    } catch {
      parsedItems = [];
    }

    const normalizedRows: ReworkItemRow[] =
      parsedItems.length > 0
        ? parsedItems.map((it: any, idx: number) => ({
            id: String(it.id || `rw-item-${idx}`),
            selected: true,
            productId: it.productId || it.inventoryId || sourceOrder.productId || 'REWORK-ITEM',
            productSku: it.productSku || it.sku || '',
            description:
              String(it.description || it.productName || sourceOrder.productName || 'Order Item')
                .replace(/^\[REWORK[^\]]*\]\s*/i, '')
                .trim(),
            originalQty: Number(it.qty || 1),
            reworkQty: Number(it.qty || 1),
            lineCost: mode === 'update_billing' ? Number(it.total || it.amount || 0) : 0,
            uom: it.uom || 'Nos',
          }))
        : [
            {
              id: 'rw-item-0',
              selected: true,
              productId: sourceOrder.productId || 'REWORK-ITEM',
              productSku: sourceOrder.productSku || '',
              description:
                String(sourceOrder.productName || 'Order Item')
                  .replace(/^\[REWORK[^\]]*\]\s*/i, '')
                  .trim(),
              originalQty: Number(sourceOrder.qty || 1),
              reworkQty: Number(sourceOrder.qty || 1),
              lineCost: mode === 'update_billing' ? Number(sourceOrder.subtotal || sourceOrder.totalPrice || 0) : 0,
              uom: 'Nos',
            },
          ];

    setReworkItemsList(normalizedRows);
    setTaxProfileId(sourceOrder.taxProfileId || '');

    if (mode === 'update_billing') {
      setReworkOrderNo(sourceOrder.orderNo || sourceOrder.id || '');
      setReworkReason(sourceOrder.reworkReason || '');
      const existingMode: ReworkBillingMode =
        sourceOrder.reworkBillingMode ||
        (Number(sourceOrder.totalPrice || 0) > 0 ? 'paid' : 'tbd');
      setBillingMode(existingMode);
      setTargetDeliveryDate(
        sourceOrder.targetDeliveryDate
          ? String(sourceOrder.targetDeliveryDate).slice(0, 10)
          : new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
      );
      setAdditionalNotes('');
    } else {
      const nextNo = generateNextReworkOrderNo(
        sourceOrder.orderNo || sourceOrder.id || 'SO-0000',
        allOrders
      );
      setReworkOrderNo(nextNo);
      setReworkReason('');
      setBillingMode('tbd');
      setTargetDeliveryDate(new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
      setAdditionalNotes('');
    }
  }, [isOpen, sourceOrder, allOrders, mode]);

  // Calculate Subtotal, VAT, SSCL & Grand Total from selected line items + Tax Profile
  const financialSummary = useMemo(() => {
    if (billingMode !== 'paid') {
      return { subtotal: 0, ssclAmount: 0, vatAmount: 0, taxAmount: 0, taxRate: 0, totalPrice: 0 };
    }
    const subtotal = reworkItemsList
      .filter((it) => it.selected)
      .reduce((s, it) => s + Math.max(0, Number(it.lineCost || 0)), 0);

    const profile = (taxProfiles || []).find((p: any) => p.id === taxProfileId);
    if (!profile) {
      return { subtotal, ssclAmount: 0, vatAmount: 0, taxAmount: 0, taxRate: 0, totalPrice: subtotal };
    }

    const ssclRate = Number(profile.ssclRate || 0);
    const vatRate = Number(profile.vatRate ?? profile.rate ?? 0);
    const ssclAmount = Number(((subtotal * ssclRate) / 100).toFixed(2));
    const vatBase = subtotal + ssclAmount;
    const vatAmount = Number(((vatBase * vatRate) / 100).toFixed(2));
    const taxAmount = Number((ssclAmount + vatAmount).toFixed(2));
    const totalPrice = Number((subtotal + taxAmount).toFixed(2));
    return {
      subtotal,
      ssclAmount,
      vatAmount,
      taxAmount,
      taxRate: ssclRate + vatRate,
      totalPrice,
    };
  }, [billingMode, reworkItemsList, taxProfiles, taxProfileId]);

  if (!sourceOrder) return null;

  const baseOrderNo =
    mode === 'update_billing'
      ? sourceOrder.parentOrderNo || `SO-${extractBaseSoNumber(sourceOrder.orderNo)}`
      : sourceOrder.orderNo || sourceOrder.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reworkReason.trim()) {
      setErrorMsg('Please enter the Rework Reason before saving.');
      return;
    }

    const selectedRows = reworkItemsList.filter((it) => it.selected && Number(it.reworkQty) > 0);
    if (selectedRows.length === 0) {
      setErrorMsg('Please select at least one item and enter a valid rework quantity.');
      return;
    }

    const numericSubtotal = financialSummary.subtotal;
    const numericTotal = financialSummary.totalPrice;

    setSubmitting(true);
    try {
      const billingBadgeText =
        billingMode === 'tbd'
          ? '[Rework Billing: To Be Decided Later]'
          : billingMode === 'non_paid'
          ? '[Rework Billing: Non-Paid / Free]'
          : `[Rework Billing: Paid - ${formatCurrency(numericTotal, false, currency)}]`;

      const totalReworkQty = selectedRows.reduce((s, it) => s + Math.max(1, Number(it.reworkQty || 1)), 0);
      const unitPriceVal =
        billingMode === 'paid' && totalReworkQty > 0
          ? Number((numericSubtotal / totalReworkQty).toFixed(2))
          : 0;

      const primaryProductName =
        selectedRows.length > 1
          ? `[REWORK] ${selectedRows[0].description} (+${selectedRows.length - 1} more)`
          : `[REWORK] ${selectedRows[0].description}`;

      const builtItems = selectedRows.map((it) => {
        const lineQty = Math.max(1, Number(it.reworkQty || 1));
        const lineTotal = billingMode === 'paid' ? Math.max(0, Number(it.lineCost || 0)) : 0;
        const lineUnitPrice = lineQty > 0 ? Number((lineTotal / lineQty).toFixed(2)) : 0;
        return {
          productId: it.productId || 'REWORK-ORDER',
          productName: `[REWORK] ${it.description}`,
          description: `[REWORK - ${baseOrderNo}] ${it.description}`,
          productSku: it.productSku || '',
          qty: lineQty,
          uom: it.uom || 'Nos',
          unitPrice: lineUnitPrice,
          total: lineTotal,
          amount: lineTotal,
        };
      });

      if (mode === 'update_billing') {
        const cleanPrevNotes = String(sourceOrder.notes || '')
          .replace(/\[Rework Billing:[^\]]*\]/gi, '')
          .trim();
        const combinedNotes = [
          billingBadgeText,
          `[Rework Reason: ${reworkReason.trim()}]`,
          additionalNotes.trim(),
          cleanPrevNotes,
        ]
          .filter(Boolean)
          .join('\n');

        await updateFinishedGoodsOrder(sourceOrder.id, {
          productName: primaryProductName,
          qty: totalReworkQty,
          unitPrice: unitPriceVal,
          subtotal: numericSubtotal,
          taxAmount: financialSummary.taxAmount,
          taxRate: financialSummary.taxRate,
          taxProfileId: billingMode === 'paid' ? (taxProfileId || null) : null,
          vatAmount: financialSummary.vatAmount,
          ssclAmount: financialSummary.ssclAmount,
          totalPrice: numericTotal,
          reworkReason: reworkReason.trim(),
          reworkBillingMode: billingMode,
          targetDeliveryDate: targetDeliveryDate || sourceOrder.targetDeliveryDate,
          items: builtItems,
          notes: combinedNotes,
        });

        onSuccess();
        onClose();
        return;
      }

      // CREATE NEW REWORK SALES ORDER
      const notesText = [
        `[REWORK ORDER from ${baseOrderNo}]`,
        billingBadgeText,
        `[Rework Reason: ${reworkReason.trim()}]`,
        additionalNotes.trim(),
      ]
        .filter(Boolean)
        .join('\n');

      const payload = {
        orderNo: reworkOrderNo.trim(),
        orderSource: 'custom_job',
        isRework: 1,
        parentOrderId: sourceOrder.id,
        parentOrderNo: baseOrderNo,
        reworkReason: reworkReason.trim(),
        reworkBillingMode: billingMode,
        quoteId: sourceOrder.quoteId || null,
        quotationNo: sourceOrder.quotationNo || null,
        productId: selectedRows[0].productId || sourceOrder.productId || 'REWORK-ORDER',
        productName: primaryProductName,
        productSku: selectedRows[0].productSku || sourceOrder.productSku || '',
        customerId: sourceOrder.customerId || null,
        customerName: sourceOrder.customerName || 'Customer',
        customerCompany: sourceOrder.customerCompany || sourceOrder.customerName || null,
        attention: sourceOrder.attention || null,
        customerPhone: sourceOrder.customerPhone || null,
        customerEmail: sourceOrder.customerEmail || null,
        deliveryAddress: sourceOrder.deliveryAddress || null,
        customerPoNo: sourceOrder.customerPoNo || 'WITHOUT PO',
        customerPoDate: sourceOrder.customerPoDate || null,
        orderDate: new Date().toISOString().slice(0, 10),
        targetDeliveryDate: targetDeliveryDate || null,
        qty: totalReworkQty,
        unitPrice: unitPriceVal,
        subtotal: numericSubtotal,
        discount: 0,
        discountType: 'percent',
        discountAmount: 0,
        taxAmount: financialSummary.taxAmount,
        taxRate: financialSummary.taxRate,
        taxProfileId: billingMode === 'paid' ? (taxProfileId || null) : null,
        isTaxInclusive: 0,
        vatAmount: financialSummary.vatAmount,
        ssclAmount: financialSummary.ssclAmount,
        totalPrice: numericTotal,
        currency,
        exchangeRate: Number(sourceOrder.exchangeRate || 1),
        status: 'Approved',
        items: builtItems,
        notes: notesText,
      };

      const res = await createFinishedGoodsOrder(payload);
      if (res && res.error) {
        throw new Error(res.error);
      }
      onSuccess(res?.order || payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save Rework Sales Order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'update_billing'
          ? `Update Rework Billing & Amount — ${reworkOrderNo}`
          : `Create Rework Sales Order — From ${baseOrderNo}`
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Top Banner: Rework Order Number & Original Order Info */}
        <div className="p-3.5 rounded-xl bg-surface2/50 border border-theme-subtle border-l-4 border-l-rex-500 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-muted font-bold">
              {mode === 'update_billing' ? 'Rework Sales Order' : 'New Rework Sales Order Number'}
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-lg bg-rex-600 text-white font-mono font-extrabold text-sm shadow-2xs">
                {reworkOrderNo}
              </span>
              <span className="text-xs text-secondary font-mono">
                Original SO: <strong className="text-primary">{baseOrderNo}</strong>
              </span>
            </div>
          </div>

          <div className="text-right space-y-0.5 text-xs">
            <div className="font-bold text-primary flex items-center justify-end gap-1.5">
              <Building size={13} className="text-rex-500" />
              <span>{sourceOrder.customerCompany || sourceOrder.customerName}</span>
            </div>
            {sourceOrder.invoiceNo && (
              <div className="text-[11px] font-mono text-muted">
                Invoiced: {sourceOrder.invoiceNo}
              </div>
            )}
          </div>
        </div>

        {/* 1. Rework Reason (Required) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-primary">
            1. Rework Reason (Why did this order come back for rework?) <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {REWORK_REASON_PRESETS.map((preset) => {
              const isSelected = reworkReason.toLowerCase().includes(preset.toLowerCase());
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setReworkReason((prev) =>
                      prev.trim()
                        ? prev.toLowerCase().includes(preset.toLowerCase())
                          ? prev
                          : `${prev.trim()} — ${preset}`
                        : preset
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rex-600 text-white border-rex-600'
                      : 'bg-surface2/60 text-secondary border-theme-subtle hover:border-rex-500/40'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            value={reworkReason}
            onChange={(e) => setReworkReason(e.target.value)}
            placeholder="Enter detailed reason for rework (e.g. Shaft diameter tolerance adjustment requested by customer after delivery)..."
            required
            className="w-full px-3 py-2 text-xs bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500 resize-none"
          />
        </div>

        {/* 2. Rework Billing & Amount Decision (Decide Now or Later) */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-primary">
            2. Rework Billing & Amount (Decide Now or Decide Later)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Option A: Decide Later (TBD) */}
            <button
              type="button"
              onClick={() => setBillingMode('tbd')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                billingMode === 'tbd'
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/30'
                  : 'bg-surface border-theme-subtle hover:bg-surface2/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-500" /> Decide Later (TBD)
                </span>
                {billingMode === 'tbd' && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
              <p className="text-[10.5px] text-muted leading-snug">
                Start rework now and decide later whether it is paid or non-paid.
              </p>
            </button>

            {/* Option B: Paid Rework (Custom Amount) */}
            <button
              type="button"
              onClick={() => setBillingMode('paid')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                billingMode === 'paid'
                  ? 'bg-rex-500/10 border-rex-500 ring-1 ring-rex-500/30'
                  : 'bg-surface border-theme-subtle hover:bg-surface2/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <DollarSign size={14} className="text-rex-500" /> Paid (Custom Amount)
                </span>
                {billingMode === 'paid' && (
                  <span className="w-2 h-2 rounded-full bg-rex-500" />
                )}
              </div>
              <p className="text-[10.5px] text-muted leading-snug">
                Chargeable rework — enter any custom rework amount you want.
              </p>
            </button>

            {/* Option C: Non-Paid / Free Rework */}
            <button
              type="button"
              onClick={() => {
                setBillingMode('non_paid');
                setTaxProfileId('');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                billingMode === 'non_paid'
                  ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-surface border-theme-subtle hover:bg-surface2/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" /> Non-Paid (Free)
                </span>
                {billingMode === 'non_paid' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </div>
              <p className="text-[10.5px] text-muted leading-snug">
                Free of charge rework (Warranty / Goodwill — Amount: 0.00).
              </p>
            </button>
          </div>

          {/* VAT / Tax Profile Selector if Paid is selected */}
          {billingMode === 'paid' && (
            <div className="p-3.5 rounded-xl bg-rex-500/5 border border-rex-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-primary">
                  VAT / Tax Profile (Does VAT apply to this Rework?)
                </label>
                <p className="text-[10.5px] text-muted">
                  Enter the cost per line item in the table below. Select a Tax Profile if VAT/SSCL applies.
                </p>
              </div>
              <select
                value={taxProfileId}
                onChange={(e) => setTaxProfileId(e.target.value)}
                className="sm:w-72 px-3 py-1.5 text-xs font-bold bg-surface border border-rex-500/40 rounded-lg text-primary focus:outline-none focus:border-rex-500"
              >
                <option value="">No Tax / VAT Exempt (0%)</option>
                {(taxProfiles || []).map((tp: any) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name} ({tp.ssclRate ? `SSCL ${tp.ssclRate}% + ` : ''}VAT {tp.vatRate ?? tp.rate ?? 0}%)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3. Select Sales Order Items & Rework Quantities */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Package size={13} className="text-rex-500" />
              3. Sales Order Items for Rework ({reworkItemsList.filter((i) => i.selected).length}/{reworkItemsList.length} selected)
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setReworkItemsList((prev) => prev.map((it) => ({ ...it, selected: true })))}
                className="text-rex-600 dark:text-rex-400 hover:underline font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-muted">|</span>
              <button
                type="button"
                onClick={() => setReworkItemsList((prev) => prev.map((it) => ({ ...it, selected: false })))}
                className="text-muted hover:text-primary hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="border border-theme-subtle rounded-xl overflow-hidden bg-surface max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface2/60 border-b border-theme-subtle text-[10px] uppercase tracking-wider text-muted font-bold">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">Pick</th>
                  <th className="px-3 py-2">Item / Part Description</th>
                  <th className="px-2 py-2 w-24 text-center">Orig. Qty</th>
                  <th className="px-3 py-2 w-28 text-center">Rework Qty</th>
                  <th className="px-3 py-2 w-40 text-right">Line Cost ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-subtle/50">
                {reworkItemsList.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${item.selected ? 'bg-rex-500/5' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          setReworkItemsList((prev) =>
                            prev.map((row, rIdx) => (rIdx === idx ? { ...row, selected: e.target.checked } : row))
                          )
                        }
                        className="w-3.5 h-3.5 accent-rex-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={item.description}
                        disabled={!item.selected}
                        onChange={(e) =>
                          setReworkItemsList((prev) =>
                            prev.map((row, rIdx) => (rIdx === idx ? { ...row, description: e.target.value } : row))
                          )
                        }
                        className="w-full px-2 py-1 text-xs font-semibold bg-transparent border border-transparent focus:border-theme-subtle focus:bg-surface rounded text-primary outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-muted">
                      {item.originalQty} {item.uom}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="number"
                        min={1}
                        step="any"
                        disabled={!item.selected}
                        value={item.reworkQty}
                        onChange={(e) =>
                          setReworkItemsList((prev) =>
                            prev.map((row, rIdx) =>
                              rIdx === idx ? { ...row, reworkQty: Number(e.target.value) } : row
                            )
                          )
                        }
                        className="w-20 px-2 py-1 text-xs font-mono font-bold bg-surface border border-theme-subtle rounded text-primary text-center focus:outline-none focus:border-rex-500 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {billingMode === 'paid' ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          disabled={!item.selected}
                          value={item.lineCost || ''}
                          placeholder="0.00"
                          onChange={(e) =>
                            setReworkItemsList((prev) =>
                              prev.map((row, rIdx) =>
                                rIdx === idx ? { ...row, lineCost: Number(e.target.value) } : row
                              )
                            )
                          }
                          className="w-32 px-2.5 py-1 text-xs font-mono font-bold bg-surface border border-rex-500/40 rounded text-primary text-right focus:outline-none focus:border-rex-500 disabled:opacity-50"
                        />
                      ) : (
                        <span className="text-[11px] font-mono text-muted">
                          {billingMode === 'tbd' ? 'TBD' : '0.00'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Target Delivery Date & Additional Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-secondary mb-1 flex items-center gap-1">
              <Calendar size={12} className="text-muted" /> Target Delivery Date
            </label>
            <input
              type="date"
              value={targetDeliveryDate}
              onChange={(e) => setTargetDeliveryDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500"
            />
          </div>
          <div className="sm:col-span-8">
            <label className="block text-xs font-bold text-secondary mb-1 flex items-center gap-1">
              <FileText size={12} className="text-muted" /> Additional Instructions / Notes (Optional)
            </label>
            <input
              type="text"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any special shop floor or dispatch instructions..."
              className="w-full px-3 py-1.5 text-xs bg-surface border border-theme-subtle rounded-lg text-primary focus:outline-none focus:border-rex-500"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-theme-subtle">
          <div className="text-xs font-mono text-secondary">
            {billingMode === 'tbd' && (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                Billing: To Be Decided Later
              </span>
            )}
            {billingMode === 'non_paid' && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Billing: Free / Non-Paid Rework ({formatCurrency(0, false, currency)})
              </span>
            )}
            {billingMode === 'paid' && (
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Subtotal: <strong className="text-primary">{formatCurrency(financialSummary.subtotal, false, currency)}</strong>
                </span>
                {financialSummary.ssclAmount > 0 && (
                  <span>
                    SSCL: <strong className="text-amber-600">{formatCurrency(financialSummary.ssclAmount, false, currency)}</strong>
                  </span>
                )}
                {financialSummary.vatAmount > 0 && (
                  <span>
                    VAT: <strong className="text-indigo-600 dark:text-indigo-400">{formatCurrency(financialSummary.vatAmount, false, currency)}</strong>
                  </span>
                )}
                <span className="text-rex-600 dark:text-rex-400 font-extrabold text-sm">
                  Total: {formatCurrency(financialSummary.totalPrice, false, currency)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              icon={mode === 'update_billing' ? CheckCircle2 : RotateCcw}
              disabled={submitting}
              className="bg-rex-600 hover:bg-rex-700 text-white font-bold text-xs px-4"
            >
              {submitting
                ? 'Saving...'
                : mode === 'update_billing'
                ? 'Save Rework Billing & Amount'
                : `Create Rework Order (${reworkOrderNo})`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
