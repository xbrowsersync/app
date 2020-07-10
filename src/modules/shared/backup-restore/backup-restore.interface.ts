import { ApiServiceType } from '../api/api.enum';

export interface Backup {
  xbrowsersync: BackupRoot;
}

export interface BackupRoot {
  data: BackupData;
  date: string;
  sync: BackupSync;
}

export interface BackupData {
  bookmarks?: any;
}

export interface BackupSync {
  id?: string;
  type?: ApiServiceType;
  url?: string;
}
