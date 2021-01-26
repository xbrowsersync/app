import angular from 'angular';
import { Injectable } from 'angular-ts-decorators';
import autobind from 'autobind-decorator';
import { AlertType } from '../../alert/alert.enum';
import { Alert } from '../../alert/alert.interface';
import AlertService from '../../alert/alert.service';
import { PlatformService } from '../../global-shared.interface';
import LogService from '../../log/log.service';
import * as Exceptions from '../exception';

@autobind
@Injectable('ExceptionHandler')
export default class ExceptionHandlerService {
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

  getAlertFromException(exception: Exceptions.Exception): Alert {
    const alertMessage: Alert = {
      message: '',
      title: '',
      type: AlertType.Error
    };

    switch (exception.constructor) {
      case Exceptions.NetworkOfflineException:
      case Exceptions.HttpRequestFailedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.HttpRequestFailed_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.HttpRequestFailed_Message);
        break;
      case Exceptions.TooManyRequestsException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.TooManyRequests_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.TooManyRequests_Message);
        break;
      case Exceptions.RequestEntityTooLargeException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.RequestEntityTooLarge_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.RequestEntityTooLarge_Message);
        break;
      case Exceptions.NotAcceptingNewSyncsException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.NotAcceptingNewSyncs_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.NotAcceptingNewSyncs_Message);
        break;
      case Exceptions.DailyNewSyncLimitReachedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.DailyNewSyncLimitReached_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.DailyNewSyncLimitReached_Message);
        break;
      case Exceptions.MissingClientDataException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.MissingClientData_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.MissingClientData_Message);
        break;
      case Exceptions.NoDataFoundException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.InvalidCredentials_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.InvalidCredentials_Message);
        break;
      case Exceptions.SyncRemovedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.SyncRemoved_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.SyncRemoved_Message);
        break;
      case Exceptions.SyncVersionNotSupportedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.SyncVersionNotSupported_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.SyncVersionNotSupported_Message);
        break;
      case Exceptions.InvalidCredentialsException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.InvalidCredentials_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.InvalidCredentials_Message);
        break;
      case Exceptions.ContainerChangedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.ContainerChanged_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.ContainerChanged_Message);
        break;
      case Exceptions.ContainerNotFoundException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.LocalContainerNotFound_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.LocalContainerNotFound_Message);
        break;
      case Exceptions.DataOutOfSyncException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.OutOfSync_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.OutOfSync_Message);
        break;
      case Exceptions.InvalidServiceException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.InvalidService_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.InvalidService_Message);
        break;
      case Exceptions.ServiceOfflineException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.ServiceOffline_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.ServiceOffline_Message);
        break;
      case Exceptions.UnsupportedApiVersionException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.UnsupportedServiceApiVersion_Title);
        alertMessage.message = this.platformSvc.getI18nString(
          this.Strings.Exception.UnsupportedServiceApiVersion_Message
        );
        break;
      case Exceptions.FailedGetPageMetadataException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedGetPageMetadata_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.FailedGetPageMetadata_Message);
        break;
      case Exceptions.FailedScanException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.ScanFailed_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.ScanFailed_Message);
        break;
      case Exceptions.FailedShareBookmarkException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.ShareFailed_Title);
        break;
      case Exceptions.FailedDownloadFileException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedDownloadFile_Title);
        break;
      case Exceptions.FailedGetDataToRestoreException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedGetDataToRestore_Title);
        break;
      case Exceptions.FailedRestoreDataException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedRestoreData_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.FailedRestoreData_Message);
        break;
      case Exceptions.FailedShareUrlException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedShareUrl_Title);
        break;
      case Exceptions.FailedShareUrlNotSyncedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedShareUrlNotSynced_Title);
        break;
      case Exceptions.FailedRefreshBookmarksException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.FailedRefreshBookmarks_Title);
        break;
      case Exceptions.SyncUncommittedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.UncommittedSyncs_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.UncommittedSyncs_Message);
        break;
      case Exceptions.UpgradeFailedException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.UpgradeFailed_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.UpgradeFailed_Message);
        break;
      case Exceptions.FailedCreateNativeBookmarksException:
      case Exceptions.FailedGetNativeBookmarksException:
      case Exceptions.FailedRemoveNativeBookmarksException:
      case Exceptions.NativeBookmarkNotFoundException:
      case Exceptions.BookmarkNotFoundException:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.LocalSyncError_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.LocalSyncError_Message);
        break;
      default:
        alertMessage.title = this.platformSvc.getI18nString(this.Strings.Exception.Default_Title);
        alertMessage.message = this.platformSvc.getI18nString(this.Strings.Exception.Default_Message);
    }

    return alertMessage;
  }

  handleException(exception: Exceptions.Exception, cause?: string, displayAlert = true): void {
    switch (exception.constructor) {
      case Exceptions.HttpRequestCancelledException:
        displayAlert = false;
        return;
      case Exceptions.NetworkOfflineException:
        if (!exception.logged) {
          this.logSvc.logWarning('Network offline');
        }
        exception.logged = true;
        break;
      case Exceptions.ServiceOfflineException:
        if (!exception.logged) {
          this.logSvc.logWarning('Service offline');
        }
        exception.logged = true;
        break;
      case Exceptions.InvalidCredentialsException:
      case Exceptions.SyncUncommittedException:
        break;
      default:
        this.logSvc.logError(exception, cause);
    }

    if (displayAlert) {
      this.alertSvc.setCurrentAlert(this.getAlertFromException(exception));
    }
  }

  static Factory($injector: ng.auto.IInjectorService, AlertSvc: AlertService, LogSvc: LogService) {
    const exceptionHandler = new ExceptionHandlerService($injector, AlertSvc, LogSvc);
    return exceptionHandler.handleException;
  }
}
