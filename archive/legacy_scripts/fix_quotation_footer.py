import re

with open('src/components/QuotationPrintView.tsx', 'r') as f:
    code = f.read()

footer = """          <div className="mt-auto border-t flex items-center justify-between px-4 py-2 text-[9px] font-bold text-black w-full">
            <span>DOC NO: {docNo}</span>
            <span>ISSUE NO: {issueNo}</span>
            <span>ISSUE DATE: {issueDate}</span>
          </div>
        </div>
      </div>
    </>
  )
}"""

old_end = """        </div>
      </div>
    </>
  )
}"""

code = code.replace(old_end, footer)

with open('src/components/QuotationPrintView.tsx', 'w') as f:
    f.write(code)

