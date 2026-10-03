import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Update BOM Interface
content = content.replace(
    'collapsed: boolean;',
    'collapsed: boolean;\n  autoCollapsed?: boolean;\n  manualCollapsed?: boolean;\n  machiningCollapsed?: boolean;'
)

# 2. Patch Plate/Rod Sizes
old_auto = '''                    {/* Plate / Rod Materials */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="text-[13px] font-medium text-secondary">Plate or Rod Sizes (mm)</h3>
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/40" size="sm" icon={Plus} onClick={() => addAutoMat(bom.id)}>Add Row</Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[860px]">'''
                        
new_auto = '''                    {/* Plate / Rod Materials */}
                    <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/10 mb-4">
                      <div className="flex justify-between items-center p-3 bg-surface2/40 cursor-pointer hover:bg-surface2/60 transition-colors border-b border-theme-subtle/20" onClick={() => updateBOM(bom.id, { autoCollapsed: !bom.autoCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded text-muted hover:text-primary transition-colors">
                            {bom.autoCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Plate or Rod Sizes (mm)</h3>
                          {bom.autoMats.length > 0 && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{bom.autoMats.length} Items</span>}
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/50 bg-surface shadow-sm h-7 text-[11px]" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); addAutoMat(bom.id); }}>Add Row</Button>
                      </div>
                      <div className={overflow-x-auto transition-all }>
                        <table className="w-full text-left min-w-[860px]">'''
                        
content = content.replace(old_auto, new_auto)

# 3. Patch Manual Materials
old_manual = '''                    {/* Other Materials */}
                    <div>
                      <div className="flex justify-between items-center mb-4 mt-2">
                        <div>
                          <h3 className="text-[13px] font-medium text-secondary">Manually Calculated Materials</h3>
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/40" size="sm" icon={Plus} onClick={() => addManualMat(bom.id)}>Add Row</Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[640px]">'''
                        
new_manual = '''                    {/* Other Materials */}
                    <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/10 mb-4">
                      <div className="flex justify-between items-center p-3 bg-surface2/40 cursor-pointer hover:bg-surface2/60 transition-colors border-b border-theme-subtle/20" onClick={() => updateBOM(bom.id, { manualCollapsed: !bom.manualCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded text-muted hover:text-primary transition-colors">
                            {bom.manualCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Manually Calculated Materials</h3>
                          {bom.manualMats.length > 0 && <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">{bom.manualMats.length} Items</span>}
                        </div>
                        <Button variant="ghost" className="border border-theme-subtle/50 bg-surface shadow-sm h-7 text-[11px]" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); addManualMat(bom.id); }}>Add Row</Button>
                      </div>
                      <div className={overflow-x-auto transition-all }>
                        <table className="w-full text-left min-w-[640px]">'''

content = content.replace(old_manual, new_manual)

# 4. Patch Machining Operations
old_mach = '''                    {/* Machining Table */}
                    <div>
                      <div className="flex justify-between items-center mb-4 mt-2">
                        <h3 className="text-[13px] font-medium text-secondary">Machining Operations</h3>
                      </div>
                      <div className="border border-theme-subtle/40 rounded-xl overflow-hidden">
                        <table className="w-full text-left">'''
                        
new_mach = '''                    {/* Machining Table */}
                    <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/10 mb-4">
                      <div className="flex justify-between items-center p-3 bg-surface2/40 cursor-pointer hover:bg-surface2/60 transition-colors border-b border-theme-subtle/20" onClick={() => updateBOM(bom.id, { machiningCollapsed: !bom.machiningCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded text-muted hover:text-primary transition-colors">
                            {bom.machiningCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Machining Operations</h3>
                        </div>
                      </div>
                      <div className={overflow-x-auto transition-all }>
                        <table className="w-full text-left">'''

content = content.replace(old_mach, new_mach)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated BOM panels')