import { ApiServiceType } from '../api/api.enum';
import { Bookmark } from '../bookmark/bookmark.interface';

export interface Backup {
  xbrowsersync?: BackupRoot;
  xBrowserSync?: LegacyBackupRoot;
}

export interface BackupRoot {
  data: BackupData;
  date: string;
  sync: BackupSync;
}

export interface BackupData {
  bookmarks?: Bookmark[];
}

export interface BackupSync {
  id?: string;
  type?: ApiServiceType;
  url?: string;
  version?: string;
}

export interface LegacyBackupRoot {
  bookmarks?: Bookmark[];
  id?: string;
}
