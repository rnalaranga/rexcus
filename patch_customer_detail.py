import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/CustomerDetail.tsx', 'r', 'utf-8') as f:
    content = f.read()

target = "name: customer.name,"
replacement = "prefix: customer.prefix || '',\n        name: customer.name,"

if "prefix: customer.prefix" not in content:
    content = content.replace(target, replacement)
    
with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/CustomerDetail.tsx', 'w', 'utf-8') as f:
    f.write(content)