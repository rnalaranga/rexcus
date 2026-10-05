import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("<Badge value=\"Customer Sample\" color=\"blue\" size=\"sm\" />", "<Badge value=\"Sample\" size=\"sm\" />")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'w', 'utf-8') as f:
    f.write(content)