import sys

with open('src/pages/finance/AccountingHub.tsx', 'r') as f:
    content = f.read()

start_marker = "const generateTaxColumns = (): Column<any>[] => ["
end_marker = "  const countLabel ="
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_cols = """  const generateTaxColumns = (): Column<any>[] => [
    {
      key: 'tax', header: 'Tax Profile Details', sortable: true,
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
          if (await showConfirm('Delete Profile', 'Are you sure you want to delete this tax profile?')) {
            const { deleteTaxProfile } = await import('@/lib/api');
            await deleteTaxProfile(row.id);
            toast('Deleted', 'success');
            refetchTaxes();
          }
        }}>Delete</Button>
      )
    }
  ];

"""

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_cols + content[end_idx:]

with open('src/pages/finance/AccountingHub.tsx', 'w') as f:
    f.write(content)
print("Fixed generateTaxColumns")
