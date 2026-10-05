import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/hooks/useFinance.ts', 'r', 'utf-8') as f:
    content = f.read()

old_code = "try { const res = await fetchFinanceDashboard(); setData(Array.isArray(res) ? res : []); } catch (e) { console.error(e); }"
new_code = "try { const res = await fetchFinanceDashboard(); setData(res && !res.error ? res : { cash: 0, ar: 0, ap: 0, profit: 0, revenue: 0, expenses: 0 }); } catch (e) { console.error(e); }"

content = content.replace(old_code, new_code)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/hooks/useFinance.ts', 'w', 'utf-8') as f:
    f.write(content)