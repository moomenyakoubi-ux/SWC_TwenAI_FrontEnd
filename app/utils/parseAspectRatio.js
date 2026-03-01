export function parseAspectRatio(value) {
  if (value == null) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return null;

    s = s.replace(',', '.');

    const n = Number(s);
    if (Number.isFinite(n) && n > 0) return n;

    if (s.includes(':')) {
      const [aStr, bStr] = s.split(':');
      const a = Number(aStr.trim().replace(',', '.'));
      const b = Number(bStr.trim().replace(',', '.'));
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a / b;
    }

    if (s.includes('/')) {
      const [aStr, bStr] = s.split('/');
      const a = Number(aStr.trim().replace(',', '.'));
      const b = Number(bStr.trim().replace(',', '.'));
      if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return a / b;
    }
  }

  return null;
}
