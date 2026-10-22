with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/Quotations.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
end = -1
for i, line in enumerate(lines):
    if '<Modal isOpen={!!viewBomDialog}' in line:
        start = i
    if '</Modal>' in line and start != -1 and end == -1:
        # We need to make sure this is the right </Modal>. It is at the end of the file.
        end = i

print(f'Start: {start}, End: {end}')