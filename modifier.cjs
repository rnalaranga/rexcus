const fs = require('fs');
let code = fs.readFileSync('src/pages/inventory/Inventory.tsx', 'utf8');

// 1. Update TabType
code = code.replace(
  /type TabType = 'all' \| 'product' \| 'service'/,
  "type TabType = 'all' | 'raw_material' | 'finished_product' | 'company_asset' | 'service'"
);

// 2. Add imports if needed
if (!code.includes('Briefcase')) {
  code = code.replace(/import \{ ([^}]+) \} from 'lucide-react'/, (match, p1) => {
    return `import { ${p1}, Box, Briefcase } from 'lucide-react'`;
  });
}

// 3. Update initialForm
code = code.replace(
  /type: 'product', name: '', sku: ''/,
  "type: 'raw_material', name: '', sku: ''"
);

// 4. Update Columns - Icon rendering
code = code.replace(
  /render: \(val: any, item\) => \([\s\S]*?<div className={`p-2 rounded \$\{item\.type === 'product' \? 'bg-blue-500\/10 text-blue-400' : 'bg-purple-500\/10 text-purple-400'\}`\}>[\s\S]*?<\/div>\s*<div>/,
  `render: (val: any, item) => {
        let icon = <Box size={16} />;
        let color = 'bg-emerald-500/10 text-emerald-400';
        if (item.type === 'finished_product') { icon = <Package size={16} />; color = 'bg-blue-500/10 text-blue-400'; }
        else if (item.type === 'service') { icon = <Wrench size={16} />; color = 'bg-purple-500/10 text-purple-400'; }
        else if (item.type === 'company_asset') { icon = <Briefcase size={16} />; color = 'bg-amber-500/10 text-amber-400'; }
        return (
          <div className="flex items-center gap-3">
            <div className={\`p-2 rounded \${color}\`}>
              {icon}
            </div>
            <div>`
);

// 5. Update Columns - Type Badge rendering
code = code.replace(
  /render: \(val: any\) => \([\s\S]*?<Badge variant=\{val === 'product' \? 'info' : 'warning'\}>[\s\S]*?<\/Badge>\s*\)/,
  `render: (val: any) => {
        const text = String(val).replace(/_/g, ' ');
        const variant = val === 'raw_material' ? 'success' : val === 'finished_product' ? 'info' : val === 'company_asset' ? 'default' : 'warning';
        return <Badge variant={variant as any}>{text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Badge>;
      }`
);

// 6. Update Columns - Stock / Qty
code = code.replace(
  /item\.type === 'product'\s*\?/g,
  "item.type !== 'service' ?"
);

// 7. Update Add/Edit Form - Type selection buttons
const oldFormButtons = `<div className="flex bg-surface2 rounded-lg p-1 border border-theme-subtle">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, type: 'product'})}
                        className={\`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all \${formData.type === 'product' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}\`}
                      >Product</button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, type: 'service'})}
                        className={\`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all \${formData.type === 'service' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}\`}
                      >Service</button>
                    </div>`;
const newFormButtons = `<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'raw_material', label: 'Raw Material' },
                        { id: 'finished_product', label: 'Finished Product' },
                        { id: 'company_asset', label: 'Company Asset' },
                        { id: 'service', label: 'Service' }
                      ].map(t => (
                        <button 
                          key={t.id}
                          type="button"
                          onClick={() => setFormData({...formData, type: t.id})}
                          className={\`py-2 text-xs font-semibold rounded-md border transition-all \${formData.type === t.id ? 'bg-rex-500/10 border-rex-500 text-rex-600' : 'bg-surface2 border-theme-subtle text-muted hover:text-secondary'}\`}
                        >{t.label}</button>
                      ))}
                    </div>`;
code = code.replace(oldFormButtons, newFormButtons);

// 8. Update CSV logic - Download template
code = code.replace(
  /const headers = \['Type\(product\/service\)',/g,
  "const headers = ['Type(raw_material/finished_product/service/company_asset)',"
);
code = code.replace(
  /const row = \['product', 'Sample Item',/g,
  "const row = ['raw_material', 'Sample Item',"
);

// 9. Update CSV logic - parsing
code = code.replace(
  /const type = \(row\[0\]\|\|''\)\.toLowerCase\(\) === 'service' \? 'service' : 'product'/g,
  `let typeStr = (row[0]||'').toLowerCase().replace(' ', '_');
        if (!['raw_material', 'finished_product', 'service', 'company_asset'].includes(typeStr)) {
          typeStr = typeStr === 'product' ? 'finished_product' : 'raw_material';
        }
        const type = typeStr;`
);

// 10. Update Tabs at the bottom
const oldTabs = `<div className="flex items-center bg-surface2/50 p-1 rounded-lg border border-theme-subtle">
          <button 
            className={\`px-4 py-1.5 text-xs font-semibold rounded-md transition-all \${activeTab === 'all' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}\`}
            onClick={() => setActiveTab('all')}
          >All Items</button>
          <button 
            className={\`px-4 py-1.5 text-xs font-semibold rounded-md transition-all \${activeTab === 'product' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}\`}
            onClick={() => setActiveTab('product')}
          >Products</button>
          <button 
            className={\`px-4 py-1.5 text-xs font-semibold rounded-md transition-all \${activeTab === 'service' ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}\`}
            onClick={() => setActiveTab('service')}
          >Services</button>
        </div>`;
const newTabs = `<div className="flex items-center bg-surface2/50 p-1 rounded-lg border border-theme-subtle overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'raw_material', label: 'Raw Materials' },
            { id: 'finished_product', label: 'Finished Products' },
            { id: 'company_asset', label: 'Company Assets' },
            { id: 'service', label: 'Services' }
          ].map(t => (
            <button 
              key={t.id}
              className={\`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap \${activeTab === t.id ? 'bg-surface border border-theme-subtle text-primary shadow-sm' : 'text-muted hover:text-secondary'}\`}
              onClick={() => setActiveTab(t.id as TabType)}
            >{t.label}</button>
          ))}
        </div>`;
code = code.replace(oldTabs, newTabs);

fs.writeFileSync('src/pages/inventory/Inventory.tsx', code, 'utf8');
console.log('Modifications applied');
