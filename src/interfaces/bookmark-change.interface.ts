import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import BookmarkChangeType from '../modules/shared/bookmark/bookmark-change-type.enum';
import BookmarkMetadata from '../modules/shared/bookmark/bookmark-metadata.interface';
import Bookmark from '../modules/shared/bookmark/bookmark.interface';

export interface AddBookmarkChangeData {
  metadata: BookmarkMetadata;
}

export interface AddNativeBookmarkChangeData {
  nativeBookmark: NativeBookmarkWithAdditionalMetadata;
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

export default interface BookmarkChange {
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
