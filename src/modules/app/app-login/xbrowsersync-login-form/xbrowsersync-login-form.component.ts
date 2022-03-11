import { Component, OnInit, Output } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import * as countriesList from 'countries-list';
import { ApiServiceStatus, ApiServiceType } from '../../../shared/api/api.enum';
import { ApiService, ApiServiceInfo, ApiServiceSyncInfo } from '../../../shared/api/api.interface';
import { ApiXbrowsersyncServiceSyncInfo } from '../../../shared/api/api-xbrowsersync/api-xbrowsersync.interface';
import { CryptoService } from '../../../shared/crypto/crypto.service';
import { InvalidServiceError, UnsupportedApiVersionError } from '../../../shared/errors/errors';
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

@autobind
@Component({
  controllerAs: 'vm',
  selector: 'xbsLoginForm',
  styles: [require('./xbrowsersync-login-form.component.scss')],
  template: require('./xbrowsersync-login-form.component.html')
})
export class XbrowsersyncLoginComponent implements OnInit {
  Strings = require('../../../../../res/strings/en.json');

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

  @Output() displaySyncConfirmation: () => void;
  @Output() executeSync: () => void;
  @Output() setSyncInfo: () => (syncInfo: ApiServiceSyncInfo) => void;

  apiServiceStatus = ApiServiceStatus;
  enablePasswordValidation = false;
  getSyncIdPanelVisible: boolean;
  newServiceInfo: ApiServiceInfo;
  newSync = false;
  password: string;
  passwordComplexity: any;
  passwordConfirmation = null;
  passwordConfirmationVisible = false;
  serviceInfo: ApiServiceInfo;
  showPassword = false;
  syncEnabled = false;
  syncForm: ng.IFormController;
  syncId: string;
  updateServiceConfirmationVisible = false;
  updateServicePanelVisible = false;
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
    this.passwordConfirmationVisible = false;
    this.passwordConfirmation = null;
  }

  cancelUpdateService(): void {
    this.updateServiceConfirmationVisible = false;
    this.updateServicePanelVisible = false;
  }

  confirmPassword(): void {
    this.passwordConfirmationVisible = true;
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
        this.updateServiceConfirmationVisible = false;
        this.updateServicePanelVisible = false;
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
      this.password = undefined;
      this.passwordComplexity = undefined;
    });
  }

  displayExistingSyncPanel(event?: Event): void {
    event?.preventDefault();
    this.newSync = false;
    this.password = undefined;
    this.appHelperSvc.focusOnElement('input[name="txtId"]');
  }

  displayNewSyncPanel(event?: Event): void {
    event?.preventDefault();
    this.newSync = true;
    this.passwordConfirmationVisible = false;
    this.password = undefined;
    this.passwordComplexity = undefined;
    this.passwordConfirmation = undefined;
    this.storeSvc.remove(StoreKey.SyncId);
    this.storeSvc.remove(StoreKey.Password);
    this.syncId = undefined;
    this.syncForm.txtId.$setValidity('InvalidSyncId', true);
    this.appHelperSvc.focusOnElement('.login-form-new input[name="txtPassword"]');
  }

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
        this.storeSvc.get<string>(StoreKey.SyncId),
        this.utilitySvc.isSyncEnabled(),
        this.utilitySvc.getServiceUrl(),
        this.currentLocaleSupportsPasswordValidation()
      ])
      .then((data) => {
        const [syncId, syncEnabled, serviceUrl, currentLocaleIsEnglish] = data;
        this.syncId = syncId;
        this.syncEnabled = syncEnabled;
        this.enablePasswordValidation = currentLocaleIsEnglish;

        this.serviceInfo = {
          url: serviceUrl
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
    return this.appHelperSvc.formatServiceInfo().then((formattedServiceInfo) => {
      Object.assign(this.serviceInfo, formattedServiceInfo);
    });
  }

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

  submitForm(): void {
    this.$timeout(() => {
      // Handle enter key press
      if (this.updateServicePanelVisible) {
        (document.querySelector('.update-service-panel .btn-update-service-url') as HTMLButtonElement).click();
      } else if (this.newSync) {
        if (this.passwordConfirmationVisible) {
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
    this.updateServiceConfirmationVisible = false;
    this.updateServicePanelVisible = true;
    this.validatingServiceUrl = false;

    // Validate service url and then focus on url field
    this.validateServiceUrl().finally(() => this.appHelperSvc.focusOnElement('.update-service-panel input'));
  }

  sync(): void {
    // Set sync info
    const syncInfo: ApiXbrowsersyncServiceSyncInfo = {
      syncPassword: this.password,
      serviceType: ApiServiceType.xBrowserSync,
      serviceUrl: this.serviceInfo.url,
      syncId: this.syncId
    };
    this.setSyncInfo()(syncInfo);

    if (this.syncId && this.appHelperSvc.confirmBeforeSyncing()) {
      // Display overwrite data confirmation panel
      this.displaySyncConfirmation();
      this.appHelperSvc.focusOnElement('.btn-confirm-enable-sync');
    } else {
      // If no ID provided start syncing
      this.executeSync();
    }
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
        this.updateServiceConfirmationVisible = true;
        this.appHelperSvc.attachClickEventsToNewTabLinks(document.querySelector('.service-message'));
        this.appHelperSvc.focusOnElement('.focused');
      });
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
