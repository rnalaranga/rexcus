import { fetchCostCenters } from '@/lib/api';
import { fetchFinanceDashboard } from '@/lib/api';
﻿import { useState, useEffect, useCallback } from 'react';
import { fetchAccounts, fetchTaxes, fetchJournals } from '@/lib/api';

export function useAccounts() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAccounts();
      setData(res);
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
      setData(res);
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
      setData(res);
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
    try { const res = await fetchFinanceDashboard(); setData(res); } catch (e) { console.error(e); }
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
    try { const res = await fetchCostCenters(); setData(res); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}
