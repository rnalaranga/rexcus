import sys
import re

with open('src/pages/crm/Customers.tsx', 'r') as f:
    content = f.read()

# Remove submitting state
content = re.sub(r"  const \[submitting, setSubmitting\] = useState\(false\)\n", "", content)

# Remove formData state
content = re.sub(r"  const \[formData, setFormData\] = useState\(\{[\s\S]*?\}\)\n", "", content)

# Remove handleCreateCustomer
content = re.sub(r"  const handleCreateCustomer = async \(e: React.FormEvent\) => \{[\s\S]*?\}\n\n", "", content)

with open('src/pages/crm/Customers.tsx', 'w') as f:
    f.write(content)
print("Cleaned up Customers.tsx")
