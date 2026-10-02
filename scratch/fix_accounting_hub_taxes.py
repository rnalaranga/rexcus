import sys

with open('src/pages/finance/AccountingHub.tsx', 'r') as f:
    content = f.read()

find_str = "`${taxes.length} tax rates`;"
rep_str = "`${taxProfiles.length} tax profiles`;"
content = content.replace(find_str, rep_str)

# Also fix any other stray uses of taxes
# wait, there's a generateTaxColumns which I replaced, but let's check for any other `taxes.` usages.
with open('src/pages/finance/AccountingHub.tsx', 'w') as f:
    f.write(content)
print("Fixed stray taxes variable")
