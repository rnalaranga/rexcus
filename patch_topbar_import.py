import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add Banknote
content = content.replace("CheckCircle2, TrendingUp, AlertCircle, Star,", "CheckCircle2, TrendingUp, AlertCircle, Star, Banknote,")

# Add useCurrencies
if "useCurrencies" not in content:
    content = content.replace("import { useTheme } from '@/store/theme'", "import { useTheme } from '@/store/theme'\nimport { useCurrencies } from '@/hooks/useFinance'")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'w', 'utf-8') as f:
    f.write(content)