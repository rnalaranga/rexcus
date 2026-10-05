import codecs
import re

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Imports
if "fetchAllCustomerGRNs" not in content:
    content = content.replace("import { useSuppliers } from '@/hooks/useData';", "import { useSuppliers } from '@/hooks/useData';\nimport { fetchAllCustomerGRNs } from '@/lib/api';")

# 2. State & Effect
if "const [custGrns, setCustGrns]" not in content:
    hook_inject = """  const { data: suppliers } = useSuppliers();

  const [custGrns, setCustGrns] = useState<any[]>([]);
  useEffect(() => {
    fetchAllCustomerGRNs().then(setCustGrns).catch(console.error);
  }, []);
"""
    content = content.replace("  const { data: suppliers } = useSuppliers();", hook_inject)

# 3. Merge data
if "const combinedGrns =" not in content:
    current_data_replace = """  const combinedGrns = useMemo(() => {
    const sGrns = grns.map((g: any) => ({ ...g, isCustomerSample: false }));
    const cGrns = custGrns.map((g: any) => ({ ...g, isCustomerSample: true }));
    return [...sGrns, ...cGrns].sort((a, b) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
  }, [grns, custGrns]);

  const currentData = activeTab === 'po' ? pos : activeTab === 'mr' ? mrs : activeTab === 'grn' ? combinedGrns : bills;"""
    
    content = content.replace("  const currentData = activeTab === 'po' ? pos : activeTab === 'mr' ? mrs : activeTab === 'grn' ? grns : bills;", current_data_replace)

# 4. Filter logic
    filter_logic_old = """    const filtered = currentData.filter((item: any) => {
      const term = search.toLowerCase();
      const matchSearch = [item.id, item.supplierId, getSupplierName(item.supplierId), item.status, item.requestedBy, item.invoiceNo].some(v => v?.toLowerCase().includes(term));
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });"""
    filter_logic_new = """    const filtered = currentData.filter((item: any) => {
      const term = search.toLowerCase();
      const matchSearch = [
        item.id, item.supplierId, getSupplierName(item.supplierId), 
        item.status, item.requestedBy, item.invoiceNo,
        item.customerName, item.leadName, item.receivedBy
      ].some(v => v?.toLowerCase().includes(term));
      const matchStatus = statusFilter === 'all' || item.status === statusFilter || (item.isCustomerSample && statusFilter === 'received');
      return matchSearch && matchStatus;
    });"""
    content = content.replace(filter_logic_old, filter_logic_new)

# 5. Columns
    columns_old = """    if (activeTab === 'grn') {
      return [
        {
          key: 'grn', header: 'Goods Receipt (GRN)', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 border border-emerald-500/40 flex items-center justify-center">
                <Truck size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                <p className="text-[10px] text-muted truncate mt-0.5 font-mono">Ref: {row.poId}</p>
              </div>
            </div>
          )
        },
        { key: 'supplier', header: 'Vendor', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{getSupplierName(row.supplierId)}</span> },
        { key: 'status', header: 'Status', width: '90px', render: v => <Badge value={String(v)} size="sm" /> },
        { key: 'vehicleNo', header: 'Carrier', width: '120px', render: v => <span className="text-[10px] text-muted font-mono">{String(v)}</span> },
        { key: 'date', header: 'Receipt Date', sortable: true, render: v => <span className="text-xs text-muted">{String(v).split('T')[0]}</span> },
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/bill-builder?grn=${row.id}`)} className="text-[10px] uppercase h-6 text-emerald-500">Create Bill</Button>
        )}
      ];
    }"""
    columns_new = """    if (activeTab === 'grn') {
      return [
        {
          key: 'grn', header: 'Goods Receipt (GRN)', sortable: true,
          render: (_, row) => (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex-shrink-0 border flex items-center justify-center ${row.isCustomerSample ? 'bg-blue-600 border-blue-500/40' : 'bg-emerald-600 border-emerald-500/40'}`}>
                {row.isCustomerSample ? <Package size={14} className="text-white" /> : <Truck size={14} className="text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate leading-snug">{row.id}</p>
                <p className="text-[10px] text-muted truncate mt-0.5 font-mono">Ref: {row.isCustomerSample ? (row.quoNo || row.leadId || 'Customer Sample') : row.poId}</p>
              </div>
            </div>
          )
        },
        { key: 'supplier', header: 'Source', width: '180px', render: (_, row) => <span className="text-xs text-secondary truncate">{row.isCustomerSample ? (row.customerName || row.leadName || 'Customer') : getSupplierName(row.supplierId)}</span> },
        { key: 'status', header: 'Status', width: '90px', render: (_, row) => row.isCustomerSample ? <Badge value="Customer Sample" color="blue" size="sm" /> : <Badge value={String(row.status)} size="sm" /> },
        { key: 'vehicleNo', header: 'Carrier / Receiver', width: '120px', render: (_, row) => <span className="text-[10px] text-muted font-mono">{row.isCustomerSample ? (row.receivedBy || 'System') : String(row.vehicleNo)}</span> },
        { key: 'date', header: 'Receipt Date', sortable: true, render: (_, row) => <span className="text-xs text-muted">{String(row.isCustomerSample ? row.receivedAt : row.date).split('T')[0]}</span> },
        { key: 'actions', header: '', align: 'right', render: (_, row) => (
          !row.isCustomerSample ? <Button variant="ghost" size="sm" onClick={() => navigate(`/purchasing/bill-builder?grn=${row.id}`)} className="text-[10px] uppercase h-6 text-emerald-500">Create Bill</Button> : null
        )}
      ];
    }"""
    content = content.replace(columns_old, columns_new)

with codecs.open('H:/ANTIGRAVITY/REXNW/src/pages/purchasing/PurchasingHub.tsx', 'w', 'utf-8') as f:
    f.write(content)