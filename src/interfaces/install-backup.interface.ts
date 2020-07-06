import Bookmark from '../modules/shared/bookmark/bookmark.interface';

export default interface InstallBackup {
  bookmarks: Bookmark[];
  date: string;
}
