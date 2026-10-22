with open('api/src/server.ts', 'r') as f:
    code = f.read()

# Add to fix-db patches
patch = "'ALTER TABLE invoices ADD COLUMN attention VARCHAR(255) DEFAULT NULL'"
code = code.replace("    'ALTER TABLE invoices ADD COLUMN taxBreakdown TEXT DEFAULT NULL'\n  ];", "    'ALTER TABLE invoices ADD COLUMN taxBreakdown TEXT DEFAULT NULL',\n    " + patch + "\n  ];")

with open('api/src/server.ts', 'w') as f:
    f.write(code)

