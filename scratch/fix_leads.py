import sys

with open('src/pages/crm/Leads.tsx', 'r') as f:
    content = f.read()

# Fix Email
email_label_old = '<label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address <span className="text-rex-500">*</span></label>'
email_label_new = '<label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Email Address</label>'
content = content.replace(email_label_old, email_label_new)

email_input_old = '<input type="email" required value={formData.email}'
email_input_new = '<input type="email" value={formData.email}'
content = content.replace(email_input_old, email_input_new)

# Fix Company
company_label_old = '<label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company <span className="text-rex-500">*</span></label>'
company_label_new = '<label className="text-[10px] font-semibold text-secondary uppercase tracking-wider">Company</label>'
content = content.replace(company_label_old, company_label_new)

company_input_old = '<input required value={formData.company}'
company_input_new = '<input value={formData.company}'
content = content.replace(company_input_old, company_input_new)

with open('src/pages/crm/Leads.tsx', 'w') as f:
    f.write(content)
print("Removed required from Lead Email and Company")
