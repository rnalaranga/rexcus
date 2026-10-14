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


export const updateQuotationStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_URL}/quotations/status/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};

export const deleteQuotation = async (id: string) => {
  const res = await fetch(`${API_URL}/quotations/${id}`, { method: 'DELETE' });
  return res.json();
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
export const createJournal = async (data: any) => (await (await fetch(`${API_URL}/finance/journals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json());

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

export const createWorkOrder = async (data: any) => {
  const res = await fetch(`${API_URL}/production/work-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};
export const fetchPartyLedger = async (id: string) => (await (await fetch(`${API_URL}/finance/party/${id}/ledger`)).json());
export const deleteJournal = async (id: string) => (await (await fetch(`${API_URL}/finance/journals/${id}`, { method: 'DELETE' })).json());

export const approveCreditLimit = async (id: string, status: 'approved' | 'rejected') => (await (await fetch(`${API_URL}/customers/${id}/approve-credit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })).json());

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
