import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

old_desc = """        let finalDesc = b.title;
        if (b.title.startsWith('BOM Part ')) {
            finalDesc = b.description ? b.description : 'Machined Component';
        } else {
            if (b.description) {
                finalDesc += `\\n\\n${b.description}`;
            }
        }"""

new_desc = """        let finalDesc = b.title.startsWith('BOM Part ') 
            ? 'Custom Fabrication & Manufacturing' 
            : `Fabrication and Supply of ${b.title}`;
            
        if (b.description) {
            finalDesc += `\\n\\nScope of Work:\\n${b.description}`;
        }"""

code = code.replace(old_desc, new_desc)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

