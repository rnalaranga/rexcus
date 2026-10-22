with open('api/src/server.ts', 'r') as f:
    code = f.read()

# For POST /api/customers
code = code.replace("const data = { ...req.body };", "const data = { ...req.body };\n    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);")

# For PUT /api/customers/:id
code = code.replace("const data = req.body;", "const data = { ...req.body };\n    if (data.contacts && typeof data.contacts === 'object') data.contacts = JSON.stringify(data.contacts);")

with open('api/src/server.ts', 'w') as f:
    f.write(code)

