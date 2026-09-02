/**
 * What an index is, to Fess.
 *
 * kopf is served from the Fess admin dashboard, so the cluster it shows is
 * almost always a Fess one, and there every index name means something.
 * Naming them turns a flat list of forty into the four questions an operator
 * actually has: which index is being searched, which one is being written,
 * which are configuration, and which are OpenSearch's own.
 *
 * The rules below were read off a running Fess 15.8.0 on OpenSearch 3.8.0,
 * not inferred from the source: the document index is `fess.<timestamp>`
 * carrying the aliases `fess.search` and `fess.update`, and the suggester
 * has its own `fess.suggest.<timestamp>` with `fess.suggest` and
 * `fess.suggest.update`. The two families share a prefix, which is why
 * suggest is tested first.
 */
export type FessIndexRole =
  | 'document'
  | 'suggest'
  | 'config'
  | 'user'
  | 'log'
  | 'crawler'
  | 'plugin'
  | 'system'
  | 'other';

/** Which of the two document aliases point here. */
export type DocumentAlias = 'search' | 'update';

export const SEARCH_ALIAS = 'fess.search';
export const UPDATE_ALIAS = 'fess.update';

export interface FessIndexInfo {
  role: FessIndexRole;
  /**
   * Search before update, and empty for every index that is not the live
   * one. A document index with neither is a previous generation: Fess builds
   * the new one, moves the aliases, and leaves the old index in place.
   */
  documentAliases: DocumentAlias[];
}

export interface NamedIndex {
  name: string;
  aliases: string[];
}

function role(index: NamedIndex): FessIndexRole {
  const {name, aliases} = index;
  // OpenSearch's own, and the plugin index Fess stores dictionaries in.
  if (name.startsWith('.') || name.startsWith('_')) {
    return 'system';
  }
  if (name === 'configsync') {
    return 'plugin';
  }
  // Before the document rules: fess.suggest.<timestamp> also starts with
  // `fess.`, and fess_suggest_array.fess also starts with `fess_suggest`.
  if (
    name.startsWith('fess.suggest') ||
    name.startsWith('fess_suggest') ||
    aliases.some((alias) => alias.startsWith('fess.suggest'))
  ) {
    return 'suggest';
  }
  if (name.startsWith('fess_config')) {
    return 'config';
  }
  if (name.startsWith('fess_user')) {
    return 'user';
  }
  if (name.startsWith('fess_log')) {
    return 'log';
  }
  if (name.startsWith('fess_crawler')) {
    return 'crawler';
  }
  if (
    name.startsWith('fess.') ||
    aliases.includes(SEARCH_ALIAS) ||
    aliases.includes(UPDATE_ALIAS)
  ) {
    return 'document';
  }
  return 'other';
}

/** Classifies one index by its name and the aliases bound to it. */
export function fessIndexInfo(index: NamedIndex): FessIndexInfo {
  const documentAliases: DocumentAlias[] = [];
  if (index.aliases.includes(SEARCH_ALIAS)) {
    documentAliases.push('search');
  }
  if (index.aliases.includes(UPDATE_ALIAS)) {
    documentAliases.push('update');
  }
  return {role: role(index), documentAliases};
}

/** True for the indices Fess owns -- everything but system and other. */
export function isFessIndex(index: NamedIndex): boolean {
  const named = role(index);
  return named !== 'system' && named !== 'other';
}
