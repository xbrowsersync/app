import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { ApiServiceType } from '../../shared/api/api.enum';
import { ApiService, ApiServiceSyncInfo } from '../../shared/api/api.interface';
import { CryptoService } from '../../shared/crypto/crypto.service';
import {
  BaseError,
  ClientDataNotFoundError,
  InvalidCredentialsError,
  SyncVersionNotSupportedError
} from '../../shared/errors/errors';
import { ExceptionHandler } from '../../shared/errors/errors.interface';
import Globals from '../../shared/global-shared.constants';
import { PlatformType } from '../../shared/global-shared.enum';
import { PlatformService } from '../../shared/global-shared.interface';
import { LogService } from '../../shared/log/log.service';
import { StoreKey } from '../../shared/store/store.enum';
import { StoreService } from '../../shared/store/store.service';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import { UtilityService } from '../../shared/utility/utility.service';
import { WorkingService } from '../../shared/working/working.service';
import { RoutePath } from '../app.enum';
import { AppHelperService } from '../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appLogin',
  styles: [require('./app-login.component.scss')],
  template: require('./app-login.component.html')
})
export class AppLoginComponent implements OnInit {
  Strings = require('../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiService;
  appHelperSvc: AppHelperService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  apiServiceType = ApiServiceType;
  otherSyncsWarningVisible = false;
  platformType = PlatformType;
  selectedServiceType: ApiServiceType;
  syncConfirmationVisible = false;
  syncInfo: ApiServiceSyncInfo;
  upgradeConfirmationVisible = false;
  upgradeConfirmed = false;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$timeout',
    'ApiService',
    'AppHelperService',
    'CryptoService',
    'LogService',
    'PlatformService',
    'StoreService',
    'UtilityService',
    'WorkingService'
  ];
  constructor(
    $exceptionHandler: ExceptionHandler,
    $q: ng.IQService,
    $timeout: ng.ITimeoutService,
    ApiSvc: ApiService,
    AppHelperSvc: AppHelperService,
    CryptoSvc: CryptoService,
    LogSvc: LogService,
    PlatformSvc: PlatformService,
    StoreSvc: StoreService,
    UtilitySvc: UtilityService,
    WorkingSvc: WorkingService
  ) {
    this.$exceptionHandler = $exceptionHandler;
    this.$q = $q;
    this.$timeout = $timeout;
    this.apiSvc = ApiSvc;
    this.appHelperSvc = AppHelperSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  dismissOtherSyncsWarning(): void {
    // Hide disable other syncs warning panel and update cache setting
    this.otherSyncsWarningVisible = false;
    this.storeSvc.set(StoreKey.DisplayOtherSyncsWarning, false);

    // Focus on password field
    this.appHelperSvc.focusOnElement('.active-login-form input[name="txtPassword"]');
  }

  executeSync(): void {
    // Check sync info was provided
    if (!this.syncInfo) {
      throw new ClientDataNotFoundError('Sync info not provided');
    }

    const syncData: Sync = {
      type: SyncType.Local
    };
    let syncInfoMessage: string;

    // Display loading panel
    this.otherSyncsWarningVisible = false;
    this.syncConfirmationVisible = false;
    this.upgradeConfirmationVisible = false;
    this.workingSvc.show();

    // Check service status
    this.apiSvc
      .checkServiceStatus()
      // Clear the current cached password
      .then(() => this.storeSvc.remove(StoreKey.Password))
      .then(() => {
        // If a sync ID has not been supplied, get a new one
        if (!this.syncInfo.syncId) {
          // Set sync type for create new sync
          syncData.type = SyncType.Remote;

          // Get new sync ID
          return this.apiSvc.createNewSync().then((newSync) => {
            syncInfoMessage = `New sync id created: ${newSync.id}`;

            // Add sync data to cache and return
            return this.$q
              .all([
                this.storeSvc.set(StoreKey.LastUpdated, newSync.lastUpdated),
                this.storeSvc.set(StoreKey.SyncId, newSync.id),
                this.storeSvc.set(StoreKey.SyncVersion, newSync.version)
              ])
              .then(() => {
                this.syncInfo.syncId = newSync.id;
              });
          });
        }

        // Check if existing id requires sync upgrade
        return this.$q
          .all([this.apiSvc.getBookmarksVersion(this.syncInfo.syncId), this.platformSvc.getAppVersion()])
          .then((results) => {
            const [response, appVersion] = results;
            const { version: bookmarksVersion } = response;

            // If sync version is less than app version, confirm upgrade before proceeding with sync
            if (this.utilitySvc.compareVersions(bookmarksVersion ?? '0', appVersion, '<')) {
              syncData.type = SyncType.Upgrade;
              if (!this.upgradeConfirmed) {
                this.upgradeConfirmationVisible = true;
                return;
              }
            }
            // If sync version is greater than app version, sync version is not supported
            else if (this.utilitySvc.compareVersions(bookmarksVersion ?? '0', appVersion, '>')) {
              throw new SyncVersionNotSupportedError();
            }

            syncInfoMessage = `Synced to existing id: ${this.syncInfo.syncId}`;

            // Add sync version to cache and return current sync ID
            return this.$q
              .all([
                this.storeSvc.set(StoreKey.SyncId, this.syncInfo.syncId),
                this.storeSvc.set(StoreKey.SyncVersion, bookmarksVersion)
              ])
              .then(() => {});
          });
      })
      .then(() => {
        // Don't continue with sync if user needs to confirm sync upgrade
        if (this.upgradeConfirmationVisible) {
          return;
        }

        // Generate a password hash, cache it then queue the sync
        return this.cryptoSvc
          .getPasswordHash(this.syncInfo.syncPassword, this.syncInfo.syncId)
          .then((passwordHash) =>
            this.storeSvc.set(StoreKey.Password, passwordHash).then(() => this.platformSvc.queueSync(syncData))
          )
          .then(() => {
            this.logSvc.logInfo(syncInfoMessage);
            return this.appHelperSvc.syncBookmarksSuccess();
          })
          .catch((err) => this.syncFailed(err, syncData));
      })
      .catch((err) => {
        // Disable upgrade confirmed flag
        this.upgradeConfirmed = false;

        throw err;
      })
      // Hide loading panel
      .finally(() => this.workingSvc.hide());
  }

  ngOnInit(): void {
    this.selectedServiceType = ApiServiceType.xBrowserSync;

    this.storeSvc.get<boolean>(StoreKey.DisplayOtherSyncsWarning).then((displayOtherSyncsWarning) => {
      this.otherSyncsWarningVisible = displayOtherSyncsWarning;
      if (this.otherSyncsWarningVisible) {
        // Focus on first button
        this.appHelperSvc.focusOnElement('.otherSyncsWarning .buttons > button');
      }
    });
  }

  setSyncConfirmationVisible(isVisible = true): void {
    this.syncConfirmationVisible = isVisible;
  }

  setSyncInfo(syncInfo: ApiServiceSyncInfo): void {
    this.syncInfo = syncInfo;
  }

  switchToHelpView(): void {
    this.appHelperSvc.switchView(RoutePath.Help);
  }

  switchToSettingsView(): void {
    this.appHelperSvc.switchView(RoutePath.Settings);
  }

  syncFailed(err: BaseError, sync: Sync): void {
    // Disable upgrade confirmed flag
    this.upgradeConfirmed = false;

    // Clear cached data
    const keys = [StoreKey.Bookmarks, StoreKey.Password, StoreKey.SyncVersion];
    // If error occurred whilst creating new sync, remove cached sync ID and password
    if (sync.type === SyncType.Remote) {
      keys.push(StoreKey.SyncId);
    }
    this.storeSvc.remove(keys).then(() => {
      // If creds were incorrect, focus on password field
      if (err instanceof InvalidCredentialsError && !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
        this.$timeout(() => {
          (document.querySelector('.login-form-existing input[name="txtPassword"]') as HTMLInputElement).select();
        }, Globals.InterfaceReadyTimeout);
      }

      throw err;
    });
  }

  upgradeSync(): void {
    this.upgradeConfirmed = true;
    this.executeSync();
  }
}
