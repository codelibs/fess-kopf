/** Flattens nested objects into dotted keys, as the CSV export needs. */
function flatten(value: unknown, prefix = '', into: Record<string, unknown> = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    into[prefix === '' ? 'value' : prefix] = Array.isArray(value) ? JSON.stringify(value) : value;
    return into;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    flatten(nested, prefix === '' ? key : `${prefix}.${key}`, into);
  });
  return into;
}

function escapeCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Renders a response as CSV.
 *
 * A search response is exported as its hits, which is the case worth having;
 * anything else is flattened into a single row. Replaces jquery.csv, the last
 * jQuery-dependent piece of this screen.
 */
export function toCsv(response: unknown): string {
  if (response === null || typeof response !== 'object') {
    return '';
  }
  const hits = (response as {hits?: {hits?: unknown[]}}).hits?.hits;
  const rows = Array.isArray(hits) ? hits : Array.isArray(response) ? response : [response];
  const flattened = rows.map((row) => flatten(row));
  const columns = [...new Set(flattened.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(escapeCell).join(',')];
  flattened.forEach((row) => {
    lines.push(columns.map((column) => escapeCell(row[column])).join(','));
  });
  return lines.join('\n');
}
