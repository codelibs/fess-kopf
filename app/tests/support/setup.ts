/**
 * jsdom shims.
 *
 * jsdom implements neither matchMedia, ResizeObserver, nor Element.scrollTo.
 * Naive UI's dropdowns render through vueuc's virtual list, which calls
 * matchMedia during setup and scrollTo when it highlights an option, so without
 * these a mounted view throws before a single assertion runs.
 */

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = function scrollTo(): void {};
}
