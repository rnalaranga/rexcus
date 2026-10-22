const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Settings.tsx', 'utf8');

const importReplacement = `import React, { useState } from 'react';`;
code = code.replace(/import React from 'react';/, importReplacement);

const newFunction = `
  const handleFreshDb = async () => {
    const pw = prompt('Enter super password to wipe and refresh database:');
    if (pw !== '0715719676@Bcg') {
      if (pw !== null) alert('Incorrect password!');
      return;
    }
    
    if (confirm('WARNING: This will delete all transactional data (Quotations, Leads, Invoices, etc). Are you absolutely sure?')) {
      try {
        const res = await fetch('http://localhost:3000/api/settings/fresh-db', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: pw }) });
        const data = await res.json();
        if (data.success) {
          alert('Database refreshed successfully!');
          window.location.reload();
        } else {
          alert('Failed to refresh DB: ' + data.error);
        }
      } catch (e) {
        alert('Error: ' + e.message);
      }
    }
  };
`;

code = code.replace(/const handleSave = async \(\) => \{/, newFunction + '\n  const handleSave = async () => {');

const newButton = `
          <GlassCard className="p-6 col-span-1 md:col-span-2 border-red-500/30">
            <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">Wipe all transactional data and refresh the database to a clean state. Master data (Users, Settings) will be kept.</p>
              <Button variant="ghost" onClick={handleFreshDb} className="text-red-500 bg-red-500/10 hover:bg-red-500/20">Fresh DB</Button>
            </div>
          </GlassCard>
        </div>
      </div>
    );
`;

code = code.replace(/<\/div>\s*<\/div>\s*\);/, newButton);

fs.writeFileSync('src/pages/admin/Settings.tsx', code);
console.log('done');
