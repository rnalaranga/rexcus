import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

import_find = "import { useLeads, useFollowups } from '@/hooks/useData'"
import_rep = "import { useLeads, useFollowups, useCustomers } from '@/hooks/useData'\nimport { SearchableSelect } from '@/components/ui/SearchableSelect'\nimport { useDialog } from '@/components/ui/DialogProvider'"
content = content.replace(import_find, import_rep)

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Fixed imports")
