import Bookmark from './bookmark.interface';

export default interface UpdateBookmarksResult {
  bookmark: Bookmark;
  bookmarks: Bookmark[];
  container?: string;
}
