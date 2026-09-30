const fs = require('fs');

// 1. Update api.ts
let apiCode = fs.readFileSync('src/lib/api.ts', 'utf8');
if (!apiCode.includes('export const deleteCustomer = async')) {
  apiCode = apiCode.replace(/export const updateCustomer = async [\\s\\S]*?\\n  \\};/, match => match + '\n  export const deleteCustomer = async (id: string) => {\n    const res = await fetch(`${API_URL}/customers/${id}`, { method: \'DELETE\' });\n    return res.json();\n  };');
  fs.writeFileSync('src/lib/api.ts', apiCode);
}

// 2. Update Customers.tsx
let code = fs.readFileSync('src/pages/crm/Customers.tsx', 'utf8');

code = code.replace(/import \{ createCustomer \} from '@\/lib\/api'/, "import { createCustomer, deleteCustomer } from '@/lib/api'");
code = code.replace(/const \[submitting, setSubmitting\]       = useState\(false\)/, "const [submitting, setSubmitting]       = useState(false)\n  const [deleting, setDeleting] = useState<string | null>(null)");

const deleteHandler = `
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this customer?')) {
      setDeleting(id);
      try {
        await deleteCustomer(id);
        refetch();
      } catch (err) {
        alert('Failed to delete customer.');
      }
      setDeleting(null);
    }
  };
`;

code = code.replace(/const handleSubmit = async/, deleteHandler + '\n  const handleSubmit = async');

// Let's check how actions are rendered in DataTable inside Customers.tsx
console.log('done');
