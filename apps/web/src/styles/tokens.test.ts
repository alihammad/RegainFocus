import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcDir = join(import.meta.dirname, '..');
const tokensCss = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function tokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tokensCss.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('design tokens', () => {
  it('keeps colour values in tokens.css only', () => {
    const offenders = walk(srcDir)
      .filter((f) => /\.(css|tsx?|html)$/.test(f))
      .filter((f) => !f.endsWith('tokens.css') && !f.endsWith('tokens.test.ts'))
      .filter((f) => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(readFileSync(f, 'utf8')))
      .map((f) => relative(srcDir, f));
    expect(offenders).toEqual([]);
  });

  // Pairs named in docs/DESIGN.md. Text needs 4.5:1 (3:1 at 24px and above).
  const t = tokens();
  const pairs: [string, string, string, number][] = [
    ['ink on ground', '--color-ink', '--color-ground', 4.5],
    ['ink on surface', '--color-ink', '--color-surface', 4.5],
    ['ink-2 on ground', '--color-ink-2', '--color-ground', 4.5],
    ['ink-2 on surface', '--color-ink-2', '--color-surface', 4.5],
    ['ink-3 on muted panel', '--color-ink-3', '--color-muted-panel', 4.5],
    ['ink-3 on control border (disabled primary)', '--color-ink-3', '--color-control-border', 4.5],
    ['ink-3 on chip', '--color-ink-3', '--color-chip', 4.5],
    ['on-blue on blue (primary button)', '--color-on-blue', '--color-blue', 4.5],
    ['blue on surface (links)', '--color-blue', '--color-surface', 4.5],
    ['blue-on-tint on blue-tint', '--color-blue-on-tint', '--color-blue-tint', 4.5],
    ['ink on blue-soft (ribbon)', '--color-ink', '--color-blue-soft', 4.5],
    ['amber-text on amber-tint', '--color-amber-text', '--color-amber-tint', 4.5],
    ['amber-text on surface', '--color-amber-text', '--color-surface', 4.5],
    ['on-dark-muted on dark', '--color-on-dark-muted', '--color-dark', 4.5],
    ['on-dark-link on dark', '--color-on-dark-link', '--color-dark', 4.5],
    ['on-dark-accent on dark', '--color-on-dark-accent', '--color-dark', 3],
  ];

  it.each(pairs)('%s passes WCAG AA', (_name, fg, bg, min) => {
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
