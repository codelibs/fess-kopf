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

    // Left to right, each column searched from where the previous one ended.
    // Searching the whole header instead finds the wrong offset whenever a
    // column name occurs inside an earlier one -- _cat/thread_pool's header
    // is `node_name name ...`, and indexOf('name') lands inside `node_name`,
    // which sliced every node name in half.
    const starts: number[] = [];
    let from = 0;
    this.columns.forEach((column) => {
      const at = header.indexOf(column, from);
      starts.push(at);
      from = at + column.length;
    });

    this.lines = rows.slice(1, end).map((line) =>
      this.columns.map((_column, i) => line.substring(starts[i], starts[i + 1]).trim()),
    );
  }
}
