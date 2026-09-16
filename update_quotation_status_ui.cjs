const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/Quotations.tsx', 'utf8');

if (!content.includes('updateQuotationStatus')) {
  content = content.replace(
    "import { deleteQuotation } from '@/lib/api'",
    "import { deleteQuotation, updateQuotationStatus } from '@/lib/api'\nimport { toast } from 'react-hot-toast'"
  );
}

// Add the status change handler
const changeHandler = `
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateQuotationStatus(id, status)
      toast.success('Status updated successfully')
      refetch()
    } catch(e) {
      toast.error('Failed to update status')
    }
  }
`;

content = content.replace("export const Quotations: React.FC = () => {", "export const Quotations: React.FC = () => {\n" + changeHandler);

// Add Status Dropdown in the header
const headerReplace = `                      <h3 className="text-base font-bold text-primary flex items-center gap-2">
                        {group.quoNo}
                        {latestMain && <span className="text-[10px] bg-rex-500/20 text-rex-700 dark:text-rex-300 px-2 py-0.5 rounded-full font-bold">MAIN v{latestMain.version}</span>}
                        {latestMain && (
                          <select 
                            value={latestMain.status || 'Draft'}
                            onChange={(e) => handleStatusChange(latestMain.id, e.target.value)}
                            className="ml-2 text-[10px] bg-surface2 border border-theme-subtle rounded px-2 py-0.5 text-primary font-medium focus:outline-none focus:border-rex-500"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="In Production">In Production</option>
                          </select>
                        )}
                      </h3>`;

content = content.replace(/<h3 className="text-base font-bold text-primary flex items-center gap-2">[\s\S]*?<\/h3>/, headerReplace);

fs.writeFileSync('src/pages/crm/Quotations.tsx', content, 'utf8');