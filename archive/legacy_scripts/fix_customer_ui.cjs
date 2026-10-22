const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Customers.tsx', 'utf8');

const regex = /const \[submitting, setSubmitting\]       = useState\(false\)/;
if (code.includes('const [submitting, setSubmitting]       = useState(false)')) {
  code = code.replace(regex, "const [submitting, setSubmitting]       = useState(false)\n  const [deleting, setDeleting] = useState<string | null>(null)");
}

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

if (!code.includes('const handleDelete')) {
  code = code.replace(/const handleCreateCustomer = async/, deleteHandler + '\n  const handleCreateCustomer = async');
}

fs.writeFileSync('src/pages/crm/Customers.tsx', code);
console.log('done');
