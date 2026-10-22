import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

old_input = "<input type=\"text\" value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} placeholder=\"Description…\" className={tableInputClass} />"
new_textarea = "<textarea value={item.description} onChange={e => handleChangeItem(item.id, 'description', e.target.value)} placeholder=\"Description…\\n(Multiple lines allowed)\" className={`${tableInputClass} resize-y min-h-[40px] leading-relaxed`} rows={2} />"

if old_input in content:
    content = content.replace(old_input, new_textarea)
    with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Old input not found")
