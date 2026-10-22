import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

cash_query = 'SELECT id FROM chart_of_accounts WHERE code = "1000" OR subtype LIKE "%bank%" OR subtype LIKE "%cash%" OR name LIKE "%cash%" LIMIT 1'
content = content.replace('SELECT id FROM chart_of_accounts WHERE code = "1000" LIMIT 1', cash_query)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Replaced cash GL query")
