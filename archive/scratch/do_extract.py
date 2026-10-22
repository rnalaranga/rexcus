import sys
import re

with open('scratch/InvoiceBuilder_fullscreen.tsx', 'r') as f:
    content = f.read()

start = content.find("const InvoicePreview: React.FC<any> = ({")
end = content.find("};\n\nexport const InvoiceBuilder") + 2

preview_code = content[start:end]

to_words = """
export function toWords(num: number): string {
  if (num === 0) return 'Zero';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const g = ['','Thousand','Million','Billion'];
  const makeGroup = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n] + ' '; }
    return str.trim();
  };
  let result = '';
  let i = 0;
  let val = Math.floor(Math.abs(num));
  while (val > 0) {
    const chunk = val % 1000;
    if (chunk !== 0) {
      result = makeGroup(chunk) + ' ' + g[i] + ' ' + result;
    }
    val = Math.floor(val / 1000);
    i++;
  }
  return result.trim() + ' Only';
}

export const TEMPLATES = [
  { id: 'government', name: 'Government Format', description: 'Official statutory layout', color: '#000000', accent: '#000000' },
  { id: 'classic', name: 'Classic', description: 'Clean minimal white', color: '#1e1e2e', accent: '#2563eb' },
  { id: 'modern',  name: 'Modern',  description: 'Bold dark gradient',  color: '#0f172a', accent: '#b91c1c' },
  { id: 'elegant', name: 'Elegant', description: 'Light professional',   color: '#374151', accent: '#059669' },
];
"""

final_code = "import React from 'react';\nimport { formatCurrency } from '@/lib/utils';\n" + to_words + "\nexport " + preview_code

with open('src/components/finance/InvoicePreview.tsx', 'w') as f:
    f.write(final_code)

# Now we rewrite InvoiceBuilder to use it
new_builder = content[:start] + content[end:]
new_builder = "import { InvoicePreview, TEMPLATES, toWords } from '@/components/finance/InvoicePreview';\n" + new_builder

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(new_builder)
