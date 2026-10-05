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
    try { const res = await fetchFinanceDashboard(); setData(Array.isArray(res) ? res : []); } catch (e) { console.error(e); }
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
