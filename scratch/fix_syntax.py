import sys

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

find_bad = """    </div>
  )
}

    </div>
  )
}"""

rep_good = """    </div>
  )
}"""

content = content.replace(find_bad, rep_good)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Fixed syntax")
