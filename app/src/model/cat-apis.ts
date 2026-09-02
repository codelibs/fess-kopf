const CAT_LINE = /^\/_cat\/([^/{]+)$/;

/**
 * Takes the body of GET /_cat and returns the API names that can be run
 * without an argument.
 *
 * The first line is the cat face banner, and every entry with a
 * {placeholder} segment needs a value the screen has no way to supply --
 * /_cat/snapshots only exists as /_cat/snapshots/{repository}, so it is not
 * offered. Asking the cluster for its own list is what keeps this working
 * across OpenSearch versions: 2.19.1 and 3.8.0 answer with the same
 * thirty-one entries, and a later version's list arrives without a release
 * here.
 */
export function parseCatApis(body: string): string[] {
  const names = body
    .split('\n')
    .map((line) => CAT_LINE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match[1]);
  return [...new Set(names)].sort();
}
