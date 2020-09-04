import './backup-restore-settings.component.scss';
import angular from 'angular';
import { Component, OnInit, ViewParent } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AlertType } from '../../../shared/alert/alert.enum';
import AlertService from '../../../shared/alert/alert.service';
import { ApiService } from '../../../shared/api/api.interface';
import { Backup } from '../../../shared/backup-restore/backup-restore.interface';
import BackupRestoreService from '../../../shared/backup-restore/backup-restore.service';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { Bookmark, BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import * as Exceptions from '../../../shared/exception/exception';
import { MessageCommand } from '../../../shared/global-shared.enum';
import { PlatformService } from '../../../shared/global-shared.interface';
import LogService from '../../../shared/log/log.service';
import { StoreKey } from '../../../shared/store/store.enum';
import StoreService from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import UtilityService from '../../../shared/utility/utility.service';
import { WorkingContext } from '../../../shared/working/working.enum';
import WorkingService from '../../../shared/working/working.service';
import { AppEventType } from '../../app.enum';
import { AppHelperService } from '../../app.interface';
import AppSettingsComponent from '../app-settings.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'backupRestoreSettings',
  template: require('./backup-restore-settings.component.html')
})
export default class BackupRestoreSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  apiSvc: ApiService;
  appHelperSvc: AppHelperService;
  backupRestoreSvc: BackupRestoreService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  syncEnabled: boolean;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  @ViewParent('^appSettings') appSettingsCtrl: AppSettingsComponent;

  backupCompletedMessage: string;
  backupFileName: string;
  dataToRestore: string;
  displayRestoreConfirmation = false;
  displayRestoreForm = false;
  displayRevertConfirmation = false;
  restoreCompletedMessage: string;
  restoreForm: ng.IFormController;
  revertCompleted = false;
  revertConfirmationMessage: string;
  revertUnavailable = false;
  savingBackup = false;
  validatingRestoreData = false;

  static $inject = [
    '$q',
    '$timeout',
    'AlertService',
    'ApiService',
    'AppHelperService',
    'BackupRestoreService',
    'BookmarkHelperService',
    'BookmarkService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
    ApiSvc: ApiService,
    AppHelperSvc: AppHelperService,
    BackupRestoreSvc: BackupRestoreService,
    BookmarkHelperSvc: BookmarkHelperService,
    BookmarkSvc: BookmarkService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.backupRestoreSvc = BackupRestoreSvc;
    this.bookmarkHelperSvc = BookmarkHelperSvc;
    this.bookmarkSvc = BookmarkSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  backupFileChanged(): void {
    const fileInput = document.getElementById('backupFile') as HTMLInputElement;

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      this.backupFileName = file.name;
      const reader = new FileReader();

      reader.onload = ((data) => {
        return (event) => {
          this.$timeout(() => {
            this.dataToRestore = event.target.result;

            // Reset validation interface
            this.resetFormValidity();
            this.validatingRestoreData = true;

            // Trigger restore data validation
            this.$timeout(() => {
              this.validateBackupData();
              this.validatingRestoreData = false;
            });
          });
        };
      })(file);

      // Read the backup file data
      reader.readAsText(file);
    }
  }

  closeRevertPanel(): void {
    this.displayRevertConfirmation = false;
    this.revertCompleted = false;
    this.revertConfirmationMessage = null;
    this.revertUnavailable = false;
  }

  confirmRestore(): void {
    if (!this.dataToRestore) {
      // Display alert
      this.alertSvc.setCurrentAlert({
        message: this.platformSvc.getI18nString(this.Strings.Exception.NoDataToRestore_Message),
        title: this.platformSvc.getI18nString(this.Strings.Exception.NoDataToRestore_Title),
        type: AlertType.Error
      });
      return;
    }

    // Hide restore confirmation
    this.displayRestoreConfirmation = false;
    this.displayRestoreForm = true;

    // Start restore
    this.restoreBackupData(JSON.parse(this.dataToRestore));
  }

  confirmRevert(): void {
    // Display loading overlay
    this.workingSvc.show(WorkingContext.Reverting);

    // Disable sync and restore native bookmarks to installation state
    this.$q
      .all([this.storeSvc.get<any>(StoreKey.InstallBackup), this.platformSvc.disableSync()])
      .then((response) => {
        const installBackupObj = JSON.parse(response[0]);
        const installBackupDate = new Date(installBackupObj.date);
        const bookmarksToRestore = installBackupObj.bookmarks;
        this.logSvc.logInfo(`Reverting data to installation state from ${installBackupDate.toISOString()}`);

        // Start restore
        return this.platformSvc.queueSync(
          {
            bookmarks: bookmarksToRestore,
            type: SyncType.Local
          },
          MessageCommand.RestoreBookmarks
        );
      })
      .then(() => {
        // Update view model
        this.displayRevertConfirmation = false;
        this.revertCompleted = true;
        this.appHelperSvc.focusOnElement('.revert-completed .focused');
        this.utilitySvc.broadcastEvent(AppEventType.SyncDisabled);
      });
  }

  displayRestorePanel(): void {
    this.backupFileName = null;
    this.restoreCompletedMessage = null;
    this.displayRestoreConfirmation = false;
    this.dataToRestore = '';
    this.displayRestoreForm = true;
    (document.querySelector('#backupFile') as HTMLInputElement).value = null;
    this.restoreForm.dataToRestore.$setValidity('InvalidData', true);

    // Focus on restore textarea
    if (!this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
      this.$timeout(() => {
        (document.querySelector('#restoreForm textarea') as HTMLTextAreaElement).select();
      });
    }
  }

  displayRevertPanel(): void {
    // Retrieve install backup from store
    this.storeSvc.get<any>(StoreKey.InstallBackup).then((installBackup) => {
      if (angular.isUndefined(installBackup)) {
        this.revertUnavailable = true;
        this.appHelperSvc.focusOnElement('.revert-completed .focused');
        return;
      }

      const installBackupObj = JSON.parse(installBackup);
      if (installBackupObj?.date && installBackupObj?.bookmarks) {
        const date = new Date(installBackupObj.date);
        const confirmationMessage = this.platformSvc.getI18nString(
          this.Strings.View.Settings.BackupRestore.Revert.Confirm
        );
        this.revertConfirmationMessage = confirmationMessage.replace('{date}', date.toLocaleDateString());
        this.displayRevertConfirmation = true;
      } else {
        this.revertUnavailable = true;
      }
    });
  }

  downloadBackup(): void {
    this.savingBackup = true;
    this.saveBackupFile().finally(() => {
      // Update view model
      this.savingBackup = false;
      this.appHelperSvc.focusOnElement('.backup-completed .focused');
    });
  }

  getBookmarksForExport(): ng.IPromise<Bookmark[]> {
    const cleanRecursive = (bookmarks: Bookmark[]): Bookmark[] => {
      return bookmarks.map((bookmark) => {
        const cleanedBookmark = this.bookmarkHelperSvc.cleanBookmark(bookmark);
        if (angular.isArray(cleanedBookmark.children)) {
          cleanedBookmark.children = cleanRecursive(cleanedBookmark.children);
        }
        return cleanedBookmark;
      });
    };

    return this.utilitySvc
      .isSyncEnabled()
      .then((syncEnabled) => {
        // If sync is not enabled, export native bookmarks
        return syncEnabled
          ? this.bookmarkHelperSvc.getCachedBookmarks()
          : this.bookmarkSvc.getNativeBookmarksAsBookmarks();
      })
      .then((bookmarks) => {
        // Clean bookmarks for export
        return cleanRecursive(this.bookmarkHelperSvc.removeEmptyContainers(bookmarks));
      });
  }

  ngOnInit(): void {
    // Set backup file change event for mobile platforms
    if (this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
      document.getElementById('backupFile').addEventListener('change', this.backupFileChanged, false);
    }

    // Initialise view model values
    this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      this.syncEnabled = syncEnabled;
    });
  }

  resetFormValidity(): void {
    this.restoreForm.dataToRestore.$setValidity('InvalidData', true);
  }

  restore(): void {
    if (!this.validateBackupData()) {
      return;
    }

    // Display restore confirmation
    this.displayRestoreForm = false;
    this.displayRestoreConfirmation = true;

    // Focus on confirm button
    this.appHelperSvc.focusOnElement('.btn-confirm-restore');
  }

  restoreBackupData(backupData: Backup): ng.IPromise<void> {
    let bookmarksToRestore: Bookmark[];
    let serviceUrl: string;
    let syncId: string;
    let syncEnabled: boolean;

    this.logSvc.logInfo('Restoring data');

    if (backupData.xbrowsersync) {
      // Get data to restore from v1.5.0 backup
      const data = backupData.xbrowsersync.data;
      const sync = backupData.xbrowsersync.sync;
      bookmarksToRestore = data?.bookmarks;
      serviceUrl = sync?.url;
      syncId = sync && syncId;
    } else if (backupData.xBrowserSync) {
      // Get data to restore from backups prior to v1.5.0
      bookmarksToRestore = backupData.xBrowserSync.bookmarks;
      syncId = backupData.xBrowserSync.id;
    } else {
      // Data to restore invalid, throw error
      throw new Exceptions.FailedRestoreDataException();
    }

    this.workingSvc.show(WorkingContext.Restoring);

    return this.utilitySvc
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
      .then(() => {
        // Return if no bookmarks found
        if (!bookmarksToRestore) {
          return;
        }

        // Start restore
        return this.platformSvc
          .queueSync(
            {
              bookmarks: bookmarksToRestore,
              type: !syncEnabled ? SyncType.Local : SyncType.LocalAndRemote
            },
            MessageCommand.RestoreBookmarks
          )
          .then(this.restoreBookmarksSuccess);
      });
  }

  restoreBookmarksSuccess(): void {
    // Update view model
    this.displayRestoreForm = false;
    this.dataToRestore = undefined;
    this.restoreCompletedMessage = this.platformSvc.getI18nString(
      this.Strings.View.Settings.BackupRestore.Restore.Done
    );

    // Refresh data usage
    this.appSettingsCtrl.refreshSyncDataUsage();

    // Focus on button
    this.appHelperSvc.focusOnElement('.restore-completed .focused');
  }

  saveBackupFile(): ng.IPromise<void> {
    // Get data for backup
    return this.$q
      .all([
        this.getBookmarksForExport(),
        this.storeSvc.get<string>(StoreKey.SyncId),
        this.utilitySvc.getServiceUrl(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const bookmarksData = data[0];
        const syncId = data[1];
        const serviceUrl = data[2];
        const syncEnabled = data[3];
        const backupData = this.backupRestoreSvc.createBackupData(
          bookmarksData,
          syncEnabled ? syncId : null,
          syncEnabled ? serviceUrl : null
        );

        // Beautify json and download data
        const beautifiedJson = JSON.stringify(backupData, null, 2);
        return this.appHelperSvc.downloadFile(this.backupRestoreSvc.getBackupFileName(), beautifiedJson, 'backupLink');
      })
      .then((message) => {
        // Display message
        this.backupCompletedMessage = message;
      });
  }

  selectBackupFile(): void {
    // Open select file dialog
    (document.querySelector('#backupFile') as HTMLInputElement).click();
  }

  validateBackupData(): boolean {
    if (!this.dataToRestore) {
      return false;
    }

    // Check backup data structure
    let validateData = false;
    try {
      const restoreData: Backup = JSON.parse(this.dataToRestore);
      const bookmarks = restoreData.xBrowserSync?.bookmarks ?? restoreData.xbrowsersync?.data?.bookmarks;
      validateData = !angular.isUndefined(bookmarks ?? undefined);
    } catch (err) {}
    this.restoreForm.dataToRestore.$setValidity('InvalidData', validateData);
    return validateData;
  }
}
