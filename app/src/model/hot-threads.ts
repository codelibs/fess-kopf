/** One sampled thread: its header line, the stack's first line, and the rest. */
export class HotThread {
  subHeader: string | undefined = undefined;
  readonly stack: string[] = [];

  constructor(readonly header: string) {}
}

/**
 * Matches the node line OpenSearch emits, e.g.
 *   ::: {search01}{HTsFSGtD...}{...}{172.20.0.3}{172.20.0.3:9300}{dimml}
 * Older Elasticsearch used [name] instead, so both are accepted.
 */
const NODE_NAME = /^\s*[{[]([^}\]]*)[}\]]/;

/** The hot threads reported for one node. */
export class NodeHotThreads {
  readonly header: string;
  readonly subHeader: string | undefined;
  readonly node: string;
  readonly threads: HotThread[] = [];

  constructor(data: string) {
    const lines = data.split('\n');
    this.header = lines[0] ?? '';

    // Since 4859ce5d the second line is a "Hot threads at ..." banner; before
    // that the stack started immediately.
    const banner = (lines[1] ?? '').includes('Hot threads at');
    this.subHeader = banner ? lines[1] : undefined;
    const headerLines = banner ? 3 : 2;

    // The original looked for [name]; OpenSearch writes {name}, so it always
    // came back empty. The partial used this as a DOM id, which collided
    // across nodes.
    this.node = NODE_NAME.exec(this.header)?.[1] ?? '';

    let thread: HotThread | undefined;
    lines.slice(headerLines).forEach((line) => {
      if (thread === undefined) {
        // A blank line between sections is not the start of a thread. The
        // original made one anyway, so an idle node reported a thread whose
        // header, sub header and stack were all empty.
        if (line.trim().length === 0) {
          return;
        }
        thread = new HotThread(line);
        this.threads.push(thread);
        return;
      }
      if (thread.subHeader === undefined) {
        thread.subHeader = line;
        return;
      }
      thread.stack.push(line);
      if (line.trim().length === 0) {
        thread = undefined;
      }
    });
  }
}

/** The whole response, split into one section per node. */
export class HotThreads {
  readonly nodes_hot_threads: NodeHotThreads[];

  constructor(data: string) {
    // Each node's section starts with ':::'; the first split piece is what
    // precedes the first marker, so it is dropped.
    this.nodes_hot_threads = data
      .split(':::')
      .slice(1)
      .map((section) => new NodeHotThreads(section));
  }
}
