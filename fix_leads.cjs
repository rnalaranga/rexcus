const fs = require('fs');
let code = fs.readFileSync('src/pages/crm/Leads.tsx', 'utf8');

code = code.replace(/const \[formData, setFormData\] = useState\(\{[^\}]*\}\)/,
  `const [formData, setFormData] = useState({
    name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: ''
  })`
);

code = code.replace(
  /setFormData\(\{ name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new' \}\)/,
  `setFormData({ name: '', company: '', email: '', phone: '', source: 'website', priority: 'medium', value: '', stage: 'new', vat: '', svat: '' })`
);

code = code.replace(
  /source: lead\.source,/g,
  `source: lead.source, vat: lead.vat || '', svat: lead.svat || '',`
);

code = code.replace(
  /<input value=\{formData\.company\}/,
  `<input required value={formData.company}`
);
code = code.replace(
  />Company<\/label>/,
  `>Company <span className="text-rex-500">*</span></label>`
);

code = code.replace(
  /<input type="email" value=\{formData\.email\}/,
  `<input type="email" required value={formData.email}`
);
code = code.replace(
  />Email Address<\/label>/,
  `>Email Address <span className="text-rex-500">*</span></label>`
);

code = code.replace(
  /<input type="tel" value=\{formData\.phone\}/,
  `<input type="tel" required value={formData.phone}`
);
code = code.replace(
  />Phone Number<\/label>/,
  `>Phone Number <span className="text-rex-500">*</span></label>`
);

const newFields = `
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">VAT Number <span className="text-rex-500">*</span></label>
                <input required value={formData.vat} onChange={e => setFormData({...formData, vat: e.target.value})} className="w-full input-base" placeholder="VAT Number" />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">SVAT Number <span className="text-rex-500">*</span></label>
                <input required value={formData.svat} onChange={e => setFormData({...formData, svat: e.target.value})} className="w-full input-base" placeholder="SVAT Number" />
              </div>
`;

code = code.replace(
  /<div className="space-y-1\.5 col-span-2 sm:col-span-1">\s*<label className="text-\[10px\] font-semibold text-secondary uppercase tracking-wider">Priority<\/label>/,
  newFields + '\n              <div className="space-y-1.5 col-span-2 sm:col-span-1">\n                <label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Priority</label>'
);

fs.writeFileSync('src/pages/crm/Leads.tsx', code);
console.log('done');
