import sys
import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

bad_modal_pattern = r"      \{/\* Add Customer Modal \*/\}.*?</Modal>"
# We want to replace the first TWO occurrences with "    </div>\n  )\n}"

def replacer(match):
    replacer.count += 1
    if replacer.count <= 2:
        return "    </div>\n  )\n}"
    return match.group(0) # Keep the 3rd one

replacer.count = 0

content = re.sub(bad_modal_pattern, replacer, content, flags=re.DOTALL)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Removed bad modals")
