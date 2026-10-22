import sys
import re

with open('src/pages/crm/Customers.tsx', 'r') as f:
    content = f.read()

# Add import
import_stmt = "import { Modal } from '@/components/ui/Modal'"
new_import = "import { Modal } from '@/components/ui/Modal'\nimport { CustomerModal } from '@/components/crm/CustomerModal'"
content = content.replace(import_stmt, new_import)

# Remove the inline modal
modal_pattern = r"<Modal isOpen=\{isModalOpen\}.*?</Modal>"
new_modal = """<CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => refetch()} 
      />"""

content = re.sub(modal_pattern, new_modal, content, flags=re.DOTALL)

with open('src/pages/crm/Customers.tsx', 'w') as f:
    f.write(content)
print("Updated Customers.tsx to use CustomerModal")
