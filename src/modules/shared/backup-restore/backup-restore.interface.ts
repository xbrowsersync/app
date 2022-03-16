import { ApiServiceType } from '../api/api.enum';
import { ApiSyncInfo } from '../api/api.interface';
import { Bookmark } from '../bookmark/bookmark.interface';

export interface AutoBackUpSchedule {
  autoBackUpNumber: string;
  autoBackUpUnit: string;
  autoBackUpHour: string;
  autoBackUpMinute: string;
}

export interface Backup {
  xbrowsersync?: BackupRoot;
  xBrowserSync?: LegacyBackupRoot;
}

export interface BackupRoot {
  data: BackupData;
  date: string;
  sync: ApiSyncInfo | BackupSync;
}

export interface BackupData {
  bookmarks?: Bookmark[];
}

/**
 * @deprecated Replaced by {@link ApiSyncInfo} as of v1.6.0
 */
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
