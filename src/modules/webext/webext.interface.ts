import { Bookmark } from '../shared/bookmark/bookmark.interface';

export interface InstallBackup {
  bookmarks: Bookmark[];
  date: string;
}

export interface NativeBookmarkService {
  enableEventListeners: () => ng.IPromise<void>;
  disableEventListeners: () => ng.IPromise<void>;
}
