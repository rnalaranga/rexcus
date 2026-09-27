const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Leads.tsx', 'utf8');

const convertFunc =   const handleConvertToCustomer = async () => {
    if (!editId) return;
    if (confirm('Are you sure you want to convert this lead to a Customer? It will be marked as Won.')) {
      setSubmitting(true);
      try {
        const res = await fetch('http://localhost:3000/api/leads/' + editId + '/convert', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert('Successfully converted to Customer! ID: ' + data.customerId);
          setShowForm(false);
          refetch();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (e) {
        alert('Network error');
      }
      setSubmitting(false);
    }
  };

  const handleDelete;

code = code.replace("  const handleDelete", convertFunc);

const buttonsTarget = <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Lead</Button>
              ) : <div />};

const buttonsReplacement = <div className="flex gap-2">
                <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Lead</Button>
                {formData.stage !== 'Won' && <Button variant="primary" type="button" onClick={handleConvertToCustomer} className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500">Convert to Customer</Button>}
              </div>
              ) : <div />};

code = code.replace(buttonsTarget, buttonsReplacement);

fs.writeFileSync('src/pages/crm/Leads.tsx', code, 'utf8');
console.log('Leads.tsx patched with Convert button');