/**
 * The table behind a _cat response.
 *
 * _cat?v pads every column so the header is at least as wide as its widest
 * value, which is what makes slicing by the header's column offsets work.
 * Ported from src/kopf/opensearch/cat_result.js.
 */
export class CatResult {
  readonly columns: string[];
  readonly lines: string[][];

  constructor(result: string) {
    const rows = result.split('\n');
    const header = rows[0] ?? '';
    this.columns = header.match(/\S+/g) ?? [];

    // The original dropped the last element unconditionally, which relies on
    // the response ending in a newline. Dropping trailing blanks instead is
    // identical for real _cat output and does not lose a row without one.
    let end = rows.length;
    while (end > 1 && rows[end - 1].trim() === '') {
      end--;
    }

    this.lines = rows.slice(1, end).map((line) =>
      this.columns.map((column, i) => {
        const start = header.indexOf(column);
        const next = i < this.columns.length - 1 ? header.indexOf(this.columns[i + 1]) : undefined;
        return line.substring(start, next).trim();
      }),
    );
  }
}
