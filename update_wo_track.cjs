const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// Add bom to trackWO modal
const bomRender = `
              </div>
              
              {/* BOM Display */}
              {trackWO.bom && (
                <div className="bg-surface/50 p-4 border border-theme-subtle rounded-lg mt-4">
                  <h3 className="text-sm font-bold text-primary mb-3">Bill of Materials</h3>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-theme-subtle text-xs text-muted">
                        <th className="py-2">Item</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">Notes</th>
                        <th className="py-2 text-right">Dispatch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {JSON.parse(trackWO.bom).map((b: any, i: number) => (
                        <tr key={i} className="border-b border-theme-subtle/50 last:border-0">
                          <td className="py-2 font-medium text-primary">{b.material}</td>
                          <td className="py-2 text-secondary">{b.qty} {b.unit}</td>
                          <td className="py-2 text-xs text-muted">{b.notes}</td>
                          <td className="py-2 text-right">
                            <button className="text-[10px] bg-rex-600 hover:bg-rex-500 text-white px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors">
                              Dispatch
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="space-y-3">
`;

content = content.replace(/<\/div>\s*<div className="space-y-3">/, bomRender);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');