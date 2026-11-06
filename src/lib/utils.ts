export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function toMySQLDate(date: Date): string {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return localDate.toISOString().slice(0, 19).replace('T', ' ')
}

export function formatCurrency(amount: number, short = false, currencyCode = 'LKR'): string {
  const isRs = currencyCode === 'LKR' || currencyCode === 'Rs' || !currencyCode;
  const sym = isRs ? 'Rs.' : (currencyCode + ' ');
  return `${sym}${(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '—') return '—'
  const normalized = String(dateStr).includes(' ') ? String(dateStr).replace(' ', 'T') : String(dateStr)
  const d = new Date(normalized)
  if (isNaN(d.getTime())) {
    const d2 = new Date(String(dateStr).replace(/-/g, '/'))
    if (!isNaN(d2.getTime())) {
      return d2.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    return String(dateStr).slice(0, 10)
  }
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

export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const num2words = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '') + ' ';
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred ' + num2words(n % 100);
    if (n < 100000) return num2words(Math.floor(n / 1000)) + 'Thousand ' + num2words(n % 1000);
    if (n < 10000000) return num2words(Math.floor(n / 100000)) + 'Lakh ' + num2words(n % 100000);
    return num2words(Math.floor(n / 10000000)) + 'Crore ' + num2words(n % 10000000);
  };

  const whole = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - whole) * 100);
  let words = num2words(whole).trim() + ' Rupees';
  if (cents > 0) {
    words += ' and ' + num2words(cents).trim() + ' Cents';
  }
  return words + ' Only';
}

export function resolveFileUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // If already relative /api/files/...
  if (url.startsWith('/api/files/')) {
    return `${apiBase.replace(/\/api$/, '')}${url}`;
  }

  // If it's an R2 direct API URL (e.g. *.r2.cloudflarestorage.com) which cannot be opened directly in browsers
  const r2DirectMatch = url.match(/https?:\/\/[^\/]+\.r2\.cloudflarestorage\.com\/(.+)$/i);
  if (r2DirectMatch && r2DirectMatch[1]) {
    return `${apiBase}/files/${r2DirectMatch[1]}`;
  }

  // If it's a relative path starting with common storage folders
  if (/^(quotations|sales_orders|attachments|branding)\//i.test(url)) {
    return `${apiBase}/files/${url}`;
  }

  return url;
}

export function openDataUriOrUrl(url: string, title?: string): void {
  if (!url) return;
  try {
    const targetUrl = resolveFileUrl(url);
    if (targetUrl.startsWith('data:')) {
      const parts = targetUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      window.open(targetUrl, '_blank');
    }
  } catch (e) {
    console.error('Error opening document:', e);
    window.open(resolveFileUrl(url), '_blank');
  }
}

export function downloadDataUriOrUrl(url: string, filename: string): void {
  if (!url) return;
  try {
    const targetUrl = resolveFileUrl(url);
    if (targetUrl.startsWith('data:')) {
      const parts = targetUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } else {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch (e) {
    console.error('Error downloading document:', e);
  }
}

export function dataUriToBlobUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith('data:')) return resolveFileUrl(url);
  try {
    const parts = url.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Error creating Blob URL from data URI:', e);
    return resolveFileUrl(url);
  }
}
