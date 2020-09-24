import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import { BookmarkContainer } from '../../../shared/bookmark/bookmark.enum';
import { Bookmark, BookmarkService } from '../../../shared/bookmark/bookmark.interface';

export interface WebExtBookmarkService extends BookmarkService {
  clearNativeBookmarks: () => ng.IPromise<void>;
  createNativeBookmarksFromBookmarks: (bookmarks: Bookmark[]) => ng.IPromise<number>;
  createNativeSeparator: (
    parentId: string,
    nativeToolbarContainerId: string
  ) => ng.IPromise<NativeBookmarks.BookmarkTreeNode>;
  disableEventListeners: () => ng.IPromise<void>;
  enableEventListeners: () => ng.IPromise<void>;
  ensureContainersExist: (bookmarks: Bookmark[]) => Bookmark[];
  getNativeBookmarksAsBookmarks: () => ng.IPromise<Bookmark[]>;
  getNativeContainerIds: () => ng.IPromise<Map<BookmarkContainer, string>>;
  syncNativeBookmarkChanged: (id?: string) => ng.IPromise<void>;
  syncNativeBookmarkCreated: (id?: string, nativeBookmark?: NativeBookmarks.BookmarkTreeNode) => ng.IPromise<void>;
  syncNativeBookmarkMoved: (id?: string, moveInfo?: NativeBookmarks.OnMovedMoveInfoType) => ng.IPromise<void>;
  unsupportedContainers: BookmarkContainer[];
}
