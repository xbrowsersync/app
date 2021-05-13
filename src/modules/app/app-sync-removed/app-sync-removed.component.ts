import { Component } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import BackupRestoreService from '../../shared/backup-restore/backup-restore.service';
import { PlatformService } from '../../shared/global-shared.interface';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import { RemovedSync } from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import AppHelperService from '../shared/app-helper/app-helper.service';

/**
 * Panel that is displayed when the active sync is not found or has been removed by the service.
 * Allows the user to download their cached sync data as a backup file before it is cleared locally.
 */
@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appSyncRemoved',
  styles: [require('./app-sync-removed.component.scss')],
  template: require('./app-sync-removed.component.html')
})
export default class AppSyncRemovedComponent {
  Strings = require('../../../../res/strings/en.json');

  $timeout: ng.ITimeoutService;
  appHelperSvc: AppHelperService;
  backupRestoreSvc: BackupRestoreService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;

  backupCompletedMessage: string;
  savingBackup = false;

  static $inject = [
    '$timeout',
    'AppHelperService',
    'BackupRestoreService',
    'PlatformService',
    'StoreService',
    'UtilityService'
  ];
  constructor(
    $timeout: ng.ITimeoutService,
    AppHelperSvc: AppHelperService,
    BackupRestoreSvc: BackupRestoreService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService
  ) {
    this.$timeout = $timeout;
    this.appHelperSvc = AppHelperSvc;
    this.backupRestoreSvc = BackupRestoreSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
  }

  /**
   * Removes removed sync from store and switches to the default view.
   */
  close(): void {
    this.storeSvc.remove(StoreKey.RemovedSync);
    this.appHelperSvc.switchView();
  }

  /**
   * Event handler for Download Backup button.
   * Updates button view model to display saving spinner and triggers backup.
   */
  downloadBackup(): void {
    this.savingBackup = true;
    this.saveRemovedSyncAsBackupFile()
      .then((filename) => {
        if (!filename) {
          return;
        }
        // Only mobile platforms display a file downloaded message
        this.backupCompletedMessage = this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)
          ? `${this.platformSvc.getI18nString(this.Strings.View.Settings.FileDownloaded)}: ${filename}`
          : '';
      })
      .finally(() => {
        this.savingBackup = false;
        this.appHelperSvc.focusOnElement('.focused');
      });
  }

  /**
   * Retrieves removed sync from store and saves it as a backup file.
   */
  saveRemovedSyncAsBackupFile(): ng.IPromise<string | void> {
    return this.storeSvc.get<RemovedSync>(StoreKey.RemovedSync).then((removedSync) => {
      const backupData = this.backupRestoreSvc.createBackupData(
        removedSync.bookmarks,
        removedSync.syncId,
        removedSync.serviceUrl,
        removedSync.syncVersion
      );
      const beautifiedJson = JSON.stringify(backupData, null, 2);
      const filename = this.backupRestoreSvc.getBackupFilename();
      return this.appHelperSvc.downloadFile(filename, beautifiedJson);
    });
  }
}
