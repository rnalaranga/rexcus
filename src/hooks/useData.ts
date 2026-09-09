import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';

export function useCustomers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchCustomers().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useLeads() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchLeads().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useDeals() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchDeals().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useInventory() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchInventory().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useStockLedger(inventoryId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!inventoryId) return;
    api.fetchStockLedger(inventoryId).then(d => {
      setData(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => { setData([]); setLoading(false); });
  }, [inventoryId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useSuppliers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchSuppliers().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useSupplierLedger(supplierId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!supplierId) return;
    api.fetchSupplierLedger(supplierId).then(d => {
      setData(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => { setData([]); setLoading(false); });
  }, [supplierId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useFollowups() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchFollowups().then(d => {
      setData(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => { setData([]); setLoading(false); });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
export function useInvoices() { const [data, setData] = useState<any[]>([]); const [loading, setLoading] = useState(true); const refetch = useCallback(() => { api.fetchInvoices().then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => { setData([]); setLoading(false); }); }, []); useEffect(() => { refetch(); }, [refetch]); return { data, loading, refetch }; }

export function useQuotations() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    api.fetchQuotations().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}
