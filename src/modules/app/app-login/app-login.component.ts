import { Component, OnInit } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import compareVersions from 'compare-versions';
import * as countriesList from 'countries-list';
import { ZXCVBNResult } from 'zxcvbn';
import { ApiServiceStatus } from '../../shared/api/api.enum';
import { ApiService, ApiServiceInfo } from '../../shared/api/api.interface';
import CryptoService from '../../shared/crypto/crypto.service';
import * as Exceptions from '../../shared/exception/exception';
import { ExceptionHandler } from '../../shared/exception/exception.interface';
import Globals from '../../shared/global-shared.constants';
import { PlatformType } from '../../shared/global-shared.enum';
import { PlatformService } from '../../shared/global-shared.interface';
import LogService from '../../shared/log/log.service';
import { StoreKey } from '../../shared/store/store.enum';
import StoreService from '../../shared/store/store.service';
import { SyncType } from '../../shared/sync/sync.enum';
import { Sync } from '../../shared/sync/sync.interface';
import UtilityService from '../../shared/utility/utility.service';
import WorkingService from '../../shared/working/working.service';
import { AppViewType } from '../app.enum';
import AppHelperService from '../shared/app-helper/app-helper.service';

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'appLogin',
  styles: [require('./app-login.component.scss')],
  template: require('./app-login.component.html')
})
export default class AppLoginComponent implements OnInit {
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

  ApiServiceStatus = ApiServiceStatus;
  displayGetSyncIdPanel: boolean;
  displayOtherSyncsWarning = false;
  displayPasswordConfirmation = false;
  displaySyncConfirmation = false;
  displayUpdateServiceConfirmation = false;
  displayUpdateServicePanel = false;
  displayUpgradeConfirmation = false;
  newServiceInfo: ApiServiceInfo;
  newSync = false;
  password: string;
  passwordComplexity: ZXCVBNResult;
  passwordConfirmation = null;
  platformType = PlatformType;
  serviceInfo: ApiServiceInfo;
  showPassword = false;
  syncEnabled = false;
  syncForm: ng.IFormController;
  syncId: string;
  upgradeConfirmed = false;
  validatingServiceUrl = false;

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

  cancelConfirmPassword(): void {
    this.displayPasswordConfirmation = false;
    this.passwordConfirmation = null;
  }

  cancelUpdateService(): void {
    this.displayUpdateServiceConfirmation = false;
    this.displayUpdateServicePanel = false;
  }

  confirmPassword(): void {
    this.displayPasswordConfirmation = true;
    this.appHelperSvc.focusOnElement('input[name="txtPasswordConfirmation"]');
  }

  confirmUpdateService(): void {
    // Update stored service info
    const url = this.newServiceInfo.url.replace(/\/$/, '');
    this.appHelperSvc
      .updateServiceUrl(url)
      .then((serviceInfo) => {
        // Update view model and remove stored creds
        this.serviceInfo = serviceInfo;
        this.serviceInfo.url = url;
        return this.$q.all([this.storeSvc.remove(StoreKey.SyncId), this.storeSvc.remove(StoreKey.Password)]);
      })
      .then(() => {
        // Update view model
        this.displayUpdateServiceConfirmation = false;
        this.displayUpdateServicePanel = false;
        this.password = undefined;
        this.passwordComplexity = undefined;
        this.passwordConfirmation = undefined;
        this.syncId = undefined;
        this.syncForm.txtId.$setValidity('InvalidSyncId', true);
        this.syncForm.$setPristine();
        this.syncForm.$setUntouched();

        // Focus on first field
        this.appHelperSvc.focusOnElement('.active-login-form input');
      })
      .catch((err) => this.logSvc.logError(err));
  }

  disableSync(): ng.IPromise<void> {
    return this.platformSvc.disableSync().then(() => {
      this.syncEnabled = false;
      this.password = undefined;
      this.passwordComplexity = undefined;
    });
  }

  dismissOtherSyncsWarning(): void {
    // Hide disable other syncs warning panel and update cache setting
    this.displayOtherSyncsWarning = false;
    this.storeSvc.set(StoreKey.DisplayOtherSyncsWarning, false);

    // Focus on password field
    this.appHelperSvc.focusOnElement('.active-login-form input[name="txtPassword"]');
  }

  displayExistingSyncPanel(): void {
    this.newSync = false;
    this.password = undefined;
    this.appHelperSvc.focusOnElement('input[name="txtId"]');
  }

  displayNewSyncPanel(): void {
    this.newSync = true;
    this.displayPasswordConfirmation = false;
    this.password = undefined;
    this.passwordComplexity = undefined;
    this.passwordConfirmation = undefined;
    this.storeSvc.remove(StoreKey.SyncId);
    this.storeSvc.remove(StoreKey.Password);
    this.syncId = undefined;
    this.syncForm.txtId.$setValidity('InvalidSyncId', true);
    this.appHelperSvc.focusOnElement('.login-form-new input[name="txtPassword"]');
  }

  enableManualEntry(): void {
    this.displayGetSyncIdPanel = false;
  }

  executeSync(): void {
    const syncData: Sync = {
      type: SyncType.Local
    };
    let syncInfoMessage: string;

    // Display loading panel
    this.displaySyncConfirmation = false;
    this.displayOtherSyncsWarning = false;
    this.displayUpgradeConfirmation = false;
    this.workingSvc.show();

    // Check service status
    this.apiSvc
      .checkServiceStatus()
      // Clear the current cached password
      .then(() => this.storeSvc.remove(StoreKey.Password))
      .then(() => {
        // If a sync ID has not been supplied, get a new one
        if (!this.syncId) {
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
              .then(() => newSync.id);
          });
        }

        // Retrieve sync version for existing id
        return this.$q
          .all([this.apiSvc.getBookmarksVersion(this.syncId), this.platformSvc.getAppVersion()])
          .then((results) => {
            const response = results[0];
            const appVersion = results[1];

            if (compareVersions.compare(response.version ?? '0', appVersion, '<')) {
              // Sync version is less than app version, confirm upgrade before proceeding with sync
              if (this.upgradeConfirmed) {
                syncData.type = SyncType.Upgrade;
              } else {
                this.displayUpgradeConfirmation = true;
                return;
              }
            } else if (compareVersions.compare(response.version ?? '0', appVersion, '>')) {
              // Sync version is greater than app version, throw error
              throw new Exceptions.SyncVersionNotSupportedException();
            }

            syncInfoMessage = `Synced to existing id: ${this.syncId}`;

            // Add sync version to cache and return current sync ID
            return this.$q
              .all([
                this.storeSvc.set(StoreKey.SyncId, this.syncId),
                this.storeSvc.set(StoreKey.SyncVersion, response.version)
              ])
              .then(() => this.syncId);
          });
      })
      .then((syncId) => {
        if (!syncId) {
          return;
        }

        // Generate a password hash, cache it then queue the sync
        return this.cryptoSvc
          .getPasswordHash(this.password, syncId)
          .then((passwordHash) =>
            this.storeSvc.set(StoreKey.Password, passwordHash).then(() => this.platformSvc.queueSync(syncData))
          )
          .then(() => {
            this.logSvc.logInfo(syncInfoMessage);
            return this.appHelperSvc.syncBookmarksSuccess();
          })
          .then(() => {
            this.syncEnabled = true;
            this.syncId = syncId;
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

  getCountryNameFrom2LetterISOCode(isoCode: string): string {
    if (!isoCode) {
      return;
    }

    const country = countriesList.countries[isoCode];
    if (!country) {
      this.logSvc.logWarning(`No country found matching ISO code: ${isoCode}`);
    }
    return country.name;
  }

  getServiceStatusTextFromStatusCode(statusCode: ApiServiceStatus): string {
    switch (statusCode) {
      case ApiServiceStatus.NoNewSyncs:
        return this.platformSvc.getI18nString(this.Strings.Service.Status.NoNewSyncs);
      case ApiServiceStatus.Offline:
        return this.platformSvc.getI18nString(this.Strings.Service.Status.Offline);
      case ApiServiceStatus.Online:
        return this.platformSvc.getI18nString(this.Strings.Service.Status.Online);
      case ApiServiceStatus.Error:
      default:
        return this.platformSvc.getI18nString(this.Strings.Service.Status.Error);
    }
  }

  ngOnInit(): void {
    this.$q
      .all([
        this.storeSvc.get([StoreKey.DisplayOtherSyncsWarning, StoreKey.SyncId]),
        this.utilitySvc.isSyncEnabled(),
        this.utilitySvc.getServiceUrl()
      ])
      .then((data) => {
        this.displayOtherSyncsWarning = data[0].displayOtherSyncsWarning;
        this.syncId = data[0].syncId;
        this.syncEnabled = data[1];
        const serviceUrl = data[2];

        this.serviceInfo = {
          url: serviceUrl
        };

        // Validate sync id if present
        if (this.syncId) {
          this.$timeout(() => this.validateSyncId(), Globals.InterfaceReadyTimeout);
        }

        if (this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
          // Set displayed panels for mobile platform
          this.displayGetSyncIdPanel = !this.syncId;
          this.newSync = false;
        } else {
          // Set displayed panels for browsers
          this.newSync = !this.syncId;

          // If not synced before, display warning to disable other sync tools
          if (this.displayOtherSyncsWarning) {
            // Focus on first button
            this.appHelperSvc.focusOnElement('.otherSyncsWarning .buttons > button');
          } else if (!this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
            // Focus on password field
            this.appHelperSvc.focusOnElement('.active-login-form  input[name="txtPassword"]');
          }
        }

        // Refresh service info
        this.refreshServiceStatus()
          // Set links to open in new tabs
          .then(() => this.appHelperSvc.attachClickEventsToNewTabLinks());
      });
  }

  refreshServiceStatus(): ng.IPromise<void> {
    return this.appHelperSvc.formatServiceInfo().then((formattedServiceInfo) => {
      Object.assign(this.serviceInfo, formattedServiceInfo);
    });
  }

  scanId() {
    this.appHelperSvc.switchView({ view: AppViewType.Scan });
  }

  serviceIsOnline(): boolean {
    return (
      this.serviceInfo.status === ApiServiceStatus.NoNewSyncs || this.serviceInfo.status === ApiServiceStatus.Online
    );
  }

  serviceUrlChanged(): void {
    // Reset form if field is invalid
    if (this.syncForm.newServiceUrl.$invalid) {
      this.syncForm.newServiceUrl.$setValidity('InvalidService', true);
      this.syncForm.newServiceUrl.$setValidity('RequestFailed', true);
      this.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);
    }
  }

  submitForm(): void {
    this.$timeout(() => {
      // Handle enter key press
      if (this.displayUpdateServicePanel) {
        (document.querySelector('.update-service-panel .btn-update-service-url') as HTMLButtonElement).click();
      } else if (this.newSync) {
        if (this.displayPasswordConfirmation) {
          (document.querySelector('.login-form-new .btn-new-sync') as HTMLButtonElement).click();
        } else {
          (document.querySelector('.login-form-new .btn-confirm-password') as HTMLButtonElement).click();
        }
      } else {
        (document.querySelector('.login-form-existing .btn-existing-sync') as HTMLButtonElement).click();
      }
    });
  }

  switchService(): void {
    // Reset view
    this.newServiceInfo = {
      url: this.serviceInfo.url
    };
    this.displayUpdateServiceConfirmation = false;
    this.displayUpdateServicePanel = true;
    this.validatingServiceUrl = false;

    // Validate service url and then focus on url field
    this.validateServiceUrl().finally(() => {
      (document.querySelector('.update-service-panel input') as HTMLInputElement).focus();
    });
  }

  switchToHelpView(): void {
    this.appHelperSvc.switchView({ view: AppViewType.Help });
  }

  switchToSettingsView(): void {
    this.appHelperSvc.switchView({ view: AppViewType.Settings });
  }

  sync(): void {
    if (this.syncId && this.appHelperSvc.confirmBeforeSyncing()) {
      // Display overwrite data confirmation panel
      this.displaySyncConfirmation = true;
      this.appHelperSvc.focusOnElement('.btn-confirm-enable-sync');
    } else {
      // If no ID provided start syncing
      this.executeSync();
    }
  }

  syncFailed(err: Exceptions.Exception, sync: Sync): void {
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
      if (
        err instanceof Exceptions.InvalidCredentialsException &&
        !this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)
      ) {
        this.$timeout(() => {
          (document.querySelector('.login-form-existing input[name="txtPassword"]') as HTMLInputElement).select();
        }, Globals.InterfaceReadyTimeout);
      }

      throw err;
    });
  }

  syncIdChanged(): void {
    if (this.validateSyncId()) {
      this.storeSvc.set(StoreKey.SyncId, this.syncId);
    }
  }

  toggleShowPassword(): void {
    // Toggle show password
    this.showPassword = !this.showPassword;
  }

  updateServiceUrl(): void {
    // Check for protocol
    if (this.newServiceInfo.url?.trim() && !new RegExp(Globals.URL.ProtocolRegex).test(this.newServiceInfo.url ?? '')) {
      this.newServiceInfo.url = `https://${this.newServiceInfo.url}`;
    }

    // Validate service url
    this.validateServiceUrl().then((newServiceInfo) => {
      if (!newServiceInfo) {
        return;
      }

      // Retrieve new service status and update view model
      return this.appHelperSvc.formatServiceInfo(newServiceInfo).then((serviceInfo) => {
        Object.assign(this.newServiceInfo, serviceInfo);
        this.displayUpdateServiceConfirmation = true;
        this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message'));
        this.appHelperSvc.focusOnElement('.focused');
      });
    });
  }

  upgradeSync(): void {
    this.upgradeConfirmed = true;
    this.executeSync();
  }

  validateServiceUrl() {
    this.validatingServiceUrl = true;

    // Check service url status
    const url = this.newServiceInfo.url.replace(/\/$/, '');
    return this.apiSvc
      .checkServiceStatus(url)
      .catch((err) => {
        switch (err.constructor) {
          case Exceptions.UnsupportedApiVersionException:
            this.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', false);
            break;
          case Exceptions.InvalidServiceException:
            this.syncForm.newServiceUrl.$setValidity('InvalidService', false);
            break;
          default:
            this.syncForm.newServiceUrl.$setValidity('RequestFailed', false);
        }

        // Focus on url field
        (document.querySelector('input[name=newServiceUrl]') as HTMLInputElement).focus();
      })
      .finally(() => {
        this.validatingServiceUrl = false;
      });
  }

  validateSyncId(): boolean {
    const isValid = !this.syncId || this.utilitySvc.syncIdIsValid(this.syncId);
    this.syncForm.txtId.$setValidity('InvalidSyncId', isValid);
    return isValid;
  }
}
