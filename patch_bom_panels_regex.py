import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Update BOM Interface
if 'autoCollapsed?: boolean;' not in content:
    content = content.replace(
        'collapsed: boolean;',
        'collapsed: boolean;\n  autoCollapsed?: boolean;\n  manualCollapsed?: boolean;\n  machiningCollapsed?: boolean;'
    )

# 2. Patch Plate/Rod Sizes
content = re.sub(
    r'\{\/\* Plate \/ Rod Materials \*\/\}.*?<table className="w-full text-left min-w-\[860px\]">',
    r'''{/* Plate / Rod Materials */}
                    <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/5 mb-4">
                      <div className="flex justify-between items-center p-3 bg-surface2/30 cursor-pointer hover:bg-surface2/50 transition-colors border-b border-theme-subtle/20" onClick={() => updateBOM(bom.id, { autoCollapsed: !bom.autoCollapsed })}>
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
                        <table className="w-full text-left min-w-[860px]">''',
    content,
    flags=re.DOTALL
)

# 3. Patch Manual Materials
content = re.sub(
    r'\{\/\* Other Materials \*\/\}.*?<table className="w-full text-left min-w-\[640px\]">',
    r'''{/* Other Materials */}
                    <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/5 mb-4">
                      <div className="flex justify-between items-center p-3 bg-surface2/30 cursor-pointer hover:bg-surface2/50 transition-colors border-b border-theme-subtle/20" onClick={() => updateBOM(bom.id, { manualCollapsed: !bom.manualCollapsed })}>
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
                        <table className="w-full text-left min-w-[640px]">''',
    content,
    flags=re.DOTALL
)

# 4. Patch Machining Operations
content = re.sub(
    r'\{\/\* Machining Table \*\/\}.*?<table className="w-full text-left">',
    r'''{/* Machining Table */}
                    <div className="border border-theme-subtle/40 rounded-xl overflow-hidden bg-surface/5 mb-4">
                      <div className="flex justify-between items-center p-3 bg-surface2/30 cursor-pointer hover:bg-surface2/50 transition-colors border-b border-theme-subtle/20" onClick={() => updateBOM(bom.id, { machiningCollapsed: !bom.machiningCollapsed })}>
                        <div className="flex items-center gap-3">
                          <button className="p-1 rounded text-muted hover:text-primary transition-colors">
                            {bom.machiningCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                          </button>
                          <h3 className="text-[13px] font-semibold text-secondary">Machining Operations</h3>
                        </div>
                      </div>
                      <div className={overflow-x-auto transition-all }>
                        <table className="w-full text-left">''',
    content,
    flags=re.DOTALL
)

# 5. Fix closing divs
# The original structure had:
# <div>
#   <div class=header>...</div>
#   <div class=overflow><table... </table></div>
# </div>
# The regex replaced up to <table...> so the closing </div> structure is exactly the same!
# The only difference is my injected <div className={overflow-x-auto transition-all ...}> REPLACED the original <div className="overflow-x-auto"> (or the inner div wrapper for machining).

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', 'utf-8') as f:
    f.write(content)

print('Updated BOM panels with regex')