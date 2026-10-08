import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

old_desc = """        const itemName = b.title.startsWith('BOM Part ') ? 'Machined Component' : b.title.toUpperCase();
        let finalDesc = `Precision manufacturing and fabrication of ${itemName} as per the provided technical specifications and requirements.`;
        
        if (b.description) {
            finalDesc += `\\n\\nScope of work includes: ${b.description}`;
        }"""

new_desc = """        let finalDesc = b.title;
        if (b.title.startsWith('BOM Part ')) {
            finalDesc = b.description ? b.description : 'Machined Component';
        } else {
            if (b.description) {
                finalDesc += `\\n\\n${b.description}`;
            }
        }"""

code = code.replace(old_desc, new_desc)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)

