import codecs
import re

# TopBar
with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'r', 'utf-8') as f:
    content = f.read()

if "useCurrencies" not in content:
    content = content.replace("import { useTheme } from '@/store/theme'", "import { useTheme } from '@/store/theme';\nimport { useCurrencies } from '@/hooks/useFinance';")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'w', 'utf-8') as f:
    f.write(content)

# Settings
with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'r', 'utf-8') as f:
    content = f.read()

if "const { toast" not in content:
    content = content.replace("export const Settings: React.FC = () => {\n  const { settings, updateSettings, refreshSettings } = useSettings();", "export const Settings: React.FC = () => {\n  const { settings, updateSettings, refreshSettings } = useSettings();\n  const { toast, showConfirm } = useDialog();")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'w', 'utf-8') as f:
    f.write(content)
