import { Bookmark } from '../../shared/bookmark/bookmark.interface';

export interface BookmarkSearchResult extends Bookmark {
  score?: number;
}

export interface BookmarkTreeItem extends Bookmark {
  displayChildren: boolean;
  open: boolean;
}
