import sys

with open('src/pages/crm/Quotations.tsx', 'r') as f:
    content = f.read()

find_map = """        {filtered.map(group => {
          const latestMain = group.main[0]
          const latestJob = group.job[0]
          const latestCust = group.customer[0]"""

rep_map = """        {filtered.map(group => {
          const latestMain = group.main[0]
          // Hide drafts from the main list, as they are shown in the Active Drafts section above
          if (latestMain?.type === 'draft' && !group.job.length && !group.customer.length && group.main.length === 1) return null;
          
          const latestJob = group.job[0]
          const latestCust = group.customer[0]"""

content = content.replace(find_map, rep_map)

with open('src/pages/crm/Quotations.tsx', 'w') as f:
    f.write(content)
print("Updated Quotations list to hide drafts from main view")
