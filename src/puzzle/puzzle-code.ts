/**
 * Shareable puzzle codes.
 *
 * A code encodes an unsigned 32-bit seed in base36 with a one-character
 * checksum, so a mistyped code is usually rejected rather than silently loading
 * a different puzzle. Codes are client-side only — no backend involved.
 *
 * Format: `QC1-<base36 seed>-<checksum>` (case-insensitive), e.g. `QC1-1a-1`.
 */

const PREFIX = 'QC1';
const CODE_RE = /^QC1-([0-9A-Z]+)-([0-9A-Z])$/;

function checksumChar(seed: number): string {
  return (seed % 36).toString(36).toUpperCase();
}

export function encodePuzzleCode(seed: number): string {
  const s = seed >>> 0;
  return `${PREFIX}-${s.toString(36).toUpperCase()}-${checksumChar(s)}`;
}

/** Decode a code back to its seed, or null if malformed or checksum-mismatched. */
export function decodePuzzleCode(code: string): number | null {
  const match = CODE_RE.exec(code.trim().toUpperCase());
  if (!match) return null;
  const seed = parseInt(match[1], 36);
  if (!Number.isFinite(seed)) return null;
  const s = seed >>> 0;
  if (s !== seed) return null; // out of unsigned 32-bit range
  if (match[2] !== checksumChar(s)) return null;
  return s;
}
