const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const badCode = '<Button variant="ghost" size="sm" onClick={() => openTrackModal(row)} className="text-rex-600 hover:bg-rex-500/10"><Settings size={14} className="mr-1.5"/> Track</Button><Button variant="ghost" size="sm" onClick={() => handleDeleteWO(row.id)} className="text-red-500 hover:bg-red-500/10 ml-2"><Trash2 size={14}/></Button></div>';

const goodCode = '<div className="flex justify-end items-center"><Button variant="ghost" size="sm" onClick={() => openTrackModal(row)} className="text-rex-600 hover:bg-rex-500/10"><Settings size={14} className="mr-1.5"/> Track</Button><Button variant="ghost" size="sm" onClick={() => handleDeleteWO(row.id)} className="text-red-500 hover:bg-red-500/10 ml-2"><Trash2 size={14}/></Button></div>';

if (content.includes(badCode)) {
    content = content.replace(badCode, goodCode);
    fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
    console.log('Fixed JSX syntax error');
} else {
    console.log('Bad code not found, let us search for it');
}