import sys

with open('src/pages/finance/AccountingHub.tsx', 'r') as f:
    content = f.read()

# 1. Imports
import_find = "import { useAccounts, useTaxes, useJournals } from '@/hooks/useFinance';"
import_rep = "import { useAccounts, useTaxes, useTaxProfiles, useJournals } from '@/hooks/useFinance';"
content = content.replace(import_find, import_rep)

# 2. Hooks
hooks_find = "  const { data: taxes, loading: loadingTaxes } = useTaxes();"
hooks_rep = "  const { data: taxProfiles, loading: loadingTaxes, refetch: refetchTaxes } = useTaxProfiles();"
content = content.replace(hooks_find, hooks_rep)

# 3. Filter
filter_find = "  const filteredTaxes = taxes.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));"
filter_rep = "  const filteredTaxes = taxProfiles.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));"
content = content.replace(filter_find, filter_rep)

# 4. Columns
cols_find = """  const generateTaxColumns = (): Column<any>[] => [
    {
      key: 'tax', header: 'Tax Details', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs">TX</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5">Rate: {Number(row.rate).toFixed(2)}%</p>
          </div>
        </div>
      )
    },
    {
      key: 'liability', header: 'Liability Account',
      render: (_, row) => {
        const acc = accounts.find(a => a.id === row.accountId);
        return acc ? <span className="text-xs text-muted">{acc.code} - {acc.name}</span> : <span className="text-xs text-muted italic">Not mapped</span>;
      }
    }
  ];"""

cols_rep = """  const generateTaxColumns = (): Column<any>[] => [
    {
      key: 'tax', header: 'Tax Profile', sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-amber-600 border border-amber-500/40 flex items-center justify-center text-white font-bold text-xs">TX</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate leading-snug">{row.name}</p>
            <p className="text-[10px] text-muted truncate mt-0.5">
              {row.tax1_name} ({row.tax1_rate}%)
              {row.tax2_name ? ` + ${row.tax2_name} (${row.tax2_rate}%${row.tax2_compound ? ' Compound' : ''})` : ''}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'actions', header: '', align: 'right',
      render: (_, row) => (
        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={async () => {
          if (await showConfirm('Delete Profile', 'Are you sure?')) {
            const { deleteTaxProfile } = await import('@/lib/api');
            await deleteTaxProfile(row.id);
            toast('Deleted', 'success');
            refetchTaxes();
          }
        }}>Delete</Button>
      )
    }
  ];"""
content = content.replace(cols_find, cols_rep)

# 5. Buttons & Modal Title
btn_find = "Add Tax Rate"
btn_rep = "Add Tax Profile"
content = content.replace(btn_find, btn_rep)

tab_find = "Tax Rates"
tab_rep = "Tax Profiles"
content = content.replace(tab_find, tab_rep)

# 6. Form Submit
form_find = """          const formData = new FormData(e.currentTarget);
          const name = formData.get('name') as string;
          const rate = Number(formData.get('rate'));
          const accountId = formData.get('accountId') as string;
          
          if (!name || isNaN(rate) || !accountId) return showError('Please fill all required fields.', 'Validation Error');
          
          try {
            const { createTax } = await import('@/lib/api');
            await createTax({ id: crypto.randomUUID(), name, rate, accountId });
            toast('Tax rate created', 'success');
            setShowAddTax(false);
            window.location.reload();"""

form_rep = """          const formData = new FormData(e.currentTarget);
          const name = formData.get('name') as string;
          const tax1_name = formData.get('tax1_name') as string;
          const tax1_rate = Number(formData.get('tax1_rate'));
          const tax2_name = formData.get('tax2_name') as string;
          const tax2_rate = Number(formData.get('tax2_rate'));
          const tax2_compound = formData.get('tax2_compound') === 'on' ? 1 : 0;
          
          if (!name || !tax1_name) return showError('Please fill required fields.', 'Validation Error');
          
          try {
            const { createTaxProfile } = await import('@/lib/api');
            await createTaxProfile({ 
              id: crypto.randomUUID(), 
              name, 
              tax1_name, tax1_rate: tax1_rate || 0,
              tax2_name: tax2_name || null, tax2_rate: tax2_rate || 0,
              tax2_compound
            });
            toast('Tax profile created', 'success');
            setShowAddTax(false);
            refetchTaxes();"""
content = content.replace(form_find, form_rep)

# 7. Form Fields
fields_find = """        <form onSubmit={async (e) => {
          e.preventDefault();"""

fields_end = """          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setShowAddTax(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">Save Tax Profile</Button>
          </div>
        </form>"""

# Using regex or split to replace the middle fields
si = content.find('<div className="space-y-4">', content.find('<Modal isOpen={showAddTax}'))
ei = content.find('<div className="flex justify-end gap-2 mt-6">', si)

new_fields = """          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Profile Name (e.g. VAT + SSCL)</label>
              <input name="name" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Primary Tax Name (e.g. SSCL)</label>
                <input name="tax1_name" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Rate (%)</label>
                <input name="tax1_rate" type="number" step="0.01" required className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
              </div>
            </div>
            <div className="border-t border-theme-subtle pt-4 mt-2">
              <label className="block text-xs font-bold text-primary mb-2">Optional Secondary Tax</label>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">Secondary Tax Name (e.g. VAT)</label>
                  <input name="tax2_name" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase mb-1">Rate (%)</label>
                  <input name="tax2_rate" type="number" step="0.01" className="w-full bg-surface border border-theme-subtle px-3 py-2 rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-primary">
                <input type="checkbox" name="tax2_compound" />
                Calculate Secondary Tax on (Subtotal + Primary Tax)
              </label>
            </div>
          </div>
"""

content = content[:si] + new_fields + content[ei:]

with open('src/pages/finance/AccountingHub.tsx', 'w') as f:
    f.write(content)
print("Updated AccountingHub for Tax Profiles")
