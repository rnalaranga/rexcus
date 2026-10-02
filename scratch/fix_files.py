import sys

# Fix InvoicePreview.tsx
with open('src/components/finance/InvoicePreview.tsx', 'r') as f:
    content = f.read()

sig = "export const InvoicePreview: React.FC<any> = ({ template, docNo, date, dueDate, deliveryDate, placeOfSupply, quotationNo, dispatchNo, orderNo, poNo, customer, customerVat, items, subtotal, taxAmount, total, notes, company, getTaxRate, taxRates })"
if sig in content and sig + " => {" not in content:
    content = content.replace(sig, sig + " => {")
    with open('src/components/finance/InvoicePreview.tsx', 'w') as f:
        f.write(content)

# Fix TemplatePicker in InvoiceBuilder.tsx
with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    builder = f.read()

if "const TemplatePicker" not in builder:
    picker = """
const TemplatePicker = ({ current, onChange, onClose }: any) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-surface p-6 rounded-xl border border-theme-subtle w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Select Template</h3>
        <div className="space-y-2">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => { onChange(t.id); onClose(); }} className={`w-full text-left p-3 rounded-lg border ${current === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-theme-subtle hover:bg-surface2/50'}`}>
              <div className="font-bold">{t.name}</div>
              <div className="text-xs text-muted">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
"""
    builder = builder + "\n" + picker
    with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
        f.write(builder)
