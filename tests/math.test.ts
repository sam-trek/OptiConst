import { describe, expect, it } from 'vitest';
import { argmax, max, sortByX, trapz } from '../src/lib/math';

describe('trapz', () => {
  it('matches numpy.trapezoid for a simple ramp', () => {
    // numpy.trapezoid([0,1,2,3], [0,1,2,3]) == 4.5
    expect(trapz([0, 1, 2, 3], [0, 1, 2, 3])).toBeCloseTo(4.5, 10);
  });
});

describe('sortByX', () => {
  it('sorts y in tandem with ascending x', () => {
    const { x, y } = sortByX([3, 1, 2], ['c', 'a', 'b'] as unknown as number[]);
    expect(x).toEqual([1, 2, 3]);
    expect(y).toEqual(['a', 'b', 'c']);
  });
});

describe('argmax/max', () => {
  it('finds the index and value of the largest element', () => {
    expect(argmax([1, 5, 3])).toBe(1);
    expect(max([1, 5, 3])).toBe(5);
  });
});
