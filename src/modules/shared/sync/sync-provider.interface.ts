import SyncProcessResult, { SyncProcessBookmarksData } from './sync-process-result.interface';
import Sync from './sync.interface';

export default interface SyncProvider {
  disable: () => ng.IPromise<void>;
  enable: () => ng.IPromise<void>;
  processSync: (sync: Sync) => ng.IPromise<SyncProcessResult>;
  handleUpdateRemoteFailed: (err: Error, lastResult: SyncProcessBookmarksData, sync: Sync) => ng.IPromise<void>;
}
