import Bookmark from '../modules/shared/bookmark/bookmark.interface';

export default interface BookmarkSearchResult extends Bookmark {
  score?: number;
}
