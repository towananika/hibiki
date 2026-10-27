export function amount(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw Error('金額は0以上の整数で入力してください。');
  return n;
}
export function remaining(budget, saved) {
  return budget == null || saved == null ? null : Math.max(0, budget - saved);
}
export function safeSource(url) {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : null; } catch { return null; }
}
