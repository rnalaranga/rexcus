const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf8');

const newFunc = `
export const createWorkOrder = async (data: any) => {
  const res = await fetch(\`\${API_URL}/production/work-orders\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};
`;

content = content + "\n" + newFunc;

fs.writeFileSync('src/lib/api.ts', content, 'utf8');