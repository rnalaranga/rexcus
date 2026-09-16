const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

const modalMarkup = `
      <Modal isOpen={showMarginModal} onClose={() => setShowMarginModal(false)} title="✨ AI Quote Generation" size="sm">
        <div className="p-5 space-y-4">
          <p className="text-xs text-secondary leading-relaxed bg-blue-500/10 text-blue-600 p-3 rounded-xl border border-blue-500/20">
            The system will calculate the target price using your Job Costing and append the exact materials and processes used to the customer quote description.
          </p>
          <div>
            <label className="block text-xs font-bold text-secondary mb-1.5">Desired Profit Margin (%)</label>
            <input 
              type="number" 
              className="w-full input-base font-bold text-lg" 
              value={marginInput} 
              onChange={e => setMarginInput(e.target.value)} 
              placeholder="e.g. 35"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-theme-subtle">
            <Button variant="ghost" onClick={() => setShowMarginModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={autoGenerateCustomerQuote} className="bg-gradient-to-r from-purple-500 to-indigo-500 border-0 text-white">Generate Quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
`;

const replaceStr = "      </Modal>\n    </div>\n  )\n}";
content = content.replace(replaceStr, "      </Modal>\n" + modalMarkup);

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');