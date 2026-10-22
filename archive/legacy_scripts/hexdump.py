import codecs
with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    lines = f.readlines()
line = lines[970]
print(line.strip())
print([hex(ord(c)) for c in line.strip()])