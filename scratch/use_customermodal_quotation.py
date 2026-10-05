import sys
import re

with open('src/pages/crm/QuotationBuilder.tsx', 'r') as f:
    content = f.read()

# Add import
import_stmt = "import { Modal } from '@/components/ui/Modal'"
new_import = "import { Modal } from '@/components/ui/Modal'\nimport { CustomerModal } from '@/components/crm/CustomerModal'"
content = content.replace(import_stmt, new_import)

# Remove the inline modal
modal_pattern = r"<Modal isOpen=\{showAddCustomer\}.*?</Modal>"
new_modal = """<CustomerModal 
        isOpen={showAddCustomer} 
        onClose={() => setShowAddCustomer(false)} 
        onSuccess={(newCustomer) => {
           showToast('success', 'Customer registered successfully!');
           setSelectedLeadId(newCustomer.id);
           setCustomerName(newCustomer.name + (newCustomer.company ? ` (${newCustomer.company})` : ''));
        }} 
      />"""

content = re.sub(modal_pattern, new_modal, content, flags=re.DOTALL)

with open('src/pages/crm/QuotationBuilder.tsx', 'w') as f:
    f.write(content)
print("Updated QuotationBuilder.tsx to use CustomerModal")
