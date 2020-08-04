import { LogLevel } from '../log/log.enum';

export interface PlatformStoreService {
  clear: () => ng.IPromise<void>;
  get: <T = StoreContent>(keys: IDBValidKey[]) => ng.IPromise<T[]>;
  keys: () => ng.IPromise<IDBValidKey[]>;
  remove: (keys: IDBValidKey[]) => ng.IPromise<void>;
  set: (key: IDBValidKey, value: any) => ng.IPromise<void>;
}

export interface StoreContent {
  appVersion: string;
  bookmarkIdMappings: any;
  bookmarks: any;
  checkForAppUpdates: boolean;
  darkModeEnabled: boolean;
  displayHelp: boolean;
  displayOtherSyncsWarning: boolean;
  displayPermissions: boolean;
  displaySearchBarBeneathResults: boolean;
  displayUpdated: boolean;
  defaultToFolderView: boolean;
  installBackup: any;
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
