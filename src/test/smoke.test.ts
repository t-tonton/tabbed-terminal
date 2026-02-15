import { describe, expect, it } from 'vitest';
import { generateId } from '../utils/id';

describe('test foundation', () => {
  it('can run tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('generates unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).toBeTypeOf('string');
    expect(id2).toBeTypeOf('string');
    expect(id1).not.toBe(id2);
  });
});
