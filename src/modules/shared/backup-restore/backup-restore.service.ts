import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { ApiSyncInfo } from '../api/api.interface';
import { ApiXbrowsersyncSyncInfo } from '../api/api-xbrowsersync/api-xbrowsersync.interface';
import { Bookmark, BookmarkService } from '../bookmark/bookmark.interface';
import { FailedRestoreDataError } from '../errors/errors';
import { MessageCommand } from '../global-shared.enum';
import { PlatformService } from '../global-shared.interface';
import { LogService } from '../log/log.service';
import { StoreKey } from '../store/store.enum';
import { StoreService } from '../store/store.service';
import { SyncType } from '../sync/sync.enum';
import { UpgradeService } from '../upgrade/upgrade.service';
import { UtilityService } from '../utility/utility.service';
import { AutoBackUpSchedule, Backup } from './backup-restore.interface';

@Injectable('BackupRestoreService')
export class BackupRestoreService {
  $q: ng.IQService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  upgradeSvc: UpgradeService;
  utilitySvc: UtilityService;

  static $inject = [
    '$q',
    'BookmarkService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UpgradeService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UpgradeSvc: UpgradeService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.upgradeSvc = UpgradeSvc;
    this.utilitySvc = UtilitySvc;
  }

  createBackupData(bookmarks: Bookmark[], syncInfo: ApiSyncInfo): Backup {
    return {
      xbrowsersync: {
        date: this.utilitySvc.getDateTimeString(new Date()),
        sync: syncInfo,
        data: {
          bookmarks
        }
      }
    } as Backup;
  }

  getBackupFilename(): string {
    const fileName = `xbs_backup_${this.utilitySvc.getDateTimeString(new Date())}.txt`;
    return fileName;
  }

  getSetAutoBackUpSchedule(newValue?: AutoBackUpSchedule | null): ng.IPromise<AutoBackUpSchedule> {
    if (angular.isUndefined(newValue)) {
      return this.storeSvc.get<AutoBackUpSchedule>(StoreKey.AutoBackUpSchedule);
    }
    return this.storeSvc.set(StoreKey.AutoBackUpSchedule, newValue).then(() => {
      if (newValue === null) {
        this.logSvc.logInfo(`Auto back up schedule cleared`);
      } else {
        this.logSvc.logInfo(
          `Auto back up schedule: ${newValue.autoBackUpHour}:${newValue.autoBackUpMinute} every ${newValue.autoBackUpNumber} ${newValue.autoBackUpUnit}`
        );
      }
      return newValue;
    });
  }

  getSyncInfo(): ng.IPromise<ApiSyncInfo> {
    // Remove sensitive data from sync info before returning
    return this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo).then((syncInfo) => {
      const { password, ...syncInfoNoPassword } = syncInfo;
      return syncInfoNoPassword;
    });
  }

  restoreBackupData(backupData: Backup): ng.IPromise<void> {
    let bookmarksToRestore: Bookmark[];
    let syncEnabled: boolean;
    let syncId: string;
    let syncInfo: ApiSyncInfo;
    let syncVersion: string;

    if (backupData.xbrowsersync) {
      // > v1.5.2
      if (backupData.xbrowsersync?.sync && 'serviceType' in backupData.xbrowsersync.sync) {
        syncInfo = backupData.xbrowsersync.sync;
      }
      // v1.5.0 - v1.5.2
      else if (backupData.xbrowsersync?.sync && 'type' in backupData.xbrowsersync.sync) {
        const { id, url, version } = backupData.xbrowsersync.sync;
        syncInfo = {
          id,
          serviceUrl: url,
          version
        } as ApiXbrowsersyncSyncInfo;
      }
      bookmarksToRestore = backupData.xbrowsersync.data?.bookmarks;
    }
    // < v1.5.0
    else if (backupData.xBrowserSync) {
      bookmarksToRestore = backupData.xBrowserSync.bookmarks;
    } else {
      // Invalid restore data
      throw new FailedRestoreDataError('Unsupported backup data format');
    }

    this.logSvc.logInfo('Restoring data');

    // Upgrade the bookmarks if required
    return this.platformSvc
      .getAppVersion()
      .then((currentVersion) => {
        return syncVersion === currentVersion
          ? bookmarksToRestore
          : this.upgradeSvc.upgradeBookmarks(currentVersion, syncVersion, bookmarksToRestore);
      })
      .then((upgradedBookmarks) =>
        this.utilitySvc
          .isSyncEnabled()
          .then((cachedSyncEnabled) => {
            syncEnabled = cachedSyncEnabled;

            // If synced, check service status before starting restore, otherwise restore sync info
            return syncEnabled
              ? this.utilitySvc
                  .getApiService()
                  .then((apiSvc) => apiSvc.checkServiceStatus())
                  .then(() => {})
              : this.storeSvc.set(StoreKey.SyncInfo, syncInfo);
          })
          // Start restore
          .then(() =>
            this.platformSvc.queueSync(
              {
                bookmarks: upgradedBookmarks,
                type: !syncEnabled ? SyncType.Local : SyncType.LocalAndRemote
              },
              MessageCommand.RestoreBookmarks
            )
          )
      )
      .then(() => {});
  }

  runAutoBackUp(): void {
    this.logSvc.logInfo('Running auto back up');
    this.saveBackupFile(false);
  }

  saveBackupFile(displaySaveDialog?: boolean): ng.IPromise<string | void> {
    let filename: string;
    return this.$q
      .all([this.getSyncInfo(), this.bookmarkSvc.getBookmarksForExport(), this.utilitySvc.isSyncEnabled()])
      .then((data) => {
        const [syncInfo, bookmarksData, syncEnabled] = data;
        const backupData = this.createBackupData(bookmarksData, syncEnabled ? syncInfo : undefined);

        // Beautify json and download data
        const beautifiedJson = JSON.stringify(backupData, null, 2);
        filename = this.getBackupFilename();
        return this.platformSvc.downloadFile(filename, beautifiedJson, displaySaveDialog);
      });
  }
}
