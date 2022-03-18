import { Component, OnInit } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { ApiServiceType } from '../../shared/api/api.enum';
import { ApiSyncInfo } from '../../shared/api/api.interface';
import { CryptoService } from '../../shared/crypto/crypto.service';
import {
  BaseError,
  IncompleteSyncInfoError,
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
  appHelperSvc: AppHelperService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  apiServiceType = ApiServiceType;
  confirmSync: () => ng.IPromise<void>;
  otherSyncsWarningVisible = false;
  platformType = PlatformType;
  selectedServiceType: ApiServiceType;
  syncConfirmationVisible = false;
  upgradeConfirmationVisible = false;
  upgradeSync: () => ng.IPromise<void>;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$timeout',
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
    this.appHelperSvc = AppHelperSvc;
    this.cryptoSvc = CryptoSvc;
    this.logSvc = LogSvc;
    this.platformSvc = PlatformSvc;
    this.storeSvc = StoreSvc;
    this.utilitySvc = UtilitySvc;
    this.workingSvc = WorkingSvc;
  }

  @boundMethod
  dismissOtherSyncsWarning(): void {
    // Hide disable other syncs warning panel and update cache setting
    this.otherSyncsWarningVisible = false;
    this.storeSvc.set(StoreKey.DisplayOtherSyncsWarning, false);

    // Focus on password field
    this.appHelperSvc.focusOnElement('.active-login-form input[name="txtPassword"]');
  }

  @boundMethod
  executeSync(syncPassword: string, syncConfirmed = false, upgradeConfirmed = false): ng.IPromise<void> {
    this.setSyncConfirmationVisible(false);
    this.confirmSync = undefined;
    this.upgradeSync = undefined;

    return this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo).then((syncInfo) => {
      // Check sync info was provided
      if (!syncInfo) {
        throw new IncompleteSyncInfoError();
      }

      // Display overwrite data confirmation panel if sync id provided
      if (syncInfo.id && this.appHelperSvc.confirmBeforeSyncing() && !syncConfirmed) {
        this.setSyncConfirmationVisible(true);
        this.confirmSync = () => this.executeSync(syncPassword, true);
        return;
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

      // Load API service dynamically for selected service type
      return this.utilitySvc.getApiService().then((apiSvc) =>
        this.$q
          .resolve()
          .then(() => {
            // If a sync ID has not been supplied, get a new one
            if (!syncInfo.id) {
              // Set sync type for create new sync
              syncData.type = SyncType.Remote;

              // Get new sync ID
              return apiSvc.createNewSync().then((newSync) => {
                syncInfo.id = newSync.id;
                syncInfo.version = newSync.version;
                syncInfoMessage = `New sync id created: ${newSync.id}`;
              });
            }

            // Check if existing id requires sync upgrade
            return this.$q
              .all([apiSvc.getSyncVersion(syncInfo.id), this.platformSvc.getAppVersion()])
              .then((results) => {
                const [response, appVersion] = results;
                const { version: syncVersion } = response;

                // If sync version is less than app version, confirm upgrade before proceeding with sync
                if (this.utilitySvc.compareVersions(syncVersion ?? '0', appVersion, '<')) {
                  syncData.type = SyncType.Upgrade;
                  if (!upgradeConfirmed) {
                    this.upgradeConfirmationVisible = true;
                    this.upgradeSync = () => this.executeSync(syncPassword, true, true);
                    return;
                  }
                }
                // If sync version is greater than app version, sync version is not supported
                else if (this.utilitySvc.compareVersions(syncVersion ?? '0', appVersion, '>')) {
                  throw new SyncVersionNotSupportedError();
                }

                syncInfo.version = syncVersion;
                syncInfoMessage = `Synced to existing id: ${syncInfo.id}`;
              });
          })
          .then(() => this.storeSvc.set(StoreKey.SyncInfo, syncInfo))
          .then(() => {
            // Don't continue with sync if user needs to confirm sync upgrade
            if (this.upgradeConfirmationVisible) {
              return;
            }

            // Generate a password hash, cache it then queue the sync
            return this.cryptoSvc
              .getPasswordHash(syncPassword, syncInfo.id)
              .then((passwordHash) => {
                syncInfo.password = passwordHash;
                return this.storeSvc.set(StoreKey.SyncInfo, syncInfo).then(() => this.platformSvc.queueSync(syncData));
              })
              .then(() => {
                this.logSvc.logInfo(syncInfoMessage);
                return this.appHelperSvc.syncBookmarksSuccess();
              })
              .catch((err) => this.syncFailed(err, syncData));
          })
          .finally(() => this.workingSvc.hide())
      );
    });
  }

  ngOnInit(): void {
    this.$q
      .all([this.utilitySvc.getCurrentApiServiceType(), this.storeSvc.get<boolean>(StoreKey.DisplayOtherSyncsWarning)])
      .then((data) => {
        const [selectedServiceType, displayOtherSyncsWarning] = data;
        this.selectedServiceType = selectedServiceType;
        this.otherSyncsWarningVisible = displayOtherSyncsWarning;
        if (this.otherSyncsWarningVisible) {
          // Focus on first button
          this.appHelperSvc.focusOnElement('.otherSyncsWarning .buttons > button');
        }
      });
  }

  @boundMethod
  setSyncConfirmationVisible(isVisible = true): void {
    this.syncConfirmationVisible = isVisible;
    if (isVisible) {
      this.appHelperSvc.focusOnElement('.btn-confirm-enable-sync');
    }
  }

  @boundMethod
  switchToHelpView(): void {
    this.appHelperSvc.switchView(RoutePath.Help);
  }

  @boundMethod
  switchToSettingsView(): void {
    this.appHelperSvc.switchView(RoutePath.Settings);
  }

  syncFailed(err: BaseError, sync: Sync): ng.IPromise<void> {
    return this.$q
      .resolve()
      .then(() => {
        // If error occurred whilst creating new sync, remove cached sync ID and password
        if (sync.type === SyncType.Remote) {
          return this.storeSvc.get<ApiSyncInfo>(StoreKey.SyncInfo).then((syncInfo) => {
            const { id: syncId, password: syncPassword, ...trimmedSyncInfo } = syncInfo;
            return this.storeSvc.set(StoreKey.SyncInfo, trimmedSyncInfo);
          });
        }
      })
      .then(() => {
        // If creds were incorrect, focus on password field
        if (
          err instanceof InvalidCredentialsError &&
          !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)
        ) {
          this.$timeout(() => {
            (document.querySelector('.login-form-existing input[name="txtPassword"]') as HTMLInputElement).select();
          }, Globals.InterfaceReadyTimeout);
        }

        throw err;
      });
  }
}
