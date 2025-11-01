// 'YYYY-MM' -> 'YYYY-MM-01'
export function toMonthDate(yyyyMm) {
  const m = String(yyyyMm || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  return `${m}-01`;
}
