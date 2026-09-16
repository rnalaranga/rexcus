const fs = require('fs');
let content = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

// 1. Add confirm delete modal state
const stateAnchor = "const [errorModal, setErrorModal] = useState<string | null>(null);";
if (!content.includes('deleteConfirmModal')) {
    content = content.replace(stateAnchor, stateAnchor + "\n  const [deleteConfirmModal, setDeleteConfirmModal] = useState<string | null>(null);");
}

// 2. Change handleDeleteWO to just set the state
const oldDelete = `const handleDeleteWO = async (id: string) => {
    if (confirm('Are you sure you want to delete this work order?')) {
      await fetch(API + '/production/work-orders/' + id, { method: 'DELETE' });
      fetchData();
    }
  };`;
const newDelete = `const handleDeleteWO = (id: string) => {
    setDeleteConfirmModal(id);
  };
  
  const executeDeleteWO = async () => {
    if (!deleteConfirmModal) return;
    await fetch(API + '/production/work-orders/' + deleteConfirmModal, { method: 'DELETE' });
    setDeleteConfirmModal(null);
    fetchData();
  };`;
if (content.includes(oldDelete)) {
    content = content.replace(oldDelete, newDelete);
}

// 3. Add Delete Confirmation Modal UI
const endAnchor = "    </div>\n  )\n}";
const deleteModalCode = `
      <Modal isOpen={!!deleteConfirmModal} onClose={() => setDeleteConfirmModal(null)} title="Confirm Deletion" size="sm">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} />
          </div>
          <p className="text-sm font-bold text-primary mb-2">Are you absolutely sure?</p>
          <p className="text-xs text-muted mb-6">This will permanently delete this work order and all its operations.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteConfirmModal(null)}>Cancel</Button>
            <Button variant="primary" className="bg-red-500 hover:bg-red-600 border-none text-white" onClick={executeDeleteWO}>Delete Work Order</Button>
          </div>
        </div>
      </Modal>
`;
if (content.includes(endAnchor) && !content.includes('deleteConfirmModal}')) {
    content = content.replace(endAnchor, deleteModalCode + endAnchor);
}

fs.writeFileSync('src/pages/production/WorkOrders.tsx', content, 'utf8');
console.log('Fixed window.confirm');