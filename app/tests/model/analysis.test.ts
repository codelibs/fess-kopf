import {describe, expect, it} from 'vitest';
import {parseAnalysis} from '@/model/analysis';

/** The plain shape, when explain was not asked for. */
const PLAIN = {
  tokens: [
    {token: 'fess', start_offset: 0, end_offset: 4, type: '<ALPHANUM>', position: 0},
    {token: 'search', start_offset: 5, end_offset: 11, type: '<ALPHANUM>', position: 1},
  ],
};

/**
 * A custom analyzer explaining itself, taken verbatim from a 3.8.0 cluster
 * and confirmed identical on 2.19.1: two char filters, the tokenizer, then
 * three token filters, one of which drops tokens and one of which adds them.
 */
const CUSTOM = {
  detail: {
    custom_analyzer: true,
    charfilters: [
      {name: 'html_strip', filtered_text: ['Fess is a full-text search']},
      {name: 'strip_dashes', filtered_text: ['Fess is a fulltext search']},
    ],
    tokenizer: {
      name: 'standard',
      tokens: [
        {token: 'Fess', start_offset: 3, end_offset: 7, type: '<ALPHANUM>', position: 0},
        {token: 'is', start_offset: 12, end_offset: 14, type: '<ALPHANUM>', position: 1},
        {token: 'a', start_offset: 15, end_offset: 16, type: '<ALPHANUM>', position: 2},
        {token: 'fulltext', start_offset: 17, end_offset: 26, type: '<ALPHANUM>', position: 3},
        {token: 'search', start_offset: 27, end_offset: 33, type: '<ALPHANUM>', position: 4},
      ],
    },
    tokenfilters: [
      {
        name: 'lowercase',
        tokens: [
          {token: 'fess', start_offset: 3, end_offset: 7, type: '<ALPHANUM>', position: 0},
          {token: 'is', start_offset: 12, end_offset: 14, type: '<ALPHANUM>', position: 1},
          {token: 'a', start_offset: 15, end_offset: 16, type: '<ALPHANUM>', position: 2},
          {token: 'fulltext', start_offset: 17, end_offset: 26, type: '<ALPHANUM>', position: 3},
          {token: 'search', start_offset: 27, end_offset: 33, type: '<ALPHANUM>', position: 4},
        ],
      },
      {
        name: 'my_stop',
        tokens: [
          {token: 'fess', start_offset: 3, end_offset: 7, type: '<ALPHANUM>', position: 0},
          {token: 'fulltext', start_offset: 17, end_offset: 26, type: '<ALPHANUM>', position: 3},
          {token: 'search', start_offset: 27, end_offset: 33, type: '<ALPHANUM>', position: 4},
        ],
      },
      {
        name: 'my_synonyms',
        tokens: [
          {token: 'fess', start_offset: 3, end_offset: 7, type: '<ALPHANUM>', position: 0},
          {token: 'search', start_offset: 3, end_offset: 11, type: 'SYNONYM', position: 0},
          {token: 'fulltext', start_offset: 17, end_offset: 26, type: '<ALPHANUM>', position: 3},
          {token: 'server', start_offset: 3, end_offset: 11, type: 'SYNONYM', position: 1},
          {token: 'search', start_offset: 27, end_offset: 33, type: '<ALPHANUM>', position: 4},
        ],
      },
    ],
  },
};

/** A built-in analyzer has nothing inside it to show. */
const BUILT_IN = {
  detail: {
    custom_analyzer: false,
    analyzer: {
      name: 'standard',
      tokens: [{token: 'fess', start_offset: 0, end_offset: 4, type: '<ALPHANUM>', position: 0}],
    },
  },
};

describe('parseAnalysis, without explain', () => {
  it('reads the flat token list', () => {
    const result = parseAnalysis(PLAIN);
    expect(result.tokens.map((t) => t.token)).toEqual(['fess', 'search']);
    expect(result.explained).toBe(false);
    expect(result.steps).toEqual([]);
  });

  it('carries the offsets, position and type of each token', () => {
    const [first] = parseAnalysis(PLAIN).tokens;
    expect(first.startOffset).toBe(0);
    expect(first.endOffset).toBe(4);
    expect(first.position).toBe(0);
    expect(first.type).toBe('<ALPHANUM>');
  });

  it('survives a response with no tokens at all', () => {
    expect(parseAnalysis({}).tokens).toEqual([]);
  });
});

describe('parseAnalysis, with explain', () => {
  it('lists every stage in the order it ran', () => {
    const {steps} = parseAnalysis(CUSTOM);
    expect(steps.map((s) => [s.kind, s.name])).toEqual([
      ['char_filter', 'html_strip'],
      ['char_filter', 'strip_dashes'],
      ['tokenizer', 'standard'],
      ['filter', 'lowercase'],
      ['filter', 'my_stop'],
      ['filter', 'my_synonyms'],
    ]);
  });

  it('gives a char filter its text rather than tokens', () => {
    const [first] = parseAnalysis(CUSTOM).steps;
    expect(first.text).toBe('Fess is a full-text search');
    expect(first.tokens).toEqual([]);
  });

  it('counts what each filter changed, against the stage before it', () => {
    const byName = Object.fromEntries(
      parseAnalysis(CUSTOM).steps.map((step) => [step.name, step.delta]),
    );
    expect(byName.standard).toBe(0);
    expect(byName.lowercase).toBe(0);
    // my_stop took "is" and "a" out; my_synonyms put two in.
    expect(byName.my_stop).toBe(-2);
    expect(byName.my_synonyms).toBe(2);
  });

  it('reports the last stage as the result', () => {
    const result = parseAnalysis(CUSTOM);
    expect(result.explained).toBe(true);
    expect(result.tokens.map((t) => t.token)).toEqual([
      'fess',
      'search',
      'fulltext',
      'server',
      'search',
    ]);
    // The token a synonym filter invented is only distinguishable by type.
    expect(result.tokens[1].type).toBe('SYNONYM');
  });

  it('reads a built-in analyzer, which reports itself as one opaque stage', () => {
    const result = parseAnalysis(BUILT_IN);
    expect(result.tokens.map((t) => t.token)).toEqual(['fess']);
    expect(result.explained).toBe(false);
  });

  it('handles a chain with no char filters', () => {
    const result = parseAnalysis({
      detail: {
        custom_analyzer: true,
        tokenizer: {name: 'standard', tokens: PLAIN.tokens},
        tokenfilters: [],
      },
    });
    expect(result.steps.map((s) => s.kind)).toEqual(['tokenizer']);
    expect(result.tokens.map((t) => t.token)).toEqual(['fess', 'search']);
  });
});
