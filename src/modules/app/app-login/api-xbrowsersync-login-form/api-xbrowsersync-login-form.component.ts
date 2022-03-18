import { Component, OnInit, Output } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import * as countriesList from 'countries-list';
import { ApiServiceStatus, ApiServiceType } from '../../../shared/api/api.enum';
import {
  ApiXbrowsersyncServiceInfo,
  ApiXbrowsersyncSyncInfo
} from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { ApiXbrowsersyncService } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.service';
import { CryptoService } from '../../../shared/crypto/crypto.service';
import { InvalidServiceError, ServiceOfflineError, UnsupportedApiVersionError } from '../../../shared/errors/errors';
import { ExceptionHandler } from '../../../shared/errors/errors.interface';
import Globals from '../../../shared/global-shared.constants';
import { PlatformService } from '../../../shared/global-shared.interface';
import { LogService } from '../../../shared/log/log.service';
import { StoreKey } from '../../../shared/store/store.enum';
import { StoreService } from '../../../shared/store/store.service';
import { UtilityService } from '../../../shared/utility/utility.service';
import { WorkingService } from '../../../shared/working/working.service';
import { RoutePath } from '../../app.enum';
import { AppHelperService } from '../../shared/app-helper/app-helper.service';

@Component({
  controllerAs: 'vm',
  selector: 'apiXbrowsersyncLoginForm',
  styles: [require('./api-xbrowsersync-login-form.component.scss')],
  template: require('./api-xbrowsersync-login-form.component.html')
})
export class XbrowsersyncLoginComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

  $exceptionHandler: ExceptionHandler;
  $q: ng.IQService;
  $timeout: ng.ITimeoutService;
  apiSvc: ApiXbrowsersyncService;
  appHelperSvc: AppHelperService;
  cryptoSvc: CryptoService;
  logSvc: LogService;
  platformSvc: PlatformService;
  storeSvc: StoreService;
  utilitySvc: UtilityService;
  workingSvc: WorkingService;

  @Output() executeSync: () => (syncPassword: string) => void;

  apiServiceStatus = ApiServiceStatus;
  enablePasswordValidation = false;
  getSyncIdPanelVisible: boolean;
  newServiceInfo: ApiXbrowsersyncServiceInfo;
  newSync = false;
  serviceInfo: ApiXbrowsersyncServiceInfo;
  showPassword = false;
  syncEnabled = false;
  syncForm: ng.IFormController;
  syncId: string;
  syncPassword: string;
  syncPasswordComplexity: any;
  syncPasswordConfirmation = null;
  syncPasswordConfirmationVisible = false;
  updateServiceConfirmationVisible = false;
  updateServicePanelVisible = false;
  validatingServiceUrl = false;

  static $inject = [
    '$exceptionHandler',
    '$q',
    '$timeout',
    'ApiXbrowsersyncService',
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
    ApiSvc: ApiXbrowsersyncService,
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

  @boundMethod
  cancelConfirmPassword(): void {
    this.syncPasswordConfirmationVisible = false;
    this.syncPasswordConfirmation = null;
  }

  @boundMethod
  cancelUpdateService(): void {
    this.updateServiceConfirmationVisible = false;
    this.updateServicePanelVisible = false;
  }

  @boundMethod
  confirmPassword(): void {
    this.syncPasswordConfirmationVisible = true;
    this.appHelperSvc.focusOnElement('input[name="txtPasswordConfirmation"]');
  }

  @boundMethod
  confirmUpdateService(): void {
    // Update view model and remove stored creds
    const url = this.newServiceInfo.url.replace(/\/$/, '');
    this.serviceInfo = {
      ...this.newServiceInfo,
      url
    };
    this.storeSvc
      .remove(StoreKey.SyncInfo)
      .then(() => {
        // Update view model
        this.updateServiceConfirmationVisible = false;
        this.updateServicePanelVisible = false;
        this.syncPassword = undefined;
        this.syncPasswordComplexity = undefined;
        this.syncPasswordConfirmation = undefined;
        this.syncId = undefined;
        this.syncForm.txtId.$setValidity('InvalidSyncId', true);
        this.syncForm.$setPristine();
        this.syncForm.$setUntouched();

        // Focus on first field
        this.appHelperSvc.focusOnElement('.active-login-form input');
      })
      .catch((err) => this.logSvc.logError(err));
  }

  /**
   * Checks if the current locale supports zxcvbn password validation messages.
   * @returns `true` if the current locale supports password validation, otherwise 'false'.
   */
  currentLocaleSupportsPasswordValidation(): ng.IPromise<boolean> {
    return this.platformSvc.getCurrentLocale().then((currentLocale) => {
      // Only english and german are currently supported
      return currentLocale.indexOf('en') === 0 || currentLocale.indexOf('de') === 0;
    });
  }

  disableSync(): ng.IPromise<void> {
    return this.platformSvc.disableSync().then(() => {
      this.syncEnabled = false;
      this.syncPassword = undefined;
      this.syncPasswordComplexity = undefined;
    });
  }

  @boundMethod
  displayExistingSyncPanel(event?: Event): void {
    event?.preventDefault();
    this.newSync = false;
    this.syncPassword = undefined;
    this.appHelperSvc.focusOnElement('input[name="txtId"]');
  }

  @boundMethod
  displayNewSyncPanel(event?: Event): void {
    event?.preventDefault();
    this.newSync = true;
    this.syncPasswordConfirmationVisible = false;
    this.syncPassword = undefined;
    this.syncPasswordComplexity = undefined;
    this.syncPasswordConfirmation = undefined;
    this.syncId = undefined;
    this.syncForm.txtId.$setValidity('InvalidSyncId', true);
    this.appHelperSvc.focusOnElement('.login-form-new input[name="txtPassword"]');
  }

  @boundMethod
  enableManualEntry(event?: Event): void {
    event?.preventDefault();
    this.getSyncIdPanelVisible = false;
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
        this.storeSvc.get<ApiXbrowsersyncSyncInfo>(StoreKey.SyncInfo),
        this.utilitySvc.isSyncEnabled(),
        this.currentLocaleSupportsPasswordValidation()
      ])
      .then((data) => {
        const [syncInfo, syncEnabled, currentLocaleIsEnglish] = data;
        this.syncId = syncInfo?.id;
        this.syncEnabled = syncEnabled;
        this.enablePasswordValidation = currentLocaleIsEnglish;

        // Use default service url if not set
        this.serviceInfo = {
          url: syncInfo?.serviceUrl ?? Globals.URL.DefaultServiceUrl
        };

        // Validate sync id if present
        if (this.syncId) {
          this.$timeout(() => this.validateSyncId(), Globals.InterfaceReadyTimeout);
        }

        if (this.utilitySvc.isMobilePlatform(this.platformSvc.platformName)) {
          // Set displayed panels for mobile platform
          this.getSyncIdPanelVisible = !this.syncId;
          this.newSync = false;
        } else {
          // Set displayed panels for browsers
          this.newSync = !this.syncId;

          // Focus on password field
          this.appHelperSvc.focusOnElement('.active-login-form  input[name="txtPassword"]');
        }

        // Refresh service info
        this.refreshServiceStatus()
          // Set links to open in new tabs
          .then(() => this.appHelperSvc.attachClickEventsToNewTabLinks());
      });
  }

  refreshServiceStatus(): ng.IPromise<void> {
    return this.apiSvc
      .checkServiceStatus(this.serviceInfo.url)
      .then((serviceInfoResponse) => {
        this.serviceInfo = {
          ...this.serviceInfo,
          ...this.apiSvc.formatServiceInfo(serviceInfoResponse)
        };
      })
      .catch((err) => {
        const status = err instanceof ServiceOfflineError ? ApiServiceStatus.Offline : ApiServiceStatus.Error;
        this.serviceInfo = {
          ...this.serviceInfo,
          status
        };
      });
  }

  @boundMethod
  scanId(event?: Event) {
    event?.preventDefault();
    this.appHelperSvc.switchView(RoutePath.Scan);
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
      this.syncForm.newServiceUrl.$setValidity('InvalidUrl', true);
      this.syncForm.newServiceUrl.$setValidity('RequestFailed', true);
      this.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', true);
    }

    if ((this.newServiceInfo.url ?? undefined) === undefined) {
      return;
    }

    // Check url is valid
    if (!new RegExp(`^${Globals.URL.ValidUrlRegex}$`, 'i').test(this.newServiceInfo.url)) {
      this.syncForm.newServiceUrl.$setValidity('InvalidUrl', false);
    }
  }

  @boundMethod
  submitForm(): void {
    this.$timeout(() => {
      // Handle enter key press
      if (this.updateServicePanelVisible) {
        (document.querySelector('.update-service-panel .btn-update-service-url') as HTMLButtonElement).click();
      } else if (this.newSync) {
        if (this.syncPasswordConfirmationVisible) {
          (document.querySelector('.login-form-new .btn-new-sync') as HTMLButtonElement).click();
        } else {
          (document.querySelector('.login-form-new .btn-confirm-password') as HTMLButtonElement).click();
        }
      } else {
        (document.querySelector('.login-form-existing .btn-existing-sync') as HTMLButtonElement).click();
      }
    });
  }

  @boundMethod
  switchService(): void {
    // Reset view
    this.newServiceInfo = {
      url: this.serviceInfo.url
    };
    this.updateServiceConfirmationVisible = false;
    this.updateServicePanelVisible = true;
    this.validatingServiceUrl = false;

    // Validate service url and then focus on url field
    this.validateServiceUrl().finally(() => this.appHelperSvc.focusOnElement('.update-service-panel input'));
  }

  @boundMethod
  sync(): ng.IPromise<void> {
    // Add sync info to store and execute sync
    const syncInfo: ApiXbrowsersyncSyncInfo = {
      serviceType: ApiServiceType.xBrowserSync,
      serviceUrl: this.serviceInfo.url,
      id: this.syncId
    };
    return this.storeSvc.set(StoreKey.SyncInfo, syncInfo).then(() => this.executeSync()(this.syncPassword));
  }

  @boundMethod
  toggleShowPassword(): void {
    // Toggle show password
    this.showPassword = !this.showPassword;
  }

  @boundMethod
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
      this.newServiceInfo = {
        ...this.newServiceInfo,
        ...this.apiSvc.formatServiceInfo(newServiceInfo)
      };
      this.updateServiceConfirmationVisible = true;
      this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message'));
      this.appHelperSvc.focusOnElement('.focused');
    });
  }

  validateServiceUrl() {
    this.validatingServiceUrl = true;

    // Check service url status
    const url = this.newServiceInfo.url.replace(/\/$/, '');
    return this.apiSvc
      .checkServiceStatus(url)
      .catch((err) => {
        switch (err.constructor) {
          case UnsupportedApiVersionError:
            this.syncForm.newServiceUrl.$setValidity('ServiceVersionNotSupported', false);
            break;
          case InvalidServiceError:
            this.syncForm.newServiceUrl.$setValidity('InvalidService', false);
            break;
          default:
            this.syncForm.newServiceUrl.$setValidity('RequestFailed', false);
        }

        // Focus on url field
        this.appHelperSvc.focusOnElement('input[name=newServiceUrl]', true);
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
