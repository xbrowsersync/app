import angular from 'angular';
import { OnDestroy, OnInit, ViewParent } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { detect } from 'detect-browser';
import { AlertType } from '../../../shared/alert/alert.enum';
import { AlertService } from '../../../shared/alert/alert.service';
import { Backup } from '../../../shared/backup-restore/backup-restore.interface';
import { BackupRestoreService } from '../../../shared/backup-restore/backup-restore.service';
import { BookmarkService } from '../../../shared/bookmark/bookmark.interface';
import { BookmarkHelperService } from '../../../shared/bookmark/bookmark-helper/bookmark-helper.service';
import { SyncVersionNotSupportedError } from '../../../shared/errors/errors';
import { MessageCommand, PlatformType } from '../../../shared/global-shared.enum';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogService } from '../../../shared/log/log.service';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { SyncType } from '../../../shared/sync/sync.enum';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingContext } from '../../../shared/working/working.enum';
import { WorkingService } from '../../../shared/working/working.service';
import { AppEventType } from '../../app.enum';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';
import { AppSettingsComponent } from '../app-settings.component';

export abstract class BackupRestoreSettingsComponent implements OnInit, OnDestroy {
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
  displayAutoBackUpForm = false;
  displayAutoBackUpConfirmation = false;
  displayRestoreConfirmation = false;
  displayRestoreForm = false;
  displayResetConfirmation = false;
  restoreCompletedMessage: string;
  restoreForm: ng.IFormController;
  resetCompleted = false;
  resetConfirmationMessage: string;
  resetUnavailable = false;
  savingBackup = false;
  syncEnabled = false;
  useTextarea = false;
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

  @boundMethod
  backupFileChanged(): void {
    const fileInput = document.getElementById('backupFile') as HTMLInputElement;

    if (fileInput.files.length > 0) {
      const [file] = fileInput.files;
      this.backupFileName = file.name;
      const reader = new FileReader();

      reader.onload = ((data) => {
        return () => {
          this.$timeout(() => {
            this.dataToRestore = reader.result as string;

            // Reset validation interface
            this.resetRestoreFormValidity();
            this.validatingRestoreData = true;

            // Trigger restore data validation
            this.$timeout(() => {
              if (this.validateBackupData()) {
                this.appHelperSvc.focusOnElement('#restoreForm .btn-restore');
              }
              this.validatingRestoreData = false;
            });
          });
        };
      })(file);

      // Read the backup file data
      reader.readAsText(file);
    }
  }

  @boundMethod
  confirmRestore(): void {
    if (!this.dataToRestore) {
      // Display alert
      this.alertSvc.currentAlert = {
        message: this.platformSvc.getI18nString(this.Strings.Error.NoDataToRestore.Message),
        title: this.platformSvc.getI18nString(this.Strings.Error.NoDataToRestore.Title),
        type: AlertType.Error
      };
      return;
    }

    // Hide restore confirmation
    this.displayRestoreConfirmation = false;
    this.displayRestoreForm = true;

    // Display loading overlay and start restore
    this.workingSvc.show(WorkingContext.Restoring);
    this.backupRestoreSvc
      .restoreBackupData(JSON.parse(this.dataToRestore))
      .then(() => this.restoreBookmarksSuccess())
      .catch((err) => {
        if (err instanceof SyncVersionNotSupportedError) {
          // Display specific message if user is trying to restore an unsupported backup version
          this.alertSvc.currentAlert = {
            message: this.platformSvc.getI18nString(this.Strings.Error.SyncVersionNotSupported.Restore.Message),
            title: this.platformSvc.getI18nString(this.Strings.Error.SyncVersionNotSupported.Title),
            type: AlertType.Error
          };
          return;
        }
        throw err;
      })
      .finally(() => this.workingSvc.hide());
  }

  @boundMethod
  confirmReset(): void {
    // Display loading overlay
    this.workingSvc.show(WorkingContext.Resetting);

    // Disable sync and restore native bookmarks to installation state
    this.$q
      .all([this.storeSvc.get<any>(StoreKey.InstallBackup), this.platformSvc.disableSync()])
      .then((response) => {
        const [installBackupData] = response;
        const installBackup = JSON.parse(installBackupData);
        const installBackupDate = new Date(installBackup.date);
        const bookmarksToRestore = installBackup.bookmarks;
        this.logSvc.logInfo(`Resetting to installation state from ${installBackupDate.toISOString()}`);

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
        this.displayResetConfirmation = false;
        this.resetCompleted = true;
        this.appHelperSvc.focusOnElement('.reset-completed .focused');
        this.utilitySvc.broadcastEvent(AppEventType.SyncDisabled);
      });
  }

  @boundMethod
  displayRestorePanel(): void {
    this.backupFileName = null;
    this.restoreCompletedMessage = null;
    this.displayRestoreConfirmation = false;
    this.dataToRestore = '';
    this.displayRestoreForm = true;
    (document.querySelector('#backupFile') as HTMLInputElement).value = null;
    this.restoreForm.dataToRestore.$setValidity('InvalidData', true);
    if (this.platformSvc.platformName === PlatformType.Firefox) {
      // Focus on restore textarea
      this.$timeout(() => {
        (document.querySelector('#restoreForm textarea') as HTMLTextAreaElement).select();
      });
    } else {
      this.appHelperSvc.focusOnElement('#restoreForm .focused');
    }
  }

  @boundMethod
  displayResetPanel(): void {
    // Retrieve install backup from store
    this.storeSvc.get<any>(StoreKey.InstallBackup).then((installBackup) => {
      if (angular.isUndefined(installBackup)) {
        this.resetUnavailable = true;
        this.appHelperSvc.focusOnElement('.reset-completed .focused');
        return;
      }

      const installBackupObj = JSON.parse(installBackup);
      if (installBackupObj?.date && installBackupObj?.bookmarks) {
        const date = new Date(installBackupObj.date);
        const confirmationMessage = this.platformSvc.getI18nString(
          this.Strings.View.Settings.BackupRestore.Reset.Confirm
        );
        this.resetConfirmationMessage = confirmationMessage.replace(
          '{date}',
          (this.$filter('date') as ng.IFilterDate)(date)
        );
        this.displayResetConfirmation = true;
      } else {
        this.resetUnavailable = true;
      }
    });
  }

  @boundMethod
  downloadBackup(): void {
    this.savingBackup = true;
    this.backupRestoreSvc
      .saveBackupFile()
      .then((filename) => {
        if (!filename) {
          return;
        }
        // Only mobile platforms display a file downloaded message
        this.backupCompletedMessage = this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)
          ? `${this.platformSvc.getI18nString(this.Strings.View.Settings.FileDownloaded)}: ${filename}`
          : undefined;
      })
      .finally(() => {
        this.savingBackup = false;
        this.appHelperSvc.focusOnElement('.file-downloaded .focused');
      });
  }

  @boundMethod
  hideResetPanel(): void {
    this.displayResetConfirmation = false;
    this.resetCompleted = false;
    this.resetConfirmationMessage = null;
    this.resetUnavailable = false;
  }

  @boundMethod
  hideRestorePanel(): void {
    this.displayRestoreForm = false;
    this.restoreForm.$setPristine();
    this.restoreForm.$setUntouched();
  }

  ngOnDestroy(): void {
    document.getElementById('backupFile').removeEventListener('change', this.backupFileChanged, false);
  }

  ngOnInit(): void {
    // Firefox on all platforms and Chromium on linux cannot use backup file select input
    // because extension pop up closes when a file is selected
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1292701
    this.useTextarea =
      this.platformSvc.platformName === PlatformType.Firefox ||
      (this.platformSvc.platformName === PlatformType.Chromium && detect().os.toLowerCase() === 'linux');

    // Set backup file change event if not using textarea fallback
    if (!this.useTextarea) {
      document.getElementById('backupFile').addEventListener('change', this.backupFileChanged, false);
    }

    // Initialise view model values
    this.utilitySvc.isSyncEnabled().then((syncEnabled) => {
      this.syncEnabled = syncEnabled;
    });
  }

  @boundMethod
  resetRestoreFormValidity(): void {
    this.restoreForm.dataToRestore.$setValidity('InvalidData', true);
  }

  @boundMethod
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

  @boundMethod
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

  @boundMethod
  selectBackupFile(): void {
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
