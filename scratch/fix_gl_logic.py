import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

# Replace hardcoded 1100 and 4000
ar_query = "SELECT id FROM chart_of_accounts WHERE code IN ('1100', '1500') OR name LIKE '%Receivable%' LIMIT 1"
sales_query = "SELECT id FROM chart_of_accounts WHERE code IN ('3000', '4000') OR name LIKE '%Sales%' OR name LIKE '%Revenue%' LIMIT 1"

content = content.replace("SELECT id FROM chart_of_accounts WHERE code = \"1100\" LIMIT 1", ar_query)
content = content.replace("SELECT id FROM chart_of_accounts WHERE code = \"4000\" LIMIT 1", sales_query)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Replaced GL queries")
