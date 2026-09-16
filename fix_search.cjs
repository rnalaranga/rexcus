const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// Fix the filter and mapping
const oldSearchLine1 = "{inventory.filter(i => (i.type === 'consumable' || i.type === 'accessory' || !i.type) && i.name.toLowerCase().includes(accSearch.toLowerCase())).length > 0 ? (";
const newSearchLine1 = "{inventory.filter(i => i.name && i.name.toLowerCase().includes(accSearch.toLowerCase())).length > 0 ? (";

const oldSearchLine2 = "inventory.filter(i => (i.type === 'consumable' || i.type === 'accessory' || !i.type) && i.name.toLowerCase().includes(accSearch.toLowerCase())).map(i => (";
const newSearchLine2 = "inventory.filter(i => i.name && i.name.toLowerCase().includes(accSearch.toLowerCase())).map(i => (";

const oldUnit = "<span className={`text-xs font-mono ${i.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>{i.quantity} {i.unit}</span>";
const newUnit = "<span className={`text-xs font-mono ${i.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>{i.quantity} {i.uom || 'pcs'}</span>";

content = content.replace(oldSearchLine1, newSearchLine1);
content = content.replace(oldSearchLine2, newSearchLine2);
content = content.replace(oldUnit, newUnit);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log("Fixed search filter and unit.");