import { BookmarkIdMapping } from '../../webext/shared/bookmark-id-mapper/bookmark-id-mapper.interface';
import { LogLevel } from '../log/log.enum';
import { RemovedSync } from '../sync/sync.interface';

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
  removedSync: RemovedSync;
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
