const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const trackHeaderOld = `</div>
                    <h2 className="text-lg font-bold font-mono text-primary truncate">{trackWO.id}</h2>
                    <p className="text-xs text-muted mt-0.5">{trackWO.title} {trackWO.customerId ? ' • ' + trackWO.customerId : ''}</p>`;
const trackHeaderNew = `<span className="text-[10px] font-mono text-muted">{trackWO.id}</span>
                    </div>
                    <h2 className="text-lg font-bold text-primary">{trackWO.title}</h2>
                    <p className="text-xs text-muted mt-0.5">{trackWO.customerId || 'No customer assigned'}</p>`;
                    
content = content.replace(trackHeaderOld, trackHeaderNew);
fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log("Track Header Reversed");