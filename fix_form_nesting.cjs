const fs = require('fs');
let content = fs.readFileSync('src/pages/inventory/Inventory.tsx', 'utf8');

content = content.replace(
  '<form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">',
  '<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">'
);

content = content.replace(
  '<Button variant="primary" type="submit" disabled={submitting}>{submitting ? \'...\' : \'Add Entry\'}</Button>\n        </form>',
  '<Button variant="primary" type="button" onClick={handleAdd} disabled={submitting}>{submitting ? \'...\' : \'Add Entry\'}</Button>\n        </div>'
);

content = content.replace(
  'const handleAdd = async (e: React.FormEvent) => {\n    e.preventDefault()',
  'const handleAdd = async (e?: React.FormEvent | React.MouseEvent) => {\n    if (e) e.preventDefault()'
);

fs.writeFileSync('src/pages/inventory/Inventory.tsx', content, 'utf8');