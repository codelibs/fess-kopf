/**
 * Where the caret is inside a textarea.
 *
 * A textarea gives no coordinates for its own caret, so the text up to it is
 * laid out again in a hidden div that copies every property that affects
 * layout; a marker span placed at the caret then has the offsets we want.
 */

/** The properties the mirror must copy for its layout to match. */
const MIRRORED = [
  'boxSizing', 'width', 'borderTopWidth', 'borderRightWidth',
  'borderBottomWidth', 'borderLeftWidth', 'paddingTop', 'paddingRight',
  'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight',
  'fontStretch', 'fontSize', 'lineHeight', 'fontFamily', 'textAlign',
  'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize',
  'whiteSpace', 'wordBreak',
];

export interface CaretPosition {
  /** Offsets from the textarea's own top left corner, scrolling included. */
  top: number;
  left: number;
  /** How far below `top` the line the caret is on ends. */
  lineHeight: number;
}

function pixels(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function caretPosition(element: HTMLTextAreaElement, at: number): CaretPosition {
  const style = window.getComputedStyle(element);
  const lineHeight = pixels(style.lineHeight, pixels(style.fontSize, 13) * 1.5);

  const mirror = document.createElement('div');
  // CSSStyleDeclaration indexes by camel-cased name, which its type does not
  // describe; copying one property at a time by hand would be far longer.
  const target = mirror.style as unknown as Record<string, string>;
  const source = style as unknown as Record<string, string>;
  MIRRORED.forEach((property) => {
    target[property] = source[property] ?? '';
  });
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.style.height = 'auto';
  mirror.style.overflow = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';

  mirror.textContent = element.value.slice(0, at);
  const marker = document.createElement('span');
  // Something has to be in the marker, or it collapses at the end of a line.
  marker.textContent = element.value.slice(at) || '.';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const top = marker.offsetTop + pixels(style.borderTopWidth) - element.scrollTop;
  const left = marker.offsetLeft + pixels(style.borderLeftWidth) - element.scrollLeft;
  document.body.removeChild(mirror);

  return {top, left, lineHeight};
}
