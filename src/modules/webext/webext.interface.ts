import { Bookmark } from '../shared/bookmark/bookmark.interface';

export interface InstallBackup {
  bookmarks: Bookmark[];
  date: string;
}
