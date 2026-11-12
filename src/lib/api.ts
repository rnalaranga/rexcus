import { getApiBaseUrl } from '@/lib/utils';

const API_URL = getApiBaseUrl();

export const safeJson = async (res: Response, fallback: any = null) => {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch (e) {
    console.warn('safeJson parse warning:', e);
    return fallback;
  }
};

export const uploadFileToStorage = async (
  dataUri: string, 
  filename: string, 
  folder: string = 'attachments'
): Promise<{ url: string; key: string } | null> => {
  if (!dataUri || !dataUri.startsWith('data:')) return null;
  try {
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUri, filename, folder })
    });
    if (res.ok) {
      const data = await safeJson(res, null);
      if (data && data.url) {
        return { url: data.url, key: data.key };
      }
    }
  } catch (err) {
    console.warn('Storage upload error (fallback to local data):', err);
  }
  return null;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  let userRole = '';
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      userRole = JSON.parse(storedUser)?.role || '';
    }
  } catch (e) {}

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userRole ? { 'X-User-Role': userRole } : {})
  };
};

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
  const data = await safeJson(res, []);
  return Array.isArray(data) ? data : [];
};

export const createQuotation = async (data: any) => {
  const res = await fetch(`${API_URL}/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return safeJson(res, { success: res.ok });
};

export const updateQuotation = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/quotations/update/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return safeJson(res, { success: res.ok });
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

export const deleteQuotation = async (id: string, force: boolean = false) => {
  const query = force ? '?force=true' : '';
  const res = await fetch(`${API_URL}/quotations/${id}${query}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete quotation');
  return json;
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

export const resetAllInventoryStock = async (type?: string) => {
  const res = await fetch(`${API_URL}/inventory/reset-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset inventory stock');
  }
  return res.json();
};

export const resetAllInventoryPricing = async (type?: string) => {
  const res = await fetch(`${API_URL}/inventory/reset-pricing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reset inventory pricing');
  }
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create sales order');
  return json;
};

export const updateFinishedGoodsOrder = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to update sales order');
  return json;
};

export const approveOrderAdvanceWaiver = async (id: string | number, approvedBy?: string, notes?: string) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}/approve-advance-waiver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy, notes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to approve advance waiver');
  return data;
};

export const rejectOrderAdvanceWaiver = async (id: string | number, rejectedBy?: string, reason?: string) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}/reject-advance-waiver`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectedBy, reason })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reject advance waiver');
  return data;
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
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete sales order');
  return json;
};

export const cancelFinishedGoodsOrder = async (id: string, payload: {
  cancellationReason: string;
  reasonCategory?: string;
  applyPenalty?: boolean;
  newRating?: number;
  cancelledBy?: string;
  notes?: string;
}) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${id}/cancel`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to cancel sales order');
  return json;
};

export const changeSalesOrderNumber = async (id: string, newOrderNo: string) => {
  const res = await fetch(`${API_URL}/finished-goods-orders/${encodeURIComponent(id)}/change-number`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ newOrderNo })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to change sales order number');
  return json;
};

// -- SUPPLIERS --
export const fetchSuppliers = async () => {
  const res = await fetch(`${API_URL}/suppliers`);
  return res.json();
};

export const createSupplier = async (data: any) => {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || json.details || 'Failed to create supplier');
  return json;
};

export const updateSupplier = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || json.details || 'Failed to update supplier');
  return json;
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
  const encId = encodeURIComponent(id);
  const res = await fetch(`${API_URL}/invoices/${encId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const changeInvoiceNumber = async (oldId: string, newInvoiceNo: string) => {
  const encId = encodeURIComponent(oldId);
  const res = await fetch(`${API_URL}/invoices/${encId}/change-number`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newInvoiceNo })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to change invoice number');
  return data;
};

export const deleteInvoice = async (id: string) => {
  const encId = encodeURIComponent(id);
  const token = localStorage.getItem('token');
  let userRole = 'admin';
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.role) userRole = u.role;
    }
  } catch (e) {}

  const res = await fetch(`${API_URL}/invoices/${encId}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
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
    headers: getAuthHeaders(),
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
  const token = localStorage.getItem('token');
  let userRole = 'admin';
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.role) userRole = u.role;
    }
  } catch (e) {}

  const res = await fetch(`${API_URL}/finance/payment-receipts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': userRole,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete payment receipt');
  return json;
};



// --- PURCHASING ---
export const fetchMRs = async () => (await (await fetch(`${API_URL}/purchasing/mrs`)).json());
export const fetchMRById = async (id: string) => (await (await fetch(`${API_URL}/purchasing/mrs/${id}`)).json());
export const createMR = async (data: any) => {
  const res = await fetch(`${API_URL}/purchasing/mrs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create Material Request');
  return json;
};
export const updateMR = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/purchasing/mrs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to update Material Request');
  return json;
};
export const deleteMR = async (id: string) => {
  const res = await fetch(`${API_URL}/purchasing/mrs/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to delete Material Request');
  return json;
};

export const fetchPOs = async () => (await (await fetch(`${API_URL}/purchasing/pos`)).json());
export const fetchPOById = async (id: string) => (await (await fetch(`${API_URL}/purchasing/pos/${id}`)).json());
export const createPO = async (data: any) => {
  const res = await fetch(`${API_URL}/purchasing/pos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create Purchase Order');
  return json;
};
export const updatePO = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/purchasing/pos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to update Purchase Order');
  return json;
};
export const deletePO = async (id: string) => {
  const res = await fetch(`${API_URL}/purchasing/pos/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to delete Purchase Order');
  return json;
};

export const fetchGRNs = async () => (await (await fetch(`${API_URL}/purchasing/grns`)).json());
export const fetchGRNById = async (id: string) => (await (await fetch(`${API_URL}/purchasing/grns/${id}`)).json());
export const createGRN = async (data: any) => {
  const res = await fetch(`${API_URL}/purchasing/grns`, { method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create GRN');
  return json;
};
export const updateGRN = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/purchasing/grns/${id}`, { method: 'PUT', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to update GRN');
  return json;
};
export const deleteGRN = async (id: string) => {
  const res = await fetch(`${API_URL}/purchasing/grns/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to delete GRN');
  return json;
};

// --- CREDIT & DEBIT NOTES ---
export const fetchCreditDebitNotes = async (params?: Record<string, any>) => {
  let url = `${API_URL}/finance/credit-debit-notes`;
  if (params && Object.keys(params).length > 0) {
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams[k] = String(v);
      }
    });
    if (Object.keys(cleanParams).length > 0) {
      url += `?${new URLSearchParams(cleanParams).toString()}`;
    }
  }
  const res = await fetch(url, { headers: getAuthHeaders() });
  return res.json();
};

export const createCreditDebitNote = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/credit-debit-notes`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create Note');
  return json;
};

export const fetchBills = async () => (await (await fetch(`${API_URL}/purchasing/bills`)).json());
export const fetchBillsByPO = async (poId: string) => (await (await fetch(`${API_URL}/purchasing/pos/${poId}/bills`)).json());
export const createBill = async (data: any) => {
  const res = await fetch(`${API_URL}/purchasing/bills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to create Bill');
  return json;
};
export const updateBill = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/purchasing/bills/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to update Bill');
  return json;
};
export const deleteBill = async (id: string) => {
  const res = await fetch(`${API_URL}/purchasing/bills/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Failed to delete Bill');
  return json;
};



// ==========================
// FINANCE API
// ==========================
export const fetchAccounts = async () => (await (await fetch(`${API_URL}/finance/accounts`)).json());
export const createAccount = async (data: any) => (await (await fetch(`${API_URL}/finance/accounts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const updateAccount = async (id: string, data: any) => (await (await fetch(`${API_URL}/finance/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteAccount = async (id: string) => (await (await fetch(`${API_URL}/finance/accounts/${id}`, { method: 'DELETE' })).json());
export const recalculateAccountBalances = async () => (await (await fetch(`${API_URL}/finance/recalculate-balances`, { method: 'POST' })).json());
export const fetchAccountLedger = async (id: string, params?: { startDate?: string; endDate?: string }) => {
  const q = new URLSearchParams();
  if (params?.startDate) q.append('startDate', params.startDate);
  if (params?.endDate) q.append('endDate', params.endDate);
  const qStr = q.toString() ? `?${q.toString()}` : '';
  const res = await fetch(`${API_URL}/finance/accounts/${id}/ledger${qStr}`);
  return res.json();
};

export const fetchAccountLedgerReport = async (params: { accountId?: string; startDate?: string; endDate?: string }) => {
  const q = new URLSearchParams();
  if (params.accountId) q.append('accountId', params.accountId);
  if (params.startDate) q.append('startDate', params.startDate);
  if (params.endDate) q.append('endDate', params.endDate);
  const qStr = q.toString() ? `?${q.toString()}` : '';
  const res = await fetch(`${API_URL}/finance/reports/account-ledger${qStr}`);
  return res.json();
};

export const fetchTaxes = async () => (await (await fetch(`${API_URL}/finance/taxes`)).json());
export const createTax = async (data: any) => (await (await fetch(`${API_URL}/finance/taxes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());
export const deleteTax = async (id: string) => (await (await fetch(`${API_URL}/finance/taxes/${id}`, { method: 'DELETE' })).json());

export const fetchJournals = async () => (await (await fetch(`${API_URL}/finance/journals`)).json());
export const fetchJournal = async (id: string) => {
  const res = await fetch(`${API_URL}/finance/journals/${encodeURIComponent(id)}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to fetch journal entry');
  }
  return json;
};

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

export const updateJournal = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/finance/journals/${encodeURIComponent(id)}`, { 
    method: 'PUT', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(data) 
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Failed to update journal entry');
  }
  return json;
};

export const fetchInventoryValuationSummary = async () => {
  const res = await fetch(`${API_URL}/finance/inventory/valuation-summary`);
  return res.json();
};

export const syncInventoryValuation = async (data?: { syncDate?: string; notes?: string; user?: string }) => {
  const res = await fetch(`${API_URL}/finance/inventory/sync-valuation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {})
  });
  return res.json();
};

export interface CashbookEntry {
  id: string;
  date: string;
  time: string;
  entryType: 'IN' | 'OUT';
  amount: number;
  particulars: string;
  accountId: string;
  cashAccountId: string;
  referenceNo?: string;
  partyName?: string;
  journalEntryId?: string;
  createdBy?: string;
  createdById?: string;
  createdByName?: string;
  source?: 'mobile' | 'desktop';
  status?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  receiptPhoto?: string;
  notes?: string;
  createdAt?: string;
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  accountSubtype?: string;
  cashAccountCode?: string;
  cashAccountName?: string;
  runningBalance?: number;
}

export interface CashbookData {
  date: string;
  cashAccount: {
    id: string;
    code: string;
    name: string;
    balance: number;
  };
  allCashAccounts: Array<{
    id: string;
    code: string;
    name: string;
    balance: number;
    subtype?: string;
  }>;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  netMovement: number;
  closingBalance: number;
  entries: CashbookEntry[];
  pendingEntries?: CashbookEntry[];
  dayPendingEntries?: CashbookEntry[];
}

export const fetchCashbook = async (date?: string, cashAccountId?: string): Promise<CashbookData> => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (cashAccountId) params.append('cashAccountId', cashAccountId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/finance/cashbook${query}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to fetch cashbook');
  return json;
};

export const createCashbookEntry = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/cashbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to create cashbook entry');
  return json;
};

export const deleteCashbookEntry = async (id: string) => {
  const res = await fetch(`${API_URL}/finance/cashbook/${id}`, {
    method: 'DELETE'
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete cashbook entry');
  return json;
};

export const approveCashbookEntry = async (id: string, approvedBy?: string) => {
  const res = await fetch(`${API_URL}/finance/cashbook/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to approve cashbook entry');
  return json;
};

export const rejectCashbookEntry = async (id: string, rejectedBy?: string, reason?: string) => {
  const res = await fetch(`${API_URL}/finance/cashbook/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectedBy, reason })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to reject cashbook entry');
  return json;
};

export const fetchPendingCashbookEntries = async (): Promise<CashbookEntry[]> => {
  const res = await fetch(`${API_URL}/finance/cashbook/pending`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to fetch pending cashbook entries');
  return json;
};

export const setCashbookFloat = async (data: {
  cashAccountId?: string;
  floatAmount: number;
  fundingSourceAccountId?: string;
  notes?: string;
  date?: string;
  createdBy?: string;
}) => {
  const res = await fetch(`${API_URL}/finance/cashbook/set-float`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to set petty cash float');
  return json;
};

export const fetchAdvancedReport = async (params: {
  reportType: 'invoices' | 'unpaid_invoices' | 'cashbook' | 'tax_register' | 'vendor_bills' | 'unpaid_bills' | 'ap_aging';
  startDate?: string;
  endDate?: string;
  customerId?: string;
  supplierId?: string;
  billCategory?: string;
  billSource?: string;
  agingBucket?: string;
  status?: string;
  cashAccountId?: string;
}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      q.append(k, String(v));
    }
  });
  const res = await fetch(`${API_URL}/finance/reports/advanced?${q.toString()}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to fetch advanced report');
  return json;
};

export const settleCustomerOutstanding = async (data: {
  customerId: string;
  customerName?: string;
  paymentDate?: string;
  paymentMethod: string;
  depositAccountId?: string;
  reference?: string;
  notes?: string;
  totalAmount: number;
  currency?: string;
  exchangeRate?: number;
  allocations: Array<{
    invoiceId: string;
    invoiceNo?: string;
    allocatedAmount: number;
  }>;
  receivedBy?: string;
}) => {
  const res = await fetch(`${API_URL}/finance/receivables/settle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to settle customer payment');
  return json;
};

export const settleVendorOutstanding = async (data: {
  supplierId: string;
  supplierName?: string;
  paymentDate?: string;
  paymentMethod: string;
  creditAccountId?: string; // Bank or Cash
  debitAccountId?: string;  // Accounts Payable
  referenceNo?: string;
  notes?: string;
  totalAmount: number;
  chequeNo?: string;
  chequeDate?: string;
  bankName?: string;
  depositSlip?: string;
  allocations: Array<{
    billId: string;
    invoiceNo?: string;
    allocatedAmount: number;
  }>;
}) => {
  const res = await fetch(`${API_URL}/finance/payables/settle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to settle vendor payment');
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
  const res = await fetch(`${API_URL}/production/work-orders/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete work order');
  return json;
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
  const res = await fetch(`${API_URL}/production/operations/${opId}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete operation');
  return json;
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
  const res = await fetch(`${API_URL}/gate-passes/${id}`, { 
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Failed to delete gate pass');
  return json;
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

// 5. Customer PO Pool APIs
export interface CustomerPoPoolItem {
  id: string;
  poNumber: string;
  poDate?: string;
  customerId?: string;
  customerName?: string;
  customerCompany?: string;
  amount?: number;
  currency?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  notes?: string;
  status: 'unassigned' | 'assigned';
  assignedQuoteId?: string;
  assignedQuoteNo?: string;
  assignedOrderId?: string;
  assignedOrderNo?: string;
  assignedAt?: string;
  assignedBy?: string;
  receivedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchCustomerPoPool = async (params?: { status?: string; customerId?: string; search?: string }): Promise<CustomerPoPoolItem[]> => {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.customerId) query.append('customerId', params.customerId);
  if (params?.search) query.append('search', params.search);
  const res = await fetch(`${API_URL}/customer-po-pool?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch customer PO pool');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const createCustomerPoPoolItem = async (data: Partial<CustomerPoPoolItem>): Promise<CustomerPoPoolItem> => {
  const res = await fetch(`${API_URL}/customer-po-pool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add PO to pool');
  }
  return res.json();
};

export const assignCustomerPoFromPool = async (
  poolId: string, 
  data: { quoteId?: string; quoteNo?: string; orderId?: string; orderNo?: string; assignedBy?: string; notes?: string }
) => {
  const res = await fetch(`${API_URL}/customer-po-pool/${poolId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign PO from pool');
  }
  return res.json();
};

export const unassignCustomerPoFromPool = async (poolId: string) => {
  const res = await fetch(`${API_URL}/customer-po-pool/${poolId}/unassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to unassign PO from pool');
  return res.json();
};

export const deleteCustomerPoPoolItem = async (poolId: string) => {
  const res = await fetch(`${API_URL}/customer-po-pool/${poolId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete PO from pool');
  return res.json();
};

export const getDailyCashFlow = async (params: { startDate?: string; endDate?: string; paymentMethod?: string; type?: string } = {}) => {
  const sp = new URLSearchParams();
  if (params.startDate) sp.append('startDate', params.startDate);
  if (params.endDate) sp.append('endDate', params.endDate);
  if (params.paymentMethod && params.paymentMethod !== 'ALL') sp.append('paymentMethod', params.paymentMethod);
  if (params.type && params.type !== 'ALL') sp.append('type', params.type);
  const q = sp.toString() ? `?${sp.toString()}` : '';
  const res = await fetch(`${API_URL}/finance/daily-cash-flow${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch cash flow data');
  }
  return res.json();
};

export const getPaymentVouchers = async (params: { startDate?: string; endDate?: string; payeeType?: string } = {}) => {
  const sp = new URLSearchParams();
  if (params.startDate) sp.append('startDate', params.startDate);
  if (params.endDate) sp.append('endDate', params.endDate);
  if (params.payeeType) sp.append('payeeType', params.payeeType);
  const q = sp.toString() ? `?${sp.toString()}` : '';
  const res = await fetch(`${API_URL}/finance/payment-vouchers${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch payment vouchers');
  }
  return res.json();
};

export const createPaymentVoucher = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/payment-vouchers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create payment voucher');
  }
  return res.json();
};

export const updateChequeStatus = async (id: string, status: string, sourceTable?: string) => {
  const res = await fetch(`${API_URL}/finance/cheques/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, sourceTable })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update cheque status');
  }
  return res.json();
};

// ==========================================
// SERVICE & INSPECTION JOBS API
// ==========================================

export interface ServiceInspectionJob {
  id: string;
  jobNo: string;
  intakeDate: string;
  customerId?: string | null;
  customerName: string;
  customerCompany?: string | null;
  contactPhone?: string | null;
  contactPerson?: string | null;
  itemName: string;
  itemCategory?: string;
  serialNo?: string | null;
  modelNo?: string | null;
  customerProblem?: string | null;
  initialCondition?: string | null;
  receivedBy?: string;
  status: 'intake' | 'in_inspection' | 'diagnosis_complete' | 'quoted' | 'approved' | 'in_repair' | 'declined' | 'released' | 'closed';
  priority?: string;
  assignedTechnician?: string | null;
  findings?: string | null;
  requiredParts?: Array<{
    id?: string;
    name: string;
    partNo?: string;
    qty: number;
    unitPrice: number;
    total: number;
    isAvailable?: boolean;
  }>;
  requiredOperations?: Array<{
    id?: string;
    operationName: string;
    machineName?: string;
    estimatedHours: number;
    hourlyRate: number;
    total: number;
    description?: string;
  }>;
  estimatedRepairCost?: number;
  inspectionFee?: number;
  inspectionFeeStatus?: 'unbilled' | 'billed' | 'waived' | 'paid';
  inspectionInvoiceId?: string | null;
  inspectionInvoiceNo?: string | null;
  diagnosisCompletedAt?: string | null;
  diagnosisCompletedBy?: string | null;
  inwardGatePassId?: string | null;
  inwardGatePassNo?: string | null;
  inspectionWorkOrderId?: string | null;
  quotationId?: string | null;
  quotationNo?: string | null;
  quotationAmount?: number;
  customerDecision?: 'Pending' | 'Approved' | 'Declined';
  customerDecisionDate?: string | null;
  customerDecisionNotes?: string | null;
  salesOrderId?: string | null;
  salesOrderNo?: string | null;
  repairWorkOrderId?: string | null;
  finalInvoiceId?: string | null;
  finalInvoiceNo?: string | null;
  outwardGatePassId?: string | null;
  outwardGatePassNo?: string | null;
  releasedDate?: string | null;
  releasedBy?: string | null;
  releaseReason?: string | null;
  timeline?: Array<{
    id?: string;
    timestamp: string;
    action: string;
    actor?: string;
    title?: string;
    description?: string;
    documentType?: string;
    documentNo?: string;
    documentId?: string;
  }>;
  photos?: string[];
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  linkedRecords?: {
    quotation?: any;
    inwardGatePass?: any;
    outwardGatePass?: any;
    inspectionInvoice?: any;
    finalInvoice?: any;
    salesOrder?: any;
    repairWorkOrder?: any;
  };
}

export const fetchServiceJobs = async (params: { status?: string; search?: string; customerId?: string } = {}) => {
  const sp = new URLSearchParams();
  if (params.status && params.status !== 'all') sp.append('status', params.status);
  if (params.search) sp.append('search', params.search);
  if (params.customerId) sp.append('customerId', params.customerId);
  const q = sp.toString() ? `?${sp.toString()}` : '';
  const res = await fetch(`${API_URL}/production/service-jobs${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch service jobs');
  }
  return res.json();
};

export const fetchServiceJobById = async (id: string): Promise<ServiceInspectionJob> => {
  const res = await fetch(`${API_URL}/production/service-jobs/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch service job');
  }
  return res.json();
};

export const createServiceJob = async (data: any) => {
  const res = await fetch(`${API_URL}/production/service-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create service job');
  }
  return res.json();
};

export const updateServiceJobDiagnosis = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/service-jobs/${encodeURIComponent(id)}/diagnosis`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update diagnosis');
  }
  return res.json();
};

export const createServiceJobQuotation = async (id: string, data: any = {}) => {
  const res = await fetch(`${API_URL}/production/service-jobs/${encodeURIComponent(id)}/create-quotation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create quotation');
  }
  return res.json();
};

export const recordServiceJobDecision = async (
  id: string,
  data: {
    decision: 'Approved' | 'Declined';
    notes?: string;
    recordedBy?: string;
    feeAction?: 'charge' | 'waive';
  }
) => {
  const res = await fetch(`${API_URL}/production/service-jobs/${encodeURIComponent(id)}/decision`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to record customer decision');
  }
  return res.json();
};

export const releaseServiceJobGatePass = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/service-jobs/${encodeURIComponent(id)}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to release equipment and issue gate pass');
  }
  return res.json();
};

export const updateServiceJob = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/production/service-jobs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update service job');
  }
  return res.json();
};



