import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'r', 'utf-8') as f:
    content = f.read()

# Add import
if "useCurrencies" not in content:
    content = content.replace("import { Menu, Search, Bell, Sun, Moon, X } from 'lucide-react'", "import { Menu, Search, Bell, Sun, Moon, X, Banknote } from 'lucide-react'\nimport { useCurrencies } from '@/hooks/useFinance'")

# Add hook
if "const { data: currencies } = useCurrencies()" not in content:
    content = content.replace("const [sysStats, setSysStats] = useState<any>(null)", "const [sysStats, setSysStats] = useState<any>(null)\n  const { data: currencies } = useCurrencies()")

# Add JSX
currency_jsx = """        {/* Currency Rates */}
        {currencies && currencies.length > 0 && (
          <div className="hidden lg:flex items-center gap-3 mr-2 px-3 py-1 bg-surface/50 border border-theme-subtle rounded text-[10px] font-mono font-bold text-muted uppercase tracking-wider">
            {currencies.filter((c: any) => !c.isBase).map((c: any, idx: number) => (
              <React.Fragment key={c.code}>
                <div className="flex items-center gap-1.5 text-emerald-500/90" title={`${c.name} Exchange Rate`}>
                  <Banknote size={12} />
                  <span>{c.code}</span>
                  <span>{Number(c.exchangeRate).toFixed(2)}</span>
                </div>
                {idx < currencies.filter((c: any) => !c.isBase).length - 1 && <div className="w-px h-3 bg-theme-subtle"></div>}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* System Stats Mini */}"""

content = content.replace("{/* System Stats Mini */}", currency_jsx)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'w', 'utf-8') as f:
    f.write(content)