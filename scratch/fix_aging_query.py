import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

old_ar_query = """      SELECT 
        jl.partyId,
        p.name as partyName,
        SUM(jl.debit - jl.credit) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) <= 30 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 31 AND 60 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 61 AND 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) > 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90plus'
      FROM journal_lines jl
      JOIN journal_entries je ON jl.entryId = je.id
      JOIN chart_of_accounts ca ON jl.accountId = ca.id
      JOIN customers p ON jl.partyId = p.id 
      WHERE jl.partyType = 'Customer' AND ca.name LIKE "%Receivable%" 
      GROUP BY jl.partyId, p.name 
      HAVING balance > 0"""

new_ar_query = """      SELECT 
        jl.partyId,
        COALESCE(p.name, p.company, l.name, l.company, 'Unknown') as partyName,
        SUM(jl.debit - jl.credit) as balance,
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) <= 30 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket30',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 31 AND 60 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket60',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) BETWEEN 61 AND 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90',
        SUM(CASE WHEN DATEDIFF(NOW(), je.date) > 90 THEN (jl.debit - jl.credit) ELSE 0 END) as 'bucket90plus'
      FROM journal_lines jl
      JOIN journal_entries je ON jl.entryId = je.id
      JOIN chart_of_accounts ca ON jl.accountId = ca.id
      LEFT JOIN customers p ON jl.partyId = p.id 
      LEFT JOIN leads l ON jl.partyId = l.id
      WHERE jl.partyType = 'Customer' AND (ca.name LIKE "%Receivable%" OR ca.code IN ("1100", "1500"))
      GROUP BY jl.partyId, partyName 
      HAVING balance > 0"""

content = content.replace(old_ar_query, new_ar_query)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Replaced AR query")
