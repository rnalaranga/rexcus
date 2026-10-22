import sys

with open('scratch/diff.txt', 'r') as f:
    diff = f.readlines()

body = []
in_preview = False
for line in diff:
    if line.startswith('-export const InvoicePreview'):
        in_preview = True
        body.append(line[1:])
    elif in_preview:
        if line.startswith('-'):
            body.append(line[1:])
        elif line.startswith(' '):
            body.append(line[1:])
        if 'export const InvoiceBuilder' in line:
            break

# The last few lines might be junk, but let's see what we got
with open('scratch/preview_restored.txt', 'w') as f:
    f.writelines(body)
