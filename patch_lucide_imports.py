import codecs

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("import { Download, Plus, Filter, FileText, Truck, CreditCard, GitPullRequest } from 'lucide-react';", "import { Download, Plus, Filter, FileText, Truck, CreditCard, GitPullRequest, Package } from 'lucide-react';")

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'w', 'utf-8') as f:
    f.write(content)