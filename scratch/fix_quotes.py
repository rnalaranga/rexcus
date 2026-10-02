import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

content = content.replace("code IN ('1100', '1500')", 'code IN ("1100", "1500")')
content = content.replace("name LIKE '%Receivable%'", 'name LIKE "%Receivable%"')
content = content.replace("code IN ('3000', '4000')", 'code IN ("3000", "4000")')
content = content.replace("name LIKE '%Sales%'", 'name LIKE "%Sales%"')
content = content.replace("name LIKE '%Revenue%'", 'name LIKE "%Revenue%"')

with open('api/src/server.ts', 'w') as f:
    f.write(content)
