import sys
import re

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

content = content.replace("description: '', customerId: '', description: '', customerId: ''", "description: '', customerId: ''")

# also line 36/37 where it spans multiple lines might have been messed up. Let's fix line 55 first.

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Fixed setFormData")
