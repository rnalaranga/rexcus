export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function toMySQLDate(date: Date): string {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return localDate.toISOString().slice(0, 19).replace('T', ' ')
}

export function formatCurrency(amount: number, short = false): string {
  if (short) {
    if (amount >= 1_000_000) return `Rs. ${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `Rs. ${(amount / 1_000).toFixed(0)}K`
    return `Rs. ${amount.toLocaleString()}`
  }
  return `Rs. ${amount.toLocaleString('en-LK')}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '—') return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function relativeTime(dateStr: string): string {
  if (!dateStr || dateStr === '—') return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
