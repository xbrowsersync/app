import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import { BookmarkChangeType, BookmarkContainer } from './bookmark.enum';

export interface AddBookmarkChangeData {
  metadata: BookmarkMetadata;
}

export interface AddNativeBookmarkChangeData {
  nativeBookmark: NativeBookmarkWithAdditionalMetadata;
}

export interface Bookmark extends BookmarkMetadata {
  children?: Bookmark[];
  id?: number;
}

export type ChangeData =
  | AddBookmarkChangeData
  | AddNativeBookmarkChangeData
  | ModifyBookmarkChangeData
  | ModifyNativeBookmarkChangeData
  | MoveNativeBookmarkChangeData
  | RemoveBookmarkChangeData
  | RemoveNativeBookmarkChangeData;

export interface BookmarkChange {
  changeData: ChangeData;
  type: BookmarkChangeType;
}

export interface BookmarkMetadata {
  description?: string;
  isSeparator?: boolean;
  tags?: string[];
  title?: string;
  url?: string;
}

export interface BookmarkService {
  buildIdMappings: (bookmarks: Bookmark[]) => ng.IPromise<void>;
  clearNativeBookmarks: () => ng.IPromise<void>;
  createNativeBookmarksFromBookmarks: (bookmarks: Bookmark[]) => ng.IPromise<void>;
  getNativeBookmarksAsBookmarks: () => ng.IPromise<Bookmark[]>;
  processNativeChangeOnBookmarks: (changeInfo: BookmarkChange, bookmarks: Bookmark[]) => ng.IPromise<Bookmark[]>;
  processChangeOnNativeBookmarks: (
    id: number,
    changeType: BookmarkChangeType,
    changeInfo: BookmarkMetadata
  ) => ng.IPromise<void>;
  unsupportedContainers: BookmarkContainer[];
}

export interface ModifyBookmarkChangeData {
  bookmark: Bookmark;
}

export interface ModifyNativeBookmarkChangeData {
  nativeBookmark: NativeBookmarks.BookmarkTreeNode;
}

export interface MoveNativeBookmarkChangeData extends NativeBookmarks.OnMovedMoveInfoType {
  id: string;
}

export interface NativeBookmarkWithAdditionalMetadata extends NativeBookmarks.BookmarkTreeNode {
  description?: string;
  tags?: string[];
}

export interface RemoveBookmarkChangeData {
  id: number;
}

export interface RemoveNativeBookmarkChangeData {
  nativeBookmark: NativeBookmarks.BookmarkTreeNode;
}

export interface UpdateBookmarksResult {
  bookmark: Bookmark;
  bookmarks: Bookmark[];
  container?: string;
}
