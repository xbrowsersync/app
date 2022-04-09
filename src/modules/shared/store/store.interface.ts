import { BookmarkIdMapping } from '../../webext/shared/bookmark-id-mapper/bookmark-id-mapper.interface';
import { ApiSyncInfo } from '../api/api.interface';
import { AutoBackUpSchedule } from '../backup-restore/backup-restore.interface';
import { LogLevel } from '../log/log.enum';
import { RemovedSync } from '../sync/sync.interface';

export interface StoreContent {
  alternateSearchBarPosition: boolean;
  appVersion: string;
  autoBackUpSchedule: AutoBackUpSchedule;
  autoFetchMetadata: boolean;
  bookmarkIdMappings: BookmarkIdMapping[];
  bookmarks: string;
  checkForAppUpdates: boolean;
  darkModeEnabled: boolean;
  displayHelp: boolean;
  displayOtherSyncsWarning: boolean;
  displayPermissions: boolean;
  displayTelemetryCheck: boolean;
  displayUpdated: boolean;
  defaultToFolderView: boolean;
  installBackup: string;
  lastUpdated: string;
  removedSync: RemovedSync;
  syncBookmarksToolbar: boolean;
  syncEnabled: boolean;
  syncInfo: ApiSyncInfo;
  telemetryEnabled: boolean;
  traceLog: string[];
}

export interface TraceLogItem {
  level: LogLevel;
  message: string;
  timestamp: number;
}
