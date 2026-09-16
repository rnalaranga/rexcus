const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

// Header buttons for MAIN
const mainButtons = `<div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${group.leadId}?quoteId=\${latestMain?.id || displayQ.id}&preview=true\`)} className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 h-8">
                         View Quote
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${group.leadId}?quoteId=\${displayQ.id}\`)} className="bg-surface border border-theme-subtle hover:bg-surface2 h-8">
                         Edit
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async () => {
`;
content = content.replace(
  /<div className="flex flex-col gap-2">\s*<Button variant="ghost" size="sm" onClick=\{\(\) => navigate[^>]+>\s*Open Editor\s*<\/Button>\s*<Button variant="ghost" size="sm" onClick=\{async \(\) => \{/m,
  mainButtons
);

// Job buttons
const jobButtons = `<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${group.leadId}?quoteId=\${latestJob.id}&preview=true\`)} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${group.leadId}?quoteId=\${latestJob.id}\`)} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>`;
content = content.replace(
  /\{latestJob && \(\s*<Button variant="ghost" size="sm" onClick=\{\(\) => navigate\(\`\/crm\/quotations\/new\/\$\{group\.leadId\}\?quoteId=\$\{latestJob\.id\}\`\)\} className="opacity-0 group-hover:opacity-100 transition-opacity">\s*Open <ArrowRight size=\{14\} className="ml-1" \/>\s*<\/Button>\s*\)\}/m,
  `{latestJob && (${jobButtons})}`
);

// Cust buttons
const custButtons = `<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${group.leadId}?quoteId=\${latestCust.id}&preview=true\`)} className="text-xs h-7 px-2">
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(\`/crm/quotations/new/\${group.leadId}?quoteId=\${latestCust.id}\`)} className="text-xs h-7 px-2">
                        Edit
                      </Button>
                    </div>`;
content = content.replace(
  /\{latestCust && \(\s*<Button variant="ghost" size="sm" onClick=\{\(\) => navigate\(\`\/crm\/quotations\/new\/\$\{group\.leadId\}\?quoteId=\$\{latestCust\.id\}\`\)\} className="opacity-0 group-hover:opacity-100 transition-opacity">\s*Open <ArrowRight size=\{14\} className="ml-1" \/>\s*<\/Button>\s*\)\}/m,
  `{latestCust && (${custButtons})}`
);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');