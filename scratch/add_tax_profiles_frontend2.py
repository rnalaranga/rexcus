import sys

# 1. Update useFinance.ts
with open('src/hooks/useFinance.ts', 'r') as f:
    content = f.read()

new_hook = """
export function useTaxProfiles() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchTaxProfiles } = await import('@/lib/api');
      const res = await fetchTaxProfiles();
      setData(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}
"""
content += new_hook

with open('src/hooks/useFinance.ts', 'w') as f:
    f.write(content)


# 2. Update api.ts
with open('src/lib/api.ts', 'r') as f:
    api_content = f.read()

new_api_fns = """
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
"""
api_content += new_api_fns

with open('src/lib/api.ts', 'w') as f:
    f.write(api_content)
print("Updated frontend hooks")
