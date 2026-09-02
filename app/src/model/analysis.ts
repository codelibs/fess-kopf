/** One token, as every _analyze response describes it. */
export interface AnalyzeTokenResponse {
  token: string;
  start_offset: number;
  end_offset: number;
  position: number;
  type?: string;
  positionLength?: number;
}

export class AnalysisToken {
  readonly token: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly position: number;
  /**
   * What the tokenizer or filter called this token: `<ALPHANUM>`, `word`,
   * `SYNONYM`. Worth showing -- a token that only exists because a synonym
   * filter added it looks identical without it.
   */
  readonly type: string;

  constructor(raw: AnalyzeTokenResponse) {
    this.token = raw.token;
    this.startOffset = raw.start_offset;
    this.endOffset = raw.end_offset;
    this.position = raw.position;
    this.type = raw.type ?? '';
  }
}

export type AnalysisStepKind = 'char_filter' | 'tokenizer' | 'filter';

/** One stage of the analysis chain, in the order it ran. */
export interface AnalysisStep {
  kind: AnalysisStepKind;
  name: string;
  /** A char filter produces text, not tokens. */
  text?: string;
  tokens: AnalysisToken[];
  /**
   * Token count against the previous token-producing stage, so the stage
   * that dropped or added tokens is the one carrying a number. The
   * tokenizer, which has nothing before it, is always 0.
   */
  delta: number;
}

/**
 * What one _analyze call produced.
 *
 * Without `explain` the response is a flat token list. With it, the response
 * is the chain -- char filters, tokenizer, then each token filter -- and
 * that is the thing worth having: when a Japanese query stops matching, the
 * question is never "what are the tokens", it is "which stage changed
 * them". Fess's own `japanese_analyzer` is six filters behind a tokenizer
 * behind two char filters, and this is the only way to see which one is
 * responsible.
 */
export class AnalysisResult {
  constructor(
    readonly tokens: AnalysisToken[],
    readonly steps: AnalysisStep[],
  ) {}

  /** True when the response carried the chain rather than only the result. */
  get explained(): boolean {
    return this.steps.length > 0;
  }
}

interface DetailStage {
  name: string;
  tokens?: AnalyzeTokenResponse[];
}

interface CharFilterStage {
  name: string;
  filtered_text?: string[];
}

export interface AnalyzeResponse {
  tokens?: AnalyzeTokenResponse[];
  detail?: {
    custom_analyzer?: boolean;
    charfilters?: CharFilterStage[];
    tokenizer?: DetailStage;
    tokenfilters?: DetailStage[];
    /** A named, non-custom analyzer reports itself as one opaque stage. */
    analyzer?: DetailStage;
  };
}

function tokensOf(stage: DetailStage | undefined): AnalysisToken[] {
  return (stage?.tokens ?? []).map((token) => new AnalysisToken(token));
}

/**
 * Reads either response shape.
 *
 * Measured identical on 2.19.1 and 3.8.0, including the section names --
 * `charfilters` and `tokenfilters` have no underscore, unlike the request
 * fields that configure them.
 */
export function parseAnalysis(response: AnalyzeResponse): AnalysisResult {
  const detail = response.detail;
  if (detail === undefined) {
    return new AnalysisResult((response.tokens ?? []).map((t) => new AnalysisToken(t)), []);
  }

  // A built-in analyzer asked to explain itself reports one stage and no
  // chain: there is nothing inside it to show.
  if (detail.analyzer !== undefined) {
    return new AnalysisResult(tokensOf(detail.analyzer), []);
  }

  const steps: AnalysisStep[] = [];
  (detail.charfilters ?? []).forEach((stage) => {
    steps.push({
      kind: 'char_filter',
      name: stage.name,
      text: (stage.filtered_text ?? []).join(''),
      tokens: [],
      delta: 0,
    });
  });

  const tokenizer = tokensOf(detail.tokenizer);
  if (detail.tokenizer !== undefined) {
    steps.push({kind: 'tokenizer', name: detail.tokenizer.name, tokens: tokenizer, delta: 0});
  }

  let previous = tokenizer.length;
  (detail.tokenfilters ?? []).forEach((stage) => {
    const tokens = tokensOf(stage);
    steps.push({kind: 'filter', name: stage.name, tokens, delta: tokens.length - previous});
    previous = tokens.length;
  });

  const last = [...steps].reverse().find((step) => step.kind !== 'char_filter');
  return new AnalysisResult(last?.tokens ?? [], steps);
}
