import re

with open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useEffect import
content = content.replace('import React, { useRef, useState } from \'react\';', 'import React, { useRef, useState, useEffect } from \'react\';')
content = content.replace('import { Upload, Image as ImageIcon, Save, Trash2 } from \'lucide-react\';', 'import { Upload, Image as ImageIcon, Save, Trash2, Cpu, HardDrive, MemoryStick } from \'lucide-react\';')

# 2. Add state and fetch logic
state_logic = '''
  const [sysStats, setSysStats] = useState<any>(null);

  useEffect(() => {
    fetch(${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats)
      .then(res => res.json())
      .then(data => setSysStats(data))
      .catch(console.error);
      
    // Update every 10 seconds
    const interval = setInterval(() => {
      fetch(${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/system/stats)
        .then(res => res.json())
        .then(data => setSysStats(data))
        .catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
'''

content = content.replace('const [saving, setSaving] = useState(false);', 'const [saving, setSaving] = useState(false);\n' + state_logic)

# 3. Add Server Status UI before Database Maintenance UI
status_ui = '''
        <GlassCard className="p-6 col-span-1 md:col-span-2 border-blue-500/30">
          <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">Server Resources (Live)</h2>
          {sysStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU */}
              <div className="bg-surface/50 p-4 rounded-xl border border-theme-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="text-blue-500" size={18}/>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">CPU Usage</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-primary">{sysStats.cpu.percent}%</span>
                </div>
                <div className="w-full bg-theme-subtle rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: ${Math.min(sysStats.cpu.percent, 100)}% }}></div>
                </div>
              </div>

              {/* RAM */}
              <div className="bg-surface/50 p-4 rounded-xl border border-theme-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <MemoryStick className="text-purple-500" size={18}/>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">RAM Usage</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-primary">{sysStats.ram.percent.toFixed(1)}%</span>
                  <span className="text-xs font-mono text-muted mb-1">{formatBytes(sysStats.ram.used)} / {formatBytes(sysStats.ram.total)}</span>
                </div>
                <div className="w-full bg-theme-subtle rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: ${Math.min(sysStats.ram.percent, 100)}% }}></div>
                </div>
              </div>

              {/* Storage */}
              <div className="bg-surface/50 p-4 rounded-xl border border-theme-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="text-emerald-500" size={18}/>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">Storage</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-black text-primary">{sysStats.storage.percent.toFixed(1)}%</span>
                  <span className="text-xs font-mono text-muted mb-1">{formatBytes(sysStats.storage.used)} / {formatBytes(sysStats.storage.total)}</span>
                </div>
                <div className="w-full bg-theme-subtle rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: ${Math.min(sysStats.storage.percent, 100)}% }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-theme-subtle rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-theme-subtle rounded"></div>
                  <div className="h-4 bg-theme-subtle rounded w-5/6"></div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 col-span-1 md:col-span-2 border-emerald-500/30">
'''

content = content.replace('<GlassCard className="p-6 col-span-1 md:col-span-2 border-emerald-500/30">', status_ui)

with open('H:/ANTIGRAVITY/REXNW/src/pages/admin/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done frontend settings injection')

