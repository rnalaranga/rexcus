import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add useDialog import
if "useDialog" not in content:
    content = content.replace("import { Save, Building2, Receipt, Palette, FileText } from 'lucide-react'", "import { Save, Building2, Receipt, Palette, FileText } from 'lucide-react'\nimport { useDialog } from '@/components/ui/DialogProvider'")

# Add useDialog hook
hook_inject = "  const { settings, updateSettings, refreshSettings } = useSettings();\n  const { toast, showConfirm } = useDialog();\n"
if "const { toast" not in content:
    content = content.replace("  const { settings, updateSettings, refreshSettings } = useSettings();\n", hook_inject)

# Replace alert/confirm
content = content.replace("alert('Database structure fixed successfully!');", "toast('Database structure fixed successfully!', 'success');")
content = content.replace("alert('Failed to fix DB: ' + data.error);", "toast('Failed to fix DB: ' + data.error, 'error');")
content = content.replace("alert('Error: ' + e.message);", "toast('Error: ' + e.message, 'error');")
content = content.replace("alert('Failed to save settings');", "toast('Failed to save settings', 'error');")
content = content.replace("alert('Settings saved successfully!');", "toast('Settings saved successfully!', 'success');")

# Fix confirm
old_confirm = "if (confirm('This will safely scan and fix missing database tables and columns. No data will be deleted. Proceed?')) {"
new_confirm = "if (await showConfirm('This will safely scan and fix missing database tables and columns. No data will be deleted. Proceed?', 'Fix Database Structure', { confirmLabel: 'Proceed' })) {"
content = content.replace(old_confirm, new_confirm)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'w', 'utf-8') as f:
    f.write(content)
