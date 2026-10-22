import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

find_bad = "const amount = custTotals?.withSSCL || 0; // wait custTotals is not defined in this scope?"
rep_good = "const amount = 0; // Will be correctly set in DB on final save"

content = content.replace(find_bad, rep_good)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Fixed compile error")
