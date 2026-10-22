import sys

with open('src/pages/finance/InvoiceBuilder.tsx', 'r') as f:
    content = f.read()

find_summary = """                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">Tax</span>
                  <span className="font-mono text-sm text-amber-500">{formatCurrency(taxAmount)}</span>
                </div>"""

rep_summary = """                {selectedProfile?.tax2_name ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{selectedProfile.tax1_name}</span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(ssclAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{selectedProfile.tax2_name}</span>
                      <span className="font-mono text-sm text-amber-500">{formatCurrency(vatAmount)}</span>
                    </div>
                  </>
                ) : taxType !== 'none' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">{selectedProfile?.tax1_name || 'Tax'}</span>
                    <span className="font-mono text-sm text-amber-500">{formatCurrency(taxAmount)}</span>
                  </div>
                ) : null}"""

content = content.replace(find_summary, rep_summary)

with open('src/pages/finance/InvoiceBuilder.tsx', 'w') as f:
    f.write(content)
print("Fixed Summary in InvoiceBuilder")
