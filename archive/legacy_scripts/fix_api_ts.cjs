const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

if (!code.includes('export const deleteCustomer')) {
  const add = `
export const deleteCustomer = async (id: string) => {
  const res = await fetch(\`\${API_URL}/customers/\${id}\`, { method: 'DELETE' });
  return res.json();
};
`;
  code = code.replace(/export const updateCustomer[\s\S]*?return res\.json\(\);\n};/, match => match + '\n' + add);
  fs.writeFileSync('src/lib/api.ts', code);
  console.log('done');
}