const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf8');

const newFunc = `
export const updateQuotationStatus = async (id: string, status: string) => {
  const res = await fetch(\`\${API_URL}/quotations/status/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};
`;

content = content.replace(
  "export const deleteQuotation",
  newFunc + "\nexport const deleteQuotation"
);

fs.writeFileSync('src/lib/api.ts', content, 'utf8');