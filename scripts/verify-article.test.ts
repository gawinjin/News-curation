import assert from 'node:assert/strict';
import test from 'node:test';
import { findLongRunOverlap } from './verify-article.js';

function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `word${i + 1}`).join(' ');
}

test('allows an exact 25-word quotation', () => {
  const text = words(25);
  assert.equal(findLongRunOverlap(text, text, 25), null);
});

test('rejects a matching run longer than 25 words', () => {
  const text = words(26);
  assert.equal(findLongRunOverlap(text, text, 25), text);
});

test('normalizes punctuation and case when detecting prohibited overlap', () => {
  const source = words(26);
  const body = source.toUpperCase().replace('WORD10', '"WORD10,"');
  assert.equal(findLongRunOverlap(body, source, 25), source);
});

test('allows unrelated prose', () => {
  assert.equal(findLongRunOverlap(words(26), 'different source text entirely', 25), null);
});
