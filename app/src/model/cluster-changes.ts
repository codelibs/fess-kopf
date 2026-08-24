import {readablizeBytes} from './util';
import type {ClusterNode} from './cluster-node';
import type {Index} from './opensearch-index';

/**
 * What changed between two consecutive polls. Null rather than empty array
 * means "nothing of this kind", which is what hasChanges() tests.
 */
export class ClusterChanges {
  nodeJoins: ClusterNode[] | null = null;
  nodeLeaves: ClusterNode[] | null = null;
  indicesCreated: Index[] | null = null;
  indicesDeleted: Index[] | null = null;
  docDelta = 0;
  dataDelta = 0;

  setDocDelta(delta: number): void {
    this.docDelta = delta;
  }

  getDocDelta(): number {
    return this.docDelta;
  }

  absDocDelta(): number {
    return Math.abs(this.docDelta);
  }

  setDataDelta(delta: number): void {
    this.dataDelta = delta;
  }

  getDataDelta(): number {
    return this.dataDelta;
  }

  absDataDelta(): string | number {
    return readablizeBytes(Math.abs(this.dataDelta));
  }

  hasChanges(): boolean {
    return (
      this.nodeJoins !== null ||
      this.nodeLeaves !== null ||
      this.indicesCreated !== null ||
      this.indicesDeleted !== null
    );
  }

  addJoiningNode(node: ClusterNode): void {
    this.nodeJoins ??= [];
    this.nodeJoins.push(node);
  }

  addLeavingNode(node: ClusterNode): void {
    this.nodeLeaves ??= [];
    this.nodeLeaves.push(node);
  }

  hasJoins(): boolean {
    return this.nodeJoins !== null;
  }

  hasLeaves(): boolean {
    return this.nodeLeaves !== null;
  }

  addCreatedIndex(index: Index): void {
    this.indicesCreated ??= [];
    this.indicesCreated.push(index);
  }

  addDeletedIndex(index: Index): void {
    this.indicesDeleted ??= [];
    this.indicesDeleted.push(index);
  }

  hasCreatedIndices(): boolean {
    return this.indicesCreated !== null;
  }

  hasDeletedIndices(): boolean {
    return this.indicesDeleted !== null;
  }
}
