const fs = require('fs');
let content = fs.readFileSync('src/pages/production/Machinery.tsx', 'utf8');

const regex = /const handleSaveOperators = async \(\) => \{[\s\S]*?setManageMachine\(null\)\s*\}/;

const newSave = `const handleSaveOperators = async () => {
    if (!manageMachine) return
    try {
      const res = await fetch(\`\${API_URL}/production/machineries/\${manageMachine.id}/operators\`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: assignedOperators })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      setManageMachine(null)
    } catch (err: any) {
      console.error(err);
      alert("DB Error: " + err.message);
    }
  }`;

if (regex.test(content)) {
    content = content.replace(regex, newSave);
    console.log("Updated handleSaveOperators");
} else {
    console.log("Could not find regex");
}
fs.writeFileSync('src/pages/production/Machinery.tsx', content, 'utf8');