import type {TaskResponse} from '@/api/opensearch';

/**
 * One task the cluster is running.
 *
 * kopf can start a force merge but had no way to watch one finish, and the
 * same is true of a Fess reindex, which runs as an OpenSearch reindex task.
 * The task id OpenSearch wants back for a cancel is `<node>:<id>` -- the two
 * halves arrive separately, so they are joined here rather than at each call
 * site.
 */
export class ClusterTask {
  readonly taskId: string;
  readonly node: string;
  readonly action: string;
  readonly description: string;
  readonly startedAt: number;
  readonly runningTimeMs: number;
  readonly cancellable: boolean;
  readonly cancelled: boolean;
  readonly parentTaskId: string | null;

  constructor(raw: TaskResponse) {
    this.node = raw.node;
    this.taskId = `${raw.node}:${raw.id}`;
    this.action = raw.action;
    this.description = raw.description ?? '';
    this.startedAt = raw.start_time_in_millis;
    this.runningTimeMs = Math.round(raw.running_time_in_nanos / 1e6);
    this.cancellable = raw.cancellable;
    this.cancelled = raw.cancelled === true;
    this.parentTaskId =
      raw.parent_task_id !== undefined && raw.parent_task_id !== '' ? raw.parent_task_id : null;
  }

  /** True once the task can still be asked to stop. */
  get stoppable(): boolean {
    return this.cancellable && !this.cancelled;
  }
}

/**
 * The task listing itself. Every call to the tasks API returns its own task
 * and the per-node children it fanned out to, which is noise on a screen
 * whose whole point is what else is running.
 */
export const LISTING_ACTION = 'cluster:monitor/tasks/lists';

export function isListing(task: ClusterTask): boolean {
  return task.action.startsWith(LISTING_ACTION);
}

/** Longest-running first: that is the one an operator is looking for. */
export function parseTasks(raw: TaskResponse[]): ClusterTask[] {
  return raw.map((task) => new ClusterTask(task)).sort((a, b) => b.runningTimeMs - a.runningTimeMs);
}
