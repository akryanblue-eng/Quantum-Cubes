import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGroup } from '../src/engine/validate-group';
import { makeTile, type TileFamily } from '../src/contracts/tile';
import type { Group } from '../src/contracts/game-state';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, '..', 'fixtures');

interface FixtureFile {
  name: string;
  expectLegal: boolean;
  groups: { tiles: { family: TileFamily; value: number }[] }[];
}

function jsonFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...jsonFilesUnder(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      found.push(full);
    }
  }
  return found;
}

function toGroup(index: number, spec: FixtureFile['groups'][number]): Group {
  return { id: `g-${index}`, tiles: spec.tiles.map((t) => makeTile(t.family, t.value)) };
}

const files = jsonFilesUnder(fixturesRoot);

describe('fixtures — every JSON file validates as expected', () => {
  it('found fixture files to validate', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const label = relative(fixturesRoot, file);
    it(`validates ${label}`, () => {
      const fixture = JSON.parse(readFileSync(file, 'utf8')) as FixtureFile;
      expect(Array.isArray(fixture.groups)).toBe(true);
      const results = fixture.groups.map((g, i) => validateGroup(toGroup(i + 1, g)));

      if (fixture.expectLegal) {
        expect(results.every((r) => r.valid)).toBe(true);
      } else {
        expect(results.some((r) => !r.valid)).toBe(true);
      }
    });
  }
});
