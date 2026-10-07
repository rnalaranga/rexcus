import re

with open('api/src/server.ts', 'r') as f:
    code = f.read()

# Update POST /api/quotations update statement
old_upd = "'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, date=? WHERE id=?'"
new_upd = "'UPDATE quotations SET data=?, totalAmount=?, customAmount=?, date=?, docNo=?, issueNo=?, issueDate=? WHERE id=?'"
code = code.replace(old_upd, new_upd)

old_upd_args = "[JSON.stringify(data.data), data.totalAmount, data.customAmount || null, new Date().toISOString().slice(0, 19).replace('T', ' '), draftId]"
new_upd_args = "[JSON.stringify(data.data), data.totalAmount, data.customAmount || null, new Date().toISOString().slice(0, 19).replace('T', ' '), data.docNo || null, data.issueNo || null, data.issueDate || null, draftId]"
code = code.replace(old_upd_args, new_upd_args)

# Update POST /api/quotations insert statement
old_newq = """      customAmount: data.customAmount || null,
      selectedProfileId: data.selectedProfileId || null,
      taxEnabled: data.taxEnabled ? 1 : 0
    };"""

new_newq = """      customAmount: data.customAmount || null,
      selectedProfileId: data.selectedProfileId || null,
      taxEnabled: data.taxEnabled ? 1 : 0,
      docNo: data.docNo || null,
      issueNo: data.issueNo || null,
      issueDate: data.issueDate || null
    };"""
code = code.replace(old_newq, new_newq)

with open('api/src/server.ts', 'w') as f:
    f.write(code)

