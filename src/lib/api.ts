const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}`;

export const fetchCustomers = async () => {
  const res = await fetch(`${API_URL}/customers`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

export const fetchCustomer = async (id: string) => {
  const res = await fetch(`${API_URL}/customers/${id}`);
  if (!res.ok) throw new Error('Customer not found');
  return res.json();
};

export const createCustomer = async (data: any) => {
  const res = await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create customer');
  return json;
};

export const updateCustomer = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to update customer');
  return json;
};

export const deleteCustomer = async (id: string) => {
  const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
  return res.json();
};


export const fetchLeads = async () => {
  const res = await fetch(`${API_URL}/leads`);
  return res.json();
};

export const createLead = async (data: any) => {
  const res = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateLead = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteLead = async (id: string) => {
  const res = await fetch(`${API_URL}/leads/${id}`, { method: 'DELETE' });
  return res.json();
};

export const fetchDeals = async () => {
  const res = await fetch(`${API_URL}/deals`);
  return res.json();
};

export const createDeal = async (data: any) => {
  const res = await fetch(`${API_URL}/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateDeal = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/deals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteDeal = async (id: string) => {
  const res = await fetch(`${API_URL}/deals/${id}`, { method: 'DELETE' });
  return res.json();
};

// -- QUOTATIONS --
export const fetchQuotations = async (leadId?: string) => {
  const url = leadId ? `${API_URL}/quotations/${leadId}` : `${API_URL}/quotations`;
  const res = await fetch(url);
  return res.json();
};

export const createQuotation = async (data: any) => {
  const res = await fetch(`${API_URL}/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateQuotation = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/quotations/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};


export const updateQuotationStatus = async (id: string, status: string, options?: { approvedBy?: string; rejectionReason?: string }) => {
  const res = await fetch(`${API_URL}/quotations/status/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...options })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update quotation status');
  }
  return data;
};

export const submitQuotationForApproval = async (id: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}/submit-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit for approval');
  return data;
};

export const approveQuotation = async (id: string, approvedBy?: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve quotation');
  return data;
};

export const rejectQuotation = async (id: string, reason?: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reject quotation');
  return data;
};

export const requestQuotationEditApproval = async (id: string | number, reason: string, requestedBy?: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}/request-edit-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, requestedBy })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to request edit approval');
  return data;
};

export const approveQuotationEdit = async (id: string | number, approvedBy?: string, notes?: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}/approve-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy, notes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve edit');
  return data;
};

export const rejectQuotationEdit = async (id: string | number, rejectedBy?: string, reason?: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}/reject-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectedBy, reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reject edit request');
  return data;
};

export const deleteQuotation = async (id: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}`, { method: 'DELETE' });
  return res.json();
};

export const generateQuotationDescription = async (payload: {
  partTitle?: string;
  rawDescription?: string;
  materials?: string | string[];
  operations?: string | string[];
  dimensions?: string;
  customerName?: string;
  quantity?: number | string;
}): Promise<string> => {
  const formattedPayload = {
    ...payload,
    materials: Array.isArray(payload.materials) ? payload.materials.join(', ') : payload.materials,
    operations: Array.isArray(payload.operations) ? payload.operations.join(', ') : payload.operations,
    quantity: payload.quantity ? Number(payload.quantity) : 1
  };
  const res = await fetch(`${API_URL}/ai/generate-quotation-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formattedPayload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed generating AI description');
  return data.description || '';
};

// -- CUSTOMER GRNS --
export const fetchAllCustomerGRNs = async () => {
  const res = await fetch(`${API_URL}/crm/grns`);
  return res.json();
};

export const fetchCustomerGRNs = async (quoteId: string) => {
  const res = await fetch(`${API_URL}/crm/grns/${quoteId}`);
  return res.json();
};

export const createCustomerGRN = async (data: any) => {
  const res = await fetch(`${API_URL}/crm/grns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

// -- INVENTORY --
export const fetchInventory = async () => {
  const res = await fetch(`${API_URL}/inventory`);
  return res.json();
};

export const createInventoryItem = async (data: any) => {
  const res = await fetch(`${API_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateInventoryItem = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/inventory/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteInventoryItem = async (id: string) => {
  const res = await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
  return res.json();
};

export const fetchStockLedger = async (inventoryId: string) => {
  const res = await fetch(`${API_URL}/inventory/${inventoryId}/ledger`);
  return res.json();
};

export const fetchFullStockLedger = async () => {
  const res = await fetch(`${API_URL}/inventory/ledger/all`);
  return res.json();
};

export const addStockLedgerEntry = async (inventoryId: string, data: any) => {
  const res = await fetch(`${API_URL}/inventory/${inventoryId}/ledger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const reconcileStock = async (data: { inventoryId: string; physicalCount: number; notes?: string; user?: string; reference?: string }) => {
  const res = await fetch(`${API_URL}/inventory/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

// -- FINISHED GOODS ORDERS --
export const fetchFinishedGoodsOrders = async (params?: { productId?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.productId) query.append('productId', params.productId);
  if (params?.status) query.append('status', params.status);
  const qStr = query.toString();
  const res = await fetch(`${API_URL}/finished-goods-orders${qStr ? `?${qStr}` : ''}`);
  return res.json();
};

export const createFinishedGoodsOrder = async (data: any) => {
  const res = await fetch(`${API_URL}/finished-goods-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateFinishedGoodsOrder = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const dispatchFinishedGoodsOrder = async (id: string, dispatchDetails?: any) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dispatchDetails || {})
  });
  return res.json();
};

export const deleteFinishedGoodsOrder = async (id: string) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}`, {
    method: 'DELETE'
  });
  return res.json();
};

// -- SUPPLIERS --
export const fetchSuppliers = async () => {
  const res = await fetch(`${API_URL}/suppliers`);
  return res.json();
};

export const createSupplier = async (data: any) => {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateSupplier = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteSupplier = async (id: string) => {
  const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE' });
  return res.json();
};

export const fetchSupplierById = async (id: string) => {
  const res = await fetch(`${API_URL}/suppliers/${id}`);
  return res.json();
};

export const fetchSupplierLedger = async (supplierId: string) => {
  const res = await fetch(`${API_URL}/supplier-ledger/${supplierId}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

export const createSupplierLedgerEntry = async (data: any) => {
  const res = await fetch(`${API_URL}/supplier-ledger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || json.details || 'Failed to record supplier ledger entry');
  }
  return json;
};

export const deleteSupplierLedgerEntry = async (id: string) => {
  const res = await fetch(`${API_URL}/supplier-ledger/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || json.details || 'Failed to delete supplier ledger entry');
  }
  return json;
};

// -- FOLLOWUPS --
export const fetchFollowups = async () => {
  const res = await fetch(`${API_URL}/followups`);
  return res.json();
};

export const fetchFollowupsByRelated = async (type: string, id: string) => {
  const res = await fetch(`${API_URL}/followups/related/${type}/${id}`);
  return res.json();
};

export const createFollowup = async (data: any) => {
  const res = await fetch(`${API_URL}/followups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateFollowup = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/followups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteFollowup = async (id: string) => {
  const res = await fetch(`${API_URL}/followups/${id}`, { method: 'DELETE' });
  return res.json();
};

// -- INVOICES --
export const fetchInvoices = async () => {
  const res = await fetch(`${API_URL}/invoices`);
  return res.json();
};

export const createInvoice = async (data: any) => {
  const res = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateInvoice = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteInvoice = async (id: string) => {
  const encId = encodeURIComponent(id);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/invoices/${encId}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ id })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete invoice');
  return json;
};

export const addInvoicePayment = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/invoices/${id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

// --- PAYMENT RECEIPTS (Customer Advance / Quotation Receipts) ---
export const fetchPaymentReceipts = async (params?: Record<string, any>) => {
  let url = `${API_URL}/finance/payment-receipts`;
  if (params && Object.keys(params).length > 0) {
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams[k] = String(v);
      }
    });
    if (Object.keys(cleanParams).length > 0) {
      const qs = new URLSearchParams(cleanParams).toString();
      url += `?${qs}`;
    }
  }
  const res = await fetch(url);
  return res.json();
};

export const fetchPaymentReceiptById = async (id: string) => {
  const res = await fetch(`${API_URL}/finance/payment-receipts/${encodeURIComponent(id)}`);
  return res.json();
};

export const createPaymentReceipt = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/payment-receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deletePaymentReceipt = async (id: string) => {
  const res = await fetch(`${API_URL}/finance/payment-receipts/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return res.json();
};



// --- PURCHASING ---
export const fetchMRs = async () => (await (await fetch(`${API_URL}/purchasing/mrs`)).json());
export const fetchMRById = async (id: string) => (await (await fetch(`${API_URL}/purchasing/mrs/${id}`)).json());
export const createMR = async (data: any) => (await (await fetch(`${API_URL}/purchasing/mrs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const updateMR = async (id: string, data: any) => (await (await fetch(`${API_URL}/purchasing/mrs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteMR = async (id: string) => (await (await fetch(`${API_URL}/purchasing/mrs/${id}`, { method: 'DELETE' })).json());

export const fetchPOs = async () => (await (await fetch(`${API_URL}/purchasing/pos`)).json());
export const fetchPOById = async (id: string) => (await (await fetch(`${API_URL}/purchasing/pos/${id}`)).json());
export const createPO = async (data: any) => (await (await fetch(`${API_URL}/purchasing/pos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const updatePO = async (id: string, data: any) => (await (await fetch(`${API_URL}/purchasing/pos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deletePO = async (id: string) => (await (await fetch(`${API_URL}/purchasing/pos/${id}`, { method: 'DELETE' })).json());

export const fetchGRNs = async () => (await (await fetch(`${API_URL}/purchasing/grns`)).json());
export const fetchGRNById = async (id: string) => (await (await fetch(`${API_URL}/purchasing/grns/${id}`)).json());
export const createGRN = async (data: any) => (await (await fetch(`${API_URL}/purchasing/grns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const updateGRN = async (id: string, data: any) => (await (await fetch(`${API_URL}/purchasing/grns/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteGRN = async (id: string) => (await (await fetch(`${API_URL}/purchasing/grns/${id}`, { method: 'DELETE' })).json());

export const fetchBills = async () => (await (await fetch(`${API_URL}/purchasing/bills`)).json());
export const fetchBillsByPO = async (poId: string) => (await (await fetch(`${API_URL}/purchasing/pos/${poId}/bills`)).json());
export const createBill = async (data: any) => (await (await fetch(`${API_URL}/purchasing/bills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const updateBill = async (id: string, data: any) => (await (await fetch(`${API_URL}/purchasing/bills/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteBill = async (id: string) => (await (await fetch(`${API_URL}/purchasing/bills/${id}`, { method: 'DELETE' })).json());



// ==========================
// FINANCE API
// ==========================
export const fetchAccounts = async () => (await (await fetch(`${API_URL}/finance/accounts`)).json());
export const createAccount = async (data: any) => (await (await fetch(`${API_URL}/finance/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const updateAccount = async (id: string, data: any) => (await (await fetch(`${API_URL}/finance/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteAccount = async (id: string) => (await (await fetch(`${API_URL}/finance/accounts/${id}`, { method: 'DELETE' })).json());
export const fetchAccountLedger = async (id: string) => (await (await fetch(`${API_URL}/finance/accounts/${id}/ledger`)).json());

export const fetchTaxes = async () => (await (await fetch(`${API_URL}/finance/taxes`)).json());
export const createTax = async (data: any) => (await (await fetch(`${API_URL}/finance/taxes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteTax = async (id: string) => (await (await fetch(`${API_URL}/finance/taxes/${id}`, { method: 'DELETE' })).json());

export const fetchJournals = async () => (await (await fetch(`${API_URL}/finance/journals`)).json());
export const createJournal = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/journals`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(data) 
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to post journal entry');
  }
  return json;
};

export const fetchFinanceDashboard = async () => (await (await fetch(`${API_URL}/finance/dashboard`)).json());
export const fetchCostCenters = async () => (await (await fetch(`${API_URL}/finance/cost-centers`)).json());
export const fetchMachiningOperations = async () => (await fetch(`${API_URL}/machining-operations`)).json();
export const createMachiningOperation = async (data: any) => {
  const res = await fetch(`${API_URL}/machining-operations`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  return res.json();
};
export const updateMachiningOperation = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/machining-operations/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  return res.json();
};
export const deleteMachiningOperation = async (id: string) => {
  const res = await fetch(`${API_URL}/machining-operations/${id}`, { method: 'DELETE' });
  return res.json();
};


export const fetchWorkOrders = async () => (await fetch(`${API_URL}/production/work-orders`)).json();

export const fetchWorkOrderById = async (id: string) => (await fetch(`${API_URL}/production/work-orders/${id}`)).json();

export const createWorkOrder = async (data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateWorkOrder = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateWorkOrderStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_URL}/production/work-orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};

export const deleteWorkOrder = async (id: string) => {
  const res = await fetch(`${API_URL}/production/work-orders/${id}`, { method: 'DELETE' });
  return res.json();
};

export const issueMaterialToWorkOrder = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders/${id}/issue-material`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const fetchWorkOrderMaterials = async (id: string) => {
  const res = await fetch(`${API_URL}/production/work-orders/${id}/materials`);
  return res.json();
};

export const addWorkOrderOperation = async (woId: string, data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateWorkOrderOperation = async (opId: string, data: any) => {
  const res = await fetch(`${API_URL}/production/operations/${opId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateWorkOrderOperationStatus = async (opId: string, status: string, actualHours?: number) => {
  const res = await fetch(`${API_URL}/production/operations/${opId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, actualHours })
  });
  return res.json();
};

export const assignWorkOrderOperation = async (opId: string, data: any) => {
  const res = await fetch(`${API_URL}/production/operations/${opId}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteWorkOrderOperation = async (opId: string) => {
  const res = await fetch(`${API_URL}/production/operations/${opId}`, { method: 'DELETE' });
  return res.json();
};

export const saveWorkOrderQcCheckpoints = async (workOrderId: string, checkpoints: any[]) => {
  const res = await fetch(`${API_URL}/production/work-orders/${workOrderId}/qc-checkpoints`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkpoints })
  });
  return res.json();
};

export const logWorkOrderQcMeasurement = async (workOrderId: string, data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders/${workOrderId}/qc-measurement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const partialDispatchWorkOrder = async (workOrderId: string, data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders/${workOrderId}/partial-dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const logOperationQC = async (opId: string, data: any) => {
  const res = await fetch(`${API_URL}/production/operations/${opId}/qc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const fetchReworkLogs = async (workOrderId?: string) => {
  const url = workOrderId ? `${API_URL}/production/rework-logs?workOrderId=${encodeURIComponent(workOrderId)}` : `${API_URL}/production/rework-logs`;
  const res = await fetch(url);
  return res.json();
};

export const updateReworkLog = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/rework-logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const completeWorkOrder = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const fetchPartyLedger = async (id: string) => (await (await fetch(`${API_URL}/finance/party/${id}/ledger`)).json());
export const deleteJournal = async (id: string) => (await (await fetch(`${API_URL}/finance/journals/${id}`, { method: 'DELETE' })).json());

export const approveCreditLimit = async (id: string, status: 'approved' | 'rejected', actionBy?: string, reason?: string) => {
  const res = await fetch(`${API_URL}/customers/${id}/approve-credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, actionBy, reason })
  });
  return res.json();
};

export const fetchApprovalLogs = async (params?: { module?: string; action?: string; search?: string }) => {
  const query = new URLSearchParams();
  if (params?.module && params.module !== 'all') query.append('module', params.module);
  if (params?.action && params.action !== 'all') query.append('action', params.action);
  if (params?.search && params.search.trim()) query.append('search', params.search.trim());

  const res = await fetch(`${API_URL}/approval-logs?${query.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch approval logs');
  return Array.isArray(data) ? data : [];
};

export const createApprovalLog = async (logData: {
  module: string;
  recordId: string;
  recordNo?: string;
  entityName?: string;
  amount?: number;
  action: 'Approved' | 'Rejected';
  actionBy: string;
  notes?: string;
  metadata?: any;
}) => {
  const res = await fetch(`${API_URL}/approval-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData)
  });
  return res.json();
};

export const fetchTaxProfiles = async () => {
  const res = await fetch(`${API_URL}/finance/tax-profiles`);
  return res.json();
};

export const createTaxProfile = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/tax-profiles`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteTaxProfile = async (id: string) => {
  const res = await fetch(`${API_URL}/finance/tax-profiles/${id}`, { method: 'DELETE' });
  return res.json();
};

export const updateTaxProfile = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/finance/tax-profiles/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  return res.json();
};

export const updateCustomerGRN = async (id: string, data: any) => (await (await fetch(`${API_URL}/crm/grns/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteCustomerGRN = async (id: string) => (await (await fetch(`${API_URL}/crm/grns/${id}`, { method: 'DELETE' })).json());

// -- GATE PASSES --
export const fetchGatePasses = async () => {
  const res = await fetch(`${API_URL}/gate-passes`);
  return res.json();
};

export const fetchGatePassById = async (id: string) => {
  const res = await fetch(`${API_URL}/gate-passes/${id}`);
  return res.json();
};

export const createGatePass = async (data: any) => {
  const res = await fetch(`${API_URL}/gate-passes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateGatePass = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/gate-passes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteGatePass = async (id: string) => {
  const res = await fetch(`${API_URL}/gate-passes/${id}`, { method: 'DELETE' });
  return res.json();
};

// -- LINEAR STOCK REMNANTS & CUT OPTIMIZER --
export const fetchStockRemnants = async (params?: { materialName?: string; status?: string }) => {
  let url = `${API_URL}/inventory/remnants`;
  if (params) {
    const q = new URLSearchParams();
    if (params.materialName) q.append('materialName', params.materialName);
    if (params.status) q.append('status', params.status);
    url += `?${q.toString()}`;
  }
  const res = await fetch(url);
  return res.json();
};

export const createStockRemnant = async (data: any) => {
  const res = await fetch(`${API_URL}/inventory/remnants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateStockRemnant = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/inventory/remnants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteStockRemnant = async (id: string) => {
  const res = await fetch(`${API_URL}/inventory/remnants/${id}`, { method: 'DELETE' });
  return res.json();
};

export const executeCutIssue = async (data: any) => {
  const res = await fetch(`${API_URL}/inventory/cut-issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const fetchDocumentSequences = async () => {
  const res = await fetch(`${API_URL}/sequences`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

export const updateDocumentSequence = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/sequences/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const fetchNextDocumentNumber = async (type: string, options?: { userPrefix?: string; customerPrefix?: string; reserve?: boolean }) => {
  const res = await fetch(`${API_URL}/sequences/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, ...options })
  });
  return res.json();
};

export const updateUserPrefix = async (userId: string | number, prefix: string) => {
  const res = await fetch(`${API_URL}/users/${userId}/prefix`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix })
  });
  return res.json();
};

export const fetchUserQuotationSequences = async () => {
  const res = await fetch(`${API_URL}/sequences/user-quotations`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
};

export const updateUserQuotationSequence = async (prefix: string, next_number: number, userId?: string | number) => {
  const res = await fetch(`${API_URL}/sequences/user-quotations/${encodeURIComponent(prefix)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ next_number, userId })
  });
  return res.json();
};




// Material Shortage & Substitute Requests Workflow
export const fetchSubstituteRequests = async () => {
  const res = await fetch(`${API_URL}/production/substitute-requests`);
  return res.json();
};

export const reportMaterialShortage = async (woId: string, data: {
  bomIndex: number;
  missingMaterial: string;
  requiredQty: number;
  currentStock: number;
  substituteMaterial?: string;
  substituteInvId?: string;
  substituteQty?: number;
  substituteUnitCost?: number;
  reason?: string;
  requestedBy?: string;
  notifySales?: boolean;
}) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/report-shortage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const approveMaterialSubstitute = async (woId: string, data: {
  bomIndex: number;
  approvedBy?: string;
  actionNotes?: string;
}) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/approve-substitute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const rejectMaterialSubstitute = async (woId: string, data: {
  bomIndex: number;
  rejectedBy?: string;
  reason?: string;
}) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/reject-substitute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const createMRForShortage = async (woId: string, data: {
  bomIndex: number;
  requestedBy?: string;
  department?: string;
  priority?: string;
  notes?: string;
}) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/create-mr-shortage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const changeBomMaterial = async (woId: string, data: {
  bomIndex?: number;
  originalMaterial: string;
  newMaterial: string;
  newInventoryId?: string;
  newQty: number;
  newUnit: string;
  newUnitCost?: number;
  spec?: string;
  reason: string;
  changedBy?: string;
  requestFromStores?: boolean;
  partTitle?: string;
}) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/change-bom-material`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const adjustWorkOrderFullBom = async (
  woId: string,
  payload: {
    boms: any[];
    overheadPct?: number;
    syncRouting?: boolean;
  }
) => {
  const res = await fetch(`${API_URL}/production/work-orders/${woId}/adjust-full-bom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
};

// ==========================================
// ISO 9001:2015 & MES ENHANCEMENT API CLIENTS
// ==========================================

// 1. Calibration Instruments (ISO 7.1.5)
export const fetchCalibrationInstruments = async () => {
  const res = await fetch(`${API_URL}/calibration-instruments`);
  if (!res.ok) throw new Error('Failed to fetch calibration instruments');
  return res.json();
};

export const createCalibrationInstrument = async (data: any) => {
  const res = await fetch(`${API_URL}/calibration-instruments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create calibration instrument');
  return res.json();
};

export const updateCalibrationInstrument = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/calibration-instruments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update calibration instrument');
  return res.json();
};

// 2. Non-Conformance Reports (NCR) & CAPA (ISO 8.7 & 10.2)
export const fetchNcrRecords = async (params?: { workOrderId?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.workOrderId) query.append('workOrderId', params.workOrderId);
  if (params?.status) query.append('status', params.status);
  const res = await fetch(`${API_URL}/ncr-records?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch NCR records');
  return res.json();
};

export const createNcrRecord = async (data: any) => {
  const res = await fetch(`${API_URL}/ncr-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create NCR record');
  return res.json();
};

export const updateNcrRecord = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/ncr-records/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update NCR record');
  return res.json();
};

// 3. Machine Maintenance Logs (ISO 7.1.3 - TPM)
export const fetchMachineMaintenanceLogs = async (params?: { machineId?: string }) => {
  const query = new URLSearchParams();
  if (params?.machineId) query.append('machineId', params.machineId);
  const res = await fetch(`${API_URL}/machine-maintenance-logs?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch machine maintenance logs');
  return res.json();
};

export const createMachineMaintenanceLog = async (data: any) => {
  const res = await fetch(`${API_URL}/machine-maintenance-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create machine maintenance log');
  return res.json();
};

export const updateMachineMaintenanceLog = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/machine-maintenance-logs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update machine maintenance log');
  return res.json();
};

// 4. Engineering Change Orders (ECO) (ISO 7.5.3)
export const fetchEngineeringChangeOrders = async (params?: { workOrderId?: string }) => {
  const query = new URLSearchParams();
  if (params?.workOrderId) query.append('workOrderId', params.workOrderId);
  const res = await fetch(`${API_URL}/engineering-change-orders?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch ECO records');
  return res.json();
};

export const createEngineeringChangeOrder = async (data: any) => {
  const res = await fetch(`${API_URL}/engineering-change-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create ECO record');
  return res.json();
};

