with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

old_end = """                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{expectedProfit >= 0 ? 'Profit' : 'Loss'}</span>
                     <span className={`text-[14px] font-mono font-black ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(expectedProfit))}</span>
                  </div>
                </div>
              </div>
            </div>

        </div>"""

new_end = """                  <div className="flex justify-between items-center">
                     <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{expectedProfit >= 0 ? 'Profit' : 'Loss'}</span>
                     <span className={`text-[14px] font-mono font-black ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(expectedProfit))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>"""

code = code.replace(old_end, new_end)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(code)
