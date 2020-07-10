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

export interface BookmarkChange {
  changeData:
    | AddBookmarkChangeData
    | AddNativeBookmarkChangeData
    | ModifyBookmarkChangeData
    | ModifyNativeBookmarkChangeData
    | MoveNativeBookmarkChangeData
    | RemoveBookmarkChangeData
    | RemoveNativeBookmarkChangeData;
  type: BookmarkChangeType;
}

export interface BookmarkMetadata {
  description?: string;
  tags?: string[];
  title?: string;
  url?: string;
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
