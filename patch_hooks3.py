import codecs

# Settings
with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'r', 'utf-8') as f:
    content = f.read()

if "import { useDialog } from '@/components/ui/DialogProvider'" not in content:
    content = content.replace("import { CurrencyManager } from '@/components/CurrencyManager';", "import { CurrencyManager } from '@/components/CurrencyManager';\nimport { useDialog } from '@/components/ui/DialogProvider';")

if "const { toast" not in content:
    content = content.replace("export const Settings = () => {", "export const Settings = () => {\n  const { toast, showConfirm } = useDialog();")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'w', 'utf-8') as f:
    f.write(content)
