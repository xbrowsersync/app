import Bookmark from '../bookmark/bookmark.interface';

export interface SyncProcessBookmarksData {
  encryptedBookmarks: string;
  updatedBookmarks: Bookmark[];
}

export default interface SyncProcessResult {
  data?: SyncProcessBookmarksData;
  updateRemote?: boolean;
}
