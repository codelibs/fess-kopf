import {getProperty, readablizeBytes} from './util';

export interface NodeInfo {
  name: string;
  version: string;
  jvm: {version: string};
  os: {available_processors: number};
  transport_address: string;
  host: string;
  roles?: string[];
}

/**
 * Roles that mean the node holds data. OpenSearch splits the old `data` role
 * into tiers, and a node with only a tier role is still a data node.
 */
const DATA_ROLES = ['data', 'data_content', 'data_hot', 'data_warm', 'data_cold'];

/**
 * Roles that mean the node can be elected master. `cluster_manager` is the
 * current name; `master` is kept for OpenSearch 2.x, which still emits it.
 * Reading only `master` was the reason no node ever showed the master marker.
 */
const MASTER_ROLES = ['master', 'cluster_manager'];

/**
 * A cluster node.
 *
 * Named ClusterNode rather than Node: the AngularJS bundle declared a global
 * `Node`, shadowing the DOM's. In TypeScript that shadowing would be silent at
 * the type level too, so the name is disambiguated here.
 */
export class ClusterNode {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly jvmVersion: string;
  readonly availableProcessors: number;
  readonly transportAddress: string;
  readonly host: string;
  readonly master: boolean;
  readonly data: boolean;
  readonly client: boolean;
  readonly stats: unknown;
  readonly uptime: number;
  readonly heap_used: string | number;
  readonly heap_committed: string | number;
  readonly heap_used_percent: number | undefined;
  readonly heap_max: string | number;
  readonly disk_total_in_bytes: number | undefined;
  readonly disk_free_in_bytes: number | undefined;
  readonly disk_used_percent: number;
  readonly cpu: number | undefined;
  readonly load_average: number;
  current_master = false;

  constructor(nodeId: string, nodeStats: unknown, nodeInfo: NodeInfo) {
    this.id = nodeId;
    this.name = nodeInfo.name;
    this.version = nodeInfo.version;
    this.jvmVersion = nodeInfo.jvm.version;
    this.availableProcessors = nodeInfo.os.available_processors;
    this.transportAddress = nodeInfo.transport_address;
    this.host = nodeInfo.host;

    const roles = getProperty<string[]>(nodeInfo, 'roles', []);
    this.master = MASTER_ROLES.some((role) => roles.includes(role));
    this.data = DATA_ROLES.some((role) => roles.includes(role));
    this.client = !this.master && !this.data;

    this.stats = nodeStats;
    this.uptime = getProperty<number>(nodeStats, 'jvm.uptime_in_millis', 0);

    this.heap_used = readablizeBytes(getProperty(nodeStats, 'jvm.mem.heap_used_in_bytes'));
    this.heap_committed = readablizeBytes(
      getProperty(nodeStats, 'jvm.mem.heap_committed_in_bytes'),
    );
    this.heap_used_percent = getProperty(nodeStats, 'jvm.mem.heap_used_percent');
    this.heap_max = readablizeBytes(getProperty(nodeStats, 'jvm.mem.heap_max_in_bytes'));

    this.disk_total_in_bytes = getProperty(nodeStats, 'fs.total.total_in_bytes');
    this.disk_free_in_bytes = getProperty(nodeStats, 'fs.total.free_in_bytes');
    const usedBytes = (this.disk_total_in_bytes as number) - (this.disk_free_in_bytes as number);
    this.disk_used_percent = Math.round(100 * (usedBytes / (this.disk_total_in_bytes as number)));

    this.cpu = getProperty(nodeStats, 'process.cpu.percent');

    const loadAverage = getProperty<Record<string, number>>(nodeStats, 'os.cpu.load_average');
    this.load_average = loadAverage === undefined ? 0 : loadAverage['1m'];
  }

  setCurrentMaster(): void {
    this.current_master = true;
  }

  equals(node: {id: string}): boolean {
    return node.id === this.id;
  }
}

/** A node's stats keyed by id, as the nodes screen consumes them. */
export class NodeStats {
  readonly name: string;

  constructor(
    readonly id: string,
    readonly stats: {name: string},
  ) {
    this.name = stats.name;
  }
}
