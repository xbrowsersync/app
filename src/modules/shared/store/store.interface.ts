import { BookmarkIdMapping } from '../../webext/webext-shared/bookmark-id-mapper/bookmark-id-mapper.interface';
import { LogLevel } from '../log/log.enum';

export interface PlatformStoreService {
  clear: () => ng.IPromise<void>;
  get: <T = StoreContent>(keys: IDBValidKey[]) => ng.IPromise<T[]>;
  keys: () => ng.IPromise<IDBValidKey[]>;
  remove: (keys: IDBValidKey[]) => ng.IPromise<void>;
  set: (key: IDBValidKey, value: any) => ng.IPromise<void>;
}

export interface StoreContent {
  alternateSearchBarPosition: boolean;
  appVersion: string;
  autoFetchMetadata: boolean;
  bookmarkIdMappings: BookmarkIdMapping[];
  bookmarks: string;
  checkForAppUpdates: boolean;
  darkModeEnabled: boolean;
  displayHelp: boolean;
  displayOtherSyncsWarning: boolean;
  displayPermissions: boolean;
  displayUpdated: boolean;
  defaultToFolderView: boolean;
  installBackup: string;
  lastUpdated: string;
  password: string;
  serviceUrl: string;
  syncBookmarksToolbar: boolean;
  syncEnabled: boolean;
  syncId: string;
  syncVersion: string;
  traceLog: string[];
}

export interface TraceLogItem {
  timestamp: number;
  level: LogLevel;
  message: string;
}
