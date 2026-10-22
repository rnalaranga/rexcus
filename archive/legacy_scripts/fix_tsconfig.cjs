const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf8');

if (!content.includes('"vite/client"')) {
    content = content.replace('"compilerOptions": {', '"compilerOptions": {\n    "types": ["vite/client"],');
    fs.writeFileSync('tsconfig.json', content, 'utf8');
}
console.log('Fixed tsconfig');