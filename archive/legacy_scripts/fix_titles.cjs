const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Dashboard Table
const oldTableCol = `<p className="text-sm font-semibold text-primary truncate">{row.title}</p><p className="text-[10px] text-muted font-mono">{row.id}</p>`;
const newTableCol = `<p className="text-sm font-semibold font-mono text-primary truncate">{row.id}</p><p className="text-[10px] text-muted truncate">{row.title}</p>`;
content = content.replace(oldTableCol, newTableCol);

// 2. Track Modal Header
const oldTrackHeader = `<span className="text-[10px] font-mono text-muted">{trackWO.id}</span>
                    </div>
                    <h2 className="text-lg font-bold text-primary truncate">{trackWO.title}</h2>
                    <p className="text-xs text-muted mt-0.5">{trackWO.customerId || 'No customer assigned'}</p>`;
const newTrackHeader = `</div>
                    <h2 className="text-lg font-bold font-mono text-primary truncate">{trackWO.id}</h2>
                    <p className="text-xs text-muted mt-0.5">{trackWO.title} {trackWO.customerId ? ' • ' + trackWO.customerId : ''}</p>`;
content = content.replace(oldTrackHeader, newTrackHeader);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');