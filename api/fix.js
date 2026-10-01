const fs = require('fs'); let c = fs.readFileSync('src/server.ts', 'utf8'); c = c.replace('});\\n\\napp.get', '});

app.get'); fs.writeFileSync('src/server.ts', c);
