/**
 * Where this bundle is, and where the search engine is, worked out at runtime.
 *
 * Fess mounts kopf under a path it builds per request:
 *   <contextPath>/admin/server_<token>/_plugin/kopf/
 * The token is a fresh UUID on every dashboard load, so nothing here can be
 * decided at build time.
 */

const MARKER = '/_plugin/kopf/';

/**
 * Absolute URL of the directory Fess unpacked _site into, with a trailing
 * slash. Files that ship at the root of _site (the settings JSON, favicon)
 * are addressed from here, which keeps them reachable whether the app is
 * served from _site/app/ during the migration or from _site/ afterwards.
 *
 * Returns null when the marker is absent, i.e. the bundle is being served by
 * something other than Fess -- `vite dev`, or a plain static server.
 */
export function kopfRootUrl(): string | null {
  const url = window.location.href;
  const at = url.indexOf(MARKER);
  return at > -1 ? url.substring(0, at + MARKER.length) : null;
}

/**
 * Origin+path that OpenSearch REST calls hang off: everything before
 * /_plugin/kopf. Under Fess that is <origin><contextPath>/admin/server_<token>,
 * which is the token-checked proxy in SearchEngineApiManager.
 */
export function searchEngineBaseUrl(): string | null {
  const url = window.location.href;
  const at = url.indexOf(MARKER);
  return at > -1 ? url.substring(0, at) : null;
}

/** Resolves a file shipped at the root of _site. */
export function resolveSiteFile(name: string): string {
  const root = kopfRootUrl();
  // Without the marker we are not under Fess -- vite dev, or a plain static
  // server -- where the file sits beside index.html.
  return root === null ? `./${name}` : `${root}${name}`;
}
