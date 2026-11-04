import { fetchCostCenters } from '@/lib/api';
import { fetchFinanceDashboard } from '@/lib/api';
﻿import { useState, useEffect, useCallback } from 'react';
import { fetchAccounts, fetchTaxes, fetchJournals, fetchCashbook, CashbookData } from '@/lib/api';

export function useAccounts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAccounts();
      setData(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useTaxes() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTaxes();
      setData(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useJournals() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJournals();
      setData(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useFinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetchFinanceDashboard(); setData(res && !res.error ? res : { cash: 0, ar: 0, ap: 0, profit: 0, revenue: 0, expenses: 0 }); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useCostCenters() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetchCostCenters(); setData(Array.isArray(res) ? res : []); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useTaxProfiles() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchTaxProfiles } = await import('@/lib/api');
      const res = await fetchTaxProfiles();
      setData(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useCurrencies() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000/api') + '/currencies').then(r => r.json());
      setData(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

export function useCashbook(date?: string, cashAccountId?: string) {
  const [data, setData] = useState<CashbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCashbook(date, cashAccountId);
      setData(res);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch cashbook');
    } finally {
      setLoading(false);
    }
  }, [date, cashAccountId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}
