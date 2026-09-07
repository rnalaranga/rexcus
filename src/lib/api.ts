const API_URL = 'http://localhost:3000/api';

export const fetchCustomers = async () => {
  const res = await fetch(`${API_URL}/customers`);
  return res.json();
};

export const createCustomer = async (data: any) => {
  const res = await fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateCustomer = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
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
export const fetchQuotations = async (leadId: string) => {
  const res = await fetch(`${API_URL}/quotations/${leadId}`);
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

export const deleteQuotation = async (id: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}`, { method: 'DELETE' });
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

export const addStockLedgerEntry = async (inventoryId: string, data: any) => {
  const res = await fetch(`${API_URL}/inventory/${inventoryId}/ledger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
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
  return res.json();
};

export const createSupplierLedgerEntry = async (data: any) => {
  const res = await fetch(`${API_URL}/supplier-ledger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteSupplierLedgerEntry = async (id: string) => {
  const res = await fetch(`${API_URL}/supplier-ledger/${id}`, { method: 'DELETE' });
  return res.json();
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
  const res = await fetch(`${API_URL}/invoices/${id}`, { method: 'DELETE' });
  return res.json();
};

export const addInvoicePayment = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/invoices/${id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};
