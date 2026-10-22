const fs = require('fs');
let content = fs.readFileSync('src/lib/utils.ts', 'utf8');

// Completely disable the K and M formatting in formatCurrency
content = content.replace(
  /export function formatCurrency\(amount: number, short = false\): string \{\n\s*if \(short\) \{\n\s*if \(amount >= 1_000_000\) return `Rs\. \$\{\(amount \/ 1_000_000\)\.toFixed\(1\)\}M`\n\s*if \(amount >= 1_000\) return `Rs\. \$\{\(amount \/ 1_000\)\.toFixed\(0\)\}K`\n\s*return `Rs\. \$\{amount\.toLocaleString\(\)\}`\n\s*\}\n\s*return `Rs\. \$\{amount\.toLocaleString\('en-LK'\)\}`\n\}/g,
  `export function formatCurrency(amount: number, short = false): string {
  return \`Rs. \${(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`
}`
);

fs.writeFileSync('src/lib/utils.ts', content, 'utf8');