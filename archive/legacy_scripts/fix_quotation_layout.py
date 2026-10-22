import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    code = f.read()

# 1. Change the wrapper flex-row to flex-col
# The line is: <div className="flex flex-col md:flex-row gap-5">
code = code.replace('<div className="flex flex-col md:flex-row gap-5">', '<div className="flex flex-col gap-5">')

# 2. Change the flex-1 flex flex-col gap-4 (which was taking up the left side)
code = code.replace('<div className="flex-1 flex flex-col gap-4">', '<div className="flex flex-col gap-4">')

# 3. Change the Summary Card container to be flex justify-end
# The line is: {/* Customer Summary Card on the right */}
#              <div className="w-full md:w-80 shrink-0 space-y-4">
old_card_container = """            {/* Customer Summary Card on the right */}
            <div className="w-full md:w-80 shrink-0 space-y-4">"""

new_card_container = """            {/* Customer Summary Card at the bottom right */}
            <div className="flex justify-end">
              <div className="w-full md:w-[28rem] shrink-0 space-y-4">"""

code = code.replace(old_card_container, new_card_container)

# 4. We need to add a closing </div> for the new <div className="flex justify-end">
# Find where the summary card ends. It ends at the end of Section 3.
# Let's find the end of Section 3.
old_end = """                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </div>
      </div>
"""
# Actually it's easier to find the specific closing tag. Let's look at the file.
