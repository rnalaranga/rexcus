import sys

# 1. Update api.ts
with open('src/lib/api.ts', 'r') as f:
    api_content = f.read()

tax_api_find = "export const createTax = async (data: any) => {"
tax_api_rep = """export const createTaxProfile = async (data: any) => {
  const res = await fetch(`${API_URL}/finance/tax-profiles`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  return res.json();
};

export const deleteTaxProfile = async (id: string) => {
  const res = await fetch(`${API_URL}/finance/tax-profiles/${id}`, { method: 'DELETE' });
  return res.json();
};

export const createTax = async (data: any) => {"""
api_content = api_content.replace(tax_api_find, tax_api_rep)

with open('src/lib/api.ts', 'w') as f:
    f.write(api_content)


# 2. Update useFinance.ts
with open('src/hooks/useFinance.ts', 'r') as f:
    use_finance_content = f.read()

use_taxes_find = """export function useTaxes() {
  const { data, loading, refetch } = useQuery('/finance/taxes');
  return { data: data || [], loading, refetch };
}"""
use_taxes_rep = """export function useTaxes() {
  const { data, loading, refetch } = useQuery('/finance/taxes');
  return { data: data || [], loading, refetch };
}

export function useTaxProfiles() {
  const { data, loading, refetch } = useQuery('/finance/tax-profiles');
  return { data: data || [], loading, refetch };
}"""
use_finance_content = use_finance_content.replace(use_taxes_find, use_taxes_rep)

with open('src/hooks/useFinance.ts', 'w') as f:
    f.write(use_finance_content)

print("Updated api.ts and useFinance.ts")
