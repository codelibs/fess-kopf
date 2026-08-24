import {afterEach, describe, expect, it} from 'vitest';
import {kopfRootUrl, resolveSiteFile, searchEngineBaseUrl} from '@/api/location';

/**
 * The mount path carries a token Fess regenerates on every dashboard render,
 * so these helpers are the only thing standing between the bundle and a build
 * that would have to know where it is deployed.
 */
function at(href: string): void {
  window.history.replaceState({}, '', href);
}

// Taken from the environment rather than hardcoded: jsdom's default origin
// is not something these helpers should be pinned to.
const ORIGIN = window.location.origin;

afterEach(() => at('/'));

describe('kopfRootUrl', () => {
  it('returns the _site root when served from the kopf mount', () => {
    at('/admin/server_abc123/_plugin/kopf/');
    expect(kopfRootUrl()).toBe(`${ORIGIN}/admin/server_abc123/_plugin/kopf/`);
  });

  it('returns the same root from the app/ subdirectory used during migration', () => {
    at('/admin/server_abc123/_plugin/kopf/app/');
    expect(kopfRootUrl()).toBe(`${ORIGIN}/admin/server_abc123/_plugin/kopf/`);
  });

  it('is unaffected by the hash route', () => {
    at('/admin/server_abc123/_plugin/kopf/app/#/nodes');
    expect(kopfRootUrl()).toBe(`${ORIGIN}/admin/server_abc123/_plugin/kopf/`);
  });

  it('gives a different answer for a different token, with no rebuild', () => {
    at('/admin/server_one/_plugin/kopf/app/');
    const first = kopfRootUrl();
    at('/admin/server_two/_plugin/kopf/app/');
    expect(kopfRootUrl()).not.toBe(first);
    expect(kopfRootUrl()).toBe(`${ORIGIN}/admin/server_two/_plugin/kopf/`);
  });

  it('returns null when not served under the kopf mount', () => {
    at('/some/dev/server/');
    expect(kopfRootUrl()).toBeNull();
  });
});

describe('searchEngineBaseUrl', () => {
  it('stops before /_plugin/kopf, which is where the REST proxy lives', () => {
    at('/admin/server_abc123/_plugin/kopf/app/#/cluster');
    expect(searchEngineBaseUrl()).toBe(`${ORIGIN}/admin/server_abc123`);
  });

  it('keeps a servlet context path in front of the token', () => {
    at('/fess/admin/server_abc123/_plugin/kopf/');
    expect(searchEngineBaseUrl()).toBe(`${ORIGIN}/fess/admin/server_abc123`);
  });

  it('returns null off the mount', () => {
    at('/');
    expect(searchEngineBaseUrl()).toBeNull();
  });
});

describe('resolveSiteFile', () => {
  it('addresses _site files from the kopf root, not from the current directory', () => {
    at('/admin/server_abc123/_plugin/kopf/app/');
    expect(resolveSiteFile('kopf_external_settings.json')).toBe(
      `${ORIGIN}/admin/server_abc123/_plugin/kopf/kopf_external_settings.json`,
    );
  });

  it('resolves to the same URL once the app moves to the _site root', () => {
    at('/admin/server_abc123/_plugin/kopf/');
    expect(resolveSiteFile('kopf_external_settings.json')).toBe(
      `${ORIGIN}/admin/server_abc123/_plugin/kopf/kopf_external_settings.json`,
    );
  });

  it('resolves beside index.html when there is no mount to anchor to', () => {
    at('/');
    expect(resolveSiteFile('kopf_external_settings.json')).toBe('./kopf_external_settings.json');
  });
});
