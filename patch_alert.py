import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add useDialog import
if "useDialog" not in content:
    content = content.replace("import { Modal } from '@/components/ui/Modal'", "import { Modal } from '@/components/ui/Modal'\nimport { useDialog } from '@/components/ui/DialogProvider'")

# Add useDialog hook inside component
hook_inject = "  const navigate = useNavigate()\n  const { showToast, showConfirm } = useDialog()\n"
if "const { showToast" not in content:
    content = content.replace("  const navigate = useNavigate()\n", hook_inject)

# Replace alert/confirm
content = content.replace("alert('Invalid percentage');", "showToast('error', 'Invalid percentage');")
content = content.replace("alert('Advance payment invoice generated successfully in Finance module!');", "showToast('success', 'Advance payment invoice generated successfully in Finance module!');")
content = content.replace("alert('Failed to generate payment request.');", "showToast('error', 'Failed to generate payment request.');")
content = content.replace("alert('Failed to update status')", "showToast('error', 'Failed to update status')")
content = content.replace("alert('You can only combine quotations for the SAME customer/lead.');", "showToast('error', 'You can only combine quotations for the SAME customer/lead.');")

# The confirm Delete Group uses a raw confirm() check.
# showConfirm is probably async: await showConfirm('Delete...', 'Are you sure?')
# But to be safe if it's not async or not standard, I'll use showToast or custom state if it was confirm().
# Let's check how confirm works in DialogProvider