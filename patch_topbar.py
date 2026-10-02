import re

with open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useEffect import
content = content.replace('import React, { useState } from \'react\'', 'import React, { useState, useEffect } from \'react\'')

# Insert logic
logic = '''
  const [sysStats, setSysStats] = useState<any>(null)

  useEffect(() => {
    fetch(${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats)
      .then(res => res.json())
      .then(setSysStats)
      .catch(() => {})
      
    const interval = setInterval(() => {
      fetch(${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats)
        .then(res => res.json())
        .then(setSysStats)
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [])
'''

state_anchor = "const [searchFocus, setSearchFocus] = useState(false)"
content = content.replace(state_anchor, state_anchor + '\n' + logic)

# Insert UI
ui = '''
        {/* System Stats Mini */}
        {sysStats && (
          <div className="hidden lg:flex items-center gap-3 mr-2 px-3 py-1 bg-surface/50 border border-theme-subtle rounded text-[9px] font-mono font-bold text-muted uppercase tracking-wider">
            <div className="flex items-center gap-1.5" title="CPU Usage">
              <span>CPU</span>
              <div className="w-12 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: ${Math.min(sysStats.cpu.percent, 100)}% }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5" title="RAM Usage">
              <span>RAM</span>
              <div className="w-12 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: ${Math.min(sysStats.ram.percent, 100)}% }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5" title="Disk Usage">
              <span>DSK</span>
              <div className="w-12 h-1.5 bg-theme-subtle rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: ${Math.min(sysStats.storage.percent, 100)}% }} />
              </div>
            </div>
          </div>
        )}
'''

ui_anchor = "{/* Search bar */}"
content = content.replace(ui_anchor, ui + '\n        ' + ui_anchor)

with open('H:/ANTIGRAVITY/REXNW/src/components/layout/TopBar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patched TopBar')
