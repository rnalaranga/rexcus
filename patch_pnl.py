import re

with open('H:/ANTIGRAVITY/REXNW/src/pages/finance/FinancialReports.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_pnl_render = '''              {/* P&L RENDER - CUSTOMIZED MANAGEMENT ACCOUNT FORMAT */}
              {activeReport === 'pnl' && data && (() => {
                // Categorization Logic
                const matchSub = (acc: any, keywords: string[]) => {
                  const sub = (acc.subtype || '').toLowerCase();
                  return keywords.some(k => sub.includes(k));
                };

                // Revenue Buckets
                const sales = data.revenue.filter((a: any) => !matchSub(a, ['other']));
                const otherIncome = data.revenue.filter((a: any) => matchSub(a, ['other']));
                
                const sum = (arr: any[]) => arr.reduce((acc, curr) => acc + Number(curr.balance), 0);
                
                const totalSales = sum(sales);
                const totalOtherIncome = sum(otherIncome);
                const totalGrossRevenue = totalSales + totalOtherIncome;

                // Expense Buckets
                const prodMaterial = data.expenses.filter((a: any) => matchSub(a, ['material', 'raw', 'sub contract']));
                const prodOverhead = data.expenses.filter((a: any) => matchSub(a, ['overhead', 'factory', 'production overhead']));
                const adminExp = data.expenses.filter((a: any) => matchSub(a, ['admin']));
                const sellDistExp = data.expenses.filter((a: any) => matchSub(a, ['sell', 'distribut', 'market']));
                const financeExp = data.expenses.filter((a: any) => matchSub(a, ['financ', 'bank', 'interest', 'od']));
                const nonOpExp = data.expenses.filter((a: any) => matchSub(a, ['non op', 'non-op', 'exchange']));
                
                // Leftovers (Operating)
                const categorizedIds = new Set([
                  ...prodMaterial, ...prodOverhead, ...adminExp, ...sellDistExp, ...financeExp, ...nonOpExp
                ].map(a => a.id));
                const uncategorizedOpExp = data.expenses.filter((a: any) => !categorizedIds.has(a.id));

                const tProdMat = sum(prodMaterial);
                const tProdOverhead = sum(prodOverhead);
                
                const grossProfit = totalGrossRevenue - (tProdMat + tProdOverhead);

                const tAdmin = sum(adminExp);
                const tSell = sum(sellDistExp);
                const tFinance = sum(financeExp);
                const tUncat = sum(uncategorizedOpExp);
                
                const totalOperatingExp = tAdmin + tSell + tFinance + tUncat;
                
                const tNonOp = sum(nonOpExp);
                
                const netProfit = grossProfit - totalOperatingExp - tNonOp;

                const renderSection = (title: string, items: any[], subTotal: number) => {
                  if (items.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <h4 className="font-bold text-black border-b border-gray-300 mb-1 pb-1 text-[11px]">{title}</h4>
                      {items.map(i => (
                        <div key={i.id} className="flex justify-between py-1 px-2 border-b border-dashed border-gray-100 text-[10px]">
                          <span className="text-gray-700">{i.name}</span>
                          <span className="font-mono">{formatCurrency(i.balance)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-1.5 px-2 font-bold text-black bg-gray-50/50 text-[10px]">
                        <span>Total {title}</span>
                        <span className="font-mono">{formatCurrency(subTotal)}</span>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-black uppercase tracking-widest text-center border-b-2 border-black pb-2 mb-4">Management Account<br/>Profit & Loss Statement</h3>
                    
                    {/* REVENUE */}
                    {renderSection('Sales (Without VAT)', sales, totalSales)}
                    {renderSection('Other Income', otherIncome, totalOtherIncome)}
                    
                    {/* COST OF SALES (DIRECT) */}
                    {renderSection('(-) Production Material', prodMaterial, tProdMat)}
                    {renderSection('(-) Production Overhead Expenses', prodOverhead, tProdOverhead)}
                    
                    {/* GROSS PROFIT */}
                    <div className="flex justify-between py-3 px-2 font-black text-black bg-gray-100 uppercase tracking-widest text-[11px] mb-4">
                      <span>Gross Profit</span>
                      <span className="font-mono">{formatCurrency(grossProfit)}</span>
                    </div>

                    {/* OPERATING EXPENSES */}
                    {renderSection('Administration Expenses', adminExp, tAdmin)}
                    {renderSection('Selling & Distribution Expenses', sellDistExp, tSell)}
                    {renderSection('Finance Income/(Expenses)', financeExp, tFinance)}
                    {renderSection('Other Operating Expenses', uncategorizedOpExp, tUncat)}

                    {/* TOTAL OPERATING EXPENSES */}
                    <div className="flex justify-between py-2 px-2 font-bold text-black border-t border-b border-black uppercase tracking-widest text-[10px] mb-4">
                      <span>Total Operating Expenses</span>
                      <span className="font-mono">{formatCurrency(totalOperatingExp)}</span>
                    </div>

                    {/* NON OPERATING EXPENSES */}
                    {renderSection('Non Operating Expenses', nonOpExp, tNonOp)}

                    {/* NET PROFIT */}
                    <div className="flex justify-between py-4 px-2 font-black text-sm mt-6 border-t-2 border-b-4 border-double border-black uppercase tracking-widest bg-gray-100">
                      <span>Net Profit / (Loss)</span>
                      <span className="font-mono">{formatCurrency(netProfit)}</span>
                    </div>
                  </div>
                );
              })()}
'''

start_str = '{/* P&L RENDER */}'
end_str = '{/* BALANCE SHEET RENDER */}'

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    new_content = content[:start_idx] + new_pnl_render + '\n              ' + content[end_idx:]
    with open('H:/ANTIGRAVITY/REXNW/src/pages/finance/FinancialReports.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replaced successfully')
else:
    print('Failed to find markers')
