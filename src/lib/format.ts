const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

function toSuperscript(n: number): string {
  return String(n).split('').map((c) => SUPERSCRIPT_DIGITS[c] ?? c).join('');
}

/** Formats a number as "1.70×10⁸" style scientific notation. */
export function formatScientific(value: number, sigFigs = 3): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const exp = value.toExponential(sigFigs - 1);
  const [mantissa, expPart] = exp.split('e');
  const expNum = Number(expPart);
  if (expNum > -2 && expNum < 3) {
    return Number(value.toPrecision(sigFigs)).toString();
  }
  return `${mantissa}×10${toSuperscript(expNum)}`;
}

/** Formats a lifetime in seconds using a sensible ns/ps/us/ms scale, like the mockup's "5.90 ns". */
export function formatLifetime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const units: [number, string][] = [
    [1e-12, 'ps'], [1e-9, 'ns'], [1e-6, 'μs'], [1e-3, 'ms'], [1, 's'],
  ];
  for (const [scale, label] of units) {
    if (Math.abs(seconds) < scale * 1000) {
      return `${(seconds / scale).toFixed(2)} ${label}`;
    }
  }
  return `${formatScientific(seconds)} s`;
}
