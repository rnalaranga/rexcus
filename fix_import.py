with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(
    "import { ArrowLeft, Plus, Trash2, Download, Save, History, ChevronDown, ChevronUp, Briefcase, User, RotateCcw, X, FileText, TrendingUp, TrendingDown, LayoutDashboard, Mail, FileDown, Printer, Wand2 } from 'lucide-react'",
    "import { ArrowLeft, Plus, Trash2, Download, Save, History, ChevronDown, ChevronUp, Briefcase, User, RotateCcw, X, FileText, TrendingUp, TrendingDown, LayoutDashboard, Mail, FileDown, Printer, Wand2, LineChart } from 'lucide-react'"
)
with open('H:/ANTIGRAVITY/REXNW/src/pages/crm/QuotationBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)