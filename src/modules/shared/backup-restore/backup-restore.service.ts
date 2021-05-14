import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import AppHelperService from '../../app/shared/app-helper/app-helper.service';
import { ApiServiceType } from '../api/api.enum';
import { ApiService } from '../api/api.interface';
import { Bookmark } from '../bookmark/bookmark.interface';
import * as Exceptions from '../exception/exception';
import { MessageCommand } from '../global-shared.enum';
import { PlatformService } from '../global-shared.interface';
import LogService from '../log/log.service';
import { StoreKey } from '../store/store.enum';
import StoreService from '../store/store.service';
import { SyncType } from '../sync/sync.enum';
import UpgradeService from '../upgrade/upgrade.service';
import UtilityService from '../utility/utility.service';
import { Backup, BackupSync } from './backup-restore.interface';

@autobind
@Injectable('BackupRestoreService')
export default class BackupRestoreService {
  $q: ng.IQService;
  apiSvc: ApiService;
  appHelperSvc: AppHelperService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  upgradeSvc: UpgradeService;
  utilitySvc: UtilityService;

  static $inject = [
    '$q',
    'ApiService',
    'AppHelperService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UpgradeService',
    'UtilityService'
  ];
  constructor(
    $q: ng.IQService,
    ApiSvc: ApiService,
    AppHelperSvc: AppHelperService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UpgradeSvc: UpgradeService,
    UtilitySvc: UtilityService
  ) {
    this.$q = $q;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.upgradeSvc = UpgradeSvc;
    this.utilitySvc = UtilitySvc;
  }

  createBackupData(bookmarksData: Bookmark[], syncId: string, serviceUrl: string, syncVersion: string): Backup {
    const backupData: Backup = {
      xbrowsersync: {
        date: this.utilitySvc.getDateTimeString(new Date()),
        sync: {},
        data: {}
      }
    };

    // Add sync info if provided
    if (syncId) {
      backupData.xbrowsersync!.sync = this.createSyncInfoObject(syncId, serviceUrl, syncVersion);
    }

    // Add bookmarks
    backupData.xbrowsersync!.data.bookmarks = bookmarksData;
    return backupData;
  }

  createSyncInfoObject(syncId: string, serviceUrl: string, syncVersion?: string): BackupSync {
    return {
      id: syncId,
      type: ApiServiceType.xBrowserSync,
      url: serviceUrl,
      version: syncVersion
    } as BackupSync;
  }

  getBackupFilename(): string {
    const fileName = `xbs_backup_${this.utilitySvc.getDateTimeString(new Date())}.txt`;
    return fileName;
  }

  restoreBackupData(backupData: Backup): ng.IPromise<void> {
    let bookmarksToRestore: Bookmark[];
    let serviceUrl: string;
    let syncEnabled: boolean;
    let syncId: string;
    let syncVersion: string;

    switch (true) {
      case !angular.isUndefined(backupData.xbrowsersync): // v1.5.0+
        bookmarksToRestore = backupData.xbrowsersync.data?.bookmarks;
        serviceUrl = backupData.xbrowsersync.sync?.url;
        syncId = backupData.xbrowsersync.sync?.id;
        syncVersion = backupData.xbrowsersync.sync?.version;
        break;
      case !angular.isUndefined(backupData.xBrowserSync): // Prior to v1.5.0
        bookmarksToRestore = backupData.xBrowserSync.bookmarks;
        syncId = backupData.xBrowserSync.id;
        break;
      default:
        // Invalid restore data
        throw new Exceptions.FailedRestoreDataException();
    }

    this.logSvc.logInfo('Restoring data');

    // Upgrade the bookmarks if required
    return this.platformSvc
      .getAppVersion()
      .then((currentVersion) => {
        return syncVersion === currentVersion
          ? bookmarksToRestore
          : this.upgradeSvc.upgradeBookmarks(bookmarksToRestore, syncVersion, currentVersion);
      })
      .then((upgradedBookmarks) =>
        this.utilitySvc
          .isSyncEnabled()
          .then((cachedSyncEnabled) => {
            syncEnabled = cachedSyncEnabled;

            // If synced check service status before starting restore, otherwise restore sync settings
            return syncEnabled
              ? this.apiSvc.checkServiceStatus()
              : this.$q((resolve, reject) => {
                  // Clear current password and set sync ID if supplied
                  this.$q
                    .all([
                      this.storeSvc.remove(StoreKey.Password),
                      syncId ? this.storeSvc.set(StoreKey.SyncId, syncId) : this.$q.resolve(),
                      serviceUrl ? this.appHelperSvc.updateServiceUrl(serviceUrl) : this.$q.resolve()
                    ])
                    .then(resolve)
                    .catch(reject);
                });
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
}
