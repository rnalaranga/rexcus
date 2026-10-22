import sys

with open('src/pages/finance/FinancialReports.tsx', 'r') as f:
    content = f.read()

# Fix PNL
find_pnl = "{activeReport === 'pnl' && data && (() => {"
rep_pnl = "{activeReport === 'pnl' && data && data.revenue && (() => {"
content = content.replace(find_pnl, rep_pnl)

# Fix BS
find_bs = "{activeReport === 'bs' && data && (() => {"
rep_bs = "{activeReport === 'bs' && data && data.assets && (() => {"
content = content.replace(find_bs, rep_bs)

# Fix TB
find_tb = "{activeReport === 'tb' && data && (() => {"
rep_tb = "{activeReport === 'tb' && data && data.trialBalance && (() => {"
content = content.replace(find_tb, rep_tb)

# Fix EXP
find_exp = "{activeReport === 'exp' && data && (() => {"
rep_exp = "{activeReport === 'exp' && data && data.lines && (() => {"
content = content.replace(find_exp, rep_exp)

# Even better, add setData(null) to the buttons
find_btns = """<button onClick={() => setActiveReport('pnl')}"""
rep_btns = """<button onClick={() => { setData(null); setActiveReport('pnl'); }}"""
content = content.replace(find_btns, rep_btns)

find_btns = """<button onClick={() => setActiveReport('bs')}"""
rep_btns = """<button onClick={() => { setData(null); setActiveReport('bs'); }}"""
content = content.replace(find_btns, rep_btns)

find_btns = """<button onClick={() => setActiveReport('tb')}"""
rep_btns = """<button onClick={() => { setData(null); setActiveReport('tb'); }}"""
content = content.replace(find_btns, rep_btns)

find_btns = """<button onClick={() => setActiveReport('exp')}"""
rep_btns = """<button onClick={() => { setData(null); setActiveReport('exp'); }}"""
content = content.replace(find_btns, rep_btns)

with open('src/pages/finance/FinancialReports.tsx', 'w') as f:
    f.write(content)
print("Fixed stale state crash in FinancialReports")
