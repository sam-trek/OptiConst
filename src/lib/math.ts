// Numerical helpers mirroring numpy behavior used by the original notebooks.

/** Trapezoidal integration of y over x, equivalent to numpy.trapezoid(y, x). */
export function trapz(y: readonly number[], x: readonly number[]): number {
  if (y.length !== x.length) {
    throw new Error('trapz: x and y must have the same length');
  }
  let sum = 0;
  for (let i = 1; i < x.length; i++) {
    sum += ((y[i] + y[i - 1]) / 2) * (x[i] - x[i - 1]);
  }
  return sum;
}

/** Sorts y by ascending x, equivalent to `idx = np.argsort(x); x[idx], y[idx]`. */
export function sortByX(
  x: readonly number[],
  y: readonly number[],
): { x: number[]; y: number[] } {
  const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
  return { x: idx.map((i) => x[i]), y: idx.map((i) => y[i]) };
}

export function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

export function max(values: readonly number[]): number {
  return values[argmax(values)];
}
