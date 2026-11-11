import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';

// Global in-memory cache store for high-performance SWR (Stale-While-Revalidate)
const dataCache: Record<string, { data: any[]; timestamp: number }> = {};
const listeners: Record<string, Set<() => void>> = {};

export function invalidateDataCache(key?: string) {
  if (key) {
    Object.keys(dataCache).forEach(k => {
      if (k === key || k.startsWith(key)) {
        delete dataCache[k];
      }
    });
    // Trigger any active hooks listening for this key
    Object.keys(listeners).forEach(k => {
      if (k === key || k.startsWith(key)) {
        listeners[k]?.forEach(fn => {
          try { fn(); } catch (e) { console.warn(e); }
        });
      }
    });
  } else {
    Object.keys(dataCache).forEach(k => delete dataCache[k]);
    Object.keys(listeners).forEach(k => {
      listeners[k]?.forEach(fn => {
        try { fn(); } catch (e) { console.warn(e); }
      });
    });
  }
}

function registerListener(key: string, fn: () => void) {
  if (!listeners[key]) listeners[key] = new Set();
  listeners[key].add(fn);
  return () => {
    listeners[key]?.delete(fn);
  };
}

export function useCustomers() {
  const [data, setData] = useState<any[]>(() => dataCache['customers']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['customers']);

  const refetch = useCallback(() => {
    return api.fetchCustomers().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['customers'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch customers:', err);
      setLoading(false);
      return dataCache['customers']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, setData, loading, refetch };
}

export function useLeads() {
  const [data, setData] = useState<any[]>(() => dataCache['leads']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['leads']);

  const refetch = useCallback(() => {
    return api.fetchLeads().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['leads'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch leads:', err);
      setLoading(false);
      return dataCache['leads']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useDeals() {
  const [data, setData] = useState<any[]>(() => dataCache['deals']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['deals']);

  const refetch = useCallback(() => {
    return api.fetchDeals().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['deals'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch deals:', err);
      setLoading(false);
      return dataCache['deals']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useInventory() {
  const [data, setData] = useState<any[]>(() => dataCache['inventory']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['inventory']);

  const refetch = useCallback(() => {
    return api.fetchInventory().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['inventory'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch inventory:', err);
      setLoading(false);
      return dataCache['inventory']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useStockLedger(inventoryId: string) {
  const cacheKey = `stock_ledger_${inventoryId}`;
  const [data, setData] = useState<any[]>(() => dataCache[cacheKey]?.data || []);
  const [loading, setLoading] = useState(() => !dataCache[cacheKey]);

  const refetch = useCallback(() => {
    if (!inventoryId) return Promise.resolve([]);
    return api.fetchStockLedger(inventoryId).then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache[cacheKey] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(() => {
      setLoading(false);
      return dataCache[cacheKey]?.data || [];
    });
  }, [inventoryId, cacheKey]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useSuppliers() {
  const [data, setData] = useState<any[]>(() => dataCache['suppliers']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['suppliers']);

  const refetch = useCallback(() => {
    return api.fetchSuppliers().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['suppliers'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch suppliers:', err);
      setLoading(false);
      return dataCache['suppliers']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useSupplierLedger(supplierId: string) {
  const cacheKey = `supplier_ledger_${supplierId}`;
  const [data, setData] = useState<any[]>(() => dataCache[cacheKey]?.data || []);
  const [loading, setLoading] = useState(() => !dataCache[cacheKey]);

  const refetch = useCallback(() => {
    if (!supplierId) return Promise.resolve([]);
    return api.fetchSupplierLedger(supplierId).then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache[cacheKey] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(() => {
      setLoading(false);
      return dataCache[cacheKey]?.data || [];
    });
  }, [supplierId, cacheKey]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch, setData };
}

export function useFollowups() {
  const [data, setData] = useState<any[]>(() => dataCache['followups']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['followups']);

  const refetch = useCallback(() => {
    return api.fetchFollowups().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['followups'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(() => {
      setLoading(false);
      return dataCache['followups']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useInvoices() {
  const [data, setData] = useState<any[]>(() => dataCache['invoices']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['invoices']);

  const refetch = useCallback(() => {
    return api.fetchInvoices().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['invoices'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(() => {
      setLoading(false);
      return dataCache['invoices']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useQuotations() {
  const [data, setData] = useState<any[]>(() => dataCache['quotations']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['quotations']);

  const refetch = useCallback(() => {
    return api.fetchQuotations().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['quotations'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch quotations:', err);
      setLoading(false);
      return dataCache['quotations']?.data || [];
    });
  }, []);

  useEffect(() => { 
    refetch();
    const unregister = registerListener('quotations', () => {
      refetch();
    });
    return unregister;
  }, [refetch]);

  return { data, loading, refetch };
}

export const useMachiningOperations = () => {
  const [data, setData] = useState<any[]>(() => dataCache['machining_operations']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['machining_operations']);
  const [error, setError] = useState<Error|null>(null);

  const fetch = useCallback(async () => {
    try {
      if (!dataCache['machining_operations']) setLoading(true);
      const res = await api.fetchMachiningOperations();
      const arr = Array.isArray(res) ? res : [];
      dataCache['machining_operations'] = { data: arr, timestamp: Date.now() };
      setData(arr);
    } catch(e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export function useFinishedGoodsOrders(params?: { productId?: string; status?: string }) {
  const cacheKey = `fgo_${params?.productId || ''}_${params?.status || ''}`;
  const [data, setData] = useState<any[]>(() => dataCache[cacheKey]?.data || []);
  const [loading, setLoading] = useState(() => !dataCache[cacheKey]);

  const refetch = useCallback(() => {
    return api.fetchFinishedGoodsOrders(params).then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache[cacheKey] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch finished goods orders:', err);
      setLoading(false);
      return dataCache[cacheKey]?.data || [];
    });
  }, [params?.productId, params?.status, cacheKey]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, setData, loading, refetch };
}

export function useStockRemnants(params?: { materialName?: string; status?: string }) {
  const cacheKey = `remnants_${params?.materialName || ''}_${params?.status || ''}`;
  const [data, setData] = useState<any[]>(() => dataCache[cacheKey]?.data || []);
  const [loading, setLoading] = useState(() => !dataCache[cacheKey]);

  const refetch = useCallback(() => {
    return api.fetchStockRemnants(params).then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache[cacheKey] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error('Failed to fetch stock remnants:', err);
      setLoading(false);
      return dataCache[cacheKey]?.data || [];
    });
  }, [params?.materialName, params?.status, cacheKey]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, setData, loading, refetch };
}

export function useWorkOrders() {
  const [data, setData] = useState<any[]>(() => dataCache['work_orders']?.data || []);
  const [loading, setLoading] = useState(() => !dataCache['work_orders']);

  const refetch = useCallback(() => {
    return api.fetchWorkOrders().then(d => {
      const arr = Array.isArray(d) ? d : [];
      dataCache['work_orders'] = { data: arr, timestamp: Date.now() };
      setData(arr);
      setLoading(false);
      return arr;
    }).catch(err => {
      console.error("Failed to fetch work orders:", err);
      setLoading(false);
      return dataCache['work_orders']?.data || [];
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, setData, loading, refetch };
}
