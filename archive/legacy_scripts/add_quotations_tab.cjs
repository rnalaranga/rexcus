const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/CustomerDetail.tsx', 'utf8');

// Add useQuotations import
if (!content.includes('useQuotations')) {
  content = content.replace(
    "import { useCustomers, useLeads } from '@/hooks/useData'",
    "import { useCustomers, useLeads, useQuotations } from '@/hooks/useData'"
  );
}

// Add state for quotations tab
content = content.replace(
  "const [activeTab, setActiveTab] = useState<'overview' | 'ledger'>('overview')",
  "const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'quotations'>('overview')"
);

// Add Tab Button
const tabButtonStr = `             <button 
               onClick={() => setActiveTab('ledger')}
               className={\`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors \${activeTab === 'ledger' ? 'border-rex-600 text-primary' : 'border-transparent text-muted hover:text-secondary'}\`}
             >
               Ledger & Financials
             </button>
             <button 
               onClick={() => setActiveTab('quotations')}
               className={\`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors \${activeTab === 'quotations' ? 'border-rex-600 text-primary' : 'border-transparent text-muted hover:text-secondary'}\`}
             >
               Quotations
             </button>`;

content = content.replace(/<button\s*onClick=\{\(\) => setActiveTab\('ledger'\)\}[\s\S]*?Ledger & Financials\s*<\/button>/, tabButtonStr);

fs.writeFileSync('src/pages/crm/CustomerDetail.tsx', content, 'utf8');