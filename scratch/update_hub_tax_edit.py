import sys

with open('src/pages/finance/AccountingHub.tsx', 'r') as f:
    content = f.read()

# 1. Add editTax state
find_state = "  const [showAddTax, setShowAddTax] = useState(false);"
rep_state = """  const [showAddTax, setShowAddTax] = useState(false);
  const [editTax, setEditTax] = useState<any>(null);"""
content = content.replace(find_state, rep_state)

# 2. Add edit button next to delete in the tax columns generator
old_delete_btn = """            const { deleteTaxProfile } = await import('@/lib/api');
            await deleteTaxProfile(row.id);"""

old_delete_full = """          <div className="flex items-center gap-2">
            <button onClick={async () => {
            const { deleteTaxProfile } = await import('@/lib/api');
            await deleteTaxProfile(row.id);"""

# find the Tax column render and add edit button
find_action_in_tax = """      key: 'actions', header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            const { deleteTaxProfile } = await import('@/lib/api');
            await deleteTaxProfile(row.id);"""

rep_action_in_tax = """      key: 'actions', header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setEditTax(row)} className="p-1.5 rounded-lg hover:bg-surface2 text-muted hover:text-blue-500 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={async () => {
            const { deleteTaxProfile } = await import('@/lib/api');
            await deleteTaxProfile(row.id);"""

content = content.replace(find_action_in_tax, rep_action_in_tax)

# 3. Add Pencil to imports
find_import = "import { Plus, Trash2, Edit2, Eye, FileText, BarChart3, Download, Upload, RefreshCw, Check, ChevronDown, Building2, Book, Scale, DollarSign } from 'lucide-react'"
rep_import = "import { Plus, Trash2, Edit2, Eye, FileText, BarChart3, Download, Upload, RefreshCw, Check, ChevronDown, Building2, Book, Scale, DollarSign, Pencil } from 'lucide-react'"
content = content.replace(find_import, rep_import)

# 4. Add the Edit Tax Modal before closing div
find_close = """      {/* Tax Modal */}
      <Modal isOpen={showAddTax} onClose={() => setShowAddTax(false)} title="Add Tax Profile">"""

rep_close = """      {/* Edit Tax Modal */}
      {editTax && (
        <Modal isOpen={true} onClose={() => setEditTax(null)} title={`Edit: ${editTax.name}`}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const updated = {
              name: fd.get('name') as string,
              tax1_name: fd.get('tax1_name') as string,
              tax1_rate: Number(fd.get('tax1_rate')),
              tax2_name: fd.get('tax2_name') as string || null,
              tax2_rate: Number(fd.get('tax2_rate')) || 0,
              tax2_compound: fd.get('tax2_compound') === 'on' ? 1 : 0
            };
            try {
              const { updateTaxProfile } = await import('@/lib/api');
              await updateTaxProfile(editTax.id, updated);
              toast('Tax profile updated', 'success');
              setEditTax(null);
              refetchTaxes();
            } catch(err: any) { showError(err.message, 'Error'); }
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Profile Name</label>
                <input name="name" required defaultValue={editTax.name} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">Primary Tax Name (e.g. SSCL)</label>
                  <input name="tax1_name" required defaultValue={editTax.tax1_name} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">Rate (%)</label>
                  <input name="tax1_rate" type="number" step="0.01" required defaultValue={editTax.tax1_rate} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                </div>
              </div>
              <div className="border-t border-theme-subtle pt-4">
                <label className="block text-xs font-bold text-primary mb-2">Secondary Tax (Optional)</label>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">Name (e.g. VAT)</label>
                    <input name="tax2_name" defaultValue={editTax.tax2_name || ''} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">Rate (%)</label>
                    <input name="tax2_rate" type="number" step="0.01" defaultValue={editTax.tax2_rate || 0} className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-primary">
                  <input type="checkbox" name="tax2_compound" defaultChecked={!!editTax.tax2_compound} />
                  Calculate Secondary on (Subtotal + Primary Tax)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setEditTax(null)} type="button">Cancel</Button>
              <Button variant="primary" type="submit">Update</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Tax Modal */}
      <Modal isOpen={showAddTax} onClose={() => setShowAddTax(false)} title="Add Tax Profile">"""

content = content.replace(find_close, rep_close)

with open('src/pages/finance/AccountingHub.tsx', 'w') as f:
    f.write(content)
print("Updated AccountingHub with Tax Edit modal")
