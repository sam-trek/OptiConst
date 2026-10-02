/** "Nice" axis ticks between min and max (roughly `target` of them). */
export function niceTicks(min: number, max: number, target = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.ceil(min / step - 1e-9) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

/** Spacing between the first two ticks (0 if there is only one). */
export function tickStep(ticks: readonly number[]): number {
  return ticks.length > 1 ? ticks[1] - ticks[0] : 0;
}
