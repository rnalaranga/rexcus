const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

const envStr = "${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}";

walk('src', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Replace 'http://localhost:3000/api...' with `${...}...`
        // We have to handle both single quotes and double quotes, and backticks.
        content = content.replace(/'http:\/\/localhost:3000\/api([^']*)'/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:3000/api\'}$1`');
        content = content.replace(/"http:\/\/localhost:3000\/api([^"]*)"/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:3000/api\'}$1`');
        
        // Also handle cases where it's already in a template literal like `${API}` or just string concatenation if we want, but let's just stick to the simple one.
        // What about `http://localhost:3000/api` inside backticks?
        // Like `http://localhost:3000/api/finance/reports/${reportType}`
        content = content.replace(/`http:\/\/localhost:3000\/api([^`]*)`/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:3000/api\'}$1`');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('Fixed', filePath);
        }
    }
});