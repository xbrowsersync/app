import { Bookmarks as NativeBookmarks } from 'webextension-polyfill-ts';
import BookmarkChangeType from '../modules/shared/bookmark/bookmark-change-type.enum';
import Bookmark from '../modules/shared/bookmark/bookmark.interface';

export default interface BookmarkChange {
  bookmark?: Bookmark | NativeBookmarks.BookmarkTreeNode;
  id?: number;
  type: BookmarkChangeType;
}
