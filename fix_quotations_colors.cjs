const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

const regex = /\{latestMain && \([\s\S]*?<select[\s\S]*?value=\{latestMain\.status \|\| 'Draft'\}[\s\S]*?onChange=\{\(e\) => handleStatusChange\(latestMain\.id, e\.target\.value\)\}[\s\S]*?className="[\s\S]*?"[\s\S]*?>[\s\S]*?<option value="Draft">Draft<\/option>[\s\S]*?<option value="Sent">Sent<\/option>[\s\S]*?<option value="Approved">Approved<\/option>[\s\S]*?<option value="Rejected">Rejected<\/option>[\s\S]*?<option value="In Production">In Production<\/option>[\s\S]*?<\/select>[\s\S]*?\)\}/;

const newSelect = `{latestMain && (
                            <div className="relative ml-2 group/status cursor-pointer">
                              <select 
                                value={latestMain.status || 'Draft'}
                                onChange={(e) => handleStatusChange(latestMain.id, e.target.value)}
                                className={\`appearance-none cursor-pointer text-[10px] uppercase tracking-wider font-black rounded-full px-3 py-1 pr-6 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rex-500/50 transition-all duration-200 \${getStatusColor(latestMain.status || 'Draft')}\`}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="In Production">In Production</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                                <svg className={\`w-3 h-3 \${getStatusColor(latestMain.status || 'Draft').split(' ')[1]}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                              </div>
                            </div>
                          )}`;

content = content.replace(regex, newSelect);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');