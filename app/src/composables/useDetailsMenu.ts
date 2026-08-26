import {onBeforeUnmount, onMounted} from 'vue';

/** Distance from the summary, and the closest a panel may come to an edge. */
const GAP = 4;
const MARGIN = 8;

/**
 * Places the cluster grid's `<details>` menus.
 *
 * The grid scrolls horizontally, and a box that scrolls on one axis clips the
 * other one too, so a panel positioned inside it is cut off - on the row of
 * shards, which is the last one, it never appears at all. The panels are
 * therefore `position: fixed`, which no ancestor's overflow can clip, and this
 * puts each one against its own summary as it opens. A fixed panel does not
 * travel with the grid, so a scroll or a resize closes it rather than leaving
 * it stranded next to the wrong shard.
 */
export function useDetailsMenu(): {onToggle: (event: Event) => void} {
  let open: HTMLDetailsElement | null = null;

  function close(): void {
    if (open !== null) {
      open.open = false;
      open = null;
    }
  }

  function place(details: HTMLDetailsElement): void {
    const panel = details.querySelector<HTMLElement>('.k-menu-items');
    const summary = details.querySelector('summary');
    if (panel === null || summary === null) {
      return;
    }
    // Measure at a known origin: a fixed panel is laid out against the
    // viewport, so its own previous offsets would otherwise decide how much
    // room it had to be measured in.
    panel.style.left = '0px';
    panel.style.top = '0px';
    const anchor = summary.getBoundingClientRect();
    const {width, height} = panel.getBoundingClientRect();

    const left = Math.max(MARGIN, Math.min(anchor.left, window.innerWidth - MARGIN - width));
    let top = anchor.bottom + GAP;
    if (top + height > window.innerHeight - MARGIN) {
      const above = anchor.top - GAP - height;
      top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - MARGIN - height);
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  /** Bound to every menu's `toggle`: a native `<details>` closes nothing. */
  function onToggle(event: Event): void {
    const details = event.currentTarget as HTMLDetailsElement;
    if (!details.open) {
      if (details === open) {
        open = null;
      }
      return;
    }
    if (open !== null && open !== details) {
      open.open = false;
    }
    open = details;
    place(details);
  }

  function onDocumentClick(event: MouseEvent): void {
    if (open === null) {
      return;
    }
    const target = event.target as Node;
    const panel = open.querySelector('.k-menu-items');
    // Clicking the summary is the native toggle's business. Anything else -
    // a menu item, or the page outside - has finished with the menu.
    if (!open.contains(target) || (panel !== null && panel.contains(target))) {
      close();
    }
  }

  onMounted(() => {
    document.addEventListener('click', onDocumentClick);
    // Capturing: scroll does not bubble out of the grid.
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('scroll', close, true);
    window.removeEventListener('resize', close);
  });

  return {onToggle};
}
