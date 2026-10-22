import re

with open('src/components/QuotationPrintView.tsx', 'r') as f:
    code = f.read()

# 1. Remove the first 3 rows from the top right table
old_table_rows = """                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold w-24">DOC NO</td>
                    <td className="p-1.5">: {docNo}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">ISSUE NO</td>
                    <td className="p-1.5">: {issueNo}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">ISSUE DATE</td>
                    <td className="p-1.5">: {issueDate}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">QUO DATE</td>
                    <td className="p-1.5">: {quoDate}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-black font-bold">QUO NO</td>
                    <td className="p-1.5 font-bold">: {quotationNo}</td>
                  </tr>"""

new_table_rows = """                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold w-24">QUO DATE</td>
                    <td className="p-1.5">: {quoDate}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-black font-bold">QUO NO</td>
                    <td className="p-1.5 font-bold">: {quotationNo}</td>
                  </tr>"""

code = code.replace(old_table_rows, new_table_rows)

# 2. Add them to the very bottom
# Let's find the bottom of the QuotationPrintView.
# It ends with:
#           </div>
#         </div>
#       </div>
#     )
#   }
# )

footer_ui = """
          <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-bold text-gray-500">
             <div>DOC NO: {docNo}</div>
             <div>ISSUE NO: {issueNo}</div>
             <div>ISSUE DATE: {issueDate}</div>
          </div>
"""

# Let's search for the end of the content wrapper and inject it.
# Actually, the user wants it at the very bottom of the page. The printable area is defined as an A4 page.
