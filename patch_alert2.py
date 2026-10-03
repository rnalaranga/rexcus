import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add useDialog import
if "useDialog" not in content:
    content = content.replace("import { Modal } from '@/components/ui/Modal'", "import { Modal } from '@/components/ui/Modal'\nimport { useDialog } from '@/components/ui/DialogProvider'")

# Add useDialog hook inside component
hook_inject = "  const navigate = useNavigate()\n  const { toast, showConfirm } = useDialog()\n"
if "const { toast" not in content:
    content = content.replace("  const navigate = useNavigate()\n", hook_inject)

# Replace alert/confirm
content = content.replace("alert('Invalid percentage');", "toast('Invalid percentage', 'error');")
content = content.replace("alert('Advance payment invoice generated successfully in Finance module!');", "toast('Advance payment invoice generated successfully in Finance module!', 'success');")
content = content.replace("alert('Failed to generate payment request.');", "toast('Failed to generate payment request.', 'error');")
content = content.replace("alert('Failed to update status')", "toast('Failed to update status', 'error')")
content = content.replace("alert('You can only combine quotations for the SAME customer/lead.');", "toast('You can only combine quotations for the SAME customer/lead.', 'error');")

# Fix confirm Delete Group
old_confirm = "if (confirm(`Delete entire quotation group ${group.quoNo}?`)) {"
new_confirm = "if (await showConfirm(`Delete entire quotation group ${group.quoNo}?`, 'Delete Quotation Group', { confirmLabel: 'Delete' })) {"
content = content.replace(old_confirm, new_confirm)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)