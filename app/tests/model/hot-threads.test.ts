import {describe, expect, it} from 'vitest';
import {HotThreads, NodeHotThreads} from '@/model/hot-threads';

/**
 * The fixtures are real OpenSearch 3.8.0 output. The AngularJS parser is in
 * src/kopf/opensearch/{hot_threads,node_hot_threads,hot_thread}.js.
 */

// Real OpenSearch 3.8.0 output. Assembled from parts so no source line here
// exceeds the line-length rule; the joined text is what the cluster emits.
const NODE_LINE =
  '::: {search01}{HTsFSGtDStypPL4O0OVdxA}{Qllntw0PSBqjKPRtClp2ow}' +
  '{172.20.0.3}{172.20.0.3:9300}{dimml}';

const BANNER =
  '   Hot threads at 2026-08-23T18:08:40.562Z, interval=500ms, ' +
  'busiestThreads=3, ignoreIdleThreads=true:';

const IDLE = [NODE_LINE, BANNER, '', ''].join('\n');

const THREAD_HEADER =
  "   12.3% (61.5ms out of 500ms) cpu usage by thread " +
  "'opensearch[search01][write][T#1]'";

const STACK_ONE = '       app//org.apache.lucene.index.IndexWriter.addDocument(IndexWriter.java:1)';
const STACK_TWO =
  '       app//org.opensearch.index.engine.InternalEngine.index(InternalEngine.java:2)';

const BUSY = [
  NODE_LINE,
  BANNER,
  '',
  THREAD_HEADER,
  '     2/10 snapshots sharing following 3 elements',
  STACK_ONE,
  STACK_TWO,
  '',
  '',
].join('\n');

describe('NodeHotThreads', () => {
  it('extracts the node name from the {name} form OpenSearch emits', () => {
    // The original looked for [name] and always came back empty, which the
    // partial then used as a DOM id -- so every node collided on one id.
    const parsed = new NodeHotThreads(IDLE.replace(':::', ''));
    expect(parsed.node).toBe('search01');
  });

  it('still accepts the older [name] form', () => {
    const parsed = new NodeHotThreads(' [search01][HTsFSGtD]\n   stack line\n');
    expect(parsed.node).toBe('search01');
  });

  it('keeps the banner as the sub header', () => {
    const parsed = new NodeHotThreads(IDLE.replace(':::', ''));
    expect(parsed.subHeader).toContain('Hot threads at');
    expect(parsed.header).toContain('{search01}');
  });

  it('reports no threads for an idle node', () => {
    const parsed = new NodeHotThreads(IDLE.replace(':::', ''));
    expect(parsed.threads).toEqual([]);
  });

  it('groups a busy thread into header, sub header and stack', () => {
    const parsed = new NodeHotThreads(BUSY.replace(':::', ''));
    expect(parsed.threads).toHaveLength(1);
    const [thread] = parsed.threads;
    expect(thread.header).toContain('12.3% (61.5ms out of 500ms) cpu usage');
    expect(thread.subHeader).toContain('2/10 snapshots sharing');
    expect(thread.stack.filter((line) => line.trim() !== '')).toEqual([
      '       app//org.apache.lucene.index.IndexWriter.addDocument(IndexWriter.java:1)',
      '       app//org.opensearch.index.engine.InternalEngine.index(InternalEngine.java:2)',
    ]);
  });

  it('treats output without the banner as pre-banner format', () => {
    // Without the banner the parser skips two header lines, not three.
    const parsed = new NodeHotThreads(' {n1}\n\n   thread header\n   sub header\n');
    expect(parsed.subHeader).toBeUndefined();
    expect(parsed.threads[0].header).toBe('   thread header');
    expect(parsed.threads[0].subHeader).toBe('   sub header');
  });

  it('does not invent an empty thread from trailing blank lines', () => {
    // The original started a HotThread on any line, blank ones included, so
    // an idle node rendered a thread with an empty header and stack.
    const parsed = new NodeHotThreads(BUSY.replace(':::', ''));
    expect(parsed.threads.every((t) => t.header.trim() !== '')).toBe(true);
  });

  it('survives a section with only a header line', () => {
    // The original read lines[1] unconditionally.
    expect(() => new NodeHotThreads(' {n1}')).not.toThrow();
    expect(new NodeHotThreads(' {n1}').node).toBe('n1');
  });
});

describe('HotThreads', () => {
  it('splits one section per node and drops what precedes the first marker', () => {
    const twoNodes = `${IDLE}${IDLE.replace('search01', 'search02')}`;
    const parsed = new HotThreads(twoNodes);
    expect(parsed.nodes_hot_threads).toHaveLength(2);
    expect(parsed.nodes_hot_threads.map((n) => n.node)).toEqual(['search01', 'search02']);
  });

  it('gives distinct node names, so two nodes no longer share one identity', () => {
    const twoNodes = `${IDLE}${IDLE.replace('search01', 'search02')}`;
    const names = new HotThreads(twoNodes).nodes_hot_threads.map((n) => n.node);
    expect(new Set(names).size).toBe(2);
  });

  it('returns nothing for an empty response', () => {
    expect(new HotThreads('').nodes_hot_threads).toEqual([]);
  });
});
