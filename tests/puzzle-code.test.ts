import { describe, it, expect } from 'vitest';
import { encodePuzzleCode, decodePuzzleCode } from '../src/puzzle/puzzle-code';

describe('puzzle codes', () => {
  it('round-trips a range of seeds', () => {
    for (const seed of [0, 1, 35, 36, 123, 123456, 4294967295]) {
      const code = decodePuzzleCode(encodePuzzleCode(seed));
      expect(code).toBe(seed >>> 0);
    }
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    const code = encodePuzzleCode(123456);
    expect(decodePuzzleCode(`  ${code.toLowerCase()}  `)).toBe(123456);
  });

  it('rejects malformed codes', () => {
    expect(decodePuzzleCode('')).toBeNull();
    expect(decodePuzzleCode('hello')).toBeNull();
    expect(decodePuzzleCode('QC1-')).toBeNull();
    expect(decodePuzzleCode('QC2-1a-1')).toBeNull();
  });

  it('rejects a code whose checksum does not match', () => {
    const code = encodePuzzleCode(1000); // e.g. QC1-RS-... ; corrupt the body
    const [prefix, body, checksum] = code.split('-');
    const corruptedBody = body === 'Z' ? 'Y' : 'Z';
    const corrupted = `${prefix}-${corruptedBody}-${checksum}`;
    // Only assert rejection when the corruption actually changes the seed's checksum.
    const seed = parseInt(corruptedBody, 36);
    if ((seed % 36).toString(36).toUpperCase() !== checksum) {
      expect(decodePuzzleCode(corrupted)).toBeNull();
    }
  });
});
