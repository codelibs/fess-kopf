import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useAlerts} from '@/composables/useAlerts';

const alerts = useAlerts();

beforeEach(() => {
  vi.useFakeTimers();
  alerts.clear();
});

afterEach(() => vi.useRealTimers());

describe('useAlerts', () => {
  it('puts the newest alert first', () => {
    alerts.info('first');
    alerts.info('second');
    expect(alerts.alerts.value.map((a) => a.message)).toEqual(['second', 'first']);
  });

  it('keeps only the three most recent', () => {
    ['a', 'b', 'c', 'd'].forEach((m) => alerts.info(m));
    expect(alerts.alerts.value.map((a) => a.message)).toEqual(['d', 'c', 'b']);
  });

  it('gives every alert a distinct id, even within the same millisecond', () => {
    // The Angular version keyed on Date.getTime(), so two alerts raised in the
    // same tick collided and removing one removed the other.
    alerts.error('one');
    alerts.error('two');
    const [a, b] = alerts.alerts.value;
    expect(a.id).not.toBe(b.id);
  });

  it('expands an error that carries a body, so the cause is readable', () => {
    alerts.error('failed', {reason: 'nope'});
    expect(alerts.alerts.value[0].expanded).toBe(true);
  });

  it('leaves an error without a body collapsed', () => {
    alerts.error('failed');
    expect(alerts.alerts.value[0].expanded).toBe(false);
  });

  it('keeps errors on screen far longer than notices', () => {
    alerts.info('notice');
    alerts.error('problem');
    vi.advanceTimersByTime(2500);
    expect(alerts.alerts.value.map((a) => a.message)).toEqual(['problem']);
    vi.advanceTimersByTime(27500);
    expect(alerts.alerts.value).toEqual([]);
  });

  it('removes the alert it was asked to remove', () => {
    const keep = alerts.info('keep');
    const drop = alerts.info('drop');
    alerts.remove(drop);
    expect(alerts.alerts.value.map((a) => a.id)).toEqual([keep]);
  });

  it('does not resurrect a manually removed alert when its timer fires', () => {
    const id = alerts.info('gone');
    alerts.remove(id);
    alerts.info('other');
    vi.advanceTimersByTime(10000);
    expect(alerts.alerts.value).toEqual([]);
  });

  it('toggles details', () => {
    const id = alerts.info('note', {some: 'body'});
    expect(alerts.alerts.value[0].expanded).toBe(false);
    alerts.toggle(id);
    expect(alerts.alerts.value[0].expanded).toBe(true);
  });
});
