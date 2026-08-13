import { describe, expect, it } from 'vitest';
import de from './de.json';
import en from './en.json';

const leafKeys = (value: unknown, prefix = ''): string[] => {
  if (Array.isArray(value)) return value.map((_item, index) => `${prefix}[${index}]`);
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leafKeys(child, prefix ? `${prefix}.${key}` : key));
};

describe('translation catalogs', () => {
  it('keeps English and German structurally complete', () => {
    expect(leafKeys(de).sort()).toEqual(leafKeys(en).sort());
  });
});
