import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

# Change header
old_th = "<th className=\"px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-48\">Product / Service</th>"
new_th = "<th className=\"px-2 py-3 text-[9px] font-bold text-muted uppercase tracking-wider w-48\">Inventory (Optional)</th>"
content = content.replace(old_th, new_th)

# Change placeholder
old_select = "<SearchableSelect value={item.inventoryId} onChange={val => handleChangeItem(item.id, 'inventoryId', val)} options={itemOptions} placeholder=\"Search…\" className=\"text-xs\" />"
new_select = "<SearchableSelect value={item.inventoryId} onChange={val => handleChangeItem(item.id, 'inventoryId', val)} options={itemOptions} placeholder=\"Select or skip...\" className=\"text-xs\" />"
content = content.replace(old_select, new_select)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
