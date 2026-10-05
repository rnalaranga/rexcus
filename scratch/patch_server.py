import sys

with open('api/src/server.ts', 'r') as f:
    content = f.read()

find_patch = '      "ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT \'posted\'"'
rep_patch = '      "ALTER TABLE journal_entries ADD COLUMN status VARCHAR(50) DEFAULT \'posted\'",\n      "ALTER TABLE quotations ADD COLUMN status VARCHAR(50) DEFAULT \'Draft\'"'

content = content.replace(find_patch, rep_patch)

with open('api/src/server.ts', 'w') as f:
    f.write(content)
print("Patched server.ts")
