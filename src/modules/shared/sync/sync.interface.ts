import { Bookmark, BookmarkChange } from '../bookmark/bookmark.interface';
import { SyncType } from './sync.enum';

export interface Sync {
  bookmarks?: Bookmark[];
  changeInfo?: BookmarkChange;
  deferred?: PromiseConstructor;
  type: SyncType;
  uniqueId?: string;
}

export interface SyncProcessBookmarksData {
  encryptedBookmarks: string;
  updatedBookmarks: Bookmark[];
}

export interface SyncProcessResult {
  data?: SyncProcessBookmarksData;
  updateRemote?: boolean;
}

export interface SyncProvider {
  disable: () => ng.IPromise<void>;
  enable: () => ng.IPromise<void>;
  processSync: (sync: Sync) => ng.IPromise<SyncProcessResult>;
  handleUpdateRemoteFailed: (err: Error, lastResult: SyncProcessBookmarksData, sync: Sync) => ng.IPromise<void>;
}
