const fs = require('fs');
let content = fs.readFileSync('src/pages/production/Machinery.tsx', 'utf8');

const regex = /setManageMachine\(null\)/;
const replacement = `setManageMachine(null)\n      fetchData()`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    console.log("Added fetchData() to handleSaveOperators");
} else {
    console.log("Could not find setManageMachine(null)");
}

fs.writeFileSync('src/pages/production/Machinery.tsx', content, 'utf8');