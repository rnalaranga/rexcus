const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

const getStatusColorFunc = `
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50';
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      case 'In Production': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50';
      default: return 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700/50';
    }
  }
`;

content = content.replace("const handleStatusChange = async", getStatusColorFunc + "\n  const handleStatusChange = async");

const oldSelect = `{latestMain && (
                            <select 
                              value={latestMain.status || 'Draft'}
                              onChange={(e) => handleStatusChange(latestMain.id, e.target.value)}
                              className="ml-2 text-[10px] bg-surface2 border border-theme-subtle rounded px-2 py-0.5 text-primary font-medium focus:outline-none focus:border-rex-500"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Sent">Sent</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                              <option value="In Production">In Production</option>
                            </select>
                          )}`;

const newSelect = `{latestMain && (
                            <div className="relative ml-2 group/status cursor-pointer">
                              <select 
                                value={latestMain.status || 'Draft'}
                                onChange={(e) => handleStatusChange(latestMain.id, e.target.value)}
                                className={\`appearance-none cursor-pointer text-[10px] uppercase tracking-wider font-black rounded-full px-3 py-1 pr-6 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rex-500/50 transition-all duration-200 \${getStatusColor(latestMain.status || 'Draft')}\`}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="In Production">In Production</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                                <svg className={\`w-3 h-3 \${getStatusColor(latestMain.status || 'Draft').split(' ')[1]}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                            </div>
                          )}`;

content = content.replace(oldSelect, newSelect);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');