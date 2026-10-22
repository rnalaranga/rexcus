import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

find_phrase = """        let finalDesc = '';
        if (!b.title.startsWith('BOM Part ')) {
            finalDesc += b.title.toUpperCase();
        }
        
        if (b.description) {
            finalDesc += (finalDesc ? '\\n' : '') + b.description;
        }
        
        if (!finalDesc) {
            finalDesc = "Machining & Fabrication";
        }
        
        if (uniqueMats) {
            finalDesc += `\\n• Material: ${uniqueMats}`;
        }"""

rep_phrase = """        const itemName = b.title.startsWith('BOM Part ') ? 'Machined Component' : b.title.toUpperCase();
        let finalDesc = `Precision manufacturing and fabrication of ${itemName} as per the provided technical specifications and requirements.`;
        
        if (b.description) {
            finalDesc += `\\n\\nScope of work includes: ${b.description}`;
        }"""

content = content.replace(find_phrase, rep_phrase)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated AI phrase generation")
