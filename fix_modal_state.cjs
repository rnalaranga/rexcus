const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Add the states below `const [toast, setToast] = `
const regex = /const \[toast, setToast\] = useState<.*?null>\(null\)/;
content = content.replace(regex, match => match + "\n  const [showMarginModal, setShowMarginModal] = useState(false)\n  const [marginInput, setMarginInput] = useState('35')");

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');