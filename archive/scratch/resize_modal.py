import sys

with open('src/pages/finance/Invoices.tsx', 'r') as f:
    content = f.read()

old_modal = 'size="lg">\n          <div className="p-6">\n            <div className="bg-white text-black rounded-xl max-h-[60vh] overflow-y-auto mb-4 shadow-inner" style={{ transform: \'scale(0.85)\', transformOrigin: \'top center\', marginBottom: \'-10%\' }}>'

new_modal = 'size="xl" className="rounded-2xl">\n          <div className="flex flex-col md:flex-row gap-6">\n            <div className="flex-1 bg-[#525659] p-4 rounded-xl max-h-[70vh] overflow-y-auto mb-4 shadow-inner flex justify-center">'

if old_modal in content:
    content = content.replace(old_modal, new_modal)
    with open('src/pages/finance/Invoices.tsx', 'w') as f:
        f.write(content)
    print("Replaced modal wrapper")
else:
    print("Old modal not found")
