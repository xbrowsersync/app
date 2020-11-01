import { Bookmark, BookmarkChange } from '../bookmark/bookmark.interface';
import { Exception } from '../exception/exception';
import { SyncType } from './sync.enum';

export interface Sync {
  bookmarks?: Bookmark[];
  changeInfo?: BookmarkChange;
  deferred?: PromiseConstructor;
  type: SyncType;
  uniqueId?: string;
}

export interface SyncResult {
  success: boolean;
  error?: Exception;
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
