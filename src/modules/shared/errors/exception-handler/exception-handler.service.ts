import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import { boundMethod } from 'autobind-decorator';
import { AlertType } from '../../alert/alert.enum';
import { Alert } from '../../alert/alert.interface';
import { AlertService } from '../../alert/alert.service';
import { PlatformService } from '../../global-shared.interface';
import { LogService } from '../../log/log.service';
import * as Errors from '../errors';

@Injectable('ExceptionHandler')
export class ExceptionHandlerService {
  Strings = require('../../../../../res/strings/en.json');

  $injector: ng.auto.IInjectorService;
  alertSvc: AlertService;
  logSvc: LogService;
  _platformSvc: PlatformService;

  static $inject = ['$injector', 'AlertService', 'LogService'];
  constructor($injector: ng.auto.IInjectorService, AlertSvc: AlertService, LogSvc: LogService) {
    this.$injector = $injector;
    this.alertSvc = AlertSvc;
    this.logSvc = LogSvc;
  }

  get platformSvc(): PlatformService {
    if (angular.isUndefined(this._platformSvc)) {
      this._platformSvc = this.$injector.get('PlatformService');
    }
    return this._platformSvc;
  }

  getAlertFromError(error: Errors.BaseError): Alert {
    const alertMessage: Alert = {
      message: '',
      title: '',
      type: AlertType.Error
    };

    switch (error.constructor) {
      case Errors.HttpRequestTimedOutError:
      case Errors.NetworkConnectionError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.NetworkConnection.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.NetworkConnection.Message);
        break;
      case Errors.HttpRequestFailedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.HttpRequestFailed.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.HttpRequestFailed.Message);
        break;
      case Errors.TooManyRequestsError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.TooManyRequests.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.TooManyRequests.Message);
        break;
      case Errors.RequestEntityTooLargeError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.RequestEntityTooLarge.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.RequestEntityTooLarge.Message);
        break;
      case Errors.NotAcceptingNewSyncsError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.NotAcceptingNewSyncs.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.NotAcceptingNewSyncs.Message);
        break;
      case Errors.DailyNewSyncLimitReachedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.DailyNewSyncLimitReached.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.DailyNewSyncLimitReached.Message);
        break;
      case Errors.IncompleteSyncInfoError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.IncompleteSyncInfo.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.IncompleteSyncInfo.Message);
        break;
      case Errors.SyncNotFoundError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.SyncRemoved.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.SyncRemoved.Message);
        break;
      case Errors.SyncVersionNotSupportedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.SyncVersionNotSupported.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.SyncVersionNotSupported.Message);
        break;
      case Errors.InvalidCredentialsError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.InvalidCredentials.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.InvalidCredentials.Message);
        break;
      case Errors.ContainerChangedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.ContainerChanged.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.ContainerChanged.Message);
        break;
      case Errors.ContainerNotFoundError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.LocalContainerNotFound.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.LocalContainerNotFound.Message);
        break;
      case Errors.DataOutOfSyncError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.OutOfSync.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.OutOfSync.Message);
        break;
      case Errors.InvalidServiceError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.InvalidService.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.InvalidService.Message);
        break;
      case Errors.ServiceOfflineError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.ServiceOffline.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.ServiceOffline.Message);
        break;
      case Errors.UnsupportedApiVersionError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.UnsupportedServiceApiVersion.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.UnsupportedServiceApiVersion.Message);
        break;
      case Errors.FailedGetPageMetadataError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedGetPageMetadata.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.FailedGetPageMetadata.Message);
        break;
      case Errors.FailedScanError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.ScanFailed.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.ScanFailed.Message);
        break;
      case Errors.FailedShareBookmarkError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.ShareFailed.Title);
        break;
      case Errors.FailedDownloadFileError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedDownloadFile.Title);
        break;
      case Errors.FailedGetDataToRestoreError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedGetDataToRestore.Title);
        break;
      case Errors.FailedRestoreDataError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedRestoreData.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.FailedRestoreData.Message);
        break;
      case Errors.FailedShareUrlError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedShareUrl.Title);
        break;
      case Errors.FailedShareUrlNotSyncedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedShareUrlNotSynced.Title);
        break;
      case Errors.FailedRefreshBookmarksError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.FailedRefreshBookmarks.Title);
        break;
      case Errors.SyncUncommittedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.UncommittedSyncs.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.UncommittedSyncs.Message);
        alertMessage.type = AlertType.Information;
        break;
      case Errors.UpgradeFailedError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.UpgradeFailed.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.UpgradeFailed.Message);
        break;
      case Errors.FailedCreateNativeBookmarksError:
      case Errors.FailedGetNativeBookmarksError:
      case Errors.FailedRemoveNativeBookmarksError:
      case Errors.NativeBookmarkNotFoundError:
      case Errors.BookmarkNotFoundError:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.LocalSyncError.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.LocalSyncError.Message);
        break;
      default:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Error.Default.Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Error.Default.Message);
    }

    return alertMessage;
  }

  @boundMethod
  handleError(error: Errors.BaseError, cause?: string, displayAlert = true): void {
    switch (error.constructor) {
      case Errors.HttpRequestAbortedError:
        displayAlert = false;
        return;
      case Errors.NetworkConnectionError:
        if (!error.logged) {
          this.logSvc.logWarning('Connection lost');
        }
        error.logged = true;
        break;
      case Errors.ServiceOfflineError:
        if (!error.logged) {
          this.logSvc.logWarning('Service offline');
        }
        error.logged = true;
        break;
      case Errors.InvalidCredentialsError:
      case Errors.SyncUncommittedError:
        break;
      default:
        this.logSvc.logError(error, cause);
    }

    if (displayAlert) {
      this.alertSvc.currentAlert = this.getAlertFromError(error);
    }
  }

  static Factory($injector: ng.auto.IInjectorService, AlertSvc: AlertService, LogSvc: LogService) {
    const errorHandler = new ExceptionHandlerService($injector, AlertSvc, LogSvc);
    return errorHandler.handleError;
  }
}
