import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

# 1. Draft create
code = code.replace("totalAmount: am, customAmount: null, selectedProfileId, taxEnabled\n          });", "totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate\n          });")

# 2. Draft update
code = code.replace("type: 'draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled\n          });", "type: 'draft', data: snapshot, totalAmount: am, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate\n          });")

# 3. Main create
code = code.replace("totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled\n      })", "totalAmount: amount, customAmount: null, selectedProfileId, taxEnabled, docNo, issueNo, issueDate\n      })")

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

