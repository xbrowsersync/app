import { Bookmark, BookmarkChange } from '../bookmark/bookmark.interface';
import { SyncType } from './sync.enum';

export interface RemovedSync {
  bookmarks: Bookmark[];
  lastUpdated: string;
  serviceUrl: string;
  syncId: string;
  syncVersion: string;
}

export interface Sync {
  bookmarks?: Bookmark[];
  changeInfo?: BookmarkChange;
  deferred?: ng.IDeferred<void>;
  type: SyncType;
  uniqueId?: string;
}

export interface ProcessSyncResult {
  data?: Bookmark[];
  updateRemote?: boolean;
}

export interface SyncProvider {
  disable: () => ng.IPromise<void>;
  enable: () => ng.IPromise<void>;
  processSync: (sync: Sync) => ng.IPromise<ProcessSyncResult>;
  handleUpdateRemoteFailed: (err: Error, lastResult: Bookmark[], sync: Sync) => ng.IPromise<void>;
}
