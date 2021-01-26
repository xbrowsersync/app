import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import { BookmarkChangeType } from './bookmark.enum';

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
  | RemoveNativeBookmarkChangeData
  | ReorderNativeBookmarkChangeData;

export interface BookmarkChange {
  changeData: ChangeData;
  type: BookmarkChangeType;
}

export interface BookmarkMetadata {
  description?: string;
  tags?: string[];
  title?: string;
  url?: string;
}

export interface BookmarkService {
  buildIdMappings: (bookmarks: Bookmark[]) => ng.IPromise<void>;
  clearNativeBookmarks: () => ng.IPromise<void>;
  createNativeBookmarksFromBookmarks: (bookmarks: Bookmark[]) => ng.IPromise<number>;
  ensureContainersExist: (bookmarks: Bookmark[]) => Bookmark[];
  processNativeChangeOnBookmarks: (changeInfo: BookmarkChange, bookmarks: Bookmark[]) => ng.IPromise<Bookmark[]>;
  processChangeOnNativeBookmarks: (
    id: number,
    changeType: BookmarkChangeType,
    changeInfo: BookmarkMetadata
  ) => ng.IPromise<void>;
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

export interface OnChildrenReorderedReorderInfoType {
  childIds: string[];
}

export interface RemoveBookmarkChangeData {
  id: number;
}

export interface RemoveNativeBookmarkChangeData {
  nativeBookmark: NativeBookmarks.BookmarkTreeNode;
}

export interface ReorderNativeBookmarkChangeData {
  childIds: string[];
  parentId: string;
}

export interface UpdateBookmarksResult {
  bookmark: Bookmark;
  bookmarks: Bookmark[];
  container?: string;
}
