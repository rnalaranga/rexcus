import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = re.sub(r"import \{ useTheme \} from '@\/store\/theme'\r?\n", "import { useTheme } from '@/store/theme'\nimport { useCurrencies } from '@/hooks/useFinance'\n", content)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'w', 'utf-8') as f:
    f.write(content)