const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Leads.tsx', 'utf8');

const tg = `            {editId ? (
              <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Lead</Button>
            ) : <div />}`;
const rp = `            {editId ? (
              <div className="flex gap-2 items-center">
                <Button variant="ghost" type="button" onClick={handleDelete} className="text-rex-500 hover:bg-rex-500/10">Delete Lead</Button>
                {formData.stage !== 'Won' && <Button variant="primary" type="button" onClick={handleConvertToCustomer} className="bg-emerald-500 hover:bg-emerald-600 border-emerald-500">Convert</Button>}
              </div>
            ) : <div />}`;

code = code.replace(tg, rp);
fs.writeFileSync('src/pages/crm/Leads.tsx', code, 'utf8');