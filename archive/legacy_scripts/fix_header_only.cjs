const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const oldHeader = `        <div className="flex justify-between items-end pb-2">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Planning</h1>
            <p className="text-xs text-muted mt-1">Manage jobs, routings, and track shop floor progress.</p>
          </div>
          <div className="flex items-center gap-2">`;
const newHeader = `        <div className="flex justify-between items-end pb-2">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Work Orders & Planning</h1>
            <p className="text-xs text-muted mt-1">Manage jobs, routings, and track shop floor progress.</p>
          </div>
          <div className="flex items-center gap-2">
          <div className="flex border border-theme-subtle rounded overflow-hidden mr-2">
            <button onClick={() => setViewMode('dashboard')} className={\`px-3 py-1.5 text-xs transition-colors \${viewMode === 'dashboard' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}\`}>Dashboard</button>
            <button onClick={() => setViewMode('planning')} className={\`px-3 py-1.5 text-xs transition-colors \${viewMode === 'planning' ? 'bg-rex-500/10 text-rex-600 dark:text-rex-400' : 'text-muted hover:text-primary'}\`}>Labor Planning</button>
          </div>`;

if (content.includes(oldHeader)) {
    content = content.replace(oldHeader, newHeader);
    console.log("Header replaced");
} else {
    console.log("Could not find exact header to replace");
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');