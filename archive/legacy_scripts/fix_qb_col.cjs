const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Change header width
content = content.replace(
  '<th className="px-3 py-2.5 w-28">Hr Rate</th>',
  '<th className="px-3 py-2.5 w-48">Rates</th>'
);

// Add whitespace-nowrap to the cell
content = content.replace(
  '<td className="px-3 py-1.5 text-xs text-muted font-mono border-l border-theme-subtle/30">Rs. {Number(st.hrRate',
  '<td className="px-3 py-1.5 text-xs text-muted font-mono border-l border-theme-subtle/30 whitespace-nowrap">Rs. {Number(st.hrRate'
);

// Format with a nice dot separator instead of pipe, it looks cleaner
content = content.replace(
  'toLocaleString()}/hr | Rs. {Number',
  'toLocaleString()}/hr  •  Rs. {Number'
);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');