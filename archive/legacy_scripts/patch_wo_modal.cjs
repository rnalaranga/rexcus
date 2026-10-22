const fs = require('fs');
let code = fs.readFileSync('src/pages/production/WorkOrders.tsx', 'utf8');

const injectState = "const [deleteConfirmModal, setDeleteConfirmModal] = useState<string | null>(null);";
code = code.replace(injectState, injectState + "\n  const [inspectorOp, setInspectorOp] = useState<any>(null);");

const modalHTML = `
      {/* TIME INSPECTOR MODAL */}
      <Modal isOpen={!!inspectorOp} onClose={() => setInspectorOp(null)} title="Operation Scheduler" size="sm">
        {inspectorOp && (() => {
          const sT = inspectorOp.scheduledStart ? inspectorOp.scheduledStart.slice(0, 16) : '';
          const submitInspector = async (e) => {
            e.preventDefault();
            const f = new FormData(e.target);
            await handleAssignOperation(inspectorOp.id, 'employeeId', inspectorOp.employeeId || '', f.get('start'), f.get('isLocked') === 'on');
            setInspectorOp(null);
            fetchData();
          };
          return (
            <form onSubmit={submitInspector} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Start Time</label>
                <input type="datetime-local" name="start" defaultValue={sT} className="input-base w-full" required />
              </div>
              <div>
                <label className="text-xs font-bold text-secondary mb-1 block">Lock Schedule</label>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isLocked" defaultChecked={!!inspectorOp.isLocked} className="rounded text-rex-500 focus:ring-rex-500 bg-surface2 border-theme-subtle" />
                  <span className="text-xs text-muted">Pin this operation (prevents drag-and-drop changes)</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-theme-subtle">
                <Button variant="ghost" type="button" onClick={() => setInspectorOp(null)}>Cancel</Button>
                <Button variant="primary" type="submit">Save Changes</Button>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  )
}
`;

code = code.replace(/    <\/div>\s*\)\s*}\s*$/, modalHTML);

fs.writeFileSync('src/pages/production/WorkOrders.tsx', code, 'utf8');
console.log('Modal and state added');