import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'r', 'utf-8') as f:
    content = f.read()

target = """app.post('/api/crm/grns', async (req, res) => {
  try {
    const data = req.body;
    const item = {
      ...data,"""
replacement = """app.post('/api/crm/grns', async (req, res) => {
  try {
    const data = req.body;
    const item = {
      id: require('crypto').randomUUID(),
      ...data,"""

new_content = content.replace(target, replacement)

with codecs.open('H:/ANTIGRAVITY/REXNW/api/src/server.ts', 'w', 'utf-8') as f:
    f.write(new_content)