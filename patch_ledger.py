import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'r', 'utf-8') as f:
    content = f.read()

# 1. Fix the Party Ledger query
old_query = """SELECT jl.*, je.date, je.reference, je.description as entryDescription
         FROM journal_lines jl
         JOIN journal_entries je ON jl.entryId = je.id
         WHERE jl.partyId = ?
         ORDER BY je.date ASC"""

new_query = """SELECT jl.*, je.date, je.reference, je.description as entryDescription, c.type as accountType, c.name as accountName
         FROM journal_lines jl
         JOIN journal_entries je ON jl.entryId = je.id
         JOIN chart_of_accounts c ON jl.accountId = c.id
         WHERE jl.partyId = ? AND c.type IN ('Asset', 'Liability')
         ORDER BY je.date ASC"""
         
content = content.replace(old_query, new_query)

# 2. Fix the Invoice GL posting (stop tagging Sales with customer ID)
old_invoice_lines = """          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, data.customerId, 'Customer']
          ];"""

new_invoice_lines = """          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, arAcc[0].id, invTotal, 0, data.customerId, 'Customer'],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, salesAcc[0].id, 0, invSub, null, null]
          ];"""

content = content.replace(old_invoice_lines, new_invoice_lines)

# 3. Check for Expense tagging in Bills/Purchases if it exists
old_bill_lines = """          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, expAcc[0].id, billSub, 0, data.supplierId, 'Supplier'],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, apAcc[0].id, 0, billTotal, data.supplierId, 'Supplier']
          ];"""
          
new_bill_lines = """          const lines = [
            ['JL-' + Date.now().toString().slice(-5) + '1', jeId, expAcc[0].id, billSub, 0, null, null],
            ['JL-' + Date.now().toString().slice(-5) + '2', jeId, apAcc[0].id, 0, billTotal, data.supplierId, 'Supplier']
          ];"""

content = content.replace(old_bill_lines, new_bill_lines)

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'w', 'utf-8') as f:
    f.write(content)

print('Updated server.ts')