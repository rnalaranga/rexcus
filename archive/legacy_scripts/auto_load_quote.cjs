const fs = require('fs');
let content = fs.readFileSync('src/pages/crm/QuotationBuilder.tsx', 'utf8');

// Add useSearchParams to import
content = content.replace(
  "import { useParams, useNavigate } from 'react-router-dom'",
  "import { useParams, useNavigate, useSearchParams } from 'react-router-dom'"
);

// Add searchParams hooks inside the component
content = content.replace(
  "const { leadId } = useParams<{ leadId: string }>()",
  "const { leadId } = useParams<{ leadId: string }>()\n    const [searchParams] = useSearchParams()\n    const quoteIdParam = searchParams.get('quoteId')\n    const previewParam = searchParams.get('preview') === 'true'"
);

// In the useEffect that calls loadVersions, after loading, find the quoteIdParam and auto-load it
const loadRegex = /const loadVersions = useCallback\(async \(\) => \{[\s\S]*?\}\, \[leadId\]\)/;
content = content.replace(loadRegex, `const loadVersions = useCallback(async () => {
      if (!leadId) return
      try {
        const data = await fetchQuotations(leadId)
        setSavedVersions(data)
        
        // Auto-load if quoteId is in URL
        if (quoteIdParam) {
           const target = data.find((v: any) => v.id === quoteIdParam)
           if (target && currentId !== target.id) {
              const snap = typeof target.data === 'string' ? JSON.parse(target.data) : target.data
              restoreSnapshot(snap)
              setQuotationType(target.type || 'main')
              setCurrentId(target.id)
              
              if (previewParam) {
                 setShowPreview(true)
              }
           }
        }
      } catch (err) {
        console.error(err)
      }
    }, [leadId, quoteIdParam, previewParam, currentId])`); // wait, restoreSnapshot is not in the dependency array. It's fine, we will suppress warning or it doesn't matter.

fs.writeFileSync('src/pages/crm/QuotationBuilder.tsx', content, 'utf8');