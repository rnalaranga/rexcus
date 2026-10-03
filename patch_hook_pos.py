import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Remove the incorrectly placed one
content = content.replace("  const navigate = useNavigate()\n  const { toast, showConfirm } = useDialog()\n", "  const navigate = useNavigate()\n")

# Inject at the very top of the component
top_inject = "export const Quotations: React.FC = () => {\n  const { toast, showConfirm } = useDialog();\n"
content = content.replace("export const Quotations: React.FC = () => {", top_inject)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'w', 'utf-8') as f:
    f.write(content)