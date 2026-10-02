import re

with open('H:/ANTIGRAVITY/REXNW/src/pages/finance/AccountingHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add lucide-react icons if not present (Upload, FileSpreadsheet)
if 'Upload' not in content:
    content = content.replace('Download,', 'Download, Upload, FileSpreadsheet,')

# 2. Add imports/logic for import/export
logic = '''
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleDownloadTemplate = () => {
    const csvContent = "Code,Name,Type,Subtype,Balance\\n" +
      "1000,Commercial Bank,Asset,Bank,0\\n" +
      "1500,Accounts Receivable,Asset,Current Asset,0\\n" +
      "2000,Accounts Payable,Liability,Current Liability,0\\n" +
      "3000,Sales Revenue,Revenue,Sales,0\\n" +
      "4000,Raw Materials,Expense,Production Material,0\\n" +
      "4001,Electric item,Expense,Production Material,0\\n" +
      "4002,Sub Contract,Expense,Production Material,0\\n" +
      "5000,Diesel for Generator,Expense,Production Overhead,0\\n" +
      "5001,Electricity,Expense,Production Overhead,0\\n" +
      "5002,Factory Maintenance,Expense,Production Overhead,0\\n" +
      "6000,Audit & Accounting Fees,Expense,Administration,0\\n" +
      "6001,Bonus,Expense,Administration,0\\n" +
      "6002,Salaries & Wages,Expense,Administration,0\\n" +
      "7000,Advertising,Expense,Selling & Distribution,0\\n" +
      "7001,Sales Commissions,Expense,Selling & Distribution,0\\n" +
      "8000,Bank Charges,Expense,Finance,0\\n" +
      "9000,Exchange Gain or Loss,Expense,Non Operating,0";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Chart_of_Accounts_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\\n').filter(l => l.trim().length > 0);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const codeIdx = headers.indexOf('code');
      const nameIdx = headers.indexOf('name');
      const typeIdx = headers.indexOf('type');
      const subIdx = headers.indexOf('subtype');
      const balIdx = headers.indexOf('balance');

      if (codeIdx === -1 || nameIdx === -1 || typeIdx === -1) {
        toast({ title: 'Error', message: 'CSV must contain Code, Name, and Type columns', type: 'error' });
        return;
      }

      const parsedAccounts = lines.slice(1).map(line => {
        // Handle basic quotes (simplistic csv parse)
        const cols = line.split(','); 
        return {
          id: crypto.randomUUID(),
          code: cols[codeIdx]?.trim() || '',
          name: cols[nameIdx]?.trim() || '',
          type: cols[typeIdx]?.trim() || 'Expense',
          subtype: subIdx !== -1 ? cols[subIdx]?.trim() : '',
          balance: balIdx !== -1 ? parseFloat(cols[balIdx]) || 0 : 0
        };
      }).filter(a => a.code && a.name);

      if (parsedAccounts.length === 0) {
        toast({ title: 'Error', message: 'No valid accounts found in CSV', type: 'error' });
        return;
      }

      try {
        const res = await fetch(${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/finance/accounts/import, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts: parsedAccounts })
        });
        const data = await res.json();
        if (data.success) {
          toast({ title: 'Success', message: Imported  accounts successfully, type: 'success' });
          refetchCOA();
        } else {
          toast({ title: 'Error', message: data.error, type: 'error' });
        }
      } catch (err) {
        toast({ title: 'Error', message: 'Import failed', type: 'error' });
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
'''

idx = content.find('const getAccountName = (id: string) => {')
if idx != -1:
    content = content[:idx] + logic + '\n  ' + content[idx:]

# 3. Add UI Buttons
buttons_ui = '''
            {activeTab === 'coa' && (
              <>
                <Button variant="ghost" size="sm" icon={FileSpreadsheet} onClick={handleDownloadTemplate} className="border border-theme-subtle text-blue-500">Template</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                <Button variant="ghost" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()} className="border border-theme-subtle text-amber-500">Import CSV</Button>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditAccount(null); setShowAddAccount(true); }} className="bg-rex-600 hover:bg-rex-700">Add Account</Button>
              </>
            )}
'''

# Find the existing Add Account button and replace
search_btn = '''            {activeTab === 'coa' && (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditAccount(null); setShowAddAccount(true); }} className="bg-rex-600 hover:bg-rex-700">Add Account</Button>
            )}'''

content = content.replace(search_btn, buttons_ui.strip())

with open('H:/ANTIGRAVITY/REXNW/src/pages/finance/AccountingHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done frontend import logic')
