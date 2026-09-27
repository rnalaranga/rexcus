const fs = require('fs');
let code = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const regexAssign = /const handleAssignOperation = async \(opId: string, field: 'employeeId'\|'machineId', val: string, scheduledStart\?: string\) => \{([\s\S]*?)try \{/;

const newAssign = `const handleAssignOperation = async (opId: string, field: 'employeeId'|'machineId', val: string, scheduledStart?: string, isLocked?: boolean) => {
$1    if (isLocked !== undefined) payload.isLocked = isLocked;
    try {`;

code = code.replace(regexAssign, newAssign);
fs.writeFileSync('src/pages/production/WorkOrders.tsx', code, 'utf8');
console.log('Patched handleAssignOperation');