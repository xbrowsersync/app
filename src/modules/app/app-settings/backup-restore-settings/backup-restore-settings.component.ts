import angular from 'angular';
import { Component, OnInit, ViewParent } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AlertType } from '../../../shared/alert/alert.enum';
import AlertService from '../../../shared/alert/alert.service';
import { Backup } from '../../../shared/backup-restore/backup-restore.interface';
import BackupRestoreService from '../../../shared/backup-restore/backup-restore.service';
import { Bookmark, BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import BookmarkHelperService from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
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
import WebExtBookmarkService from '../../../webext/shared/webext-bookmark/webext-bookmark.service';
import { AppEventType } from '../../app.enum';
import AppHelperService from '../../shared/app-helper/app-helper.service';
import AppSettingsComponent from '../app-settings.component';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'backupRestoreSettings',
  styles: [require('./backup-restore-settings.component.scss')],
  template: require('./backup-restore-settings.component.html')
})
export default class BackupRestoreSettingsComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $filter: ng.FilterFactory;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  alertSvc: AlertService;
  appHelperSvc: AppHelperService;
  backupRestoreSvc: BackupRestoreService;
  bookmarkHelperSvc: BookmarkHelperService;
  bookmarkSvc: BookmarkService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
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
  syncEnabled = false;
  validatingRestoreData = false;

  static $inject = [
    '$filter',
    '$q',
    '$timeout',
    'AlertService',
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
    $filter: ng.FilterFactory,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    AlertSvc: AlertService,
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
    this.$filter = $filter;
    this.$q = $q;
    this.$timeout = $timeout;
    this.alertSvc = AlertSvc;
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

    // Display loading overlay and start restore
    this.workingSvc.show(WorkingContext.Restoring);
    this.backupRestoreSvc
      .restoreBackupData(JSON.parse(this.dataToRestore))
      .then(this.restoreBookmarksSuccess)
      .catch((err) => {
        if (err instanceof Exceptions.SyncVersionNotSupportedException) {
          // Display specific message if user is trying to restore an unsupported backup version
          this.alertSvc.setCurrentAlert({
            message: this.platformSvc.getI18nString(this.Strings.Exception.SyncVersionNotSupported_Restore_Message),
            title: this.platformSvc.getI18nString(this.Strings.Exception.SyncVersionNotSupported_Title),
            type: AlertType.Error
          });
          return;
        }
        throw err;
      })
      .finally(this.workingSvc.hide);
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
        this.revertConfirmationMessage = confirmationMessage.replace(
          '{date}',
          (this.$filter('date') as ng.IFilterDate)(date)
        );
        this.displayRevertConfirmation = true;
      } else {
        this.revertUnavailable = true;
      }
    });
  }

  downloadBackup(): void {
    this.savingBackup = true;
    this.$timeout(() =>
      this.saveBackupFile().finally(() => {
        // Update view model
        this.savingBackup = false;
        this.appHelperSvc.focusOnElement('.backup-completed .focused');
      })
    );
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
          : (this.bookmarkSvc as WebExtBookmarkService).getNativeBookmarksAsBookmarks();
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
        this.utilitySvc.getSyncVersion(),
        this.utilitySvc.isSyncEnabled()
      ])
      .then((data) => {
        const bookmarksData = data[0];
        const syncId = data[1];
        const serviceUrl = data[2];
        const syncVersion = data[3];
        const syncEnabled = data[4];
        const backupData = this.backupRestoreSvc.createBackupData(
          bookmarksData,
          syncEnabled ? syncId : undefined,
          syncEnabled ? serviceUrl : undefined,
          syncEnabled ? syncVersion : undefined
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
